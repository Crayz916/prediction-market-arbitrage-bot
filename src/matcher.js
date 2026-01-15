function jaccardSimilarity(str1, str2) {
    const set1 = new Set(str1.toLowerCase().split(/\s+/));
    const set2 = new Set(str2.toLowerCase().split(/\s+/));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
}

function levenshteinDistance(str1, str2) {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
    for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
            }
        }
    }
    return matrix[str2.length][str1.length];
}

function combinedSimilarity(str1, str2) {
    const jaccard = jaccardSimilarity(str1, str2);
    const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
    const maxLength = Math.max(str1.length, str2.length);
    const levenshtein = maxLength === 0 ? 1 : 1 - distance / maxLength;
    return jaccard * 0.6 + levenshtein * 0.4;
}

export function matchOutcomes(polymarketOutcomes, kalshiOutcomes, threshold = 0.7) {
    const matches = [];
    const usedKalshiIndices = new Set();

    for (const polyOutcome of polymarketOutcomes) {
        let bestMatch = null;
        let bestScore = 0;
        let bestIndex = -1;

        for (let i = 0; i < kalshiOutcomes.length; i++) {
            if (usedKalshiIndices.has(i)) continue;
            const score = combinedSimilarity(polyOutcome.title, kalshiOutcomes[i].title);
            if (score > bestScore && score >= threshold) {
                bestScore = score;
                bestMatch = kalshiOutcomes[i];
                bestIndex = i;
            }
        }

        if (bestMatch) {
            matches.push({ polymarket: polyOutcome, kalshi: bestMatch, similarity: bestScore });
            usedKalshiIndices.add(bestIndex);
        }
    }

    return matches;
}
