using Microsoft.Data.SqlClient;
using Dapper;
using Microsoft.AspNetCore.Authentication.Negotiate;

var builder = WebApplication.CreateBuilder(args);


// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi

builder.Services
    .AddAuthentication(
        NegotiateDefaults.AuthenticationScheme
    )
    .AddNegotiate();


builder.Services.AddAuthorization();

builder.Services.AddOpenApi();

var app = builder.Build();

async Task<AppUserAccess?> GetCurrentAppUserAsync(
    HttpContext context,
    IConfiguration config
)
{
    var windowsUser =
        context.User.Identity?.Name;


    if (
        string.IsNullOrWhiteSpace(
            windowsUser
        )
    )
    {
        return null;
    }


    await using var connection =
        new SqlConnection(
            config.GetConnectionString(
                "CampaignDb"
            )
        );


    return await connection
        .QueryFirstOrDefaultAsync<AppUserAccess>(
        """
        SELECT
            AppUserId,
            WindowsUserName,
            DisplayName,
            IsCampaignUser,
            IsManager,
            IsDirector,
            IsDataScience,
            IsAdmin,
            IsActive

        FROM dbo.AppUsers

        WHERE WindowsUserName =
            @WindowsUserName;
        """,
        new
        {
            WindowsUserName =
                windowsUser
        }
    );
}


bool CanUseCampaigns(AppUserAccess user)
{
    return
        user.IsActive &&
        (
            user.IsCampaignUser ||
            user.IsAdmin
        );
}


bool CanApproveAsManager(AppUserAccess user)
{
    return
        user.IsActive &&
        (
            user.IsManager ||
            user.IsAdmin
        );
}


bool CanApproveAsDirector(AppUserAccess user)
{
    return
        user.IsActive &&
        (
            user.IsDirector ||
            user.IsAdmin
        );
}


bool CanUseDataScience(AppUserAccess user)
{
    return
        user.IsActive &&
        (
            user.IsDataScience ||
            user.IsAdmin
        );
}


async Task<AppUserAccess?> GetCurrentAdminAsync(
    HttpContext context,
    IConfiguration config
)
{
    var user =
        await GetCurrentAppUserAsync(
            context,
            config
        );


    if (
        user == null ||
        !user.IsActive ||
        !user.IsAdmin
    )
    {
        return null;
    }


    return user;
}

    
// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

var summaries = new[]
{
    "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
};

app.MapGet("/weatherforecast", () =>
{
    var forecast =  Enumerable.Range(1, 5).Select(index =>
        new WeatherForecast
        (
            DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
            Random.Shared.Next(-20, 55),
            summaries[Random.Shared.Next(summaries.Length)]
        ))
        .ToArray();
    return forecast;
})
.WithName("GetWeatherForecast");
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/db-test", async (IConfiguration config) =>
{
    try
    {
        var connectionString =
            config.GetConnectionString("CampaignDb");

        await using var connection =
            new SqlConnection(connectionString);

        var result =
            await connection.ExecuteScalarAsync<int>(
                "SELECT 1"
            );

        return Results.Ok(new
        {
            connected = result == 1,
            message = "SQL Server connection successful"
        });
    }
    catch (Exception ex)
    {
        return Results.Problem(
            ex.Message
        );
    }
});


//Channels
app.MapGet("/api/channels", async (IConfiguration config) =>
{
    await using var connection =
        new SqlConnection(config.GetConnectionString("CampaignDb"));

    var data = await connection.QueryAsync(
        @"SELECT
              ChannelId AS [channelId],
              Channel AS [channel]
          FROM dbo.LK_CampaignChannel  WITH(NOLOCK)
          ORDER BY channel");

    return Results.Ok(data);
});


//Target Segments
app.MapGet("/api/segments", async (IConfiguration config) =>
{
    await using var connection =
        new SqlConnection(config.GetConnectionString("CampaignDb"));

    var data = await connection.QueryAsync(
        @"SELECT
              TargetSegmentId AS targetSegmentId,
              [Target Segment] AS targetSegment
          FROM dbo.LK_CampaignTargetSegment  WITH(NOLOCK)
          ORDER BY 1");

    return Results.Ok(data);
});

//Dependencies
app.MapGet("/api/dependencies", async (IConfiguration config) =>
{
    await using var connection =
        new SqlConnection(config.GetConnectionString("CampaignDb"));

    var data = await connection.QueryAsync(
        @"SELECT
              DependenciesId as dependenciesId,
              Dependencies as dependencies
          FROM dbo.LK_CampaignDependencies  WITH(NOLOCK)
          ORDER BY dependencies");

    return Results.Ok(data);
});

// Stores
app.MapGet("/api/stores", async (IConfiguration config) =>
{
    await using var connection =
        new SqlConnection(config.GetConnectionString("CampaignDb"));

    var data = await connection.QueryAsync(
        @"SELECT
              PlantId as storesId,
              PlantName stores,
              Case when [Company Code] = '1006' Then 'Sauid' ELSE 'KWT' END as country
          FROM [DailyReports].dbo.LK_PlantAreaManagers  WITH(NOLOCK)
		  WHERE [Company Code] not in ('1003' , '1004' )
          ORDER BY country, stores");

    return Results.Ok(data);
});


app.MapPost("/api/campaigns",
async (
    CampaignRequest request,
    IConfiguration config,
    HttpContext context
    ) =>
{
    var user =
        await GetCurrentAppUserAsync(
            context,
            config
        );


    if (
        user == null ||
        !CanUseCampaigns(user)
    )
    {
        return Results.Forbid();
    }


    var currentUser =
    user.WindowsUserName;


    await using var connection =
        new SqlConnection(
            config.GetConnectionString("CampaignDb")
        );

    await connection.OpenAsync();

    using var transaction =
        connection.BeginTransaction();

    try
    {
        const int draftStatusId = 1;
        const int submittedStatusId = 2;

        var initialStatusId =
            request.SaveAsDraft
                ? draftStatusId
                : submittedStatusId;

       

        var temporaryCode =
            "TMP-" +
            Guid.NewGuid()
                .ToString("N")
                .Substring(0, 12);


        var campaignId =
            await connection.ExecuteScalarAsync<int>(
            """
            INSERT INTO dbo.[Campaign Submission Approval]
            (
                [Campaign Code],
                [Campaign Name],
                Owner,
                Objective,
                [Campaign Brief],
                ChannelId,
                StatusId,
                [Start Date],
                [End Date],
                [Expected Baseline Sales],
                [Expected Uplift Pct],
                [Expected Incremental Sales],
                [Expected ROI],
                Cost,
                [Created By],
                [Created At],
                [Updated By],
                [Updated At]
            )
            OUTPUT INSERTED.[Campaign ID]
            VALUES
            (
                @CampaignCode,
                @CampaignName,
                @Owner,
                @Objective,
                @CampaignBrief,
                 @ChannelId,
                @StatusId,
                @StartDate,
                @EndDate,
                @ExpectedBaselineSales,
                @ExpectedUpliftPct,
                @ExpectedIncrementalSale,
                @ExpectedROI,
                @Cost,
                @CreatedBy,
                GETDATE(),
                @UpdatedBy,
                GETDATE()
            );
            """,
            new
            {
                CampaignCode = temporaryCode,

                request.CampaignName,
                request.Owner,
                request.Objective,
                request.CampaignBrief,

            

                ChannelId =
                    request.Channel.Id,

                StatusId =
                    initialStatusId,

                request.StartDate,
                request.EndDate,

                request.ExpectedBaselineSales,
                request.ExpectedUpliftPct,
                request.ExpectedIncrementalSale,
                request.ExpectedROI,
                request.Cost,

                CreatedBy =
                    currentUser,

                UpdatedBy =
                    currentUser
            },
            transaction
        );


        // Final Campaign Code
        var campaignCode =
            $"CMP-{DateTime.Now.Year}-{campaignId:D6}";


        await connection.ExecuteAsync(
            """
            UPDATE dbo.[Campaign Submission Approval]
            SET [Campaign Code] = @CampaignCode
            WHERE [Campaign ID] = @CampaignId;
            """,
            new
            {
                CampaignCode = campaignCode,
                CampaignId = campaignId
            },
            transaction
        );


        // Stores
        foreach (var store in request.Stores)
        {
            await connection.ExecuteAsync(
                """
                INSERT INTO dbo.CampaignStores
                (
                    [Campaign ID],
                    StoreCode
                )
                VALUES
                (
                    @CampaignId,
                    @StoreId
                );
                """,
                new
                {
                    CampaignId = campaignId,
                    StoreId = store.Id
                },
                transaction
            );
        }


        // Target Segments
        foreach (var segment in request.TargetSegments)
        {
            await connection.ExecuteAsync(
                """
                INSERT INTO dbo.CampaignTargetSegment
                (
                    [Campaign ID],
                    [TargetSegment Id]
                )
                VALUES
                (
                    @CampaignId,
                    @SegmentId
                );
                """,
                new
                {
                    CampaignId = campaignId,
                    SegmentId = segment.Id
                },
                transaction
            );
        }


        // Dependencies
        foreach (var dependency in request.Dependencies)
        {
            await connection.ExecuteAsync(
                """
                INSERT INTO dbo.CampaignDependencies
                (
                    [Campaign ID],
                    [Dependencies Id]
                )
                VALUES
                (
                    @CampaignId,
                    @DependencyId
                );
                """,
                new
                {
                    CampaignId = campaignId,
                    DependencyId = dependency.Id
                },
                transaction
            );
        }


        // Campaign Approval History - Initial Submission
    if (!request.SaveAsDraft)
    { 
        await connection.ExecuteAsync(
            """
            INSERT INTO dbo.CampaignApprovalHistory
            (
                CampaignId,
                ApprovalStageID,
                DecisionReason,
                DecisionAt,
                DecisionBy
            )
            VALUES
            (
                @CampaignId,
                @ApprovalStageID,
                @DecisionReason,
                GETDATE(),
                @DecisionBy
            );
            """,
            new
            {
                CampaignId = campaignId,

                ApprovalStageID = submittedStatusId,

                DecisionReason =
                    "Campaign Submitted / Pending Approval",

                DecisionBy =
                    currentUser
            },
            transaction
        );
    } 
        //END  Campaign Approval History - Initial Submission

        transaction.Commit();


        return Results.Ok(new
        {
            success = true,
            campaignId,
            campaignCode,
            
            statusId =
            initialStatusId,

            message = request.SaveAsDraft
                    ? "Campaign saved as Draft successfully."
                    : "Campaign submitted successfully."
                
        });
    }
    catch (Exception ex)
    {
        transaction.Rollback();

        return Results.Problem(
            detail: ex.Message,
            statusCode: 500
        );
    }
});

    app.MapGet("/api/campaigns", async (IConfiguration config) =>
    {
        await using var connection =
            new SqlConnection(
                config.GetConnectionString("CampaignDb")
            );

        var campaigns =
            await connection.QueryAsync(
            """
            SELECT
                C.[Campaign ID]      AS campaignId,
                C.[Campaign Code]    AS campaignCode,
                C.[Campaign Name]    AS campaignName,
                C.Owner              AS owner,
                C.Objective          AS objective,
                C.[Start Date]       AS startDate,
                C.[End Date]         AS endDate,

                C.StatusId           AS statusId,
                S.Status             AS status,

                C.ChannelId          AS channelId,
                CH.Channel           AS channel,

                C.[Created At]       AS createdAt,
                C.[Updated At]       AS updatedAt

            FROM dbo.[Campaign Submission Approval] C  WITH(NOLOCK)

            LEFT JOIN dbo.LK_CampaignStatus S  WITH(NOLOCK)
                ON C.StatusId = S.StatusId

            LEFT JOIN dbo.LK_CampaignChannel CH  WITH(NOLOCK)
                ON C.ChannelId = CH.ChannelId

            ORDER BY
                C.[Created At] DESC;
            """
        );

        return Results.Ok(campaigns);
    });

app.MapGet(
    "/api/campaigns/{campaignId:int}",
    async (
        int campaignId,
        IConfiguration config,
        HttpContext context
    ) =>
{
    var user =
        await GetCurrentAppUserAsync(
            context,
            config
        );


    if (
        user == null ||
        !user.IsActive
    )
    {
        return Results.Forbid();
    }


    await using var connection =
        new SqlConnection(
            config.GetConnectionString("CampaignDb")
        );

    var campaign = await connection.QueryFirstOrDefaultAsync(
    """
    SELECT
        C.[Campaign ID] AS campaignId,
        C.[Campaign Code] AS campaignCode,
        C.[Campaign Name] AS campaignName,
        C.Owner AS owner,
        C.Objective AS objective,
        C.[Campaign Brief] AS campaignBrief,

        C.[Expected Baseline Sales] AS expectedBaselineSales,
        C.[Expected Uplift Pct] AS expectedUpliftPct,
        C.[Expected Incremental Sales] AS expectedIncrementalSale,
        C.[Expected ROI] AS expectedROI,
        C.Cost AS cost,

        C.ChannelId AS channelId,
        CH.Channel AS channel,

        C.StatusId AS statusId,
        ST.Status AS status,

        C.[Start Date] AS startDate,
        C.[End Date] AS endDate,

        C.[Created By] AS createdBy,
        C.[Created At] AS createdAt,
        C.[Updated By] AS updatedBy,
        C.[Updated At] AS updatedAt

    FROM dbo.[Campaign Submission Approval] C  WITH(NOLOCK)

    LEFT JOIN dbo.LK_CampaignChannel CH  WITH(NOLOCK)
        ON C.ChannelId = CH.ChannelId

    LEFT JOIN dbo.LK_CampaignStatus ST  WITH(NOLOCK)
        ON C.StatusId = ST.StatusId

    WHERE C.[Campaign ID] = @CampaignId
    """,
    new { CampaignId = campaignId });

    if (campaign == null)
        return Results.NotFound(
            new { message = "Campaign not found." }
        );


    // Target Segments
    var targetSegments =
        await connection.QueryAsync(
        """
        SELECT
            T.TargetSegmentId AS id,
            T.[Target Segment] AS name
        FROM dbo.CampaignTargetSegment CT  WITH(NOLOCK)
        INNER JOIN dbo.LK_CampaignTargetSegment T  WITH(NOLOCK)
            ON CT.[TargetSegment Id] = T.TargetSegmentId
        WHERE CT.[Campaign ID] = @CampaignId
        ORDER BY T.[Target Segment]
        """,
        new { CampaignId = campaignId });


    // Stores - from Main Store Lookup
    var stores =
        await connection.QueryAsync(
        """
        SELECT
            P.PlantId AS id,
            P.PlantName AS name,
            CASE
                WHEN P.[Company Code] = '1006'
                    THEN 'Saudi'
                ELSE 'Kuwait'
            END AS country

        FROM dbo.CampaignStores CS  WITH(NOLOCK)

        INNER JOIN [DailyReports].dbo.LK_PlantAreaManagers P  WITH(NOLOCK)
            ON CS.StoreCode = P.PlantId

        WHERE CS.[Campaign ID] = @CampaignId

        ORDER BY country, name
        """,
        new { CampaignId = campaignId });


    // Dependencies
    var dependencies =
        await connection.QueryAsync(
        """
        SELECT
            D.DependenciesId AS id,
            D.Dependencies AS name

        FROM dbo.CampaignDependencies CD  WITH(NOLOCK)

        INNER JOIN dbo.LK_CampaignDependencies D  WITH(NOLOCK)
            ON CD.[Dependencies Id] = D.DependenciesId

        WHERE CD.[Campaign ID] = @CampaignId

        ORDER BY D.Dependencies
        """,
        new { CampaignId = campaignId });


    // Approval History
    var approvalHistory =
        await connection.QueryAsync(
        """
        SELECT
            H.[Campaign Approval Id] AS campaignApprovalId,
            H.ApprovalStageID AS approvalStageId,
            S.Status AS approvalStage,
            H.DecisionReason AS decisionReason,
            H.DecisionAt AS decisionAt,
            H.DecisionBy AS decisionBy

        FROM dbo.CampaignApprovalHistory H  WITH(NOLOCK)

        LEFT JOIN dbo.LK_CampaignStatus S  WITH(NOLOCK)
            ON H.ApprovalStageID = S.StatusId

        WHERE H.CampaignId = @CampaignId

        ORDER BY H.DecisionAt ASC
        """,
        new { CampaignId = campaignId });


    return Results.Ok(new
    {
        campaign,
        targetSegments,
        stores,
        dependencies,
        approvalHistory
    });
});




app.MapGet("/api/approvals/pending",
async (IConfiguration config,
        HttpContext context) =>
{

    var user =
        await GetCurrentAppUserAsync(
            context,
            config
        );


    if (
        user == null ||
        !user.IsActive
    )
    {
        return Results.Forbid();
    }


    bool managerAccess =
        CanApproveAsManager(user);

    bool directorAccess =
        CanApproveAsDirector(user);


    if (
        !managerAccess &&
        !directorAccess
    )
    {
        return Results.Forbid();
    }
    await using var connection =
        new SqlConnection(
            config.GetConnectionString("CampaignDb")
        );

    var campaigns =
        await connection.QueryAsync(
        """
        SELECT
            C.[Campaign ID] AS campaignId,
            C.[Campaign Code] AS campaignCode,
            C.[Campaign Name] AS campaignName,

            C.Owner AS owner,
            C.Objective AS objective,

            C.ChannelId AS channelId,
            CH.Channel AS channel,

            C.StatusId AS statusId,
            ST.Status AS status,

            C.[Start Date] AS startDate,
            C.[End Date] AS endDate,

            C.[Expected ROI] AS expectedROI,
            C.Cost AS cost,

            C.[Created At] AS createdAt

        FROM dbo.[Campaign Submission Approval] C

        LEFT JOIN dbo.LK_CampaignChannel CH
            ON C.ChannelId = CH.ChannelId

        LEFT JOIN dbo.LK_CampaignStatus ST
            ON C.StatusId = ST.StatusId

        WHERE
        (
            (@ManagerAccess = 1 AND C.StatusId = 2)
            OR
            (@DirectorAccess = 1 AND C.StatusId = 4)
        )

        ORDER BY C.[Created At] ASC;
        """, 
        new
        {
            ManagerAccess =
                managerAccess,

            DirectorAccess =
                directorAccess
        }

    );

    return Results.Ok(campaigns);
})
.RequireAuthorization();

app.MapPost(
    "/api/campaigns/{campaignId:int}/decision",
    async (
        int campaignId,
        ApprovalDecisionRequest request,
        IConfiguration config,
        HttpContext context
    ) =>
{
        var user =
            await GetCurrentAppUserAsync(
                context,
                config
            );


        if (
            user == null ||
            !user.IsActive
        )
        {
            return Results.Forbid();
        }


        var currentUser =
            user.WindowsUserName;
    await using var connection =
        new SqlConnection(
            config.GetConnectionString("CampaignDb")
        );

    await connection.OpenAsync();

    using var transaction =
        connection.BeginTransaction();

    try
    {
        var currentStatus =
            await connection.QueryFirstOrDefaultAsync<int?>(
            """
            SELECT StatusId
            FROM dbo.[Campaign Submission Approval]
            WITH (UPDLOCK, HOLDLOCK)
            WHERE [Campaign ID] = @CampaignId
            """,
            new
            {
                CampaignId = campaignId
            },
            transaction
        );


        if (currentStatus == null)
        {
            transaction.Rollback();

            return Results.NotFound(
                new
                {
                    message = "Campaign not found."
                }
            );
        }


        // ========================================
        // SECURITY - APPROVAL ROLE CHECK
        // ========================================

        // Status 2 = waiting for Manager
        if (
            currentStatus == 2 &&
            !CanApproveAsManager(user)
        )
        {
            transaction.Rollback();

            return Results.Forbid();
        }


        // Status 4 = waiting for Director
        if (
            currentStatus == 4 &&
            !CanApproveAsDirector(user)
        )
        {
            transaction.Rollback();

            return Results.Forbid();
        }

        var decision =
            request.Decision?
                .Trim()
                .ToLower();


        int newStatusId;
        int approvalHistoryStatusId;


        // Manager Stage
        // ========================================
        // STAGE 1 - MARKETING MANAGER
        // ========================================

        if (currentStatus == 2)
        {
            if (decision == "approve")
            {
                newStatusId = 4;
                approvalHistoryStatusId = 4;
            }
            else if (decision == "reject")
            {
                newStatusId = 6;
                approvalHistoryStatusId = 6;
            }
            else
            {
                transaction.Rollback();

                return Results.BadRequest(
                    new
                    {
                        message = "Invalid decision."
                    }
                );
            }
        }

            
        // ========================================
        // STAGE 2 - MARKETING DIRECTOR
        // ========================================

        else if (currentStatus == 4)
        {
            if (decision == "approve")
            {
                // Director approved:
                // Campaign moves to Execution
                newStatusId = 7;

                // History keeps the actual approval event
                approvalHistoryStatusId = 3;
            }
            else if (decision == "reject")
            {
                newStatusId = 5;
                approvalHistoryStatusId = 5;
            }
            else
            {
                transaction.Rollback();

                return Results.BadRequest(
                    new
                    {
                        message = "Invalid decision."
                    }
                );
            }
        }

        // ========================================
        // NOT IN AN APPROVAL STATE
        // ========================================

        else
        {
            transaction.Rollback();

            return Results.BadRequest(
                new
                {
                    message =
                        "Campaign is not currently awaiting approval."
                }
            );
        }


        // Rejection reason mandatory
        if (
            decision == "reject" &&
            string.IsNullOrWhiteSpace(
                request.Reason
            )
        )
        {
            transaction.Rollback();

            return Results.BadRequest(
                new
                {
                    message =
                        "Rejection reason is required."
                }
            );
        }


        // Update Campaign
        await connection.ExecuteAsync(
            """
            UPDATE dbo.[Campaign Submission Approval]

            SET
                StatusId = @StatusId,
                [Updated By] = @UpdatedBy,
                [Updated At] = GETDATE()

            WHERE [Campaign ID] = @CampaignId
            """,
            new
            {
                CampaignId = campaignId,
                StatusId = newStatusId,
                UpdatedBy = currentUser
            },
            transaction
        );


        // Approval History
        await connection.ExecuteAsync(
            """
            INSERT INTO dbo.CampaignApprovalHistory
            (
                CampaignId,
                ApprovalStageID,
                DecisionReason,
                DecisionAt,
                DecisionBy
            )

            VALUES
            (
                @CampaignId,
                @ApprovalStageID,
                @DecisionReason,
                GETDATE(),
                @DecisionBy
            )
            """,
            new
            {
                CampaignId = campaignId,

                ApprovalStageID =
                    approvalHistoryStatusId,

              DecisionReason =
                !string.IsNullOrWhiteSpace(
                    request.Reason
                )
                    ? request.Reason

                    : approvalHistoryStatusId == 3
                        ? "Approved by Director - Campaign moved to Execution"

                    : approvalHistoryStatusId == 4
                        ? "Approved by Manager"

                    : "Approved",

                DecisionBy =
                    currentUser
            },
            transaction
        );


        transaction.Commit();


        var status =
            await connection.QueryFirstOrDefaultAsync<string>(
            """
            SELECT Status
            FROM dbo.LK_CampaignStatus
            WHERE StatusId = @StatusId
            """,
            new
            {
                StatusId = newStatusId
            }
        );


        return Results.Ok(
            new
            {
                success = true,
                campaignId,
                statusId = newStatusId,
                status
            }
        );
    }
    catch
    {
        transaction.Rollback();
        throw;
    }
});





app.MapGet("/api/dashboard",
async (IConfiguration config) =>
{
    await using var connection =
        new SqlConnection(
            config.GetConnectionString("CampaignDb")
        );

    var summary =
        await connection.QueryFirstAsync(
        """
        SELECT

            COUNT(*) AS totalCampaigns,

            SUM(
                CASE
                    WHEN StatusId IN (2,4)
                    THEN 1
                    ELSE 0
                END
            ) AS pendingApprovals,

            SUM(
                CASE
                    WHEN StatusId = 7
                    THEN 1
                    ELSE 0
                END
            ) AS approvedCampaigns,

            SUM(
                CASE
                    WHEN StatusId IN (5,6)
                    THEN 1
                    ELSE 0
                END
            ) AS rejectedCampaigns,

            SUM(
                CASE
                    WHEN
                        StatusId = 7
                        AND CAST(GETDATE() AS date)
                            BETWEEN
                            CAST([Start Date] AS date)
                            AND
                            CAST([End Date] AS date)
                    THEN 1
                    ELSE 0
                END
            ) AS activeCampaigns

        FROM dbo.[Campaign Submission Approval];
        """
    );


    var recentCampaigns =
        await connection.QueryAsync(
        """
        SELECT TOP 8

            C.[Campaign ID] AS campaignId,

            C.[Campaign Code] AS campaignCode,

            C.[Campaign Name] AS campaignName,

            C.Objective AS objective,

            CH.Channel AS channel,

            C.[Start Date] AS startDate,

            C.[End Date] AS endDate,

            C.StatusId AS statusId,

            ST.Status AS status,

            CASE
                WHEN
                    C.StatusId = 7
                    AND CAST(GETDATE() AS date)
                        BETWEEN
                        CAST(C.[Start Date] AS date)
                        AND
                        CAST(C.[End Date] AS date)

                THEN CAST(1 AS bit)

                ELSE CAST(0 AS bit)

            END AS isActive

        FROM dbo.[Campaign Submission Approval] C

        LEFT JOIN dbo.LK_CampaignChannel CH
            ON C.ChannelId = CH.ChannelId

        LEFT JOIN dbo.LK_CampaignStatus ST
            ON C.StatusId = ST.StatusId

        ORDER BY
            C.[Created At] DESC;
        """
    );


    return Results.Ok(
        new
        {
            summary,
            recentCampaigns
        }
    );
});



app.MapPut(
    "/api/campaigns/{campaignId:int}",
    async (
        int campaignId,
        CampaignRequest request,
        IConfiguration config,
        HttpContext context
    ) =>
{
    var user =
        await GetCurrentAppUserAsync(
            context,
            config
        );


    if (
        user == null ||
        !CanUseCampaigns(user)
    )
    {
        return Results.Forbid();
    }


    var currentUser =
        user.WindowsUserName;


    await using var connection =
        new SqlConnection(
            config.GetConnectionString("CampaignDb")
        );

    await connection.OpenAsync();

    using var transaction =
        connection.BeginTransaction();

    try
    {
        var existing =
            await connection.QueryFirstOrDefaultAsync<CampaignState>(
            """
            SELECT
                StatusId,
                [Campaign Code] AS CampaignCode
            FROM dbo.[Campaign Submission Approval]
            WITH (UPDLOCK, HOLDLOCK)
            WHERE [Campaign ID] = @CampaignId
            """,
            new
            {
                CampaignId = campaignId
            },
            transaction
        );


        if (existing == null)
        {
            transaction.Rollback();

            return Results.NotFound(
                new
                {
                    message = "Campaign not found."
                }
            );
        }


        // Only Draft campaigns can be edited
        bool isDraft =
            existing.StatusId == 1;

        bool isRejected =
            existing.StatusId == 5 ||
            existing.StatusId == 6;


        if (!isDraft && !isRejected)
        {
            transaction.Rollback();

            return Results.BadRequest(
                new
                {
                    message =
                        "Only Draft or Rejected campaigns can be edited."
                }
            );
        }


        var newStatusId =
            request.SaveAsDraft
                ? 1
                : 2;


        // Update Main Campaign
        await connection.ExecuteAsync(
            """
            UPDATE dbo.[Campaign Submission Approval]

            SET
                [Campaign Name] = @CampaignName,
                Owner = @Owner,
                Objective = @Objective,
                [Campaign Brief] = @CampaignBrief,

                ChannelId = @ChannelId,
                StatusId = @StatusId,

                [Start Date] = @StartDate,
                [End Date] = @EndDate,

                [Expected Baseline Sales] =
                    @ExpectedBaselineSales,

                [Expected Uplift Pct] =
                    @ExpectedUpliftPct,

                [Expected Incremental Sales] =
                    @ExpectedIncrementalSale,

                [Expected ROI] =
                    @ExpectedROI,

                Cost = @Cost,

                [Updated By] = @UpdatedBy,
                [Updated At] = GETDATE()

            WHERE [Campaign ID] = @CampaignId
            """,
            new
            {
                CampaignId = campaignId,

                request.CampaignName,
                request.Owner,
                request.Objective,
                request.CampaignBrief,

                ChannelId =
                    request.Channel.Id,

                StatusId =
                    newStatusId,

                request.StartDate,
                request.EndDate,

                request.ExpectedBaselineSales,
                request.ExpectedUpliftPct,
                request.ExpectedIncrementalSale,
                request.ExpectedROI,
                request.Cost,

                UpdatedBy =
                    currentUser
            },
            transaction
        );


        // Remove old Child Records
        await connection.ExecuteAsync(
            """
            DELETE FROM dbo.CampaignStores
            WHERE [Campaign ID] = @CampaignId;

            DELETE FROM dbo.CampaignTargetSegment
            WHERE [Campaign ID] = @CampaignId;

            DELETE FROM dbo.CampaignDependencies
            WHERE [Campaign ID] = @CampaignId;
            """,
            new
            {
                CampaignId = campaignId
            },
            transaction
        );


        // Re-insert Stores
        foreach (var store in request.Stores)
        {
            await connection.ExecuteAsync(
                """
                INSERT INTO dbo.CampaignStores
                (
                    [Campaign ID],
                    StoreCode
                )
                VALUES
                (
                    @CampaignId,
                    @StoreId
                );
                """,
                new
                {
                    CampaignId = campaignId,
                    StoreId = store.Id
                },
                transaction
            );
        }


        // Re-insert Target Segments
        foreach (
            var segment
            in request.TargetSegments
        )
        {
            await connection.ExecuteAsync(
                """
                INSERT INTO dbo.CampaignTargetSegment
                (
                    [Campaign ID],
                    [TargetSegment Id]
                )
                VALUES
                (
                    @CampaignId,
                    @SegmentId
                );
                """,
                new
                {
                    CampaignId = campaignId,
                    SegmentId = segment.Id
                },
                transaction
            );
        }


        // Re-insert Dependencies
        foreach (
            var dependency
            in request.Dependencies
        )
        {
            await connection.ExecuteAsync(
                """
                INSERT INTO dbo.CampaignDependencies
                (
                    [Campaign ID],
                    [Dependencies Id]
                )
                VALUES
                (
                    @CampaignId,
                    @DependencyId
                );
                """,
                new
                {
                    CampaignId = campaignId,
                    DependencyId =
                        dependency.Id
                },
                transaction
            );
        }

        bool wasRejected =
            existing.StatusId == 5 ||
            existing.StatusId == 6;
        // If user SUBMITS the Draft
        if (!request.SaveAsDraft)
        {
            await connection.ExecuteAsync(
                """
                INSERT INTO dbo.CampaignApprovalHistory
                (
                    CampaignId,
                    ApprovalStageID,
                    DecisionReason,
                    DecisionAt,
                    DecisionBy
                )
                VALUES
                (
                    @CampaignId,
                    2,
                    @DecisionReason,
                    GETDATE(),
                    @DecisionBy
                );
                """,
                new
                {
                    CampaignId = campaignId,

                    DecisionReason =
                        wasRejected
                            ? "Rejected Campaign Revised and Resubmitted"
                            : "Draft Submitted / Pending Approval",

                    DecisionBy =
                        currentUser
                },
                transaction
            );
        }


        transaction.Commit();


        return Results.Ok(
            new
            {
                success = true,

                campaignId,

                campaignCode =
                    existing.CampaignCode,

                statusId =
                    newStatusId,

                message =
                    request.SaveAsDraft
                        ? "Draft updated successfully."
                        : "Draft submitted successfully."
            }
        );
    }
    catch (Exception ex)
    {
        transaction.Rollback();

        return Results.Problem(
            detail: ex.Message,
            statusCode: 500
        );
    }
});

app.MapPost(
    "/api/campaigns/{campaignId:int}/measurement/start",
    async (
        int campaignId,
        IConfiguration config,
        HttpContext context
    ) =>
{
     var user =
            await GetCurrentAppUserAsync(
                context,
                config
            );


        if (
            user == null ||
            !CanUseDataScience(user)
        )
        {
            return Results.Forbid();
        }


        var currentUser =
            user.WindowsUserName;
    
    await using var connection =
        new SqlConnection(
            config.GetConnectionString("CampaignDb")
        );

    await connection.OpenAsync();

    using var transaction =
        connection.BeginTransaction();

    try
    {
        var campaign =
            await connection.QueryFirstOrDefaultAsync<MeasurementCampaignState>(
            """
            SELECT
                StatusId,
                [End Date] AS EndDate
            FROM dbo.[Campaign Submission Approval]
            WHERE [Campaign ID] = @CampaignId
            """,
            new
            {
                CampaignId = campaignId
            },
            transaction
        );


        if (campaign == null)
        {
            transaction.Rollback();

            return Results.NotFound(
                new
                {
                    message =
                        "Campaign not found."
                }
            );
        }


        if (campaign.StatusId != 7)
        {
            transaction.Rollback();

            return Results.BadRequest(
                new
                {
                    message =
                        "Only campaigns in Execution can move to Measurement."
                }
            );
        }


        // Campaign must have finished
        if (
            campaign.EndDate.Date >=
            DateTime.Today
        )
        {
            transaction.Rollback();

            return Results.BadRequest(
                new
                {
                    message =
                        "Measurement can only start after the Campaign End Date."
                }
            );
        }


        // Move Campaign to Measurement
        await connection.ExecuteAsync(
            """
            UPDATE dbo.[Campaign Submission Approval]

            SET
                StatusId = 8,
                [Updated By] = @UpdatedBy,
                [Updated At] = GETDATE()

            WHERE [Campaign ID] = @CampaignId
            """,
            new
            {
                CampaignId = campaignId,

                UpdatedBy =
                    currentUser
            },
            transaction
        );


        // Create Measurement record
        await connection.ExecuteAsync(
            """
            IF NOT EXISTS
            (
                SELECT 1
                FROM dbo.CampaignMeasurement
                WHERE CampaignId = @CampaignId
            )
            BEGIN

                INSERT INTO dbo.CampaignMeasurement
                (
                    CampaignId,
                    MeasurementStartedBy,
                    MeasurementStartedAt
                )

                VALUES
                (
                    @CampaignId,
                    @StartedBy,
                    GETDATE()
                );

            END
            """,
            new
            {
                CampaignId = campaignId,

                StartedBy =
                    currentUser
            },
            transaction
        );


        transaction.Commit();


        return Results.Ok(
            new
            {
                success = true,

                campaignId,

                statusId = 8,

                status =
                    "Measurement",

                message =
                    "Campaign moved to Measurement successfully."
            }
        );
    }
    catch (Exception ex)
    {
        transaction.Rollback();

        return Results.Problem(
            detail: ex.Message,
            statusCode: 500
        );
    }
});

app.MapGet(
    "/api/campaigns/{campaignId:int}/measurement",
    async (
        int campaignId,
        IConfiguration config,
        HttpContext context
    ) =>
{
    
    var user =
        await GetCurrentAppUserAsync(
            context,
            config
        );


    if (
        user == null ||
        !CanUseDataScience(user)
    )
    {
        return Results.Forbid();
    }


    var currentUser =
        user.WindowsUserName;
    await using var connection =
        new SqlConnection(
            config.GetConnectionString("CampaignDb")
        );

    var data =
        await connection.QueryFirstOrDefaultAsync(
        """
        SELECT
            C.[Campaign ID] AS campaignId,
            C.[Campaign Code] AS campaignCode,
            C.[Campaign Name] AS campaignName,
            C.StatusId AS statusId,

            C.[Expected Baseline Sales]
                AS expectedBaselineSales,

            C.[Expected Incremental Sales]
                AS expectedIncrementalSales,

            C.[Expected ROI]
                AS expectedROI,

            C.Cost AS campaignCost,

            M.MeasurementMethod
                AS measurementMethod,

            M.ControlReference
                AS controlReference,

            M.ActualCampaignSales
                AS actualCampaignSales,

            M.ControlExpectedSales
                AS controlExpectedSales,

            M.ActualIncrementalSales
                AS actualIncrementalSales,

            M.ActualROI
                AS actualROI,

            M.MeasurementNotes
                AS measurementNotes,

            M.MeasurementStartedBy
                AS measurementStartedBy,

            M.MeasurementStartedAt
                AS measurementStartedAt,

            M.MeasuredBy
                AS measuredBy,

            M.MeasuredAt
                AS measuredAt

        FROM dbo.[Campaign Submission Approval] C

        LEFT JOIN dbo.CampaignMeasurement M
            ON C.[Campaign ID] = M.CampaignId

        WHERE C.[Campaign ID] = @CampaignId;
        """,
        new
        {
            CampaignId = campaignId
        }
    );


    if (data == null)
    {
        return Results.NotFound(
            new
            {
                message = "Campaign not found."
            }
        );
    }


    return Results.Ok(data);
});



app.MapPut(
    "/api/campaigns/{campaignId:int}/measurement",
    async (
        int campaignId,
        MeasurementResultRequest request,
        IConfiguration config,
        HttpContext context
    ) =>
{
    var user =
        await GetCurrentAppUserAsync(
            context,
            config
        );


    if (
        user == null ||
        !CanUseDataScience(user)
    )
    {
        return Results.Forbid();
    }


    var currentUser =
        user.WindowsUserName;
    await using var connection =
        new SqlConnection(
            config.GetConnectionString("CampaignDb")
        );

    await connection.OpenAsync();

    using var transaction =
        connection.BeginTransaction();

    try
    {
        var campaign =
            await connection
                .QueryFirstOrDefaultAsync<MeasurementSaveState>(
                """
                SELECT
                    StatusId,
                    Cost
                FROM dbo.[Campaign Submission Approval]
                WHERE [Campaign ID] = @CampaignId;
                """,
                new
                {
                    CampaignId = campaignId
                },
                transaction
            );


        if (campaign == null)
        {
            transaction.Rollback();

            return Results.NotFound(
                new
                {
                    message =
                        "Campaign not found."
                }
            );
        }


        if (campaign.StatusId != 8)
        {
            transaction.Rollback();

            return Results.BadRequest(
                new
                {
                    message =
                        "Campaign must be in Measurement status."
                }
            );
        }


        if (
            request.ActualCampaignSales < 0 ||
            request.ControlExpectedSales < 0
        )
        {
            transaction.Rollback();

            return Results.BadRequest(
                new
                {
                    message =
                        "Sales values cannot be negative."
                }
            );
        }


        var actualIncrementalSales =
            request.ActualCampaignSales -
            request.ControlExpectedSales;


        decimal actualROI = 0;

        if (campaign.Cost > 0)
        {
            actualROI =
                actualIncrementalSales /
                campaign.Cost;
        }


        await connection.ExecuteAsync(
            """
            UPDATE dbo.CampaignMeasurement

            SET
                MeasurementMethod =
                    @MeasurementMethod,

                ControlReference =
                    @ControlReference,

                ActualCampaignSales =
                    @ActualCampaignSales,

                ControlExpectedSales =
                    @ControlExpectedSales,

                ActualIncrementalSales =
                    @ActualIncrementalSales,

                ActualROI =
                    @ActualROI,

                MeasurementNotes =
                    @MeasurementNotes,

                MeasuredBy =
                    @MeasuredBy,

                MeasuredAt =
                    GETDATE()

            WHERE CampaignId =
                @CampaignId;
            """,
            new
            {
                CampaignId = campaignId,

                request.MeasurementMethod,
                request.ControlReference,
                request.ActualCampaignSales,
                request.ControlExpectedSales,

                ActualIncrementalSales =
                    actualIncrementalSales,

                ActualROI =
                    actualROI,

                request.MeasurementNotes,

                MeasuredBy =
                    currentUser
            },
            transaction
        );


        await connection.ExecuteAsync(
            """
            UPDATE dbo.[Campaign Submission Approval]

            SET
                [Updated By] = @UpdatedBy,
                [Updated At] = GETDATE()

            WHERE [Campaign ID] =
                @CampaignId;
            """,
            new
            {
                CampaignId = campaignId,

                UpdatedBy =
                    currentUser
            },
            transaction
        );


        transaction.Commit();


        return Results.Ok(
            new
            {
                success = true,

                campaignId,

                actualIncrementalSales,

                actualROI,

                message =
                    "Measurement results saved successfully."
            }
        );
    }
    catch (Exception ex)
    {
        transaction.Rollback();

        return Results.Problem(
            detail: ex.Message,
            statusCode: 500
        );
    }
});


app.MapPost(
    "/api/campaigns/{campaignId:int}/close",
    async (
        int campaignId,
        CampaignCloseRequest request,
        IConfiguration config,
        HttpContext context
    ) =>
{
        
    var user =
        await GetCurrentAppUserAsync(
            context,
            config
        );


    if (
        user == null ||
        !CanUseDataScience(user)
    )
    {
        return Results.Forbid();
    }


    var currentUser =
        user.WindowsUserName;
    
    await using var connection =
        new SqlConnection(
            config.GetConnectionString("CampaignDb")
        );

    await connection.OpenAsync();

    using var transaction =
        connection.BeginTransaction();

    try
    {
        var campaign =
            await connection.QueryFirstOrDefaultAsync<int?>(
                """
                SELECT StatusId
                FROM dbo.[Campaign Submission Approval]
                WHERE [Campaign ID] = @CampaignId;
                """,
                new
                {
                    CampaignId = campaignId
                },
                transaction
            );


        if (campaign == null)
        {
            transaction.Rollback();

            return Results.NotFound(
                new
                {
                    message =
                        "Campaign not found."
                }
            );
        }


        if (campaign != 8)
        {
            transaction.Rollback();

            return Results.BadRequest(
                new
                {
                    message =
                        "Only campaigns in Measurement can be closed."
                }
            );
        }


        var measurementReady =
            await connection.ExecuteScalarAsync<int>(
                """
                SELECT COUNT(*)
                FROM dbo.CampaignMeasurement

                WHERE CampaignId = @CampaignId

                  AND ActualCampaignSales IS NOT NULL
                  AND ControlExpectedSales IS NOT NULL
                  AND ActualIncrementalSales IS NOT NULL
                  AND ActualROI IS NOT NULL;
                """,
                new
                {
                    CampaignId = campaignId
                },
                transaction
            );


        if (measurementReady == 0)
        {
            transaction.Rollback();

            return Results.BadRequest(
                new
                {
                    message =
                        "Measurement results must be completed before closing the campaign."
                }
            );
        }


        // Save closing information
        await connection.ExecuteAsync(
            """
            UPDATE dbo.CampaignMeasurement

            SET
                WhatWorked =
                    @WhatWorked,

                WhatDidNotWork =
                    @WhatDidNotWork,

                WouldRunAgain =
                    @WouldRunAgain,

                ClosingNotes =
                    @ClosingNotes,

                ClosedBy =
                    @ClosedBy,

                ClosedAt =
                    GETDATE()

            WHERE CampaignId =
                @CampaignId;
            """,
            new
            {
                CampaignId = campaignId,

                request.WhatWorked,
                request.WhatDidNotWork,
                request.WouldRunAgain,
                request.ClosingNotes,

                ClosedBy =
                    currentUser
            },
            transaction
        );


        // Final lifecycle status
        await connection.ExecuteAsync(
            """
            UPDATE dbo.[Campaign Submission Approval]

            SET
                StatusId = 9,
                [Updated By] = @UpdatedBy,
                [Updated At] = GETDATE()

            WHERE [Campaign ID] =
                @CampaignId;
            """,
            new
            {
                CampaignId = campaignId,

                UpdatedBy =
                    currentUser
            },
            transaction
        );


        transaction.Commit();


        return Results.Ok(
            new
            {
                success = true,
                campaignId,
                statusId = 9,
                status = "Closed",

                message =
                    "Campaign closed successfully."
            }
        );
    }
    catch (Exception ex)
    {
        transaction.Rollback();

        return Results.Problem(
            detail: ex.Message,
            statusCode: 500
        );
    }
});


app.MapGet(
    "/api/analytics",
    async (
        IConfiguration config,
        HttpContext context
    ) =>
{
    var user =
        await GetCurrentAppUserAsync(
            context,
            config
        );


    if (
        user == null ||
        !CanUseDataScience(user)
    )
    {
        return Results.Forbid();
    }
    await using var connection =
        new SqlConnection(
            config.GetConnectionString("CampaignDb")
        );


    // ======================================
    // KPI SUMMARY
    // ======================================

    var summary =
        await connection.QueryFirstAsync(
        """
        SELECT

            COUNT(*) AS totalCampaigns,

            SUM(
                CASE
                    WHEN StatusId = 1
                    THEN 1 ELSE 0
                END
            ) AS drafts,

            SUM(
                CASE
                    WHEN StatusId IN (2,4)
                    THEN 1 ELSE 0
                END
            ) AS pendingApproval,

            SUM(
                CASE
                    WHEN StatusId IN (5,6)
                    THEN 1 ELSE 0
                END
            ) AS rejected,

            SUM(
                CASE
                    WHEN StatusId = 7
                    THEN 1 ELSE 0
                END
            ) AS execution,

            SUM(
                CASE
                    WHEN StatusId = 8
                    THEN 1 ELSE 0
                END
            ) AS measurement,

            SUM(
                CASE
                    WHEN StatusId = 9
                    THEN 1 ELSE 0
                END
            ) AS closed

        FROM dbo.[Campaign Submission Approval];
        """
    );


    // ======================================
    // ROI PERFORMANCE
    // ======================================

    var roi =
        await connection.QueryFirstAsync(
        """
        SELECT

            AVG(
                CAST(
                    C.[Expected ROI]
                    AS DECIMAL(18,4)
                )
            ) AS averageExpectedROI,

            AVG(
                M.ActualROI
            ) AS averageActualROI,

            AVG(
                M.ActualROI -
                TRY_CAST(
                    C.[Expected ROI]
                    AS DECIMAL(18,4)
                )
            ) AS averageROIVariance

        FROM dbo.[Campaign Submission Approval] C with(Nolock)

        INNER JOIN dbo.CampaignMeasurement M with(Nolock)
            ON C.[Campaign ID] =
               M.CampaignId

        WHERE
            M.ActualROI IS NOT NULL;
        """
    );


    // ======================================
    // PERFORMANCE BY OBJECTIVE
    // ======================================

    var byObjective =
        await connection.QueryAsync(
        """
        SELECT

            C.Objective AS objective,

            COUNT(*) AS campaignCount,

            AVG(
                TRY_CAST(
                    C.[Expected ROI]
                    AS DECIMAL(18,4)
                )
            ) AS averageExpectedROI,

            AVG(
                TRY_CAST(
                    M.ActualROI
                    AS DECIMAL(18,4)
                )
            ) AS averageActualROI

        FROM dbo.[Campaign Submission Approval] C

        LEFT JOIN dbo.CampaignMeasurement M
            ON C.[Campaign ID] =
               M.CampaignId

        GROUP BY
            C.Objective

        ORDER BY
            campaignCount DESC;
        """
    );


    // ======================================
    // PERFORMANCE BY CHANNEL
    // ======================================

    var byChannel =
        await connection.QueryAsync(
        """
        SELECT

            CH.Channel AS channel,

            COUNT(*) AS campaignCount,

            AVG(
                TRY_CAST(
                    C.[Expected ROI]
                    AS DECIMAL(18,4)
                )
            ) AS averageExpectedROI,

            AVG(
                TRY_CAST(
                    M.ActualROI
                    AS DECIMAL(18,4)
                )
            ) AS averageActualROI
        FROM dbo.[Campaign Submission Approval] C

        LEFT JOIN dbo.LK_CampaignChannel CH
            ON C.ChannelId =
               CH.ChannelId

        LEFT JOIN dbo.CampaignMeasurement M
            ON C.[Campaign ID] =
               M.CampaignId

        GROUP BY
            CH.Channel

        ORDER BY
            campaignCount DESC;
        """
    );


    // ======================================
    // CLOSED CAMPAIGN PERFORMANCE
    // ======================================

    var campaigns =
        await connection.QueryAsync(
        """
        SELECT TOP 20

            C.[Campaign ID]
                AS campaignId,

            C.[Campaign Code]
                AS campaignCode,

            C.[Campaign Name]
                AS campaignName,

            C.Objective
                AS objective,

            CH.Channel
                AS channel,

            C.[Expected Incremental Sales]
                AS expectedIncrementalSales,

            M.ActualIncrementalSales
                AS actualIncrementalSales,

            C.[Expected ROI]
                AS expectedROI,

            M.ActualROI
                AS actualROI,

            (
                M.ActualROI -
                TRY_CAST(
                    C.[Expected ROI]
                    AS DECIMAL(18,4)
                )
            ) AS roiVariance,

            M.WouldRunAgain
                AS wouldRunAgain

        FROM dbo.[Campaign Submission Approval] C  WITH(NOLOCK)

        LEFT JOIN dbo.LK_CampaignChannel CH WITH(NOLOCK)
            ON C.ChannelId =
               CH.ChannelId

        INNER JOIN dbo.CampaignMeasurement M  WITH(NOLOCK)
            ON C.[Campaign ID] =
               M.CampaignId

        WHERE
            M.ActualROI IS NOT NULL

        ORDER BY
            M.MeasuredAt DESC;
        """
    );


    return Results.Ok(
        new
        {
            summary,
            roi,
            byObjective,
            byChannel,
            campaigns
        }
    );
})
.RequireAuthorization();

// From Here -====================

app.MapGet(
    "/api/me",
    async (
        IConfiguration config,
        HttpContext context
    ) =>
{
    if (
        context.User.Identity == null ||
        !context.User.Identity.IsAuthenticated
    )
    {
        return Results.Unauthorized();
    }


    var user =
        await GetCurrentAppUserAsync(
            context,
            config
        );


    // Windows authenticated,
    // but user is not registered in AppUsers
    if (
        user == null ||
        !user.IsActive
    )
    {
        return Results.Json(
            new
            {
                authenticated = true,
                authorized = false,

                userName =
                    context.User.Identity.Name,

                message =
                    "Your account does not have access to this application."
            },
            statusCode: 403
        );
    }


    // Admin automatically receives all permissions
    var isAdmin =
        user.IsAdmin;


    return Results.Ok(
        new
        {
            authenticated = true,
            authorized = true,

            userName =
                user.WindowsUserName,

            displayName =
                string.IsNullOrWhiteSpace(
                    user.DisplayName
                )
                ? user.WindowsUserName
                : user.DisplayName,

            isCampaignUser =
                user.IsCampaignUser ||
                isAdmin,

            isAdmin =
                isAdmin,

            isManager =
                user.IsManager ||
                isAdmin,

            isDirector =
                user.IsDirector ||
                isAdmin,

            isDataScience =
                user.IsDataScience ||
                isAdmin
        }
    );
})
.RequireAuthorization();

// To Here -====================

app.MapGet(
    "/api/admin/config",
    async (
        IConfiguration config,
        HttpContext context) =>
{
    var admin =
        await GetCurrentAdminAsync(
            context,
            config
        );


    if (admin == null)
    {
        return Results.Forbid();
    }

    await using var connection =
        new SqlConnection(
            config.GetConnectionString("CampaignDb")
        );


    var channels =
        await connection.QueryAsync(
        """
        SELECT
            ChannelId AS channelId,
            Channel AS name
        FROM dbo.LK_CampaignChannel
        ORDER BY Channel;
        """
    );


    var targetSegments =
        await connection.QueryAsync(
        """
        SELECT
            TargetSegmentId AS targetSegmentId,
            [Target Segment] AS name
        FROM dbo.LK_CampaignTargetSegment
        ORDER BY [Target Segment];
        """
    );


    var dependencies =
        await connection.QueryAsync(
        """
        SELECT
            DependenciesId AS dependenciesId,
            Dependencies AS name
        FROM dbo.LK_CampaignDependencies
        ORDER BY Dependencies;
        """
    );


    var statuses =
        await connection.QueryAsync(
        """
        SELECT
            StatusId AS statusId,
            Status AS name
        FROM dbo.LK_CampaignStatus
        ORDER BY StatusId;
        """
    );


    return Results.Ok(
        new
        {
            channels,
            targetSegments,
            dependencies,
            statuses
        }
    );
})
.RequireAuthorization();


app.MapPost(
    "/api/admin/channels",
    async (
        AdminLookupRequest request,
        IConfiguration config,
        HttpContext context
    ) =>
{

    var admin =
        await GetCurrentAdminAsync(
            context,
            config
        );


    if (admin == null)
    {
        return Results.Forbid();
    }

    if (string.IsNullOrWhiteSpace(request.Name))
    {
        return Results.BadRequest(
            new { message = "Channel name is required." }
        );
    }


    await using var connection =
        new SqlConnection(
            config.GetConnectionString("CampaignDb")
        );


    var exists =
        await connection.ExecuteScalarAsync<int>(
            """
            SELECT COUNT(*)
            FROM dbo.LK_CampaignChannel
            WHERE Channel = @Name;
            """,
            new
            {
                Name = request.Name.Trim()
            }
        );


    if (exists > 0)
    {
        return Results.BadRequest(
            new { message = "Channel already exists." }
        );
    }


    var id =
        await connection.ExecuteScalarAsync<int>(
            """
            INSERT INTO dbo.LK_CampaignChannel
            (
                Channel
            )
            OUTPUT INSERTED.ChannelId
            VALUES
            (
                @Name
            );
            """,
            new
            {
                Name = request.Name.Trim()
            }
        );


    return Results.Ok(
        new
        {
            success = true,
            channelId = id
        }
    );
})
.RequireAuthorization();







app.MapPut(
    "/api/admin/channels/{id:int}",
    async (
        int id,
        AdminLookupRequest request,
        IConfiguration config,
        HttpContext context
    ) =>
{

    var admin =
        await GetCurrentAdminAsync(
            context,
            config
        );


    if (admin == null)
    {
        return Results.Forbid();
    }

    if (string.IsNullOrWhiteSpace(request.Name))
    {
        return Results.BadRequest(
            new { message = "Channel name is required." }
        );
    }


    await using var connection =
        new SqlConnection(
            config.GetConnectionString("CampaignDb")
        );


    var rows =
        await connection.ExecuteAsync(
            """
            UPDATE dbo.LK_CampaignChannel
            SET Channel = @Name
            WHERE ChannelId = @Id;
            """,
            new
            {
                Id = id,
                Name = request.Name.Trim()
            }
        );


    if (rows == 0)
        return Results.NotFound();


    return Results.Ok(
        new { success = true }
    );
})
.RequireAuthorization();



app.MapPost(
    "/api/admin/segments",
    async (
        AdminLookupRequest request,
        IConfiguration config,
        HttpContext context
    ) =>
{
    var admin =
        await GetCurrentAdminAsync(
            context,
            config
        );


    if (admin == null)
    {
        return Results.Forbid();
    }
    if (string.IsNullOrWhiteSpace(request.Name))
    {
        return Results.BadRequest(
            new { message = "Target Segment is required." }
        );
    }


    await using var connection =
        new SqlConnection(
            config.GetConnectionString("CampaignDb")
        );


    var id =
        await connection.ExecuteScalarAsync<int>(
            """
            INSERT INTO dbo.LK_CampaignTargetSegment
            (
                [Target Segment]
            )
            OUTPUT INSERTED.TargetSegmentId
            VALUES
            (
                @Name
            );
            """,
            new
            {
                Name = request.Name.Trim()
            }
        );


    return Results.Ok(
        new
        {
            success = true,
            targetSegmentId = id
        }
    );
})
.RequireAuthorization();




app.MapPut(
    "/api/admin/segments/{id:int}",
    async (
        int id,
        AdminLookupRequest request,
        IConfiguration config,
        HttpContext context
    ) =>
{
    var admin =
        await GetCurrentAdminAsync(
            context,
            config
        );


    if (admin == null)
    {
        return Results.Forbid();
    }
    await using var connection =
        new SqlConnection(
            config.GetConnectionString("CampaignDb")
        );


    var rows =
        await connection.ExecuteAsync(
            """
            UPDATE dbo.LK_CampaignTargetSegment
            SET [Target Segment] = @Name
            WHERE TargetSegmentId = @Id;
            """,
            new
            {
                Id = id,
                Name = request.Name.Trim()
            }
        );


    if (rows == 0)
        return Results.NotFound();


    return Results.Ok(
        new { success = true }
    );
})
.RequireAuthorization();




app.MapPost(
    "/api/admin/dependencies",
    async (
        AdminLookupRequest request,
        IConfiguration config,
        HttpContext context
    ) =>
{
    var admin =
        await GetCurrentAdminAsync(
            context,
            config
        );


    if (admin == null)
    {
        return Results.Forbid();
    }
    if (string.IsNullOrWhiteSpace(request.Name))
    {
        return Results.BadRequest(
            new { message = "Dependency name is required." }
        );
    }


    await using var connection =
        new SqlConnection(
            config.GetConnectionString("CampaignDb")
        );


    var id =
        await connection.ExecuteScalarAsync<int>(
            """
            INSERT INTO dbo.LK_CampaignDependencies
            (
                Dependencies
            )
            OUTPUT INSERTED.DependenciesId
            VALUES
            (
                @Name
            );
            """,
            new
            {
                Name = request.Name.Trim()
            }
        );


    return Results.Ok(
        new
        {
            success = true,
            dependenciesId = id
        }
    );
})
.RequireAuthorization();


app.MapPut(
    "/api/admin/dependencies/{id:int}",
    async (
        int id,
        AdminLookupRequest request,
        IConfiguration config,
        HttpContext context
    ) =>
{
    var admin =
        await GetCurrentAdminAsync(
            context,
            config
        );


    if (admin == null)
    {
        return Results.Forbid();
    }
    await using var connection =
        new SqlConnection(
            config.GetConnectionString("CampaignDb")
        );


    var rows =
        await connection.ExecuteAsync(
            """
            UPDATE dbo.LK_CampaignDependencies
            SET Dependencies = @Name
            WHERE DependenciesId = @Id;
            """,
            new
            {
                Id = id,
                Name = request.Name.Trim()
            }
        );


    if (rows == 0)
        return Results.NotFound();


    return Results.Ok(
        new { success = true }
    );
})
.RequireAuthorization();

app.MapGet(
    "/api/admin/users",
    async (
        IConfiguration config,
        HttpContext context
    ) =>
{
     
    var admin =
        await GetCurrentAppUserAsync(
            context,
            config
        );


    if (
        admin == null ||
        !admin.IsActive ||
        !admin.IsAdmin
    )
    {
        return Results.Forbid();
    }


    await using var connection =
        new SqlConnection(
            config.GetConnectionString(
                "CampaignDb"
            )
        );


    var users =
        await connection.QueryAsync(
        """
        SELECT
            AppUserId AS appUserId,
            WindowsUserName AS windowsUserName,
            DisplayName AS displayName,

            IsCampaignUser AS isCampaignUser,
            IsManager AS isManager,
            IsDirector AS isDirector,
            IsDataScience AS isDataScience,
            IsAdmin AS isAdmin,
            IsActive AS isActive,

            CreatedBy AS createdBy,
            CreatedAt AS createdAt,
            UpdatedBy AS updatedBy,
            UpdatedAt AS updatedAt

        FROM dbo.AppUsers

        ORDER BY
            DisplayName,
            WindowsUserName;
        """
    );


    return Results.Ok(users);
})
.RequireAuthorization();



app.MapPost(
    "/api/admin/users",
    async (
        AdminUserRequest request,
        IConfiguration config,
        HttpContext context
    ) =>
{
    var admin =
        await GetCurrentAppUserAsync(
            context,
            config
        );


    if (
        admin == null ||
        !admin.IsActive ||
        !admin.IsAdmin
    )
    {
        return Results.Forbid();
    }


    if (
        string.IsNullOrWhiteSpace(
            request.WindowsUserName
        )
    )
    {
        return Results.BadRequest(
            new
            {
                message =
                    "Windows User Name is required."
            }
        );
    }


    await using var connection =
        new SqlConnection(
            config.GetConnectionString(
                "CampaignDb"
            )
        );


    var exists =
        await connection.ExecuteScalarAsync<int>(
        """
        SELECT COUNT(*)
        FROM dbo.AppUsers
        WHERE WindowsUserName =
            @WindowsUserName;
        """,
        new
        {
            WindowsUserName =
                request.WindowsUserName.Trim()
        }
    );


    if (exists > 0)
    {
        return Results.BadRequest(
            new
            {
                message =
                    "This user already exists."
            }
        );
    }


    var id =
        await connection.ExecuteScalarAsync<int>(
        """
        INSERT INTO dbo.AppUsers
        (
            WindowsUserName,
            DisplayName,

            IsCampaignUser,
            IsManager,
            IsDirector,
            IsDataScience,
            IsAdmin,
            IsActive,

            CreatedBy,
            CreatedAt
        )

        OUTPUT INSERTED.AppUserId

        VALUES
        (
            @WindowsUserName,
            @DisplayName,

            @IsCampaignUser,
            @IsManager,
            @IsDirector,
            @IsDataScience,
            @IsAdmin,
            @IsActive,

            @CreatedBy,
            GETDATE()
        );
        """,
        new
        {
            WindowsUserName =
                request.WindowsUserName.Trim(),

            request.DisplayName,

            request.IsCampaignUser,
            request.IsManager,
            request.IsDirector,
            request.IsDataScience,
            request.IsAdmin,
            request.IsActive,

            CreatedBy =
                admin.WindowsUserName
        }
    );


    return Results.Ok(
        new
        {
            success = true,
            appUserId = id
        }
    );
})
.RequireAuthorization();

app.MapPut(
    "/api/admin/users/{id:int}",
    async (
        int id,
        AdminUserRequest request,
        IConfiguration config,
        HttpContext context
    ) =>
{
    var admin =
        await GetCurrentAppUserAsync(
            context,
            config
        );


    if (
        admin == null ||
        !admin.IsActive ||
        !admin.IsAdmin
    )
    {
        return Results.Forbid();
    }


    await using var connection =
        new SqlConnection(
            config.GetConnectionString(
                "CampaignDb"
            )
        );


    var rows =
        await connection.ExecuteAsync(
        """
        UPDATE dbo.AppUsers

        SET
            WindowsUserName =
                @WindowsUserName,

            DisplayName =
                @DisplayName,

            IsCampaignUser =
                @IsCampaignUser,

            IsManager =
                @IsManager,

            IsDirector =
                @IsDirector,

            IsDataScience =
                @IsDataScience,

            IsAdmin =
                @IsAdmin,

            IsActive =
                @IsActive,

            UpdatedBy =
                @UpdatedBy,

            UpdatedAt =
                GETDATE()

        WHERE AppUserId =
            @AppUserId;
        """,
        new
        {
            AppUserId = id,

            WindowsUserName =
                request.WindowsUserName.Trim(),

            request.DisplayName,

            request.IsCampaignUser,
            request.IsManager,
            request.IsDirector,
            request.IsDataScience,
            request.IsAdmin,
            request.IsActive,

            UpdatedBy =
                admin.WindowsUserName
        }
    );


    if (rows == 0)
        return Results.NotFound();


    return Results.Ok(
        new
        {
            success = true
        }
    );
})
.RequireAuthorization();



app.Run();


record LookupItem(int Id, string Name);

record StoreItem(int Id, string Name, string? Country);


record CampaignRequest(
    string CampaignName,
    string Owner,
    string Objective,
    string CampaignBrief,
    decimal ExpectedBaselineSales,
    decimal ExpectedUpliftPct,
    decimal ExpectedIncrementalSale,
    decimal ExpectedROI,
    decimal Cost,
    LookupItem Channel,
    List<LookupItem> TargetSegments,
    List<StoreItem> Stores,
    List<LookupItem> Dependencies,
    DateTime StartDate,
    DateTime EndDate,
    bool SaveAsDraft = false
);


record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}


record ApprovalDecisionRequest(
    string Decision,
    string? Reason 
);

record CampaignState(
    int StatusId,
    string CampaignCode
);


record MeasurementCampaignState(
    int StatusId,
    DateTime EndDate
);

record MeasurementResultRequest(
    string MeasurementMethod,
    string? ControlReference,
    decimal ActualCampaignSales,
    decimal ControlExpectedSales,
    string? MeasurementNotes
);


record MeasurementSaveState(
    int StatusId,
    decimal Cost
);


record CampaignCloseRequest(
    string? WhatWorked,
    string? WhatDidNotWork,
    bool WouldRunAgain,
    string? ClosingNotes 
);

record AdminLookupRequest(
    string Name
);

record AppUserAccess(
    int AppUserId,
    string WindowsUserName,
    string? DisplayName,
    bool IsCampaignUser,
    bool IsManager,
    bool IsDirector,
    bool IsDataScience,
    bool IsAdmin,
    bool IsActive
);

record AdminUserRequest(
    string WindowsUserName,
    string? DisplayName,
    bool IsCampaignUser,
    bool IsManager,
    bool IsDirector,
    bool IsDataScience,
    bool IsAdmin,
    bool IsActive
);