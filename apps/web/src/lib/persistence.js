import {
  DEFAULT_OVERLAY_CONFIG,
  DEFAULT_SUBTITLE_CONFIG,
  DEFAULT_VIDEO_CONFIG,
} from '../config/defaults.js';

export const STORAGE_KEY = 'viral-cristao:config:v1';
const CURRENT_SCHEMA_VERSION = 1;
const DEBOUNCE_MS = 300;

/**
 * Defaults bundled at module load so the cold-load path is one allocation.
 */
const DEFAULT_PRESETS = Object.freeze({
  subtitleConfig: DEFAULT_SUBTITLE_CONFIG,
  videoConfig: DEFAULT_VIDEO_CONFIG,
  overlayConfig: DEFAULT_OVERLAY_CONFIG,
  isConfigCollapsed: false,
});

function safeStorage() {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

function stripDataURL(overlayConfig) {
  if (!overlayConfig) return DEFAULT_OVERLAY_CONFIG;
  return { ...overlayConfig, dataURL: null, filename: null };
}

let warned = false;
function warnOnce(scope, err) {
  if (warned) return;
  warned = true;
  // Single console.warn line keeps the noise floor low. Components do not
  // depend on this — the cold-load path is silent.
  console.warn(`[viral-cristao] visual-presets ${scope} skipped: ${err?.message ?? err}`);
}

/**
 * @typedef {Object} VisualPresets
 * @property {import('../config/defaults.js').DEFAULT_SUBTITLE_CONFIG} subtitleConfig
 * @property {import('../config/defaults.js').DEFAULT_VIDEO_CONFIG} videoConfig
 * @property {import('../config/defaults.js').DEFAULT_OVERLAY_CONFIG} overlayConfig
 * @property {boolean} isConfigCollapsed
 */

/**
 * Load persisted visual presets, falling back to defaults on any failure
 * (missing key, schema mismatch, corrupted JSON, storage unavailable).
 *
 * @returns {VisualPresets}
 */
export function loadVisualPresets() {
  const storage = safeStorage();
  if (!storage) return { ...DEFAULT_PRESETS };

  let raw;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch (e) {
    warnOnce('read', e);
    return { ...DEFAULT_PRESETS };
  }
  if (!raw) return { ...DEFAULT_PRESETS };

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    warnOnce('parse', e);
    safeRemove(storage);
    return { ...DEFAULT_PRESETS };
  }

  if (parsed?.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    safeRemove(storage);
    return { ...DEFAULT_PRESETS };
  }

  const stored = parsed.presets ?? {};
  return {
    subtitleConfig: { ...DEFAULT_SUBTITLE_CONFIG, ...stored.subtitleConfig },
    videoConfig: { ...DEFAULT_VIDEO_CONFIG, ...stored.videoConfig },
    overlayConfig: stripDataURL(stored.overlayConfig),
    isConfigCollapsed: Boolean(stored.isConfigCollapsed),
  };
}

const ALLOWED_SUBTITLE_KEYS = Object.freeze(Object.keys(DEFAULT_SUBTITLE_CONFIG));

function clampOpacity(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.max(0, Math.min(1, n));
}

/**
 * Reduce a user-controlled presets object to a schema-strict snapshot.
 * Coerces every field to the expected type before it touches localStorage so
 * the write surface is impossible to taint with arbitrary values (defense
 * against jssecurity:S8475 — even though the storage is same-origin, this
 * keeps the on-disk shape predictable for any future migration code).
 */
function sanitizeForPersistence(presets) {
  const sub = presets?.subtitleConfig ?? {};
  const safeSub = {};
  for (const key of ALLOWED_SUBTITLE_KEYS) {
    safeSub[key] = sub[key] ?? DEFAULT_SUBTITLE_CONFIG[key];
  }
  const video = presets?.videoConfig ?? {};
  const safeVideo = {
    x: Number(video.x) || 0,
    y: Number(video.y) || 0,
    scale: Number.isFinite(Number(video.scale)) ? Number(video.scale) : 1,
  };
  return {
    subtitleConfig: safeSub,
    videoConfig: safeVideo,
    overlayConfig: {
      dataURL: null,
      opacity: clampOpacity(presets?.overlayConfig?.opacity),
      filename: null,
    },
    isConfigCollapsed: Boolean(presets?.isConfigCollapsed),
  };
}

let pendingTimer = null;
let pendingValue = null;

function safeRemove(storage) {
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function flushPending(storage) {
  pendingTimer = null;
  if (!pendingValue) return;
  const value = pendingValue;
  pendingValue = null;
  const safe = sanitizeForPersistence(value);
  const payload = JSON.stringify({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    presets: safe,
  });
  try {
    storage.setItem(STORAGE_KEY, payload);
  } catch (e) {
    warnOnce('write', e);
  }
}

/**
 * Persist visual presets. Debounced 300 ms so rapid slider/number-field
 * updates collapse into a single write. dataURL is stripped before write
 * (overlay PNG is session-only by design).
 *
 * @param {VisualPresets} presets
 */
export function saveVisualPresets(presets) {
  const storage = safeStorage();
  if (!storage) return;
  pendingValue = presets;
  if (pendingTimer !== null) clearTimeout(pendingTimer);
  pendingTimer = setTimeout(() => flushPending(storage), DEBOUNCE_MS);
}

/**
 * Reset any pending debounced write and clear the persisted key.
 */
export function clearVisualPresets() {
  const storage = safeStorage();
  if (pendingTimer !== null) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
    pendingValue = null;
  }
  if (storage) safeRemove(storage);
}

/** test seam: force-flush the pending debounce timer */
export function _flushVisualPresetsForTest() {
  const storage = safeStorage();
  if (pendingTimer !== null) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }
  if (storage) flushPending(storage);
}

/** test seam: reset internal state */
export function _resetVisualPresetsModule() {
  pendingTimer = null;
  pendingValue = null;
  warned = false;
}
