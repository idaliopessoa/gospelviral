import {
  compileScriptureRegex,
  compileKeywordRegex,
} from './scripture-books.js';

/**
 * @typedef {{ text: string, highlighted: boolean, type: 'scripture'|'keyword'|null }} HighlightPart
 */

/**
 * Walk a list of parts and split any non-highlighted part by a regex,
 * tagging matches with the given type. Already-highlighted parts pass through.
 *
 * @param {HighlightPart[]} parts
 * @param {RegExp} regex
 * @param {'scripture'|'keyword'} type
 * @returns {HighlightPart[]}
 */
export function splitByRegex(parts, regex, type) {
  const result = [];
  for (const part of parts) {
    if (part.highlighted) {
      result.push(part);
      continue;
    }
    appendMatches(result, part.text, regex, type);
  }
  return result;
}

function appendMatches(result, text, regex, type) {
  const r = new RegExp(regex.source, regex.flags);
  let lastIndex = 0;
  let match;
  while ((match = r.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push({ text: text.substring(lastIndex, match.index), highlighted: false, type: null });
    }
    result.push({ text: match[0], highlighted: true, type });
    lastIndex = match.index + match[0].length;
    if (match[0].length === 0) r.lastIndex++;
  }
  if (lastIndex < text.length) {
    result.push({ text: text.substring(lastIndex), highlighted: false, type: null });
  }
}

/**
 * Highlight a caption against subtitle config flags.
 *
 * @param {string} text
 * @param {{ highlightScripture?: boolean, highlightKeywords?: boolean }} config
 * @returns {HighlightPart[]}
 */
export function highlightText(text, config) {
  if (!text) return [{ text: '', highlighted: false, type: null }];
  let parts = [{ text, highlighted: false, type: null }];
  if (config?.highlightScripture) {
    parts = splitByRegex(parts, compileScriptureRegex(), 'scripture');
  }
  if (config?.highlightKeywords) {
    parts = splitByRegex(parts, compileKeywordRegex(), 'keyword');
  }
  return parts;
}
