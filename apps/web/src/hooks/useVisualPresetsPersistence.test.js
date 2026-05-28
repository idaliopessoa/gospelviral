import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useVisualPresetsPersistence } from './useVisualPresetsPersistence.js';
import * as persistence from '../lib/persistence.js';
import {
  DEFAULT_OVERLAY_CONFIG,
  DEFAULT_SUBTITLE_CONFIG,
  DEFAULT_VIDEO_CONFIG,
} from '../config/defaults.js';

const PRESETS = {
  subtitleConfig: DEFAULT_SUBTITLE_CONFIG,
  videoConfig: DEFAULT_VIDEO_CONFIG,
  overlayConfig: DEFAULT_OVERLAY_CONFIG,
  isConfigCollapsed: false,
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useVisualPresetsPersistence', () => {
  it('does NOT save on first render', () => {
    // Arrange
    const spy = vi.spyOn(persistence, 'saveVisualPresets');

    // Act
    renderHook(() => useVisualPresetsPersistence(PRESETS));

    // Assert
    expect(spy).not.toHaveBeenCalled();
  });

  it('saves on subsequent renders when the presets reference changes', () => {
    // Arrange
    const spy = vi.spyOn(persistence, 'saveVisualPresets');
    const { rerender } = renderHook(({ p }) => useVisualPresetsPersistence(p), {
      initialProps: { p: PRESETS },
    });

    // Act
    rerender({ p: { ...PRESETS, isConfigCollapsed: true } });

    // Assert
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ isConfigCollapsed: true }),
    );
  });
});
