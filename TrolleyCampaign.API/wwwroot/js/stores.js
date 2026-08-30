let stores = [];

let selectedStores =
    JSON.parse(
        sessionStorage.getItem("selectedStores") || "[]"
    );


document.addEventListener(
    "DOMContentLoaded",
    async function () {

        try {

            const response =
                await fetch("/api/stores");


            if (!response.ok) {

                throw new Error(
                    "Unable to load stores."
                );

            }


            const rawStores = await response.json();

            console.log("First Store From API:", rawStores[0]);

            stores = rawStores.map(store => ({
                id:
                    store.storesId ??
                    store.StoresId,

                name:
                    store.stores ??
                    store.Stores,

                country:
                    store.country ??
                    store.Country
            }));


            loadCountries();

            filterStores();

            updateSelectedCount();

        }
        catch (error) {

            console.error(error);

            alert(
                "Unable to load Stores from SQL Server."
            );

        }

    }
);


function loadCountries() {

    const countries =
        [...new Set(
            stores.map(x => x.country)
        )]
        .filter(Boolean)
        .sort();


    const dropdown =
        document.getElementById(
            "countryFilter"
        );


    dropdown.innerHTML =
        '<option value="">All Countries</option>';


    countries.forEach(country => {

        const option =
            document.createElement("option");

        option.value =
            country;

        option.textContent =
            country;

        dropdown.appendChild(option);

    });

}


function filterStores() {

    const country =
        document.getElementById(
            "countryFilter"
        ).value;


    const search =
        document
            .getElementById("storeSearch")
            .value
            .toLowerCase();


    const filtered =
        stores.filter(store => {

            const countryMatch =
                !country ||
                store.country === country;


            const searchMatch =
                String(store.id)
                    .toLowerCase()
                    .includes(search)

                ||

                (store.name || "")
                    .toLowerCase()
                    .includes(search);


            return (
                countryMatch &&
                searchMatch
            );

        });


    renderStores(filtered);

}

// Stop Here 
//*************************/

function renderStores(storeList) {

    const tbody =
        document.getElementById(
            "storeTableBody"
        );


    tbody.innerHTML = "";


    storeList.forEach(store => {

        const selected =
            selectedStores.some(
                x => x.id === store.id
            );


        const row =
            document.createElement("tr");


        row.innerHTML = `

            <td>

                <input
                    type="checkbox"

                    ${selected ? "checked" : ""}

                    onchange="toggleStore('${store.id}')">

            </td>

            <td> ${store.id} </td>
            <td> ${store.name}</td>
            <td> ${store.country || ""} </td>

        `;


        tbody.appendChild(row);

    });

}

// Ended Here 
//*************************/

function toggleStore(storeId) {

    storeId = String(storeId);

    const store =
        stores.find(
            x => String(x.id) === storeId
        );


    const exists =
        selectedStores.some(
            x => String(x.id) === storeId
        );


    if (exists) {

        selectedStores =
            selectedStores.filter(
                x => String(x.id) !== storeId
            );

    }
    else {

        selectedStores.push({
            id: store.id,
            name: store.name,
            country: store.country
        });

    }


    saveSelection();
}

function selectAllFiltered() {

    const country =
        document.getElementById(
            "countryFilter"
        ).value;


    const search =
        document
            .getElementById("storeSearch")
            .value
            .toLowerCase();


    const filtered =
        stores.filter(store => {

            return (

                (!country ||
                    store.country === country)

                &&

                (
                    String(store.id)
                        .includes(search)

                    ||

                    (store.name || "")
                        .toLowerCase()
                        .includes(search)
                )

            );

        });


        filtered.forEach(store => {

            const exists =
                selectedStores.some(
                    x => String(x.id) === String(store.id)
                );

            if (!exists) {

                selectedStores.push({
                    id: store.id,
                    name: store.name,
                    country: store.country
                });

            }

        });






    saveSelection();

    filterStores();

}


function clearSelectedStores() {

    selectedStores = [];

    saveSelection();

    filterStores();

}


function saveSelection() {

    sessionStorage.setItem(

        "selectedStores",

        JSON.stringify(selectedStores)

    );


    updateSelectedCount();

}


function updateSelectedCount() {

    document.getElementById(
        "selectedStoreCount"
    ).textContent =
        selectedStores.length;

}


function goNext() {

    if (selectedStores.length === 0) {

        alert(
            "Please select at least one Campaign Store."
        );

        return;

    }


    window.location.href =
        "schedule.html";

}