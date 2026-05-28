import { describe, it, expect, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useRuntime } from './useRuntime.js';

const CLI_STATUS = {
  cli: { available: true, binPath: '/usr/local/bin/claude', name: 'claude' },
  apiKey: true,
  recommended: 'cli',
};

describe('useRuntime', () => {
  it('fetches runtime on mount and exposes status + currentMode', async () => {
    // Arrange
    const fetchImpl = vi.fn().mockResolvedValue(CLI_STATUS);

    // Act
    const { result } = renderHook(() => useRuntime({ fetchImpl }));

    // Assert
    await waitFor(() => expect(result.current.status).toEqual(CLI_STATUS));
    expect(result.current.currentMode).toBe('cli');
    expect(result.current.forcedMode).toBe('auto');
  });

  it('forcedMode override wins over the server recommendation', async () => {
    // Arrange
    const fetchImpl = vi.fn().mockResolvedValue(CLI_STATUS);
    const { result } = renderHook(() => useRuntime({ fetchImpl }));
    await waitFor(() => expect(result.current.status).toBeTruthy());

    // Act
    act(() => result.current.setForcedMode('api'));

    // Assert
    expect(result.current.currentMode).toBe('api');
  });

  it('refresh() re-fetches with refresh=true', async () => {
    // Arrange
    const fetchImpl = vi.fn().mockResolvedValue(CLI_STATUS);
    const { result } = renderHook(() => useRuntime({ fetchImpl }));
    await waitFor(() => expect(result.current.status).toBeTruthy());
    fetchImpl.mockClear();

    // Act
    await act(async () => {
      await result.current.refresh();
    });

    // Assert
    expect(fetchImpl).toHaveBeenCalledWith({ refresh: true });
  });

  it('surfaces fetch error without breaking the hook', async () => {
    // Arrange
    const fetchImpl = vi.fn().mockRejectedValue(new Error('boom'));

    // Act
    const { result } = renderHook(() => useRuntime({ fetchImpl }));

    // Assert
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.status).toBeNull();
    expect(result.current.currentMode).toBe('none');
  });
});
