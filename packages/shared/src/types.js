/**
 * Canonical primitives that flow across the HTTP and persistence boundaries.
 * Defined as JSDoc typedefs so both apps/web and apps/server can lean on them
 * without a TypeScript build step.
 */

/**
 * @typedef {Object} CanvasReference
 * @property {1080} width
 * @property {1920} height
 */
export const CANVAS_REFERENCE = Object.freeze({ width: 1080, height: 1920 });

/**
 * Subtitle anchor presets (percentage of canvas height).
 * @typedef {Object} SubtitleAnchors
 * @property {12} top
 * @property {50} center
 * @property {86} bottom
 */
export const SUBTITLE_ANCHOR_PERCENT = Object.freeze({ top: 12, center: 50, bottom: 86 });

/**
 * @typedef {Object} SubtitleConfig
 * @property {string} font
 * @property {string} textColor
 * @property {'solid'|'transparent'} background
 * @property {string} bgColor
 * @property {number} charsPerScreen
 * @property {number} lines
 * @property {'top'|'center'|'bottom'} position
 * @property {'S'|'M'|'L'} size
 * @property {boolean} highlightScripture
 * @property {boolean} highlightKeywords
 * @property {number} x  offset in 1080-px canvas reference
 * @property {number} y  offset in 1080-px canvas reference
 */

/**
 * @typedef {Object} VideoConfig
 * @property {number} x      canvas-reference px
 * @property {number} y      canvas-reference px
 * @property {number} scale  multiplier, 1 = native
 */

/**
 * @typedef {Object} OverlayConfig
 * @property {string|null} dataURL  data:image/png;base64,... or null when absent
 * @property {number} opacity       0..1
 * @property {string|null} filename original filename for UI display
 */

/**
 * @typedef {Object} ScoreEntry
 * @property {number} score   0..10
 * @property {string} notes   free-form analyst rationale
 */

/**
 * @typedef {Object} ScoreBreakdown
 * @property {ScoreEntry} emotional_resonance
 * @property {ScoreEntry} information_value
 * @property {ScoreEntry} story_quality
 * @property {ScoreEntry} shareability
 * @property {ScoreEntry} controversy_potential
 * @property {ScoreEntry} hook_strength
 */

/**
 * @typedef {Object} TheologicalCheck
 * @property {boolean} christ_centered
 * @property {boolean} scripture_based
 * @property {boolean} grace_focused
 * @property {boolean} hope_present
 * @property {boolean} authentic
 * @property {string[]} red_flags
 */

/**
 * @typedef {Object} ColdOpenAnalysis
 * @property {number} viability_score          0..50
 * @property {'apply_cold_open'|'keep_linear'} decision
 * @property {{timestamp: string, why_powerful: string}} peak_moment
 *   `timestamp` is a RANGE string `"START-END"` (each side `MM:SS` or
 *   `HH:MM:SS`), e.g. `"01:28:43-01:29:00"` — the prompt mandates this form.
 *   Parse it via `parseColdOpenRange` (split on `-` FIRST; passing the whole
 *   string to `timestampToSeconds` returns 0). Drives the D6 cold-open
 *   playback segment `[peak, fullCut]`.
 */

/**
 * @typedef {Object} KeyScripture
 * @property {string} reference   e.g. "Salmos 34:18"
 * @property {string} text
 * @property {string} when_to_display
 */

/**
 * @typedef {Object} CaptionBlock
 * @property {string} text
 * @property {string} structure_used
 * @property {number} word_count
 */

/**
 * @typedef {Object} Cta
 * @property {string} primary
 * @property {'evangelization'|'edification'|'prayer'|'long_form'} objective
 */

/**
 * @typedef {Object} Moment
 * @property {number} rank                            1..5
 * @property {string} timestamp_start                 "MM:SS"
 * @property {string} timestamp_end                   "MM:SS"
 * @property {number} duration_seconds
 * @property {'evangelization'|'edification'|'hybrid'} content_purpose
 * @property {number} viral_score                     0..10
 * @property {ScoreBreakdown} score_breakdown
 * @property {TheologicalCheck} theological_check
 * @property {ColdOpenAnalysis} cold_open_analysis
 * @property {string} theme
 * @property {string} content_category
 * @property {string} hook_title
 * @property {string} key_quote
 * @property {KeyScripture} key_scripture
 * @property {CaptionBlock} caption
 * @property {{all: string}} hashtags
 * @property {Cta} cta
 * @property {string} viral_reasoning
 */

/**
 * @typedef {Object} AnalysisMetadata
 * @property {string} total_duration                  "MM:SS"
 * @property {string} overall_topic
 * @property {string} content_type
 * @property {string[]} primary_scripture_references
 * @property {string[]} theological_themes
 */

/**
 * @typedef {Object} AnalysisSummary
 * @property {number} candidates_above_threshold
 * @property {5} top_moments_selected
 * @property {{evangelization: string, edification: string}} balance
 */

/**
 * @typedef {Object} AnalysisResponse
 * @property {AnalysisMetadata} metadata
 * @property {AnalysisSummary} analysis_summary
 * @property {Moment[]} top_moments              length exactly 5 after parser slicing
 */

/**
 * @typedef {Object} AnalysisRequest
 * @property {string} url
 * @property {string} transcript
 * @property {'cli'|'api'} [mode]
 * @property {string} [model]
 */

/**
 * @typedef {Object} RuntimeStatus
 * @property {boolean} cli       claude CLI detected on PATH
 * @property {boolean} apiKey    a valid-looking ANTHROPIC_API_KEY present in the environment
 * @property {'cli'|'api'} recommended
 */

export const ANALYSIS_RESPONSE_REQUIRED_KEYS = Object.freeze([
  'metadata',
  'analysis_summary',
  'top_moments',
]);

export const TOP_MOMENTS_COUNT = 5;

/**
 * Reference to a video file ingested via upload. Pure handle — server owns the
 * disk path under the configured upload dir; consumers see only the typed
 * envelope. Codec / fps / resolution / duration are NOT part of this shape
 * (the file is a reference, not a description) — Phase 6 export will read
 * them from a separate module if needed.
 *
 * @typedef {Object} VideoSource
 * @property {string} id           uuid v4 generated server-side
 * @property {string} filename     sanitized original filename (display only; NEVER on disk)
 * @property {number} sizeBytes
 * @property {string} mimeType     one of VIDEO_MIME_ALLOWLIST_DEFAULT (or whatever the server allows)
 * @property {string} uploadedAt   ISO 8601 timestamp
 */

/**
 * A single subtitle cue on the FULL VIDEO FILE timeline. The bilateral
 * primitive for subtitle timing — shared by the Phase 5 live player (compares
 * `<video>.currentTime` against `start`/`end`) and the Phase 6 burned-in
 * export ("o que se vê é o que se queima"). Built by `buildSubtitleCues`.
 *
 * @typedef {Object} SubtitleCue
 * @property {string} text   normalized cue text (timecodes stripped)
 * @property {number} start  seconds, ABSOLUTE on the uploaded file timeline (a 47:30 line → 2850); NEVER relative to the cut
 * @property {number} end    seconds, ABSOLUTE; == the next visible cue's start, last == segment endSec
 */

/**
 * Phase 4 default mime allowlist for video uploads. `mp4` covers H.264/H.265
 * containers from most editors; `quicktime` covers `.mov` (iPhone, Premiere);
 * `webm` is included at zero extra cost (VP8/VP9/AV1).
 */
export const VIDEO_MIME_ALLOWLIST_DEFAULT = Object.freeze(
  new Set(['video/mp4', 'video/quicktime', 'video/webm']),
);
