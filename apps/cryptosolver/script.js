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
const OCR_WHITELIST = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-'.,!?;: \n";
const TESSERACT_VERSION = "7.0.0";
const TESSERACT_DATA_VERSION = "1.0.0";
const TESSERACT_MODULE_URL = `https://cdn.jsdelivr.net/npm/tesseract.js@${TESSERACT_VERSION}/dist/tesseract.esm.min.js`;
const TESSERACT_WORKER_URL = `https://cdn.jsdelivr.net/npm/tesseract.js@${TESSERACT_VERSION}/dist/worker.min.js`;
const TESSERACT_CORE_URL = "https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0";
const TESSERACT_LANG_URL = `https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng@${TESSERACT_DATA_VERSION}/4.0.0`;

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
const openOcrModalButton = document.getElementById("openOcrModalButton");
const solveSummary = document.getElementById("solveSummary");
const recognizedWordSummary = document.getElementById("recognizedWordSummary");
const ocrModal = document.getElementById("ocrModal");
const ocrModalBackdrop = document.getElementById("ocrModalBackdrop");
const closeOcrModalButton = document.getElementById("closeOcrModalButton");
const ocrStatus = document.getElementById("ocrStatus");
const ocrStatusBadge = document.getElementById("ocrStatusBadge");
const ocrVideo = document.getElementById("ocrVideo");
const ocrPreview = document.getElementById("ocrPreview");
const cameraEmptyState = document.getElementById("cameraEmptyState");
const startCameraButton = document.getElementById("startCameraButton");
const captureFrameButton = document.getElementById("captureFrameButton");
const retakeFrameButton = document.getElementById("retakeFrameButton");
const runOcrButton = document.getElementById("runOcrButton");
const useOcrTextButton = document.getElementById("useOcrTextButton");
const ocrResultText = document.getElementById("ocrResultText");

const state = {
    cipherText: "",
    mappings: createEmptyMappings(),
    activeCipherLetter: null,
    compactMode: false,
    ocrResult: "",
    ocrStatus: "Camera idle",
    ocrRunning: false,
    ocrModalOpen: false,
    cameraStream: null,
    capturedImageUrl: "",
    capturedBlob: null,
};

let tesseractModulePromise;
let ocrWorkerPromise;

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
    } catch {
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
    return scoreDecodedText(decodeText(state.cipherText, state.mappings, "?"), DICTIONARY);
}

function setOcrStatus(message) {
    state.ocrStatus = message;
    ocrStatus.textContent = message;
    ocrStatusBadge.textContent = message;
}

function normalizeOcrText(text) {
    return normalizeCipherText(text)
        .replace(/[|]/g, "I")
        .replace(/[“”]/g, '"')
        .replace(/[‘’`]/g, "'")
        .replace(/[—–]/g, "-")
        .replace(/[^A-Z0-9'".,!?;:\-()\n ]+/g, " ")
        .replace(/[ \t]+/g, " ")
        .replace(/ *\n */g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

function revokeCapturedImageUrl() {
    if (state.capturedImageUrl) {
        URL.revokeObjectURL(state.capturedImageUrl);
        state.capturedImageUrl = "";
    }
}

function clearCapturedFrame() {
    revokeCapturedImageUrl();
    state.capturedBlob = null;
    ocrPreview.removeAttribute("src");
}

async function stopCamera() {
    if (state.cameraStream) {
        state.cameraStream.getTracks().forEach((track) => track.stop());
        state.cameraStream = null;
    }

    ocrVideo.srcObject = null;
}

async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
        setOcrStatus("Camera API not supported in this browser");
        return;
    }

    try {
        await stopCamera();
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: { ideal: "environment" },
                width: { ideal: 1920 },
                height: { ideal: 1080 },
            },
            audio: false,
        });

        state.cameraStream = stream;
        ocrVideo.srcObject = stream;
        await ocrVideo.play();
        setOcrStatus("Camera ready");
        renderOcr();
    } catch (error) {
        setOcrStatus(`Camera unavailable: ${error.message}`);
    }
}

async function captureFrame() {
    if (!state.cameraStream) {
        setOcrStatus("Start the camera first");
        return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = ocrVideo.videoWidth || 1280;
    canvas.height = ocrVideo.videoHeight || 720;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(ocrVideo, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.95));
    if (!blob) {
        setOcrStatus("Could not capture frame");
        return;
    }

    clearCapturedFrame();
    state.capturedBlob = blob;
    state.capturedImageUrl = URL.createObjectURL(blob);
    ocrPreview.src = state.capturedImageUrl;
    setOcrStatus("Frame captured");
    renderOcr();
}

async function preprocessCapturedImage(blob) {
    const imageUrl = URL.createObjectURL(blob);
    try {
        const image = await new Promise((resolve, reject) => {
            const nextImage = new Image();
            nextImage.onload = () => resolve(nextImage);
            nextImage.onerror = () => reject(new Error("Unable to load captured image for OCR."));
            nextImage.src = imageUrl;
        });

        const scale = Math.min(1, 1800 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d", { willReadFrequently: true });
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const { data } = imageData;
        for (let index = 0; index < data.length; index += 4) {
            const grayscale = (0.299 * data[index]) + (0.587 * data[index + 1]) + (0.114 * data[index + 2]);
            const contrasted = (grayscale - 128) * 1.4 + 128;
            const output = contrasted > 160 ? 255 : 0;
            data[index] = output;
            data[index + 1] = output;
            data[index + 2] = output;
        }

        context.putImageData(imageData, 0, 0);
        return canvas;
    } finally {
        URL.revokeObjectURL(imageUrl);
    }
}

async function loadTesseractModule() {
    if (!tesseractModulePromise) {
        setOcrStatus("Loading OCR engine from CDN");
        tesseractModulePromise = import(TESSERACT_MODULE_URL);
    }

    return tesseractModulePromise;
}

async function getOcrWorker() {
    if (!ocrWorkerPromise) {
        const { default: Tesseract } = await loadTesseractModule();
        const { createWorker, PSM } = Tesseract;

        ocrWorkerPromise = createWorker("eng", 1, {
            logger: ({ status, progress }) => {
                const percent = progress ? ` ${Math.round(progress * 100)}%` : "";
                setOcrStatus(`${status}${percent}`.trim());
            },
            workerPath: TESSERACT_WORKER_URL,
            corePath: TESSERACT_CORE_URL,
            langPath: TESSERACT_LANG_URL,
        }).then(async (worker) => {
            await worker.setParameters({
                tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
                tessedit_char_whitelist: OCR_WHITELIST,
                preserve_interword_spaces: "1",
            });
            return worker;
        });
    }

    return ocrWorkerPromise;
}

async function runOcr() {
    if (!state.capturedBlob || state.ocrRunning) {
        setOcrStatus("Capture a frame before running OCR");
        return;
    }

    state.ocrRunning = true;
    renderOcr();
    setOcrStatus("Preparing capture");

    try {
        const worker = await getOcrWorker();
        const processedImage = await preprocessCapturedImage(state.capturedBlob);
        const result = await worker.recognize(processedImage);
        state.ocrResult = normalizeOcrText(result.data.text || "");
        ocrResultText.value = state.ocrResult;
        setOcrStatus(state.ocrResult ? "OCR complete" : "OCR finished with no text detected");
    } catch (error) {
        state.ocrResult = "";
        ocrResultText.value = "";
        setOcrStatus(`OCR failed: ${error.message}`);
    } finally {
        state.ocrRunning = false;
        renderOcr();
    }
}

function openOcrModal() {
    state.ocrModalOpen = true;
    ocrModal.classList.add("is-open");
    ocrModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    renderOcr();
}

async function closeOcrModal() {
    state.ocrModalOpen = false;
    ocrModal.classList.remove("is-open");
    ocrModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    await stopCamera();
    renderOcr();
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

function renderOcr() {
    const hasCapture = Boolean(state.capturedBlob);
    const cameraActive = Boolean(state.cameraStream);

    startCameraButton.disabled = state.ocrRunning;
    captureFrameButton.disabled = !cameraActive || state.ocrRunning;
    retakeFrameButton.disabled = state.ocrRunning;
    runOcrButton.disabled = !hasCapture || state.ocrRunning;
    useOcrTextButton.disabled = !state.ocrResult.trim();
    ocrResultText.value = state.ocrResult;

    ocrVideo.classList.toggle("is-visible", cameraActive && !hasCapture);
    ocrPreview.classList.toggle("is-visible", hasCapture);
    cameraEmptyState.classList.toggle("is-hidden", cameraActive || hasCapture);
    retakeFrameButton.textContent = hasCapture ? "Clear capture" : "Retake";
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
            } else {
                const plainPunct = document.createElement("span");
                plainPunct.className = "workspace-punct";
                plainPunct.textContent = char;
                const cipherPunct = document.createElement("span");
                cipherPunct.className = "workspace-punct";
                cipherPunct.textContent = char;
                plainRow.appendChild(plainPunct);
                cipherRow.appendChild(cipherPunct);
            }
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

    activeMappingSummary.textContent = state.activeCipherLetter
        ? `${state.activeCipherLetter} -> ${state.mappings[state.activeCipherLetter] || "unassigned"}`
        : "Select a cipher letter";
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
    renderOcr();
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

openOcrModalButton.addEventListener("click", openOcrModal);
ocrModalBackdrop.addEventListener("click", closeOcrModal);
closeOcrModalButton.addEventListener("click", closeOcrModal);
startCameraButton.addEventListener("click", startCamera);
captureFrameButton.addEventListener("click", captureFrame);
retakeFrameButton.addEventListener("click", () => {
    clearCapturedFrame();
    state.ocrResult = "";
    ocrResultText.value = "";
    setOcrStatus(state.cameraStream ? "Camera ready" : "Camera idle");
    renderOcr();
});
runOcrButton.addEventListener("click", runOcr);
useOcrTextButton.addEventListener("click", async () => {
    if (!state.ocrResult.trim()) {
        return;
    }
    state.mappings = createEmptyMappings();
    state.activeCipherLetter = null;
    setCipherText(state.ocrResult);
    await closeOcrModal();
});
ocrResultText.addEventListener("input", (event) => {
    state.ocrResult = normalizeOcrText(event.target.value);
    renderOcr();
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

document.addEventListener("keydown", async (event) => {
    if (event.key === "Escape" && state.ocrModalOpen) {
        await closeOcrModal();
    }
});

loadState();
populateSamples();
renderOcr();
if (!state.cipherText) {
    setCipherText(SAMPLE_PUZZLES[0].cipherText);
} else {
    encodedMessage.value = state.cipherText;
    render();
}
