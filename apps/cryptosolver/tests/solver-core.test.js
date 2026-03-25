import test from "node:test";
import assert from "node:assert/strict";

import {
    assignMapping,
    buildHintCandidates,
    buildLetterStats,
    clearMapping,
    decodeText,
    getPattern,
    getWordCandidates,
} from "../solver-core.js";

test("assignMapping swaps existing plaintext assignments", () => {
    const firstPass = assignMapping({}, "A", "T").mappings;
    const secondPass = assignMapping(firstPass, "B", "E").mappings;
    const swapped = assignMapping(secondPass, "A", "E");

    assert.deepEqual(swapped.mappings, {
        A: "E",
        B: "T",
    });
    assert.equal(swapped.swappedWith, "B");
});

test("clearMapping removes a mapping without disturbing others", () => {
    const mappings = { A: "T", B: "E" };
    assert.deepEqual(clearMapping(mappings, "A"), { B: "E" });
});

test("decodeText preserves punctuation and marks unknown letters", () => {
    const decoded = decodeText("AB!", { A: "T" }, "*");
    assert.equal(decoded, "T*!");
});

test("getPattern captures repeated letters", () => {
    assert.equal(getPattern("APPLE"), "0.1.1.2.3");
});

test("getWordCandidates respects pattern and locked mappings", () => {
    const candidates = getWordCandidates("WKLV", { W: "T" }, ["THIS", "THAT", "TEST"]);
    assert.deepEqual(candidates, ["THIS"]);
});

test("buildLetterStats sorts by frequency", () => {
    const stats = buildLetterStats("ABBCCC");
    assert.equal(stats[0].letter, "C");
    assert.equal(stats[0].count, 3);
});

test("buildHintCandidates includes constrained word matches", () => {
    const hints = buildHintCandidates("WKLV LV D WHVW", { W: "T" }, ["THIS", "IS", "A", "TEST"]);
    assert.equal(hints[0].cipherWord, "WKLV");
    assert.deepEqual(hints[0].candidates, ["THIS"]);
    assert.ok(hints.some((hint) => hint.cipherWord === "LV" && hint.candidates.includes("IS")));
});

test("buildHintCandidates skips fully completed words", () => {
    const hints = buildHintCandidates("WKLV LV", { W: "T", K: "H", L: "I", V: "S" }, ["THIS", "IS"]);
    assert.deepEqual(hints, []);
});

