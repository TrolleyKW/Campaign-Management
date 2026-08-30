let campaignId = null;


document.addEventListener(
    "DOMContentLoaded",
    loadCloseCampaign
);


async function loadCloseCampaign() {

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
        `measurement.html?id=${campaignId}`;


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


        document.getElementById(
            "campaignTitle"
        ).textContent =
            `${data.campaignCode} - ${data.campaignName}`;


        const expectedIncremental =
            Number(
                data.expectedIncrementalSales
            ) || 0;


        const actualIncremental =
            Number(
                data.actualIncrementalSales
            ) || 0;


        const expectedROI =
            Number(
                data.expectedROI
            ) || 0;


        const actualROI =
            Number(
                data.actualROI
            ) || 0;


        const salesVariance =
            actualIncremental -
            expectedIncremental;


        const roiVariance =
            actualROI -
            expectedROI;


        setText(
            "expectedIncremental",
            formatNumber(
                expectedIncremental
            )
        );


        setText(
            "actualIncremental",
            formatNumber(
                actualIncremental
            )
        );


        setText(
            "salesVariance",
            formatSigned(
                salesVariance
            )
        );


        setText(
            "expectedROI",
            expectedROI.toFixed(2) +
            " x"
        );


        setText(
            "actualROI",
            actualROI.toFixed(2) +
            " x"
        );


        setText(
            "roiVariance",
            formatSigned(
                roiVariance
            ) +
            " x"
        );

    }
    catch (error) {

        console.error(
            error
        );


        alert(
            "Unable to load Campaign results.\n\n" +
            error.message
        );

    }

}



async function closeCampaign() {

    const runAgainValue =
        document.getElementById(
            "wouldRunAgain"
        ).value;


    if (!runAgainValue) {

        alert(
            "Please select whether you would run this campaign again."
        );

        return;
    }


    if (
        !confirm(
            "Close this campaign permanently?"
        )
    ) {

        return;

    }


    const payload = {

        whatWorked:
            document.getElementById(
                "whatWorked"
            ).value.trim(),


        whatDidNotWork:
            document.getElementById(
                "whatDidNotWork"
            ).value.trim(),


        wouldRunAgain:
            runAgainValue === "true",


        closingNotes:
            document.getElementById(
                "closingNotes"
            ).value.trim() 

    };


    try {

        const response =
            await fetch(
                `/api/campaigns/${campaignId}/close`,
                {
                    method: "POST",

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
                "Unable to close Campaign.\n\n" +
                (
                    result.message ||
                    responseText
                )
            );

            return;

        }


        alert(
            "Campaign closed successfully."
        );


        window.location.href =
            `campaign-details.html?id=${campaignId}`;

    }
    catch (error) {

        console.error(
            error
        );


        alert(
            "Unable to close Campaign.\n\n" +
            error.message
        );

    }

}



function goBack() {

    window.location.href =
        `measurement.html?id=${campaignId}`;

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



function formatSigned(
    value
) {

    const number =
        Number(value);


    const formatted =
        Math.abs(number)
            .toLocaleString(
                "en-US",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            );


    return number >= 0
        ? `+${formatted}`
        : `-${formatted}`;

}