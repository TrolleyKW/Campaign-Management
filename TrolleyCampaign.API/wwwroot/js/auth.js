let currentUser = null;


async function loadCurrentUser() {

    try {

        const response =
            await fetch(
                "/api/me",
                {
                    credentials:
                        "include"
                }
            );


        if (
            response.status === 401 ||
            response.status === 403
        ) {

            showAccessDenied();

            return null;
        }


        if (!response.ok) {

            throw new Error(
                await response.text()
            );

        }


        currentUser =
            await response.json();


        updateUserDisplay();

        applyNavigationSecurity();


        return currentUser;

    }
    catch (error) {

        console.error(
            "Authentication Error:",
            error
        );


        showAccessDenied();

        return null;

    }

}



function updateUserDisplay() {

    document
        .querySelectorAll(
            ".user-info"
        )
        .forEach(element => {

            element.textContent =
                currentUser.displayName ||
                currentUser.userName ||
                "User";

        });

}



function applyNavigationSecurity() {

    document
        .querySelectorAll(
            "[data-role]"
        )
        .forEach(element => {

            const role =
                element.dataset.role;


            let allowed = false;


            switch (role) {

                case "campaignUser":

                    allowed =
                        currentUser.isCampaignUser ||
                        currentUser.isAdmin;

                    break;


                case "approval":

                    allowed =
                        currentUser.isManager ||
                        currentUser.isDirector ||
                        currentUser.isAdmin;

                    break;


                case "dataScience":

                    allowed =
                        currentUser.isDataScience ||
                        currentUser.isAdmin;

                    break;


                case "admin":

                    allowed =
                        currentUser.isAdmin;

                    break;

            }


            element.style.display =
                allowed
                    ? ""
                    : "none";

        });

}



function showAccessDenied() {

    document.body.innerHTML = `

        <div class="access-denied-page">

            <div class="access-denied-card">

                <h1>
                    Access Denied
                </h1>

                <p>
                    Your Windows account does not currently
                    have access to the Campaign Management
                    Platform.
                </p>

                <p>
                    Please contact the application administrator.
                </p>

            </div>

        </div>

    `;

}


document.addEventListener(
    "DOMContentLoaded",
    loadCurrentUser
);