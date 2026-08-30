let approvals = [];


document.addEventListener(
    "DOMContentLoaded",
    loadApprovals
);


async function loadApprovals() {

    try {

        const response =
            await fetch(
                "/api/approvals/pending"
            );


        if (!response.ok) {

            throw new Error(
                "Unable to load approvals."
            );

        }


        approvals =
            await response.json();


        document.getElementById(
            "pendingCount"
        ).textContent =
            approvals.length;


        loadFilters();

        renderApprovals(
            approvals
        );

    }
    catch (error) {

        console.error(error);

        alert(
            "Unable to load Pending Approvals."
        );

    }

}


function loadFilters() {

    loadDropdown(
        "objectiveFilter",
        approvals.map(
            x => x.objective
        )
    );


    loadDropdown(
        "channelFilter",
        approvals.map(
            x => x.channel
        )
    );

}


function loadDropdown(
    elementId,
    values
) {

    const dropdown =
        document.getElementById(
            elementId
        );


    const uniqueValues =
        [...new Set(
            values.filter(Boolean)
        )]
        .sort();


    uniqueValues.forEach(value => {

        const option =
            document.createElement(
                "option"
            );

        option.value =
            value;

        option.textContent =
            value;

        dropdown.appendChild(
            option
        );

    });

}


function filterApprovals() {

    const search =
        document
            .getElementById(
                "approvalSearch"
            )
            .value
            .toLowerCase();


    const objective =
        document.getElementById(
            "objectiveFilter"
        ).value;


    const channel =
        document.getElementById(
            "channelFilter"
        ).value;


    const filtered =
        approvals.filter(
            campaign => {

                const searchMatch =

                    (
                        campaign.campaignCode ||
                        ""
                    )
                    .toLowerCase()
                    .includes(search)

                    ||

                    (
                        campaign.campaignName ||
                        ""
                    )
                    .toLowerCase()
                    .includes(search)

                    ||

                    (
                        campaign.owner ||
                        ""
                    )
                    .toLowerCase()
                    .includes(search);


                const objectiveMatch =

                    !objective ||

                    campaign.objective
                        === objective;


                const channelMatch =

                    !channel ||

                    campaign.channel
                        === channel;


                return (
                    searchMatch &&
                    objectiveMatch &&
                    channelMatch
                );

            }
        );


    renderApprovals(
        filtered
    );

}


function renderApprovals(list) {

    const tbody =
        document.getElementById(
            "approvalTableBody"
        );


    const empty =
        document.getElementById(
            "noApprovalMessage"
        );


    tbody.innerHTML = "";


    if (!list.length) {

        empty.style.display =
            "block";

        return;

    }


    empty.style.display =
        "none";


    list.forEach(
        campaign => {

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>

                    <strong>
                        ${campaign.campaignCode}
                    </strong>

                    <div class="table-secondary">
                        ${campaign.campaignName}
                    </div>

                </td>


                <td>
                    ${campaign.owner || "-"}
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

                    →

                    ${formatDate(
                        campaign.endDate
                    )}

                </td>


                <td>
                    ${formatNumber(
                        campaign.cost
                    )}
                </td>


                <td>

                    <strong>
                        ${formatNumber(
                            campaign.expectedROI
                        )}
                    </strong>

                </td>


                <td>

                    <span class="
                        status
                        status-pending">

                        ${campaign.status}

                    </span>

                </td>


                <td>

                    <button
                        class="btn-review"
                        onclick="
                            reviewCampaign(
                                ${campaign.campaignId}
                            )
                        ">

                        Review

                    </button>

                </td>

            `;


            tbody.appendChild(
                row
            );

        }
    );

}


function reviewCampaign(
    campaignId
) {

    window.location.href =
        `campaign-details.html?id=${campaignId}&mode=approval`;

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