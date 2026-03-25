import { DICTIONARY } from "./dictionary.js";
import { SAMPLE_PUZZLES } from "./sample-puzzles.js";
import {
    ALPHABET,
    assignMapping,
    buildHintCandidates,
    buildLetterStats,
    clearMapping,
    createEmptyMappings,
    decodeText,
    invertMappings,
    normalizeCipherText,
    scoreDecodedText,
} from "./solver-core.js";

const STORAGE_KEY = "cryptosolver-state-v1";

const encodedMessage = document.getElementById("encodedMessage");
const decodedWorkspace = document.getElementById("decodedWorkspace");
const letterBoard = document.getElementById("letterBoard");
const plainPicker = document.getElementById("plainPicker");
const activeMappingSummary = document.getElementById("activeMappingSummary");
const hintList = document.getElementById("hintList");
const samplePuzzleSelect = document.getElementById("samplePuzzleSelect");
const loadSampleButton = document.getElementById("loadSampleButton");
const clearMappingsButton = document.getElementById("clearMappingsButton");
const clearActiveButton = document.getElementById("clearActiveButton");
const compactModeButton = document.getElementById("compactModeButton");
const solveSummary = document.getElementById("solveSummary");
const recognizedWordSummary = document.getElementById("recognizedWordSummary");

const state = {
    cipherText: "",
    mappings: createEmptyMappings(),
    activeCipherLetter: null,
    compactMode: false,
};

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        cipherText: state.cipherText,
        mappings: state.mappings,
        activeCipherLetter: state.activeCipherLetter,
        compactMode: state.compactMode,
    }));
}

function loadState() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

        if (!saved) {
            return;
        }

        state.cipherText = normalizeCipherText(saved.cipherText || "");
        state.mappings = saved.mappings || createEmptyMappings();
        state.activeCipherLetter = saved.activeCipherLetter || null;
        state.compactMode = Boolean(saved.compactMode);
    } catch (error) {
        state.cipherText = "";
        state.mappings = createEmptyMappings();
        state.activeCipherLetter = null;
        state.compactMode = false;
    }
}

function populateSamples() {
    samplePuzzleSelect.innerHTML = "";

    SAMPLE_PUZZLES.forEach((sample) => {
        const option = document.createElement("option");
        option.value = sample.id;
        option.textContent = `${sample.title} - ${sample.source}`;
        samplePuzzleSelect.appendChild(option);
    });
}

function setCipherText(text) {
    state.cipherText = normalizeCipherText(text);
    encodedMessage.value = state.cipherText;
    render();
}

function getLettersInPuzzle() {
    return new Set((state.cipherText.match(/[A-Z]/g) || []));
}

function getDecodedScore() {
    const decodedText = decodeText(state.cipherText, state.mappings, "?");
    return scoreDecodedText(decodedText, DICTIONARY);
}

function renderSummary() {
    const stats = buildLetterStats(state.cipherText);
    const usedLetters = stats.filter((entry) => entry.count > 0).length;
    const assignedLetters = Object.keys(state.mappings).length;
    const decodedScore = getDecodedScore();

    solveSummary.innerHTML = "";

    [
        `${usedLetters} cipher letters in play`,
        `${assignedLetters} mappings set`,
        `${decodedScore.recognizedWords}/${decodedScore.totalWords} full words recognized`,
    ].forEach((text) => {
        const badge = document.createElement("span");
        badge.className = "summary-pill";
        badge.textContent = text;
        solveSummary.appendChild(badge);
    });

    recognizedWordSummary.textContent = `${decodedScore.recognizedWords} recognized words`;
    compactModeButton.textContent = `Compact mode: ${state.compactMode ? "On" : "Off"}`;
}

function tokenizeWorkspaceText(text) {
    return text.match(/[A-Z']+[.,!?;:]*|\s+|[^A-Z'\s]+/g) || [];
}

function createLetterButton(letter, className, label) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `workspace-letter ${className}`;
    button.textContent = label;
    button.dataset.letter = letter;
    button.classList.toggle("is-active", state.activeCipherLetter === letter);
    button.addEventListener("click", () => {
        state.activeCipherLetter = letter;
        render();
    });
    return button;
}

function renderDecodedWorkspace() {
    decodedWorkspace.innerHTML = "";
    decodedWorkspace.classList.toggle("is-compact", state.compactMode);

    if (!state.cipherText.trim()) {
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = "Your puzzle grid will appear here once you paste or load a cipher.";
        decodedWorkspace.appendChild(empty);
        return;
    }

    const fragment = document.createDocumentFragment();

    tokenizeWorkspaceText(state.cipherText).forEach((token) => {
        if (/^\s+$/.test(token)) {
            const spacer = document.createElement("span");
            spacer.className = "word-space";
            spacer.textContent = " ";
            fragment.appendChild(spacer);
            return;
        }

        const wordBlock = document.createElement("div");
        wordBlock.className = "word-block";

        const plainRow = document.createElement("div");
        plainRow.className = "word-row word-row-plain";

        const cipherRow = document.createElement("div");
        cipherRow.className = "word-row word-row-cipher";

        for (const char of token) {
            if (/^[A-Z]$/.test(char)) {
                plainRow.appendChild(createLetterButton(char, "plain-letter", state.mappings[char] || "•"));
                cipherRow.appendChild(createLetterButton(char, "cipher-letter", char));
                continue;
            }

            const plainPunct = document.createElement("span");
            plainPunct.className = "workspace-punct";
            plainPunct.textContent = char;

            const cipherPunct = document.createElement("span");
            cipherPunct.className = "workspace-punct";
            cipherPunct.textContent = char;

            plainRow.appendChild(plainPunct);
            cipherRow.appendChild(cipherPunct);
        }

        wordBlock.append(plainRow, cipherRow);
        fragment.appendChild(wordBlock);
    });

    decodedWorkspace.appendChild(fragment);
}

function renderLetterBoard() {
    const stats = buildLetterStats(state.cipherText);
    const lettersInPuzzle = getLettersInPuzzle();

    letterBoard.innerHTML = "";

    stats.forEach(({ letter, count }) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "letter-tile";
        button.classList.toggle("is-active", state.activeCipherLetter === letter);
        button.classList.toggle("is-used", lettersInPuzzle.has(letter));
        button.innerHTML = `
            <span class="tile-cipher">${letter}</span>
            <span class="tile-plain">${state.mappings[letter] || "•"}</span>
            <span class="tile-count">${count}x</span>
        `;
        button.addEventListener("click", () => {
            state.activeCipherLetter = letter;
            render();
        });
        letterBoard.appendChild(button);
    });

    if (state.activeCipherLetter) {
        const currentPlain = state.mappings[state.activeCipherLetter] || "unassigned";
        activeMappingSummary.textContent = `${state.activeCipherLetter} -> ${currentPlain}`;
    } else {
        activeMappingSummary.textContent = "Select a cipher letter";
    }
}

function renderPlainPicker() {
    const reverse = invertMappings(state.mappings);
    plainPicker.innerHTML = "";

    ALPHABET.forEach((plainLetter) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "plain-tile";
        const assignedCipher = reverse[plainLetter];
        const isSelected = state.activeCipherLetter && state.mappings[state.activeCipherLetter] === plainLetter;

        button.classList.toggle("is-selected", Boolean(isSelected));
        button.disabled = !state.activeCipherLetter;
        button.innerHTML = `
            <span class="tile-cipher">${plainLetter}</span>
            <span class="tile-count">${assignedCipher ? `used by ${assignedCipher}` : "available"}</span>
        `;
        button.addEventListener("click", () => {
            if (!state.activeCipherLetter) {
                return;
            }

            state.mappings = assignMapping(state.mappings, state.activeCipherLetter, plainLetter).mappings;
            render();
        });

        plainPicker.appendChild(button);
    });
}

function applyCandidateWord(cipherWord, plainWord) {
    let nextMappings = { ...state.mappings };

    for (let index = 0; index < cipherWord.length; index += 1) {
        nextMappings = assignMapping(nextMappings, cipherWord[index], plainWord[index]).mappings;
    }

    state.mappings = nextMappings;
    render();
}

function renderHints() {
    hintList.innerHTML = "";

    if (!state.cipherText.trim()) {
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = "Hints will appear once there is a puzzle to analyze.";
        hintList.appendChild(empty);
        return;
    }

    const hints = buildHintCandidates(state.cipherText, state.mappings, DICTIONARY);

    if (hints.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = "No dictionary matches yet. Add a few mappings or try the sample puzzle.";
        hintList.appendChild(empty);
        return;
    }

    hints.forEach((hint) => {
        const card = document.createElement("article");
        card.className = "hint-card";

        const heading = document.createElement("div");
        heading.className = "hint-heading";
        heading.innerHTML = `<h3>${hint.cipherWord}</h3><p>${hint.candidates.length} candidate words</p>`;

        const actions = document.createElement("div");
        actions.className = "hint-actions";

        hint.candidates.forEach((candidate) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "hint-chip";
            button.textContent = candidate;
            button.addEventListener("click", () => applyCandidateWord(hint.cipherWord, candidate));
            actions.appendChild(button);
        });

        card.append(heading, actions);
        hintList.appendChild(card);
    });
}

function render() {
    renderSummary();
    renderDecodedWorkspace();
    renderLetterBoard();
    renderPlainPicker();
    renderHints();
    saveState();
}

encodedMessage.addEventListener("input", (event) => {
    state.cipherText = normalizeCipherText(event.target.value);
    render();
});

loadSampleButton.addEventListener("click", () => {
    const selected = SAMPLE_PUZZLES.find((sample) => sample.id === samplePuzzleSelect.value);

    if (!selected) {
        return;
    }

    state.mappings = createEmptyMappings();
    state.activeCipherLetter = null;
    setCipherText(selected.cipherText);
});

clearMappingsButton.addEventListener("click", () => {
    state.mappings = createEmptyMappings();
    render();
});

clearActiveButton.addEventListener("click", () => {
    if (!state.activeCipherLetter) {
        return;
    }

    state.mappings = clearMapping(state.mappings, state.activeCipherLetter);
    render();
});

compactModeButton.addEventListener("click", () => {
    state.compactMode = !state.compactMode;
    render();
});

loadState();
populateSamples();

if (!state.cipherText) {
    setCipherText(SAMPLE_PUZZLES[0].cipherText);
} else {
    encodedMessage.value = state.cipherText;
    render();
}
