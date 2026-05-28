import { describe, it, expect, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useAnalyze } from './useAnalyze.js';
import { EXAMPLE_RESPONSE, EXAMPLE_TRANSCRIPT, EXAMPLE_URL } from '@gospelviral/shared';

describe('useAnalyze', () => {
  it('starts on the input view with no results and no error', () => {
    // Arrange + Act
    const { result } = renderHook(() => useAnalyze());

    // Assert
    expect(result.current.view).toBe('input');
    expect(result.current.results).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('rejects invalid URL with a Portuguese error string and stays on input', async () => {
    // Arrange
    const { result } = renderHook(() => useAnalyze());

    // Act
    await act(async () => {
      await result.current.analyze({ url: 'not-a-url', transcript: '00:00 ok' });
    });

    // Assert
    expect(result.current.view).toBe('input');
    expect(result.current.error).toMatch(/URL do YouTube inválida/);
  });

  it('rejects missing transcript', async () => {
    // Arrange
    const { result } = renderHook(() => useAnalyze());

    // Act
    await act(async () => {
      await result.current.analyze({ url: EXAMPLE_URL, transcript: '   ' });
    });

    // Assert
    expect(result.current.error).toMatch(/Cole a transcrição/);
  });

  it('rejects transcripts without MM:SS timestamps', async () => {
    // Arrange
    const { result } = renderHook(() => useAnalyze());

    // Act
    await act(async () => {
      await result.current.analyze({
        url: EXAMPLE_URL,
        transcript: 'apenas texto sem timestamps',
      });
    });

    // Assert
    expect(result.current.error).toMatch(/timestamps no formato MM:SS/);
  });

  it('flips to results with EXAMPLE_RESPONSE when input matches the example', async () => {
    // Arrange
    const { result } = renderHook(() => useAnalyze());

    // Act
    await act(async () => {
      await result.current.analyze({
        url: EXAMPLE_URL,
        transcript: EXAMPLE_TRANSCRIPT,
      });
    });

    // Assert
    await waitFor(() => expect(result.current.view).toBe('results'));
    expect(result.current.results).toBe(EXAMPLE_RESPONSE);
    expect(result.current.error).toBeNull();
  });

  it('surfaces the placeholder failure and returns to input', async () => {
    // Arrange
    const fakeClient = vi.fn().mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useAnalyze(() => fakeClient));

    // Act
    await act(async () => {
      await result.current.analyze({
        url: EXAMPLE_URL,
        transcript: '00:00 ok',
      });
    });

    // Assert
    expect(result.current.view).toBe('input');
    expect(result.current.error).toMatch(/Falha na análise: boom/);
    expect(fakeClient).toHaveBeenCalledWith(
      expect.objectContaining({ url: EXAMPLE_URL, transcript: '00:00 ok' }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('reset() clears results, error and flips back to input', async () => {
    // Arrange
    const { result } = renderHook(() => useAnalyze());
    act(() => result.current.showExample(EXAMPLE_RESPONSE));
    expect(result.current.view).toBe('results');

    // Act
    act(() => result.current.reset());

    // Assert
    expect(result.current.view).toBe('input');
    expect(result.current.results).toBeNull();
  });
});
