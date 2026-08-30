let campaignId = null;
let campaignCost = 0;


document.addEventListener(
    "DOMContentLoaded",
    loadMeasurement
);


async function loadMeasurement() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    campaignId =
        params.get("id");


    if (!campaignId) {

        alert(
            "Campaign ID is missing."
        );

        return;
    }


    document.getElementById(
        "backLink"
    ).href =
        `campaign-details.html?id=${campaignId}`;


    try {

        const response =
            await fetch(
                `/api/campaigns/${campaignId}/measurement`
            );


        if (!response.ok) {

            throw new Error(
                await response.text()
            );

        }


        const data =
            await response.json();


        campaignCost =
            Number(
                data.campaignCost
            ) || 0;


        document.getElementById(
            "campaignTitle"
        ).textContent =
            `${data.campaignCode} - ${data.campaignName}`;


        setText(
            "expectedBaseline",
            formatNumber(
                data.expectedBaselineSales
            )
        );


        setText(
            "expectedIncremental",
            formatNumber(
                data.expectedIncrementalSales
            )
        );


        setText(
            "campaignCost",
            formatNumber(
                data.campaignCost
            )
        );


        setText(
            "expectedROI",
            formatNumber(
                data.expectedROI
            ) + " x"
        );


        // Restore existing measurement
        document.getElementById(
            "measurementMethod"
        ).value =
            data.measurementMethod || "";


        document.getElementById(
            "controlReference"
        ).value =
            data.controlReference || "";


        document.getElementById(
            "actualCampaignSales"
        ).value =
            data.actualCampaignSales ?? "";


        document.getElementById(
            "controlExpectedSales"
        ).value =
            data.controlExpectedSales ?? "";


        document.getElementById(
            "measurementNotes"
        ).value =
            data.measurementNotes || "";


        calculateActualResults();


        if (
            data.actualCampaignSales !== null &&
            data.actualCampaignSales !== undefined &&
            data.actualROI !== null &&
            data.actualROI !== undefined
        ) {

            document.getElementById(
                "closeCampaignButton"
            ).style.display =
                "inline-block";

        }


    }
    catch (error) {

        console.error(
            error
        );

        alert(
            "Unable to load Measurement details."
        );

    }

}


function openCloseCampaign() {

    window.location.href =
        `campaign-close.html?id=${campaignId}`;

}


function calculateActualResults() {

    const actualSales =
        Number(
            document.getElementById(
                "actualCampaignSales"
            ).value
        ) || 0;


    const controlSales =
        Number(
            document.getElementById(
                "controlExpectedSales"
            ).value
        ) || 0;


    const incremental =
        actualSales -
        controlSales;


    const roi =
        campaignCost > 0
            ? incremental /
              campaignCost
            : 0;


    document.getElementById(
        "actualIncrementalSales"
    ).value =
        incremental.toFixed(2);


    document.getElementById(
        "actualROI"
    ).value =
        roi.toFixed(2) +
        " x";

}



async function saveMeasurement() {

    const measurementMethod =
        document.getElementById(
            "measurementMethod"
        ).value;


    const actualCampaignSales =
        Number(
            document.getElementById(
                "actualCampaignSales"
            ).value
        );


    const controlExpectedSales =
        Number(
            document.getElementById(
                "controlExpectedSales"
            ).value
        );


    if (!measurementMethod) {

        alert(
            "Please select Measurement Method."
        );

        return;
    }


    if (
        Number.isNaN(
            actualCampaignSales
        )
    ) {

        alert(
            "Please enter Actual Campaign Sales."
        );

        return;
    }


    if (
        Number.isNaN(
            controlExpectedSales
        )
    ) {

        alert(
            "Please enter Control Expected Sales."
        );

        return;
    }


    const payload = {

        measurementMethod:

            measurementMethod,


        controlReference:

            document
                .getElementById(
                    "controlReference"
                )
                .value
                .trim(),


        actualCampaignSales:

            actualCampaignSales,


        controlExpectedSales:

            controlExpectedSales,


        measurementNotes:

            document
                .getElementById(
                    "measurementNotes"
                )
                .value
                .trim() 

    };


    try {

        const response =
            await fetch(
                `/api/campaigns/${campaignId}/measurement`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );


        const responseText =
            await response.text();


        if (!response.ok) {

            alert(
                "Unable to save Measurement.\n\n" +
                responseText
            );

            return;
        }


        const result =
            JSON.parse(
                responseText
            );


        alert(
            "Measurement saved successfully!\n\n" +

            "Actual Incremental Sales: " +
            formatNumber(
                result.actualIncrementalSales
            ) +

            "\nActual ROI: " +
            Number(
                result.actualROI
            ).toFixed(2) +
            " x"
        );


        window.location.reload();

    }
    catch (error) {

        console.error(
            error
        );


        alert(
            "Unable to save Measurement.\n\n" +
            error.message
        );

    }

}



function goBack() {

    window.location.href =
        `campaign-details.html?id=${campaignId}`;

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



function formatNumber(
    value
) {

    if (
        value === null ||
        value === undefined
    )
        return "-";


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