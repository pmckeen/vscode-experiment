const mappings = {};

const encodedMessage = document.getElementById("encodedMessage");
const inputMapping = document.getElementById("inputMapping");
const outputMapping = document.getElementById("outputMapping");
const mappingsList = document.getElementById("mappingsList");
const decodedMessage = document.getElementById("decodedMessage");
const addMappingButton = document.getElementById("addMappingButton");

function addMapping() {
    const input = inputMapping.value.toUpperCase().trim();
    const output = outputMapping.value.toUpperCase().trim();

    if (input.length !== output.length || input === "" || output === "") {
        alert("Input and output mappings must be of equal length and non-empty.");
        return;
    }

    for (let i = 0; i < input.length; i += 1) {
        if (mappings[input[i]] && mappings[input[i]] !== output[i]) {
            mappings[input[i]] = "CONFLICT";
        } else {
            mappings[input[i]] = output[i];
        }
    }

    inputMapping.value = "";
    outputMapping.value = "";

    updateMappingsList();
    decodeMessage();
}

function removeMapping(char) {
    delete mappings[char];
    updateMappingsList();
    decodeMessage();
}

function updateMappingsList() {
    mappingsList.innerHTML = "";

    for (const [key, value] of Object.entries(mappings)) {
        const listItem = document.createElement("li");
        listItem.className = value === "CONFLICT" ? "mapping-item conflict" : "mapping-item";

        const label = document.createElement("span");
        label.textContent = `${key} -> ${value}`;

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.textContent = "Remove";
        removeButton.addEventListener("click", () => removeMapping(key));

        listItem.append(label, removeButton);
        mappingsList.appendChild(listItem);
    }
}

function decodeMessage() {
    const text = encodedMessage.value.toUpperCase();
    const decoded = text.split("").map((char) => {
        if (mappings[char]) {
            return mappings[char] === "CONFLICT"
                ? `<span class="conflict">${char}</span>`
                : mappings[char];
        }

        return char.match(/[A-Z]/) ? "*" : char;
    }).join("");

    decodedMessage.innerHTML = decoded;
}

addMappingButton.addEventListener("click", addMapping);
encodedMessage.addEventListener("input", decodeMessage);
inputMapping.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        addMapping();
    }
});
outputMapping.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        addMapping();
    }
});

decodeMessage();
