/**
 * Clock-to-seconds conversion — the single home for the cross-task TIME
 * REFERENCE invariant (TASK_016 / 017 / 018). Every "MM:SS" / "HH:MM:SS" in
 * the system (transcript timestamps, moment ranges, `cue.start`/`cue.end`,
 * `<video>.currentTime`, the seek that drives a 206 Range request) is seconds
 * ABSOLUTE on the full uploaded video file's timeline — never relative to a
 * cut. A 47:30 line is 2850 seconds, here and everywhere downstream.
 */

/**
 * @param {string} ts "MM:SS" or "HH:MM:SS"
 * @returns {number} seconds, absolute on the file timeline (0 on falsy or unrecognized)
 */
export function timestampToSeconds(ts) {
  if (!ts) return 0;
  const parts = ts.split(':').map(Number);
  if (parts.some((n) => Number.isNaN(n))) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}
