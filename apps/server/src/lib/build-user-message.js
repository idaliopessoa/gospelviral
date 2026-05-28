const ANALYSIS_INSTRUCTION = 'Execute análise completa. Retorne EXATAMENTE 5 momentos em top_moments, ordenados por viral_score descendente. APENAS JSON, sem texto adicional.';

/**
 * Wrap a raw transcript into the user-message envelope the analyzers expect.
 *
 * Matches the artifact's `fullPrompt = ${OPTIMIZED_PROMPT}\\n\\n${userMessage}`
 * composition byte-for-byte for the userMessage half. The system-prompt half
 * (OPTIMIZED_PROMPT) is supplied separately at adapter call time.
 *
 * @param {string} transcript
 * @returns {string}
 */
export function buildUserMessage(transcript) {
  if (typeof transcript !== 'string' || transcript.length === 0) {
    throw new TypeError('transcript must be a non-empty string');
  }
  return `<transcript>\n${transcript}\n</transcript>\n\n${ANALYSIS_INSTRUCTION}`;
}
