/**
 * Portuguese (Brazilian) Bible book-name source data. Exposed as an array so
 * the regex below stays simple to read; the compiled pattern is identical to
 * the artifact's hand-written alternation.
 *
 * The matchers below are intentionally exported as pattern *sources* (strings)
 * rather than pre-compiled RegExp objects so callers can pick their own flags
 * without binding to this module's compilation choice.
 */

export const SCRIPTURE_BOOKS = Object.freeze([
  'Gênesis', 'Êxodo', 'Levítico', 'Números', 'Deuteronômio',
  'Josué', 'Juízes', 'Rute', 'Samuel', 'Reis',
  'Crônicas', 'Esdras', 'Neemias', 'Ester', 'Jó',
  'Salmos?', 'Salmo', 'Provérbios', 'Eclesiastes', 'Cantares',
  'Isaías', 'Jeremias', 'Lamentações', 'Ezequiel', 'Daniel',
  'Oséias', 'Joel', 'Amós', 'Obadias', 'Jonas',
  'Miquéias', 'Naum', 'Habacuque', 'Sofonias', 'Ageu',
  'Zacarias', 'Malaquias', 'Mateus', 'Marcos', 'Lucas',
  'João', 'Atos', 'Romanos', 'Coríntios', 'Gálatas',
  'Efésios', 'Filipenses', 'Colossenses', 'Tessalonicenses', 'Timóteo',
  'Tito', 'Filemom', 'Hebreus', 'Tiago', 'Pedro',
  'Judas', 'Apocalipse',
]);

export const SCRIPTURE_KEYWORDS = Object.freeze([
  'Jesus', 'Cristo', 'Deus', 'Senhor', 'Espírito Santo', 'Pai',
]);

export const SCRIPTURE_BOOKS_PATTERN = String.raw`\b(?:${SCRIPTURE_BOOKS.join('|')})\s+\d+(?::\d+(?:-\d+)?)?`;

export const SCRIPTURE_KEYWORD_PATTERN = String.raw`\b(${SCRIPTURE_KEYWORDS.join('|')})\b`;

export function compileScriptureRegex() {
  return new RegExp(SCRIPTURE_BOOKS_PATTERN, 'gi');
}

export function compileKeywordRegex() {
  return new RegExp(SCRIPTURE_KEYWORD_PATTERN, 'g');
}
