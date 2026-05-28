/**
 * Default values for the three global config objects — must mirror the
 * artifact (`viral-cristao-artifact.jsx`) byte-for-byte. TASK_011 will
 * persist these to localStorage; until then the defaults reset on reload.
 */
export const DEFAULT_SUBTITLE_CONFIG = Object.freeze({
  font: 'IBM Plex Sans',
  textColor: '#FFFFFF',
  background: 'shadow',
  bgColor: '#000000',
  charsPerScreen: 30,
  lines: 2,
  position: 'bottom',
  size: 'M',
  highlightScripture: true,
  highlightKeywords: true,
  x: 0,
  y: 0,
});

export const DEFAULT_VIDEO_CONFIG = Object.freeze({ x: 0, y: 0, scale: 1 });

export const DEFAULT_OVERLAY_CONFIG = Object.freeze({
  dataURL: null,
  opacity: 1,
  filename: null,
});

export const LOADING_MESSAGES = Object.freeze([
  'Mapeando momentos candidatos…',
  'Pontuando 6 dimensões…',
  'Aplicando theological check…',
  'Decidindo cold open vs linear…',
  'Estruturando assets de cada momento…',
]);

export const LOADING_ROTATION_MS = 3500;
