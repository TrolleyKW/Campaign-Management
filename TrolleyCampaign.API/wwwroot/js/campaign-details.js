document.addEventListener(
    "DOMContentLoaded",
    loadCampaign
);


async function loadCampaign() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const campaignId =
        params.get("id");


    if (!campaignId) {

        alert("Campaign ID is missing.");

        window.location.href =
            "my-campaigns.html";

        return;
    }


    try {

        const response =
            await fetch(
                `/api/campaigns/${campaignId}`
            );


        if (!response.ok)
            throw new Error(
                "Campaign not found."
            );


        const data =
            await response.json();


        renderCampaign(data);

    }
    catch (error) {

        console.error(error);

        alert(
            "Unable to load Campaign Details."
        );

    }
}


function renderCampaign(data) {

    const c = data.campaign;

    showMeasurementActions(c);
    showExecutionActions(c);
    

    setText(
        "campaignName",
        c.campaignName
    );

    setText(
        "campaignCode",
        c.campaignCode
    );

    setText(
        "owner",
        c.owner
    );

    setText(
        "objective",
        c.objective
    );

    setText(
        "channel",
        c.channel
    );

    setText(
        "campaignBrief",
        c.campaignBrief
    );


    setText(
        "campaignPeriod",
        `${formatDate(c.startDate)}
         → ${formatDate(c.endDate)}`
    );


    setText(
        "baselineSales",
        formatNumber(
            c.expectedBaselineSales
        )
    );


    setText(
        "upliftPct",
        `${formatNumber(
            c.expectedUpliftPct
        )}%`
    );


    setText(
        "incrementalSales",
        formatNumber(
            c.expectedIncrementalSale
        )
    );


    setText(
        "campaignCost",
        formatNumber(
            c.cost
        )
    );


    setText(
        "expectedROI",
        formatNumber(
            c.expectedROI
        )
    );


    document.getElementById(
        "campaignStatus"
    ).innerHTML =
        getStatusBadge(
            c.statusId,
            c.status
        );


    renderSegments(
        data.targetSegments || []
    );


    renderStores(
        data.stores || []
    );


    renderDependencies(
        data.dependencies || []
    );


    renderApprovalHistory(
        data.approvalHistory || []
    );


    const params =
    new URLSearchParams(
        window.location.search
    );

    const mode =
        params.get("mode");


    if (
        mode === "approval" &&
        (
            Number(c.statusId) === 2 ||
            Number(c.statusId) === 4
        )
    ) {
        document.getElementById(
            "approvalPanel"
        ).style.display = "block";
    }
}



function showMeasurementActions(campaign) {

    const panel =
        document.getElementById(
            "measurementPanel"
        );


    if (!panel)
        return;


    panel.style.display =
        Number(campaign.statusId) === 8
            ? "block"
            : "none";

}


function openMeasurement() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const campaignId =
        params.get("id");


    window.location.href =
        `measurement.html?id=${campaignId}`;

}

function showExecutionActions(campaign) {

    const panel =
        document.getElementById(
            "executionPanel"
        );


    if (!panel)
        return;


    if (
        Number(campaign.statusId) !== 7
    ) {
        panel.style.display =
            "none";

        return;
    }


    const endDate =
        new Date(
            campaign.endDate
        );


    const today =
        new Date();


    today.setHours(
        0, 0, 0, 0
    );

    endDate.setHours(
        0, 0, 0, 0
    );


    if (endDate < today) {

        panel.style.display =
            "block";

    }
    else {

        panel.style.display =
            "none";

    }

}


async function startMeasurement() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const campaignId =
        params.get("id");


    if (
        !confirm(
            "Move this campaign to Measurement?"
        )
    ) {
        return;
    }


    try {

        const response =
            await fetch(
                `/api/campaigns/${campaignId}/measurement/start`,
                {
                    method: "POST"
                }
            );


        const responseText =
            await response.text();


        let result = {};


        try {

            result =
                JSON.parse(
                    responseText
                );

        }
        catch {

            result.message =
                responseText;

        }


        if (!response.ok) {

            alert(
                "Unable to start Measurement.\n\n" +
                (
                    result.message ||
                    responseText
                )
            );

            return;
        }


        alert(
            "Campaign moved to Measurement successfully."
        );


        window.location.reload();

    }
    catch (error) {

        console.error(
            error
        );


        alert(
            "Unable to start Measurement.\n\n" +
            error.message
        );

    }

}

async function submitDecision(decision) {

    console.log(
        "Approval clicked:",
        decision
    );

    const params =
        new URLSearchParams(
            window.location.search
        );

    const campaignId =
        params.get("id");


    const reason =
        document
            .getElementById(
                "decisionReason"
            )
            .value
            .trim();


    if (
        decision === "reject" &&
        !reason
    ) {

        alert(
            "Rejection reason is mandatory."
        );

        return;
    }


    const confirmMessage =
        decision === "approve"
            ? "Are you sure you want to approve this campaign?"
            : "Are you sure you want to reject this campaign?";


    if (!confirm(confirmMessage)) {
        return;
    }


    try {

        const response =
            await fetch(
                `/api/campaigns/${campaignId}/decision`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            decision: decision,
                            reason: reason
                            
                        })
                }
            );


        const responseText =
            await response.text();


        console.log(
            "Approval HTTP Status:",
            response.status
        );

        console.log(
            "Approval API Response:",
            responseText
        );


        let result = {};

        if (responseText) {

            try {
                result =
                    JSON.parse(
                        responseText
                    );
            }
            catch {
                result = {
                    message:
                        responseText
                };
            }

        }


        if (!response.ok) {

            alert(
                "Approval failed.\n\n" +
                "HTTP Status: " +
                response.status +
                "\n\n" +
                (
                    result.message ||
                    responseText
                )
            );

            return;
        }


        alert(
            "Campaign updated successfully!\n\n" +
            "New Status: " +
            result.status
        );


        window.location.href =
            "approvals.html";

    }
    catch (error) {

        console.error(
            "Approval Error:",
            error
        );

        alert(
            "Unable to process approval.\n\n" +
            error.message
        );

    }

}





function renderSegments(segments) {

    const container =
        document.getElementById(
            "targetSegments"
        );


    if (!segments.length) {

        container.innerHTML =
            "<span>No Target Segments</span>";

        return;
    }


    container.innerHTML =
        segments
            .map(x =>
                `<span class="detail-tag">
                    ${x.name}
                 </span>`
            )
            .join("");
}


function renderStores(stores) {

    const tbody =
        document.getElementById(
            "storesBody"
        );


    document.getElementById(
        "storeCount"
    ).textContent =
        `(${stores.length})`;


    if (!stores.length) {

        tbody.innerHTML =
            `
            <tr>
                <td colspan="3">
                    No Stores Selected
                </td>
            </tr>
            `;

        return;
    }


    tbody.innerHTML =
        stores
            .map(store =>
            `
            <tr>

                <td>
                    ${store.id}
                </td>

                <td>
                    ${store.name}
                </td>

                <td>
                    ${store.country}
                </td>

            </tr>
            `
            )
            .join("");
}


function renderDependencies(items) {

    const container =
        document.getElementById(
            "dependencies"
        );


    if (!items.length) {

        container.innerHTML =
            "<span>No Dependencies</span>";

        return;
    }


    container.innerHTML =
        items
            .map(x =>
                `<span class="detail-tag">
                    ${x.name}
                 </span>`
            )
            .join("");
}


function renderApprovalHistory(history) {

    const container =
        document.getElementById(
            "approvalHistory"
        );


    if (!history.length) {

        container.innerHTML =
            "<div>No Approval History</div>";

        return;
    }


    container.innerHTML =
        history
            .map(item =>
            `
            <div class="timeline-item">

                <div class="timeline-dot">
                </div>

                <div class="timeline-content">

                    <strong>
                        ${item.approvalStage || ""}
                    </strong>

                    <div>
                        ${item.decisionReason || ""}
                    </div>

                    <small>
                        ${item.decisionBy || ""}
                        •
                        ${formatDateTime(
                            item.decisionAt
                        )}
                    </small>

                </div>

            </div>
            `
            )
            .join("");
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


function setText(id, value) {

    document.getElementById(id)
        .textContent =
        value ?? "-";
}


function formatDate(value) {

    if (!value)
        return "-";


    return new Date(value)
        .toLocaleDateString(
            "en-GB",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );
}


function formatDateTime(value) {

    if (!value)
        return "-";


    return new Date(value)
        .toLocaleString(
            "en-GB"
        );
}


function formatNumber(value) {

    if (
        value === null ||
        value === undefined
    )
        return "-";


    return Number(value)
        .toLocaleString(
            "en-US",
            {
                maximumFractionDigits: 2
            }
        );
}