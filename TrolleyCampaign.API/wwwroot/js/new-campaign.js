document.addEventListener(
    "DOMContentLoaded",
    function () {

        const editingCampaignId =
            sessionStorage.getItem(
                "editingCampaignId"
            );


        if (!editingCampaignId)
            return;


        document.getElementById(
            "campaignName"
        ).value =
            sessionStorage.getItem(
                "campaignName"
            ) || "";


        document.getElementById(
            "owner"
        ).value =
            sessionStorage.getItem(
                "owner"
            ) || "";


        document.getElementById(
            "objective"
        ).value =
            sessionStorage.getItem(
                "objective"
            ) || "";


        document.getElementById(
            "campaignBrief"
        ).value =
            sessionStorage.getItem(
                "campaignBrief"
            ) || "";

    }
);


function goNext() {

    const campaignName =
        document.getElementById("campaignName").value.trim();

    const objective =
        document.getElementById("objective").value;

    const campaignBrief =
        document.getElementById("campaignBrief").value.trim();

    const owner =
    	document.getElementById("owner").value;

    if (!campaignName) {
        alert("Please enter Campaign Name.");
        return;
    }

    if (!objective) {
        alert("Please select Campaign Objective.");
        return;
    }

    if (!campaignBrief) {
        alert("Please enter Campaign Brief.");
        return;
    }


    // Temporary storage until SQL integration
    sessionStorage.setItem("campaignName", campaignName);
    sessionStorage.setItem("objective", objective);
    sessionStorage.setItem("campaignBrief", campaignBrief);
    sessionStorage.setItem("owner",  owner);

    window.location.href = "business-case.html";

    // Step 2 will be connected next
}