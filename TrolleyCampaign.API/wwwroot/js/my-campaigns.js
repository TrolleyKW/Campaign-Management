let campaigns = [];


document.addEventListener(
    "DOMContentLoaded",
    async function () {

        try {

            const response =
                await fetch("/api/campaigns");


            if (!response.ok) {

                throw new Error(
                    "Unable to load campaigns."
                );

            }


            campaigns =
                await response.json();


            loadStatusFilter();

            loadObjectiveFilter();

            renderCampaigns(campaigns);

        }
        catch (error) {

            console.error(error);

            alert(
                "Unable to load Campaigns from SQL Server."
            );

        }

    }
);


function loadStatusFilter() {

    const statuses =
        [...new Set(
            campaigns
                .map(x => x.status)
                .filter(Boolean)
        )]
        .sort();


    const dropdown =
        document.getElementById(
            "statusFilter"
        );


    statuses.forEach(status => {

        const option =
            document.createElement("option");

        option.value =
            status;

        option.textContent =
            status;

        dropdown.appendChild(option);

    });

}


function loadObjectiveFilter() {

    const objectives =
        [...new Set(
            campaigns
                .map(x => x.objective)
                .filter(Boolean)
        )]
        .sort();


    const dropdown =
        document.getElementById(
            "objectiveFilter"
        );


    objectives.forEach(objective => {

        const option =
            document.createElement("option");

        option.value =
            objective;

        option.textContent =
            objective;

        dropdown.appendChild(option);

    });

}


function filterCampaigns() {

    const search =
        document
            .getElementById("campaignSearch")
            .value
            .toLowerCase();


    const status =
        document.getElementById(
            "statusFilter"
        ).value;


    const objective =
        document.getElementById(
            "objectiveFilter"
        ).value;


    const filtered =
        campaigns.filter(campaign => {

            const searchMatch =

                (campaign.campaignCode || "")
                    .toLowerCase()
                    .includes(search)

                ||

                (campaign.campaignName || "")
                    .toLowerCase()
                    .includes(search);


            const statusMatch =

                !status ||

                campaign.status === status;


            const objectiveMatch =

                !objective ||

                campaign.objective === objective;


            return (
                searchMatch &&
                statusMatch &&
                objectiveMatch
            );

        });


    renderCampaigns(filtered);

}


function renderCampaigns(list) {

    const tbody =
        document.getElementById(
            "campaignTableBody"
        );


    const emptyMessage =
        document.getElementById(
            "noCampaignMessage"
        );


    tbody.innerHTML = "";


    if (list.length === 0) {

        emptyMessage.style.display =
            "block";

        return;

    }


    emptyMessage.style.display =
        "none";


    list.forEach(campaign => {

        const row =
            document.createElement("tr");


        row.innerHTML = `

            <td>
                <strong>
                    ${campaign.campaignCode || ""}
                </strong>
            </td>

            <td>
                ${campaign.campaignName || ""}
            </td>

            <td>
                ${campaign.objective || ""}
            </td>

            <td>
                ${campaign.channel || ""}
            </td>

            <td>
                ${formatDate(campaign.startDate)}
            </td>

            <td>
                ${formatDate(campaign.endDate)}
            </td>

            <td>
                ${getStatusBadge(
                    campaign.statusId,
                    campaign.status
                )}
            </td>

            <td>

                ${
                    Number(campaign.statusId) === 1

                    ?

                    `
                    <button
                        class="table-action"
                        onclick="editCampaign(${campaign.campaignId})">

                        Edit Draft

                    </button>
                    `

                    :

                    (
                        Number(campaign.statusId) === 5 ||
                        Number(campaign.statusId) === 6
                    )

                    ?

                    `
                    <button
                        class="table-action"
                        onclick="editCampaign(${campaign.campaignId})">

                        Revise & Resubmit

                    </button>
                    `

                    :

                    `
                    <button
                        class="table-action"
                        onclick="viewCampaign(${campaign.campaignId})">

                        View

                    </button>
                    `
                }

            </td>

        `;


        tbody.appendChild(row);

    });

}


async function editCampaign(campaignId) {

    try {

        const response =
            await fetch(
                `/api/campaigns/${campaignId}`
            );


        if (!response.ok) {

            alert(
                "Unable to load Draft."
            );

            return;
        }


        const data =
            await response.json();


        const c =
            data.campaign;


        // Remember which existing Campaign
        // we are editing
        sessionStorage.setItem(
            "editingCampaignId",
            campaignId
        );


        // --------------------------------
        // STEP 1 - Campaign Details
        // --------------------------------

        sessionStorage.setItem(
            "campaignName",
            c.campaignName || ""
        );

        sessionStorage.setItem(
            "owner",
            c.owner || ""
        );

        sessionStorage.setItem(
            "objective",
            c.objective || ""
        );

        sessionStorage.setItem(
            "campaignBrief",
            c.campaignBrief || ""
        );


        // --------------------------------
        // STEP 2 - Business Case
        // --------------------------------

        sessionStorage.setItem(
            "baselineSales",
            c.expectedBaselineSales ?? ""
        );

        sessionStorage.setItem(
            "upliftPct",
            c.expectedUpliftPct ?? ""
        );

        sessionStorage.setItem(
            "incrementalSales",
            c.expectedIncrementalSale ?? ""
        );

        sessionStorage.setItem(
            "campaignCost",
            c.cost ?? ""
        );

        sessionStorage.setItem(
            "expectedROI",
            c.expectedROI ?? ""
        );


        // --------------------------------
        // STEP 3 - Channel
        // --------------------------------

        sessionStorage.setItem(
            "channel",
            JSON.stringify({
                id: c.channelId,
                name: c.channel
            })
        );


        // --------------------------------
        // STEP 3 - Target Segments
        // --------------------------------

        sessionStorage.setItem(
            "targetSegments",
            JSON.stringify(
                data.targetSegments || []
            )
        );


        // --------------------------------
        // STEP 4 - Stores
        // --------------------------------

        sessionStorage.setItem(
            "selectedStores",
            JSON.stringify(
                data.stores || []
            )
        );


        // --------------------------------
        // STEP 5 - Dependencies
        // --------------------------------

        sessionStorage.setItem(
            "dependencies",
            JSON.stringify(
                data.dependencies || []
            )
        );


        // --------------------------------
        // STEP 5 - Dates
        // --------------------------------

        sessionStorage.setItem(
            "startDate",
            toDateInput(
                c.startDate
            )
        );

        sessionStorage.setItem(
            "endDate",
            toDateInput(
                c.endDate
            )
        );


        // Open Wizard Step 1
        window.location.href =
            "new-campaign.html";

    }
    catch (error) {

        console.error(
            "Edit Draft Error:",
            error
        );

        alert(
            "Unable to load Draft Campaign."
        );

    }

}

function toDateInput(value) {

    if (!value)
        return "";

    return value.substring(0, 10);

}

function getStatusBadge(
    statusId,
    status
) {

    let cssClass =
        "status-closed";


    switch (Number(statusId)) {

        case 1:

            cssClass =
                "status-draft";

            break;


        case 2:

            cssClass =
                "status-pending";

            break;


        case 7:

            cssClass =
                "status-active";

            break;


        case 8:

            cssClass =
                "status-measurement";

            break;

        case 9:

            cssClass =
                "status-closed";

            break;
        case 4:
        case 6:

            cssClass =
                "status-rejected";

            break;

    }


    return `
        <span class="status ${cssClass}">
            ${status || ""}
        </span>
    `;

}


function formatDate(value) {

    if (!value)
        return "-";


    const date =
        new Date(value);


    return date.toLocaleDateString(
        "en-GB",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


function viewCampaign(campaignId) {

    window.location.href =
        `campaign-details.html?id=${campaignId}`;

}