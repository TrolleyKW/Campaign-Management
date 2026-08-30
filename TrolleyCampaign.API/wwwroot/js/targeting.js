let segments = [];
let channels = [];

document.addEventListener("DOMContentLoaded", async function () {

    try {

        const [segmentResponse, channelResponse] = await Promise.all([
            fetch("/api/segments"),
            fetch("/api/channels")
        ]);

        const rawSegments =
            await segmentResponse.json();

        const rawChannels =
            await channelResponse.json();

        segments = rawSegments;
        channels = rawChannels;

        console.log("RAW CHANNELS:", channels);

        renderSegments();
        renderChannels();
        restoreSelections();

    }
    catch (error) {

        console.error(error);

        alert("Unable to load Target Segments or Channels.");
    }
});



function renderSegments() {

    const container =
        document.getElementById("segmentList");

    container.innerHTML = "";

    segments.forEach(segment => {

        const label =
            document.createElement("label");

        label.innerHTML = `
            <input
                type="checkbox"
                value="${segment.targetSegmentId}"
                data-name="${segment.targetSegment}">
            ${segment.targetSegment}
        `;

        container.appendChild(label);
    });
}

function renderChannels() {

    const container =
        document.getElementById("channelList");

    container.innerHTML = "";

    channels.forEach(channel => {

        console.log("Rendering channel:", channel);

        const label =
            document.createElement("label");

        const input =
            document.createElement("input");

        input.type = "radio";
        input.name = "channel";

        input.value = channel.channelId;
        input.dataset.name = channel.channel;

        label.appendChild(input);

        label.appendChild(
            document.createTextNode(
                " " + channel.channel
            )
        );

        container.appendChild(label);
    });
}


function restoreSelections() {

    const savedSegments =
        JSON.parse(
            sessionStorage.getItem("targetSegments") || "[]"
        );

    savedSegments.forEach(saved => {

        const checkbox =
            document.querySelector(
                `#segmentList input[value="${saved.id}"]`
            );

        if (checkbox)
            checkbox.checked = true;
    });


    const savedChannel =
        JSON.parse(
            sessionStorage.getItem("channel") || "null"
        );

    if (savedChannel) {

        const radio =
            document.querySelector(
                `#channelList input[value="${savedChannel.id}"]`
            );

        if (radio)
            radio.checked = true;
    }
}


function goNext() {

    const selectedSegments =
        Array.from(
            document.querySelectorAll(
                '#segmentList input[type="checkbox"]:checked'
            )
        ).map(x => ({
            id: Number(x.value),
            name: x.dataset.name
        }));


    const selectedChannel =
        document.querySelector(
            '#channelList input[name="channel"]:checked'
        );


    if (selectedSegments.length === 0) {

        alert("Please select at least one Target Segment.");
        return;
    }


    if (!selectedChannel) {

        alert("Please select Campaign Channel.");
        return;
    }


 const channelId =
    parseInt(selectedChannel.value, 10);

if (Number.isNaN(channelId)) {

    console.error(
        "Invalid Channel Value:",
        selectedChannel.value
    );

    alert(
        "Invalid Channel ID. Please refresh the page and select the channel again."
    );

    return;
}

const channel = {

    id: channelId,

    name:
        selectedChannel.dataset.name
};

console.log(
    "Channel being saved:",
    channel
); 


    console.log("Channel being saved:", channel);


    sessionStorage.setItem(
        "targetSegments",
        JSON.stringify(selectedSegments)
    );

    sessionStorage.setItem(
        "channel",
        JSON.stringify(channel)
    );


    window.location.href = "stores.html";
}