/**
 * LexoRank-style fractional indexing using ASCII strings.
 * Generates sortable string keys that allow insertions between any two keys
 * with a single UPDATE query (no cascading updates).
 */

const MIN_CHAR = 'A'; // ASCII 65
const MAX_CHAR = 'z'; // ASCII 122
const MID_CHAR = 'U'; // roughly midpoint
const FLOOR_CHAR = '!'; // ASCII 33 — absolute floor for getBeforeRank

/**
 * Returns a string that sorts between `a` and `b`.
 * - If both null/undefined: returns midpoint
 * - If only `a`: returns something after `a`
 * - If only `b`: returns something before `b`
 * - If both: returns midpoint between them
 */
export function getMidpointRank(a?: string | null, b?: string | null): string {
  if (!a && !b) return MID_CHAR;
  if (!a) return getBeforeRank(b!);
  if (!b) return getAfterRank(a);
  return midpoint(a, b);
}

/** Returns a rank that sorts before `rank` */
export function getBeforeRank(rank: string): string {
  return midpoint(MIN_CHAR, rank);
}

/** Returns a rank that sorts after `rank` */
export function getAfterRank(rank: string): string {
  return midpoint(rank, MAX_CHAR.repeat(rank.length));
}

/** Generate an initial rank for position `index` in a list of `total` items */
export function getInitialRank(index: number, total: number): string {
  // Spread across the character space evenly
  const step = Math.floor(57 / (total + 1)); // 57 = range A-z
  const charCode = 65 + step * (index + 1);
  return String.fromCharCode(Math.min(charCode, 122));
}

function midpoint(a: string, b: string): string {
  // Ensure a < b
  if (a >= b) {
    // Append a character after `a`
    return a + MID_CHAR;
  }

  // Pad shorter string
  const maxLen = Math.max(a.length, b.length);
  const paddedA = a.padEnd(maxLen, MIN_CHAR);
  const paddedB = b.padEnd(maxLen, MAX_CHAR);

  let result = '';
  let carry = false;

  for (let i = 0; i < maxLen; i++) {
    const charA = paddedA.charCodeAt(i);
    const charB = paddedB.charCodeAt(i);

    if (charA === charB) {
      result += String.fromCharCode(charA);
      continue;
    }

    const mid = Math.floor((charA + charB) / 2);

    if (mid === charA) {
      // Not enough space — go one level deeper
      result += String.fromCharCode(charA);
      // Take midpoint of remainder
      const restA = paddedA.slice(i + 1);
      const restB = MAX_CHAR.repeat(restA.length || 1);
      const midRest = midpoint(restA || MIN_CHAR, restB);
      return result + midRest;
    }

    result += String.fromCharCode(mid);
    carry = true;
    break;
  }

  if (!carry) {
    // Strings are equal or adjacent — extend with midpoint
    result += MID_CHAR;
  }

  return result;
}
