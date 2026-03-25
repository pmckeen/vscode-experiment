export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function isLetter(char) {
    return /^[A-Z]$/.test(char);
}

function isPlainDictionaryWord(word) {
    return /^[A-Z]+$/.test(word);
}

export function normalizeCipherText(text) {
    return (text || "").toUpperCase();
}

export function createEmptyMappings() {
    return {};
}

export function invertMappings(mappings) {
    const reverse = {};

    for (const [cipherLetter, plainLetter] of Object.entries(mappings)) {
        if (isLetter(cipherLetter) && isLetter(plainLetter)) {
            reverse[plainLetter] = cipherLetter;
        }
    }

    return reverse;
}

export function assignMapping(mappings, cipherLetter, plainLetter) {
    if (!isLetter(cipherLetter) || !isLetter(plainLetter)) {
        return { mappings: { ...mappings }, changed: false, swappedWith: null };
    }

    const nextMappings = { ...mappings };
    const currentPlain = nextMappings[cipherLetter];
    const reverse = invertMappings(nextMappings);
    const occupyingCipher = reverse[plainLetter];

    if (currentPlain === plainLetter) {
        return { mappings: nextMappings, changed: false, swappedWith: null };
    }

    if (occupyingCipher && occupyingCipher !== cipherLetter) {
        delete nextMappings[occupyingCipher];
    }

    nextMappings[cipherLetter] = plainLetter;

    if (currentPlain && currentPlain !== plainLetter && occupyingCipher && occupyingCipher !== cipherLetter) {
        nextMappings[occupyingCipher] = currentPlain;
    }

    return {
        mappings: nextMappings,
        changed: true,
        swappedWith: occupyingCipher && occupyingCipher !== cipherLetter ? occupyingCipher : null,
    };
}

export function clearMapping(mappings, cipherLetter) {
    if (!isLetter(cipherLetter) || !mappings[cipherLetter]) {
        return { ...mappings };
    }

    const nextMappings = { ...mappings };
    delete nextMappings[cipherLetter];
    return nextMappings;
}

export function decodeText(text, mappings, unknownGlyph = "•") {
    return normalizeCipherText(text).split("").map((char) => {
        if (!isLetter(char)) {
            return char;
        }

        return mappings[char] || unknownGlyph;
    }).join("");
}

export function tokeniseCipherWords(text) {
    return normalizeCipherText(text).match(/[A-Z]+/g) || [];
}

export function getUniqueCipherWords(text) {
    return [...new Set(tokeniseCipherWords(text))];
}

export function getPattern(word) {
    const indices = new Map();
    let nextIndex = 0;

    return word.split("").map((char) => {
        if (!indices.has(char)) {
            indices.set(char, nextIndex);
            nextIndex += 1;
        }

        return indices.get(char);
    }).join(".");
}

export function buildLetterStats(text) {
    const counts = Object.fromEntries(ALPHABET.map((letter) => [letter, 0]));

    for (const char of normalizeCipherText(text)) {
        if (isLetter(char)) {
            counts[char] += 1;
        }
    }

    return ALPHABET.map((letter) => ({
        letter,
        count: counts[letter],
    })).sort((left, right) => right.count - left.count || left.letter.localeCompare(right.letter));
}

export function getWordCandidates(cipherWord, mappings, dictionary) {
    if (!cipherWord || !dictionary?.length) {
        return [];
    }

    const pattern = getPattern(cipherWord);
    const lockedPairs = cipherWord.split("").map((char) => mappings[char] || null);

    return dictionary.filter((word) => {
        if (!isPlainDictionaryWord(word)) {
            return false;
        }

        if (word.length !== cipherWord.length || getPattern(word) !== pattern) {
            return false;
        }

        for (let index = 0; index < lockedPairs.length; index += 1) {
            if (lockedPairs[index] && lockedPairs[index] !== word[index]) {
                return false;
            }
        }

        return true;
    });
}

export function scoreDecodedText(text, dictionary) {
    const words = tokeniseCipherWords(text);
    const dictionarySet = new Set(dictionary.filter(isPlainDictionaryWord));
    let recognizedWords = 0;

    for (const word of words) {
        if (dictionarySet.has(word)) {
            recognizedWords += 1;
        }
    }

    return {
        totalWords: words.length,
        recognizedWords,
        score: words.length === 0 ? 0 : recognizedWords / words.length,
    };
}

export function buildHintCandidates(cipherText, mappings, dictionary, limit = 8) {
    return getUniqueCipherWords(cipherText)
        .map((cipherWord) => {
            const candidates = getWordCandidates(cipherWord, mappings, dictionary).slice(0, 6);
            return {
                cipherWord,
                candidates,
                unlockedLetters: cipherWord.split("").filter((char) => !mappings[char]).length,
            };
        })
        .filter((entry) => entry.candidates.length > 0 && entry.unlockedLetters > 0)
        .sort((left, right) => {
            if (left.candidates.length !== right.candidates.length) {
                return left.candidates.length - right.candidates.length;
            }

            return right.unlockedLetters - left.unlockedLetters;
        })
        .slice(0, limit);
}

