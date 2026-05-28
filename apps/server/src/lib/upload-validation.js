/**
 * Standalone validators used by the upload route. Pure functions —
 * no I/O, no module-level state, easy to unit-test in isolation.
 */

const UUID_CHARS = new Set('0123456789abcdef-');
const UUID_HYPHEN_POSITIONS = [8, 13, 18, 23];

/**
 * Returns true when `id` looks like a v4 uuid (36 chars, hex + hyphens
 * at the canonical positions). Char-by-char check — NO regex per
 * [[sonar_quality_gate_gotchas]] (avoids javascript:S5852 ReDoS flag).
 *
 * @param {string} id
 * @returns {boolean}
 */
export function isValidVideoId(id) {
  if (typeof id !== 'string' || id.length !== 36) return false;
  for (let i = 0; i < id.length; i++) {
    const c = id[i];
    if (UUID_HYPHEN_POSITIONS.includes(i)) {
      if (c !== '-') return false;
    } else {
      if (!UUID_CHARS.has(c) || c === '-') return false;
    }
  }
  return true;
}
