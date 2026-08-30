document.addEventListener(
    "DOMContentLoaded",
    loadAnalytics
);


async function loadAnalytics() {

    try {

        const response =
            await fetch(
                "/api/analytics"
            );


        if (!response.ok) {

            throw new Error(
                await response.text()
            );

        }


        const data =
            await response.json();


        renderSummary(
            data.summary
        );


        renderROI(
            data.roi
        );


        renderObjective(
            data.byObjective || []
        );


        renderChannel(
            data.byChannel || []
        );


        renderCampaignPerformance(
            data.campaigns || []
        );


        renderLifecycleChart(
            data.summary
        );

        renderObjectiveChart(
            data.byObjective || []
        );

        renderChannelChart(
            data.byChannel || []
        );

        renderROIChart(
            data.campaigns || []
        );

    }
    catch (error) {

        console.error(
            "Analytics Error:",
            error
        );


        alert(
            "Unable to load Analytics.\n\n" +
            error.message
        );

    }

}



function renderSummary(summary) {

    setText(
        "totalCampaigns",
        summary.totalCampaigns
    );


    setText(
        "pendingApproval",
        summary.pendingApproval
    );


    setText(
        "rejectedCampaigns",
        summary.rejected
    );


    setText(
        "executionCampaigns",
        summary.execution
    );


    setText(
        "measurementCampaigns",
        summary.measurement
    );


    setText(
        "closedCampaigns",
        summary.closed
    );

}



function renderROI(roi) {

    setText(
        "averageExpectedROI",
        formatROI(
            roi.averageExpectedROI
        )
    );


    setText(
        "averageActualROI",
        formatROI(
            roi.averageActualROI
        )
    );


    setText(
        "averageROIVariance",
        formatSignedROI(
            roi.averageROIVariance
        )
    );

}



function renderObjective(items) {

    const tbody =
        document.getElementById(
            "objectiveBody"
        );


    tbody.innerHTML = "";


    items.forEach(item => {

        const row =
            document.createElement(
                "tr"
            );


        row.innerHTML = `

            <td>
                ${item.objective || "-"}
            </td>

            <td>
                ${item.campaignCount || 0}
            </td>

            <td>
                ${formatROI(
                    item.averageExpectedROI
                )}
            </td>

            <td>
                ${formatROI(
                    item.averageActualROI
                )}
            </td>

        `;


        tbody.appendChild(
            row
        );

    });

}



function renderChannel(items) {

    const tbody =
        document.getElementById(
            "channelBody"
        );


    tbody.innerHTML = "";


    items.forEach(item => {

        const row =
            document.createElement(
                "tr"
            );


        row.innerHTML = `

            <td>
                ${item.channel || "-"}
            </td>

            <td>
                ${item.campaignCount || 0}
            </td>

            <td>
                ${formatROI(
                    item.averageExpectedROI
                )}
            </td>

            <td>
                ${formatROI(
                    item.averageActualROI
                )}
            </td>

        `;


        tbody.appendChild(
            row
        );

    });

}



function renderCampaignPerformance(
    campaigns
) {

    const tbody =
        document.getElementById(
            "performanceBody"
        );


    tbody.innerHTML = "";


    if (!campaigns.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="9">
                    No measured campaigns available.
                </td>
            </tr>
        `;

        return;

    }


    campaigns.forEach(
        campaign => {

            const row =
                document.createElement(
                    "tr"
                );


            const variance =
                Number(
                    campaign.roiVariance
                ) || 0;


            row.innerHTML = `

                <td>

                    <strong>
                        ${campaign.campaignCode || ""}
                    </strong>

                    <div class="table-secondary">
                        ${campaign.campaignName || ""}
                    </div>

                </td>


                <td>
                    ${campaign.objective || "-"}
                </td>


                <td>
                    ${campaign.channel || "-"}
                </td>


                <td>
                    ${formatNumber(
                        campaign.expectedIncrementalSales
                    )}
                </td>


                <td>
                    ${formatNumber(
                        campaign.actualIncrementalSales
                    )}
                </td>


                <td>
                    ${formatROI(
                        campaign.expectedROI
                    )}
                </td>


                <td>
                    ${formatROI(
                        campaign.actualROI
                    )}
                </td>


                <td class="${
                    variance >= 0
                        ? "positive-value"
                        : "negative-value"
                }">

                    ${formatSignedROI(
                        variance
                    )}

                </td>


                <td>
                    ${formatRunAgain(
                        campaign.wouldRunAgain
                    )}
                </td>

            `;


            tbody.appendChild(
                row
            );

        }
    );

}



function formatRunAgain(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "-";

    }


    return value
        ? "Yes"
        : "No";

}



function formatROI(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "-";

    }


    return Number(
        value
    ).toFixed(2) +
        " x";

}



function formatSignedROI(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "-";

    }


    const number =
        Number(value);


    return (
        number >= 0
            ? "+"
            : ""
    ) +
        number.toFixed(2) +
        " x";

}



function formatNumber(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "-";

    }


    return Number(
        value
    ).toLocaleString(
        "en-US",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );

}



function setText(
    id,
    value
) {

    document.getElementById(
        id
    ).textContent =
        value ?? "-";

}

// Campaign Lifecycle

function renderLifecycleChart(summary) {

    const items = [

        {
            name: "Draft",
            value: summary.drafts || 0
        },

        {
            name: "Pending Approval",
            value: summary.pendingApproval || 0
        },

        {
            name: "Rejected",
            value: summary.rejected || 0
        },

        {
            name: "Execution",
            value: summary.execution || 0
        },

        {
            name: "Measurement",
            value: summary.measurement || 0
        },

        {
            name: "Closed",
            value: summary.closed || 0
        }

    ];


    renderBarChart(
        "lifecycleChart",
        items
    );

}



//Objective Chart

function renderObjectiveChart(items) {

    const data =
        items.map(x => ({
            name:
                x.objective || "Unknown",

            value:
                Number(
                    x.campaignCount
                ) || 0
        }));


    renderBarChart(
        "objectiveChart",
        data
    );

}

//Channel Chart
function renderChannelChart(items) {

    const data =
        items.map(x => ({
            name:
                x.channel || "Unknown",

            value:
                Number(
                    x.campaignCount
                ) || 0
        }));


    renderBarChart(
        "channelChart",
        data
    );

}

//Generic Bar Chart

function renderBarChart(
    containerId,
    items
) {

    const container =
        document.getElementById(
            containerId
        );


    container.innerHTML = "";


    if (!items.length) {

        container.innerHTML =
            "No data available.";

        return;
    }


    const maxValue =
        Math.max(
            ...items.map(
                x => x.value
            ),
            1
        );


    items.forEach(item => {

        const percentage =
            (
                item.value /
                maxValue
            ) * 100;


        const row =
            document.createElement(
                "div"
            );


        row.className =
            "bar-chart-row";


        row.innerHTML = `

            <div class="bar-chart-label">

                <span>
                    ${item.name}
                </span>

                <strong>
                    ${item.value}
                </strong>

            </div>


            <div class="bar-chart-track">

                <div
                    class="bar-chart-fill"
                    style="
                        width:
                        ${percentage}%;
                    ">
                </div>

            </div>

        `;


        container.appendChild(
            row
        );

    });

}


//4. Add Expected vs Actual ROI visual
function renderROIChart(campaigns) {

    const container =
        document.getElementById(
            "roiChart"
        );


    container.innerHTML = "";


    const measured =
        campaigns.filter(
            x =>
                x.actualROI !== null &&
                x.actualROI !== undefined
        );


    if (!measured.length) {

        container.innerHTML =
            "No measured campaigns available.";

        return;

    }


    measured.forEach(
        campaign => {

            const expected =
                Number(
                    campaign.expectedROI
                ) || 0;


            const actual =
                Number(
                    campaign.actualROI
                ) || 0;


            const max =
                Math.max(
                    expected,
                    actual,
                    1
                );


            const expectedWidth =
                expected /
                max *
                100;


            const actualWidth =
                actual /
                max *
                100;


            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "roi-chart-item";


            item.innerHTML = `

                <div class="roi-campaign-name">

                    ${campaign.campaignCode}

                    <strong>
                        ${campaign.campaignName}
                    </strong>

                </div>


                <div class="roi-bar-row">

                    <span>
                        Expected
                    </span>

                    <div class="roi-track">

                        <div
                            class="
                                roi-bar
                                expected-roi-bar
                            "
                            style="
                                width:
                                ${expectedWidth}%;
                            ">
                        </div>

                    </div>

                    <strong>
                        ${expected.toFixed(2)}x
                    </strong>

                </div>


                <div class="roi-bar-row">

                    <span>
                        Actual
                    </span>

                    <div class="roi-track">

                        <div
                            class="
                                roi-bar
                                actual-roi-bar
                            "
                            style="
                                width:
                                ${actualWidth}%;
                            ">
                        </div>

                    </div>

                    <strong>
                        ${actual.toFixed(2)}x
                    </strong>

                </div>

            `;


            container.appendChild(
                item
            );

        }
    );

}


