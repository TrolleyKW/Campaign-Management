document.addEventListener("DOMContentLoaded", function () {

    loadCampaignDetails();

    loadBusinessCase();

    loadTargeting();

    loadStores();

    loadSchedule();

    loadDependencies();

});


function loadCampaignDetails() {

    setText(
        "reviewCampaignName",
        sessionStorage.getItem("campaignName")
    );

    setText(
        "reviewOwner",
        sessionStorage.getItem("owner") || "Mina George"
    );

    setText(
        "reviewObjective",
        sessionStorage.getItem("objective")
    );

    setText(
        "reviewCampaignBrief",
        sessionStorage.getItem("campaignBrief")
    );

}


function loadBusinessCase() {

    const baseline =
        sessionStorage.getItem("baselineSales");

    const uplift =
        sessionStorage.getItem("upliftPct");

    const incremental =
        sessionStorage.getItem("incrementalSales");

    const cost =
        sessionStorage.getItem("campaignCost");

    const roi =
        sessionStorage.getItem("expectedROI");


    setText(
        "reviewBaseline",
        formatNumber(baseline)
    );

    setText(
        "reviewUplift",
        uplift ? uplift + " %" : "-"
    );

    setText(
        "reviewIncremental",
        formatNumber(incremental)
    );

    setText(
        "reviewCost",
        formatNumber(cost)
    );

    setText(
        "reviewROI",
        roi ? roi + " x" : "-"
    );

}


function loadTargeting() {

    const segments =
        JSON.parse(
            sessionStorage.getItem("targetSegments") || "[]"
        );


    const container =
        document.getElementById("reviewSegments");


    if (segments.length === 0) {

        container.textContent = "-";

    }
    else {

        segments.forEach(segment => {

            const tag =
                document.createElement("span");

            tag.className = "review-tag";

            
            tag.textContent = segment.name;

            container.appendChild(tag);

        });

    }


    const channel =
            JSON.parse(
                sessionStorage.getItem("channel") || "null"
            );

        setText(
            "reviewChannel",
            channel ? channel.name : "-"
        );

}


function loadStores() {

    const stores =
        JSON.parse(
            sessionStorage.getItem("selectedStores") || "[]"
        );


    setText(
        "reviewStoreCount",
        stores.length
    );


    const container =
        document.getElementById("reviewStores");


    if (stores.length === 0) {

        container.textContent = "No stores selected.";

        return;

    }


    stores.forEach(store => {

        const item =
            document.createElement("div");

        item.className =
            "review-store-item";

        item.textContent =
            `${store.id} - ${store.name}`;

        container.appendChild(item);

    });

}


function loadSchedule() {

    const startDate =
        sessionStorage.getItem("startDate");

    const endDate =
        sessionStorage.getItem("endDate");


    setText(
        "reviewStartDate",
        formatDate(startDate)
    );

    setText(
        "reviewEndDate",
        formatDate(endDate)
    );


    if (startDate && endDate) {

        const start =
            new Date(startDate);

        const end =
            new Date(endDate);


        const days =
            Math.floor(
                (end - start) /
                (1000 * 60 * 60 * 24)
            ) + 1;


        setText(
            "reviewDuration",
            days + (days === 1 ? " Day" : " Days")
        );

    }
    else {

        setText(
            "reviewDuration",
            "-"
        );

    }

}


function loadDependencies() {

    const dependencies =
        JSON.parse(
            sessionStorage.getItem("dependencies") || "[]"
        );


    const container =
        document.getElementById(
            "reviewDependencies"
        );


    if (dependencies.length === 0) {

        container.textContent =
            "No dependencies selected.";

        return;

    }


    dependencies.forEach(dependency => {

        const tag =
            document.createElement("span");

        tag.className =
            "review-tag";

        tag.textContent =
            dependency.name;

        container.appendChild(tag);

    });

}



async function saveDraft() {

    const payload =
        buildCampaignPayload();


    payload.saveAsDraft =
        true;


    // Is this a NEW Campaign
    // or an EXISTING Draft?
    const editingCampaignId =
        sessionStorage.getItem(
            "editingCampaignId"
        );


    const apiUrl =
        editingCampaignId
            ? `/api/campaigns/${editingCampaignId}`
            : "/api/campaigns";


    const httpMethod =
        editingCampaignId
            ? "PUT"
            : "POST";


    console.log(
        "Save Draft URL:",
        apiUrl
    );

    console.log(
        "Save Draft Method:",
        httpMethod
    );

    console.log(
        "Save Draft Payload:",
        payload
    );


    try {

        const response =
            await fetch(
                apiUrl,
                {
                    method:
                        httpMethod,

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


        console.log(
            "Draft HTTP Status:",
            response.status
        );


        console.log(
            "Draft Response:",
            responseText
        );


        if (!response.ok) {

            alert(
                "Unable to save Draft.\n\n" +
                "HTTP Status: " +
                response.status +
                "\n\n" +
                responseText
            );

            return;
        }


        const result =
            JSON.parse(
                responseText
            );


        alert(
            "Campaign saved as Draft successfully!\n\n" +
            "Campaign Code: " +
            result.campaignCode
        );


        clearCampaignSession();


        window.location.href =
            "my-campaigns.html";

    }
    catch (error) {

        console.error(
            "Save Draft Error:",
            error
        );


        alert(
            "Unable to save Draft.\n\n" +
            error.message
        );

    }

}





async function submitCampaign() {

    const confirmed =
        document
            .getElementById(
                "confirmCampaign"
            )
            .checked;


    if (!confirmed) {

        alert(
            "Please confirm that the campaign information is correct."
        );

        return;
    }


    const payload =
        buildCampaignPayload();


    payload.saveAsDraft =
        false;


    // Check whether we are editing
    // an existing Draft
    const editingCampaignId =
        sessionStorage.getItem(
            "editingCampaignId"
        );


    // Existing Draft = PUT
    // New Campaign = POST
    const apiUrl =
        editingCampaignId
            ? `/api/campaigns/${editingCampaignId}`
            : "/api/campaigns";


    const httpMethod =
        editingCampaignId
            ? "PUT"
            : "POST";


    console.log(
        "Submit URL:",
        apiUrl
    );

    console.log(
        "Submit Method:",
        httpMethod
    );

    console.log(
        "Submit Payload:",
        payload
    );


    try {

        const response =
            await fetch(
                apiUrl,
                {
                    method:
                        httpMethod,

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


        console.log(
            "HTTP Status:",
            response.status
        );


        console.log(
            "API Response:",
            responseText
        );


        if (!response.ok) {

            alert(
                "Campaign submission failed.\n\n" +
                "HTTP Status: " +
                response.status +
                "\n\n" +
                responseText
            );

            return;
        }


        const result =
            JSON.parse(
                responseText
            );


        alert(
            "Campaign submitted successfully!\n\n" +
            "Campaign Code: " +
            result.campaignCode
        );


        clearCampaignSession();


        window.location.href =
            "my-campaigns.html";

    }
    catch (error) {

        console.error(
            "Submit Error:",
            error
        );


        alert(
            "JavaScript/API Error:\n\n" +
            error.message
        );

    }

}




function buildCampaignPayload() {

    const channel =
        JSON.parse(
            sessionStorage.getItem("channel") || "null"
        );

    const targetSegments =
        JSON.parse(
            sessionStorage.getItem("targetSegments") || "[]"
        );

    const stores =
        JSON.parse(
            sessionStorage.getItem("selectedStores") || "[]"
        );

    const dependencies =
        JSON.parse(
            sessionStorage.getItem("dependencies") || "[]"
        );


    return {

        campaignName:
            sessionStorage.getItem("campaignName"),

        owner:
            sessionStorage.getItem("owner") || "Mina George",

        objective:
            sessionStorage.getItem("objective"),

        campaignBrief:
            sessionStorage.getItem("campaignBrief"),

        expectedBaselineSales:
            Number(sessionStorage.getItem("baselineSales")),

        expectedUpliftPct:
            Number(sessionStorage.getItem("upliftPct")),

        expectedIncrementalSale:
            Number(sessionStorage.getItem("incrementalSales")),

        expectedROI:
            Number(sessionStorage.getItem("expectedROI")),

        cost:
            Number(sessionStorage.getItem("campaignCost")),

        channel: channel,

        targetSegments: targetSegments,

        stores: stores,

        dependencies: dependencies,

        startDate:
            sessionStorage.getItem("startDate"),

        endDate:
            sessionStorage.getItem("endDate")
    };
}


function setText(id, value) {

    document.getElementById(id).textContent =
        value || "-";

}


function formatNumber(value) {

    if (!value) {
        return "-";
    }

    return Number(value).toLocaleString(
        "en-US",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );

}


function formatDate(value) {

    if (!value) {
        return "-";
    }


    const date =
        new Date(value + "T00:00:00");


    return date.toLocaleDateString(
        "en-GB",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


function clearCampaignSession() {

    const keys = [
        "editingCampaignId",
        "campaignName",
        "owner",
        "objective",
        "campaignBrief",
        "baselineSales",
        "upliftPct",
        "incrementalSales",
        "campaignCost",
        "expectedROI",
        "channel",
        "targetSegments",
        "selectedStores",
        "dependencies",
        "startDate",
        "endDate"
    ];

    keys.forEach(key =>
        sessionStorage.removeItem(key)
    );
}



