/**
 * Portuguese (Brazilian) Bible book-name regex source.
 * Matches both abbreviated and full forms used by the artifact's highlightText
 * scripture detector (e.g., "Salmos 34:18", "Romanos 5:1-2", "Salmo 23").
 *
 * Exported as a string source rather than a compiled RegExp so callers can
 * decide their own flags (case-sensitivity, global, sticky) without depending
 * on this module's compilation choice.
 */
export const SCRIPTURE_BOOKS_PATTERN =
  '\\b(?:Gênesis|Êxodo|Levítico|Números|Deuteronômio|Josué|Juízes|Rute|Samuel|Reis|Crônicas|Esdras|Neemias|Ester|Jó|Salmos?|Salmo|Provérbios|Eclesiastes|Cantares|Isaías|Jeremias|Lamentações|Ezequiel|Daniel|Oséias|Joel|Amós|Obadias|Jonas|Miquéias|Naum|Habacuque|Sofonias|Ageu|Zacarias|Malaquias|Mateus|Marcos|Lucas|João|Atos|Romanos|Coríntios|Gálatas|Efésios|Filipenses|Colossenses|Tessalonicenses|Timóteo|Tito|Filemom|Hebreus|Tiago|Pedro|Judas|Apocalipse)\\s+\\d+(?::\\d+(?:-\\d+)?)?';

export const SCRIPTURE_KEYWORD_PATTERN = '\\b(Jesus|Cristo|Deus|Senhor|Espírito Santo|Pai)\\b';

export function compileScriptureRegex() {
  return new RegExp(SCRIPTURE_BOOKS_PATTERN, 'gi');
}

export function compileKeywordRegex() {
  return new RegExp(SCRIPTURE_KEYWORD_PATTERN, 'g');
}
