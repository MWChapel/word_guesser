const POW3: readonly number[] = [1, 3, 9, 27, 81];

// Returns a number 0-242 encoding the Wordle coloring for a guess against an answer.
// 0 = grey, 1 = yellow, 2 = green per position (base-3).
export function encodePattern(guess: string, answer: string): number {
  const counts = new Int8Array(26);
  for (let i = 0; i < 5; i++) {
    if (guess[i] !== answer[i]) {
      counts[answer.charCodeAt(i) - 97]++;
    }
  }
  let result = 0;
  for (let i = 0; i < 5; i++) {
    if (guess[i] === answer[i]) {
      result += 2 * POW3[i];
    } else {
      const c = guess.charCodeAt(i) - 97;
      if (counts[c] > 0) {
        result += POW3[i];
        counts[c]--;
      }
    }
  }
  return result;
}

// Expected bits of information gained by guessing `guess` when `answers` are the remaining candidates.
export function calculateEntropy(guess: string, answers: string[]): number {
  const n = answers.length;
  if (n === 0) return 0;
  const patternCounts = new Int32Array(243);
  for (let i = 0; i < n; i++) {
    patternCounts[encodePattern(guess, answers[i])]++;
  }
  let entropy = 0;
  const logN = Math.log2(n);
  for (let p = 0; p < 243; p++) {
    const k = patternCounts[p];
    if (k > 0) entropy += k * (logN - Math.log2(k));
  }
  return entropy / n;
}
