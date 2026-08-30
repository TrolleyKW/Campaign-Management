let dependencies = [];


document.addEventListener(
    "DOMContentLoaded",
    async function () {

        restoreDates();


        try {

            const response =
                await fetch(
                    "/api/dependencies"
                );


            if (!response.ok) {

                throw new Error(
                    "Unable to load dependencies."
                );

            }


            dependencies =
                await response.json();


            renderDependencies();

            restoreDependencies();

        }
        catch (error) {

            console.error(error);

            alert(
                "Unable to load Campaign Dependencies from SQL Server."
            );

        }


        calculateDuration();

    }
);


function restoreDates() {

    const startDate =
        sessionStorage.getItem(
            "startDate"
        );

    const endDate =
        sessionStorage.getItem(
            "endDate"
        );


    if (startDate) {

        document.getElementById(
            "startDate"
        ).value = startDate;

    }


    if (endDate) {

        document.getElementById(
            "endDate"
        ).value = endDate;

    }

}


function renderDependencies() {

    const container =
        document.getElementById(
            "dependencyList"
        );


    container.innerHTML = "";


    dependencies.forEach(dependency => {

        const label =
            document.createElement("label");


        label.innerHTML = `

            <input
                type="checkbox"
                value="${dependency.dependenciesId}"
                data-name="${dependency.dependencies}">

            ${dependency.dependencies}

        `;


        container.appendChild(label);

    });

}


function restoreDependencies() {

    const saved =
        JSON.parse(
            sessionStorage.getItem("dependencies") || "[]"
        );


    saved.forEach(item => {

        const checkbox =
            document.querySelector(
                `#dependencyList input[value="${item.id}"]`
            );


        if (checkbox) {

            checkbox.checked = true;

        }

    });

}


function calculateDuration() {

    const startValue =
        document.getElementById(
            "startDate"
        ).value;

    const endValue =
        document.getElementById(
            "endDate"
        ).value;


    if (!startValue || !endValue) {

        document.getElementById(
            "campaignDuration"
        ).value = "0 Days";

        return;

    }


    const start =
        new Date(startValue);

    const end =
        new Date(endValue);


    if (end < start) {

        document.getElementById(
            "campaignDuration"
        ).value =
            "Invalid Date Range";

        return;

    }


    const days =
        Math.floor(
            (end - start) /
            (1000 * 60 * 60 * 24)
        ) + 1;


    document.getElementById(
        "campaignDuration"
    ).value =
        days +
        (days === 1
            ? " Day"
            : " Days");

}


function goNext() {

    const startDate =
        document.getElementById(
            "startDate"
        ).value;


    const endDate =
        document.getElementById(
            "endDate"
        ).value;


    if (!startDate) {

        alert(
            "Please select Campaign Start Date."
        );

        return;

    }


    if (!endDate) {

        alert(
            "Please select Campaign End Date."
        );

        return;

    }


    if (
        new Date(endDate) <
        new Date(startDate)
    ) {

        alert(
            "Campaign End Date cannot be earlier than Start Date."
        );

        return;

    }


    const selectedDependencies =
        Array.from(
            document.querySelectorAll(
                '#dependencyList input[type="checkbox"]:checked'
            )
        )
        .map(x => ({

            id:
                Number(x.value),

            name:
                x.dataset.name

        }));


    sessionStorage.setItem(
        "startDate",
        startDate
    );


    sessionStorage.setItem(
        "endDate",
        endDate
    );


    sessionStorage.setItem(
        "dependencies",
        JSON.stringify(
            selectedDependencies
        )
    );


    window.location.href =
        "review.html";

}