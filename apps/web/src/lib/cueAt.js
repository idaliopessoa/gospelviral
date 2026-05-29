/**
 * Select the subtitle cue active at time `t` (seconds, absolute on the file
 * timeline — same scale as `<video>.currentTime` and the cues). Pure selector,
 * testable without React.
 *
 * Cues are gap-free tiled (`cue.end === next.start`, half-open `[start, end)`)
 * as produced by `buildSubtitleCues`. Edge behavior keeps the subtitle from
 * ever blanking when cues exist:
 *  - `t` before the first cue → the first cue (representative pre-roll / the
 *    static cue shown while paused or in EDIÇÃO mode)
 *  - `t` at/after the last cue's end → the last cue (held; playback pauses at
 *    `endSec` anyway)
 *
 * @param {import('@gospelviral/shared').SubtitleCue[]} cues
 * @param {number} t seconds, absolute file timeline
 * @returns {import('@gospelviral/shared').SubtitleCue|null} active cue, or null when there are no cues
 */
export function cueAt(cues, t) {
  if (!Array.isArray(cues) || cues.length === 0) return null;
  for (const cue of cues) {
    if (t < cue.end) return cue;
  }
  return cues[cues.length - 1];
}
