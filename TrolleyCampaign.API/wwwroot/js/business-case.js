document.addEventListener("DOMContentLoaded", function () {

    document.getElementById("baselineSales").value =
        sessionStorage.getItem("baselineSales") || "";

    document.getElementById("upliftPct").value =
        sessionStorage.getItem("upliftPct") || "";

    document.getElementById("campaignCost").value =
        sessionStorage.getItem("campaignCost") || "";

    calculateBusinessCase();
});


function calculateBusinessCase() {

    const baseline =
        parseFloat(document.getElementById("baselineSales").value) || 0;

    const uplift =
        parseFloat(document.getElementById("upliftPct").value) || 0;

    const cost =
        parseFloat(document.getElementById("campaignCost").value) || 0;


    const incrementalSales =
        baseline * (uplift / 100);


    const roi =
        cost > 0
            ? incrementalSales / cost
            : 0;


    document.getElementById("incrementalSales").value =
        incrementalSales.toFixed(2);

    document.getElementById("expectedROI").value =
        roi.toFixed(2) + " x";
}


function goNext() {

    const baseline =
        parseFloat(document.getElementById("baselineSales").value);

    const uplift =
        parseFloat(document.getElementById("upliftPct").value);

    const cost =
        parseFloat(document.getElementById("campaignCost").value);


    if (!baseline || baseline <= 0) {
        alert("Please enter Expected Baseline Sales.");
        return;
    }

    if (!uplift || uplift <= 0) {
        alert("Please enter Expected Uplift %.");
        return;
    }

    if (!cost || cost <= 0) {
        alert("Please enter Campaign Cost.");
        return;
    }


    const incrementalSales =
        baseline * (uplift / 100);

    const roi =
        incrementalSales / cost;


    sessionStorage.setItem("baselineSales", baseline);

    sessionStorage.setItem("upliftPct", uplift);

    sessionStorage.setItem(
        "incrementalSales",
        incrementalSales.toFixed(2)
    );

    sessionStorage.setItem("campaignCost", cost);

    sessionStorage.setItem(
        "expectedROI",
        roi.toFixed(2)
    );


    // Step 3 will be created next
	//    alert("Business Case saved successfully.");
	window.location.href = "targeting.html";

	
}