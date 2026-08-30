document.addEventListener(
    "DOMContentLoaded",
    loadDashboard
);


async function loadDashboard() {

    try {

        const response =
            await fetch(
                "/api/dashboard"
            );


        if (!response.ok) {

            throw new Error(
                "Unable to load dashboard."
            );

        }


        const data =
            await response.json();


        renderSummary(
            data.summary
        );


        renderRecentCampaigns(
            data.recentCampaigns || []
        );

    }
    catch (error) {

        console.error(
            "Dashboard Error:",
            error
        );

        alert(
            "Unable to load Dashboard data."
        );

    }

}



function renderSummary(summary) {

    setText(
        "totalCampaigns",
        summary.totalCampaigns
    );


    setText(
        "pendingApprovals",
        summary.pendingApprovals
    );


    setText(
        "approvedCampaigns",
        summary.approvedCampaigns
    );


    setText(
        "activeCampaigns",
        summary.activeCampaigns
    );


    setText(
        "rejectedCampaigns",
        summary.rejectedCampaigns
    );

}



function renderRecentCampaigns(
    campaigns
) {

    const tbody =
        document.getElementById(
            "recentCampaignBody"
        );


    const empty =
        document.getElementById(
            "noRecentCampaigns"
        );


    tbody.innerHTML = "";


    if (!campaigns.length) {

        empty.style.display =
            "block";

        return;

    }


    empty.style.display =
        "none";


    campaigns.forEach(
        campaign => {

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>

                    <strong>
                        ${campaign.campaignCode || "-"}
                    </strong>

                </td>


                <td>
                    ${campaign.campaignName || "-"}
                </td>


                <td>
                    ${campaign.objective || "-"}
                </td>


                <td>
                    ${campaign.channel || "-"}
                </td>


                <td>
                    ${formatDate(
                        campaign.startDate
                    )}
                </td>


                <td>

                    ${getStatusBadge(
                        campaign
                    )}

                </td>


                <td>

                    <button
                        class="table-action"
                        onclick="
                            viewCampaign(
                                ${campaign.campaignId}
                            )
                        ">

                        View

                    </button>

                </td>

            `;


            tbody.appendChild(
                row
            );

        }
    );

}



function getStatusBadge(
    campaign
) {

    if (campaign.isActive) {

        return `
            <span class="
                status
                status-active">

                Active

            </span>
        `;

    }


    const statusId =
        Number(
            campaign.statusId
        );


    let cssClass =
        "status-closed";


    switch (statusId) {

        case 1:

            cssClass =
                "status-draft";

            break;


        case 2:

        case 4:

            cssClass =
                "status-pending";

            break;


        case 3:

            cssClass =
                "status-approved";

            break;


        case 5:

        case 6:

            cssClass =
                "status-rejected";

            break;

    }


    return `
        <span class="
            status
            ${cssClass}">

            ${campaign.status || "-"}

        </span>
    `;

}



function viewCampaign(
    campaignId
) {

    window.location.href =
        `campaign-details.html?id=${campaignId}`;

}



function setText(
    id,
    value
) {

    document
        .getElementById(id)
        .textContent =
        value ?? 0;

}



function formatDate(
    value
) {

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