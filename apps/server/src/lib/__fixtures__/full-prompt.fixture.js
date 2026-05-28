/**
 * Frozen snapshot of the artifact's `fullPrompt` composition for the
 * EXAMPLE_TRANSCRIPT input. Pin point for build-user-message.js so the
 * archival of viral-cristao-artifact.jsx in TASK_012 cannot drift the
 * server-side userMessage shape.
 *
 * The artifact composes:
 *   `${OPTIMIZED_PROMPT}\n\n${userMessage}`
 *
 * where userMessage =
 *   `<transcript>\n${transcript}\n</transcript>\n\nExecute análise completa. Retorne EXATAMENTE 5 momentos em top_moments, ordenados por viral_score descendente. APENAS JSON, sem texto adicional.`
 *
 * This fixture is ONLY the userMessage half (the system-prompt half is
 * already pinned by packages/shared/src/prompts.test.js).
 */
export const EXAMPLE_USER_MESSAGE_TAIL =
  '</transcript>\n\nExecute análise completa. Retorne EXATAMENTE 5 momentos em top_moments, ordenados por viral_score descendente. APENAS JSON, sem texto adicional.';

export const EXAMPLE_USER_MESSAGE_HEAD = '<transcript>\n';
