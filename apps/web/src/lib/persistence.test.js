import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  STORAGE_KEY,
  loadVisualPresets,
  saveVisualPresets,
  clearVisualPresets,
  _flushVisualPresetsForTest,
  _resetVisualPresetsModule,
} from './persistence.js';
import {
  DEFAULT_OVERLAY_CONFIG,
  DEFAULT_SUBTITLE_CONFIG,
  DEFAULT_VIDEO_CONFIG,
} from '../config/defaults.js';

beforeEach(() => {
  localStorage.clear();
  _resetVisualPresetsModule();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('loadVisualPresets', () => {
  it('returns defaults when nothing is stored', () => {
    // Arrange + Act
    const presets = loadVisualPresets();

    // Assert
    expect(presets.subtitleConfig).toEqual(DEFAULT_SUBTITLE_CONFIG);
    expect(presets.videoConfig).toEqual(DEFAULT_VIDEO_CONFIG);
    expect(presets.overlayConfig).toEqual(DEFAULT_OVERLAY_CONFIG);
    expect(presets.isConfigCollapsed).toBe(false);
  });

  it('loads a stored v1 payload and merges over defaults', () => {
    // Arrange
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        presets: {
          subtitleConfig: { ...DEFAULT_SUBTITLE_CONFIG, font: 'Manrope' },
          videoConfig: { x: 10, y: 20, scale: 1.5 },
          overlayConfig: { dataURL: null, opacity: 0.7, filename: null },
          isConfigCollapsed: true,
        },
      }),
    );

    // Act
    const presets = loadVisualPresets();

    // Assert
    expect(presets.subtitleConfig.font).toBe('Manrope');
    expect(presets.videoConfig).toEqual({ x: 10, y: 20, scale: 1.5 });
    expect(presets.overlayConfig.opacity).toBe(0.7);
    expect(presets.isConfigCollapsed).toBe(true);
  });

  it('drops a payload with a mismatched schemaVersion and returns defaults', () => {
    // Arrange
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schemaVersion: 0, presets: { subtitleConfig: { font: 'Old' } } }),
    );

    // Act
    const presets = loadVisualPresets();

    // Assert — defaults + the bad value was removed
    expect(presets.subtitleConfig).toEqual(DEFAULT_SUBTITLE_CONFIG);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('drops corrupted JSON and returns defaults', () => {
    // Arrange
    localStorage.setItem(STORAGE_KEY, '{not valid json}');

    // Act
    const presets = loadVisualPresets();

    // Assert
    expect(presets.subtitleConfig).toEqual(DEFAULT_SUBTITLE_CONFIG);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('strips the overlay dataURL on load (PNG is session-only)', () => {
    // Arrange
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        presets: {
          subtitleConfig: DEFAULT_SUBTITLE_CONFIG,
          videoConfig: DEFAULT_VIDEO_CONFIG,
          overlayConfig: {
            dataURL: 'data:image/png;base64,AAA',
            opacity: 0.5,
            filename: 'leaked.png',
          },
          isConfigCollapsed: false,
        },
      }),
    );

    // Act
    const presets = loadVisualPresets();

    // Assert
    expect(presets.overlayConfig.dataURL).toBeNull();
    expect(presets.overlayConfig.filename).toBeNull();
    expect(presets.overlayConfig.opacity).toBe(0.5);
  });
});

describe('saveVisualPresets', () => {
  const PRESETS = {
    subtitleConfig: { ...DEFAULT_SUBTITLE_CONFIG, font: 'Manrope' },
    videoConfig: { x: 10, y: 20, scale: 1.5 },
    overlayConfig: {
      dataURL: 'data:image/png;base64,SHOULD_NOT_PERSIST',
      opacity: 0.6,
      filename: 'pic.png',
    },
    isConfigCollapsed: true,
  };

  it('coalesces 10 rapid calls within 300ms into a single setItem', () => {
    // Arrange
    const spy = vi.spyOn(Storage.prototype, 'setItem');

    // Act
    for (let i = 0; i < 10; i++) {
      saveVisualPresets({ ...PRESETS, isConfigCollapsed: i % 2 === 0 });
    }
    vi.advanceTimersByTime(300);

    // Assert
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toBe(STORAGE_KEY);
  });

  it('strips the dataURL + filename before writing', () => {
    // Arrange + Act
    saveVisualPresets(PRESETS);
    vi.advanceTimersByTime(300);

    // Assert
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.presets.overlayConfig.dataURL).toBeNull();
    expect(parsed.presets.overlayConfig.filename).toBeNull();
    expect(parsed.presets.overlayConfig.opacity).toBe(0.6);
  });

  it('round-trips through load: save → load returns the saved values', () => {
    // Arrange + Act
    saveVisualPresets(PRESETS);
    vi.advanceTimersByTime(300);
    const loaded = loadVisualPresets();

    // Assert
    expect(loaded.subtitleConfig.font).toBe('Manrope');
    expect(loaded.videoConfig).toEqual({ x: 10, y: 20, scale: 1.5 });
    expect(loaded.isConfigCollapsed).toBe(true);
    expect(loaded.overlayConfig.dataURL).toBeNull();
  });

  it('does not throw on QuotaExceededError; logs once at warn level', () => {
    // Arrange
    const setSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      const e = new Error('Quota exceeded');
      e.name = 'QuotaExceededError';
      throw e;
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Act
    saveVisualPresets(PRESETS);
    vi.advanceTimersByTime(300);

    // Assert — flush ran, warn emitted once
    expect(setSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);

    // Subsequent calls do not warn again
    saveVisualPresets(PRESETS);
    vi.advanceTimersByTime(300);
    expect(warnSpy).toHaveBeenCalledTimes(1);

    setSpy.mockRestore();
    warnSpy.mockRestore();
  });
});

describe('clearVisualPresets', () => {
  it('removes the key and cancels any pending write', () => {
    // Arrange
    localStorage.setItem(STORAGE_KEY, '{"schemaVersion":1,"presets":{}}');
    saveVisualPresets({
      subtitleConfig: DEFAULT_SUBTITLE_CONFIG,
      videoConfig: DEFAULT_VIDEO_CONFIG,
      overlayConfig: DEFAULT_OVERLAY_CONFIG,
      isConfigCollapsed: false,
    });

    // Act
    clearVisualPresets();
    vi.advanceTimersByTime(300);

    // Assert
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe('test seam', () => {
  it('_flushVisualPresetsForTest flushes pending immediately without advancing timers', () => {
    // Arrange
    const spy = vi.spyOn(Storage.prototype, 'setItem');
    saveVisualPresets({
      subtitleConfig: DEFAULT_SUBTITLE_CONFIG,
      videoConfig: DEFAULT_VIDEO_CONFIG,
      overlayConfig: DEFAULT_OVERLAY_CONFIG,
      isConfigCollapsed: false,
    });

    // Act
    _flushVisualPresetsForTest();

    // Assert
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
