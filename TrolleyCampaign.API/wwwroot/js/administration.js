let adminConfig = null;


document.addEventListener(
    "DOMContentLoaded",
    initializeAdministration
);


async function initializeAdministration() {

    try {

        const userResponse =
            await fetch(
                "/api/me",
                {
                    credentials: "include"
                }
            );


        if (!userResponse.ok) {

            window.location.href =
                "index.html";

            return;
        }


        const user =
            await userResponse.json();


        if (!user.isAdmin) {

            alert(
                "You do not have Administration access."
            );


            window.location.href =
                "index.html";

            return;
        }


        document.getElementById(
            "adminUserName"
        ).textContent =
            user.userName || "-";


        document.getElementById(
            "adminRole"
        ).textContent =
            user.isAdmin ? "Yes" : "No";


        document.getElementById(
            "managerRole"
        ).textContent =
            user.isManager ? "Yes" : "No";


        document.getElementById(
            "directorRole"
        ).textContent =
            user.isDirector ? "Yes" : "No";


        await loadAdminConfig();
        await loadUsers();

    }
    catch (error) {

        console.error(error);

        alert(
            "Unable to load Administration."
        );

    }

}

async function loadUsers() {

    try {

        const response =
            await fetch(
                "/api/admin/users"
            );


        if (!response.ok) {

            throw new Error(
                await response.text()
            );

        }


        const users =
            await response.json();


        renderUsers(
            users
        );

    }
    catch (error) {

        console.error(
            "Load Users Error:",
            error
        );


        alert(
            "Unable to load User Access Management.\n\n" +
            error.message
        );

    }

}


function renderUsers(users) {

    const tbody =
        document.getElementById(
            "usersAdminBody"
        );


    tbody.innerHTML = "";


    if (!users.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="9">
                    No application users found.
                </td>
            </tr>
        `;

        return;
    }


    users.forEach(user => {

        const row =
            document.createElement(
                "tr"
            );


        row.innerHTML = `

            <td>
                <strong>
                    ${escapeHtml(
                        user.windowsUserName
                    )}
                </strong>
            </td>


            <td>

                <input
                    type="text"
                    id="displayName_${user.appUserId}"
                    value="${escapeHtml(
                        user.displayName || ""
                    )}">

            </td>


            <td>
                ${roleCheckbox(
                    "campaignUser",
                    user.appUserId,
                    user.isCampaignUser
                )}
            </td>


            <td>
                ${roleCheckbox(
                    "manager",
                    user.appUserId,
                    user.isManager
                )}
            </td>


            <td>
                ${roleCheckbox(
                    "director",
                    user.appUserId,
                    user.isDirector
                )}
            </td>


            <td>
                ${roleCheckbox(
                    "dataScience",
                    user.appUserId,
                    user.isDataScience
                )}
            </td>


            <td>
                ${roleCheckbox(
                    "admin",
                    user.appUserId,
                    user.isAdmin
                )}
            </td>


            <td>
                ${roleCheckbox(
                    "active",
                    user.appUserId,
                    user.isActive
                )}
            </td>


            <td>

                <button
                    type="button"
                    class="table-action"
                    onclick='saveUser(
                        ${user.appUserId},
                        ${JSON.stringify(
                            user.windowsUserName
                        )}
                    )'>

                    Save

                </button>

            </td>

        `;


        tbody.appendChild(
            row
        );

    });

}

function roleCheckbox(
    name,
    id,
    checked
) {

    return `

        <input
            type="checkbox"
            id="${name}_${id}"
            ${checked ? "checked" : ""}>

    `;

}

async function addUser() {

    const windowsUserName =
        document
            .getElementById(
                "newWindowsUserName"
            )
            .value
            .trim();


    const displayName =
        document
            .getElementById(
                "newDisplayName"
            )
            .value
            .trim();


    if (!windowsUserName) {

        alert(
            "Windows / Domain Account is required."
        );

        return;
    }


    const payload = {

        windowsUserName:
            windowsUserName,

        displayName:
            displayName,

        isCampaignUser:
            document
                .getElementById(
                    "newIsCampaignUser"
                )
                .checked,

        isManager:
            document
                .getElementById(
                    "newIsManager"
                )
                .checked,

        isDirector:
            document
                .getElementById(
                    "newIsDirector"
                )
                .checked,

        isDataScience:
            document
                .getElementById(
                    "newIsDataScience"
                )
                .checked,

        isAdmin:
            document
                .getElementById(
                    "newIsAdmin"
                )
                .checked,

        isActive:
            document
                .getElementById(
                    "newIsActive"
                )
                .checked

    };


    try {

        const response =
            await fetch(
                "/api/admin/users",
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


        if (!response.ok) {

            alert(
                "Unable to add User.\n\n" +
                responseText
            );

            return;
        }


        alert(
            "User added successfully."
        );


        clearNewUserForm();


        await loadUsers();

    }
    catch (error) {

        console.error(error);

        alert(
            "Unable to add User.\n\n" +
            error.message
        );

    }

}


async function saveUser(
    appUserId,
    windowsUserName
) {

    const payload = {

        windowsUserName:
            windowsUserName,


        displayName:
            document
                .getElementById(
                    `displayName_${appUserId}`
                )
                .value
                .trim(),


        isCampaignUser:
            document
                .getElementById(
                    `campaignUser_${appUserId}`
                )
                .checked,


        isManager:
            document
                .getElementById(
                    `manager_${appUserId}`
                )
                .checked,


        isDirector:
            document
                .getElementById(
                    `director_${appUserId}`
                )
                .checked,


        isDataScience:
            document
                .getElementById(
                    `dataScience_${appUserId}`
                )
                .checked,


        isAdmin:
            document
                .getElementById(
                    `admin_${appUserId}`
                )
                .checked,


        isActive:
            document
                .getElementById(
                    `active_${appUserId}`
                )
                .checked

    };


    if (
        !confirm(
            `Save access changes for ${windowsUserName}?`
        )
    ) {

        return;

    }


    try {

        const response =
            await fetch(
                `/api/admin/users/${appUserId}`,
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
                "Unable to update User.\n\n" +
                responseText
            );

            return;
        }


        alert(
            "User access updated successfully."
        );


        await loadUsers();

    }
    catch (error) {

        console.error(error);

        alert(
            "Unable to update User.\n\n" +
            error.message
        );

    }

}

function clearNewUserForm() {

    document.getElementById(
        "newWindowsUserName"
    ).value = "";


    document.getElementById(
        "newDisplayName"
    ).value = "";


    document.getElementById(
        "newIsCampaignUser"
    ).checked = true;


    document.getElementById(
        "newIsManager"
    ).checked = false;


    document.getElementById(
        "newIsDirector"
    ).checked = false;


    document.getElementById(
        "newIsDataScience"
    ).checked = false;


    document.getElementById(
        "newIsAdmin"
    ).checked = false;


    document.getElementById(
        "newIsActive"
    ).checked = true;

}




function escapeHtml(value) {

    return String(
        value ?? ""
    )
    .replaceAll(
        "&",
        "&amp;"
    )
    .replaceAll(
        "<",
        "&lt;"
    )
    .replaceAll(
        ">",
        "&gt;"
    )
    .replaceAll(
        '"',
        "&quot;"
    )
    .replaceAll(
        "'",
        "&#039;"
    );

}


async function loadAdminConfig() {

    const response =
        await fetch(
            "/api/admin/config"
        );


    if (!response.ok) {

        throw new Error(
            await response.text()
        );

    }


    adminConfig =
        await response.json();


    renderChannels();

    renderSegments();

    renderDependencies();

    renderStatuses();

}



function renderChannels() {

    renderLookupTable(
        "channelAdminBody",
        adminConfig.channels,
        "channelId",
        editChannel
    );

}



function renderSegments() {

    renderLookupTable(
        "segmentAdminBody",
        adminConfig.targetSegments,
        "targetSegmentId",
        editSegment
    );

}



function renderDependencies() {

    renderLookupTable(
        "dependencyAdminBody",
        adminConfig.dependencies,
        "dependenciesId",
        editDependency
    );

}



function renderStatuses() {

    const tbody =
        document.getElementById(
            "statusAdminBody"
        );


    tbody.innerHTML = "";


    adminConfig.statuses.forEach(
        item => {

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    ${item.statusId}
                </td>

                <td>
                    ${item.name}
                </td>

            `;


            tbody.appendChild(
                row
            );

        }
    );

}



function renderLookupTable(
    bodyId,
    items,
    idProperty,
    editFunction
) {

    const tbody =
        document.getElementById(
            bodyId
        );


    tbody.innerHTML = "";


    items.forEach(item => {

        const row =
            document.createElement(
                "tr"
            );


        const id =
            item[idProperty];


        const idCell =
            document.createElement(
                "td"
            );

        idCell.textContent =
            id;


        const nameCell =
            document.createElement(
                "td"
            );

        nameCell.textContent =
            item.name;


        const actionCell =
            document.createElement(
                "td"
            );


        const button =
            document.createElement(
                "button"
            );


        button.className =
            "table-action";


        button.textContent =
            "Edit";


        button.addEventListener(
            "click",
            () =>
                editFunction(
                    id,
                    item.name
                )
        );


        actionCell.appendChild(
            button
        );


        row.appendChild(
            idCell
        );

        row.appendChild(
            nameCell
        );

        row.appendChild(
            actionCell
        );


        tbody.appendChild(
            row
        );

    });

}



async function addChannel() {

    const input =
        document.getElementById(
            "newChannel"
        );


    await createLookup(
        "/api/admin/channels",
        input
    );

}



async function addSegment() {

    const input =
        document.getElementById(
            "newSegment"
        );


    await createLookup(
        "/api/admin/segments",
        input
    );

}



async function addDependency() {

    const input =
        document.getElementById(
            "newDependency"
        );


    await createLookup(
        "/api/admin/dependencies",
        input
    );

}



async function createLookup(
    url,
    input
) {

    const name =
        input.value.trim();


    if (!name) {

        alert(
            "Please enter a value."
        );

        return;

    }


    const response =
        await fetch(
            url,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({
                        name
                    })
            }
        );


    if (!response.ok) {

        alert(
            await response.text()
        );

        return;

    }


    input.value = "";


    await loadAdminConfig();

}



async function editChannel(
    id,
    currentName
) {

    await editLookup(
        `/api/admin/channels/${id}`,
        currentName
    );

}



async function editSegment(
    id,
    currentName
) {

    await editLookup(
        `/api/admin/segments/${id}`,
        currentName
    );

}



async function editDependency(
    id,
    currentName
) {

    await editLookup(
        `/api/admin/dependencies/${id}`,
        currentName
    );

}



async function editLookup(
    url,
    currentName
) {

    const name =
        prompt(
            "Enter the new value:",
            currentName
        );


    if (
        name === null ||
        !name.trim()
    ) {

        return;

    }


    const response =
        await fetch(
            url,
            {
                method: "PUT",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({
                        name:
                            name.trim()
                    })
            }
        );


    if (!response.ok) {

        alert(
            await response.text()
        );

        return;

    }


    await loadAdminConfig();

}