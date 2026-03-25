const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const STORAGE_KEY = "cryptoencoder-state-v1";

const plainMessage = document.getElementById("plainMessage");
const encodedMessage = document.getElementById("encodedMessage");
const mappingTable = document.getElementById("mappingTable");
const previewStats = document.getElementById("previewStats");
const shuffleButton = document.getElementById("shuffleButton");
const resetButton = document.getElementById("resetButton");
const copyButton = document.getElementById("copyButton");

const state = {
    plainText: "",
    cipherMap: createIdentityMap(),
};

function createIdentityMap() {
    return Object.fromEntries(ALPHABET.map((letter) => [letter, letter]));
}

function randomShuffle(items) {
    const result = [...items];

    for (let index = result.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }

    return result;
}

function createCipherMap() {
    const shuffled = randomShuffle(ALPHABET);
    const map = {};

    ALPHABET.forEach((letter, index) => {
        map[letter] = shuffled[index];
    });

    return map;
}

function normalizePlainText(text) {
    return (text || "").toUpperCase();
}

function encodeText(text, cipherMap) {
    return normalizePlainText(text).split("").map((char) => {
        if (/^[A-Z]$/.test(char)) {
            return cipherMap[char];
        }

        return char;
    }).join("");
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        plainText: state.plainText,
        cipherMap: state.cipherMap,
    }));
}

function loadState() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (!saved) {
            return;
        }

        state.plainText = normalizePlainText(saved.plainText || "");
        state.cipherMap = saved.cipherMap || createIdentityMap();
    } catch {
        state.plainText = "";
        state.cipherMap = createIdentityMap();
    }
}

function renderMappingTable() {
    mappingTable.innerHTML = "";

    ALPHABET.forEach((letter) => {
        const pair = document.createElement("div");
        pair.className = "mapping-pair";
        pair.innerHTML = `<span>${letter}</span><strong>${state.cipherMap[letter]}</strong>`;
        mappingTable.appendChild(pair);
    });
}

function renderStats() {
    const encodedText = encodeText(state.plainText, state.cipherMap);
    const stats = [
        { label: "Plain length", value: `${state.plainText.length} chars` },
        { label: "Encoded length", value: `${encodedText.length} chars` },
        { label: "Distinct mapped letters", value: `${new Set(Object.values(state.cipherMap)).size}` },
    ];

    previewStats.innerHTML = "";
    stats.forEach((item) => {
        const card = document.createElement("div");
        card.className = "stat-card";
        card.innerHTML = `<strong>${item.label}</strong><p>${item.value}</p>`;
        previewStats.appendChild(card);
    });
}

function render() {
    const encodedText = encodeText(state.plainText, state.cipherMap);
    plainMessage.value = state.plainText;
    encodedMessage.value = encodedText;
    renderMappingTable();
    renderStats();
    saveState();
}

plainMessage.addEventListener("input", (event) => {
    state.plainText = normalizePlainText(event.target.value);
    render();
});

shuffleButton.addEventListener("click", () => {
    state.cipherMap = createCipherMap();
    render();
});

resetButton.addEventListener("click", () => {
    state.plainText = "";
    state.cipherMap = createIdentityMap();
    render();
});

copyButton.addEventListener("click", async () => {
    await navigator.clipboard.writeText(encodedMessage.value);
    copyButton.textContent = "Copied";
    window.setTimeout(() => {
        copyButton.textContent = "Copy encoded";
    }, 1200);
});

loadState();
render();
