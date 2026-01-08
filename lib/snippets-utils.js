/**
 * Helpers for slash-command snippets insertion into plain text editors.
 */

/**
 * Finds an active "/query" token that ends at cursorIndex.
 * Only triggers when the token starts at beginning or after whitespace/newline.
 *
 * @param {string} text
 * @param {number} cursorIndex
 * @returns {{ start: number, end: number, query: string } | null}
 */
export function getActiveSlashToken(text, cursorIndex) {
  if (typeof text !== 'string') return null;
  const cur = typeof cursorIndex === 'number' ? cursorIndex : 0;
  if (cur < 0 || cur > text.length) return null;

  // Walk backwards to the start of the current "word"
  let i = cur - 1;
  while (i >= 0) {
    const ch = text[i];
    if (ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r') break;
    i -= 1;
  }
  const tokenStart = i + 1;
  if (text[tokenStart] !== '/') return null;

  // Avoid triggering on a bare "/" with no cursor after it? (still valid)
  const query = text.slice(tokenStart + 1, cur);
  // Keep it simple: only open for "command-like" queries
  if (!/^[a-zA-Z0-9_-]*$/.test(query)) return null;

  return { start: tokenStart, end: cur, query };
}

/**
 * Replace [start,end) range with snippetText and return new text + cursor.
 *
 * @param {string} text
 * @param {number} start
 * @param {number} end
 * @param {string} snippetText
 */
export function replaceRangeWithSnippet(text, start, end, snippetText) {
  const before = text.slice(0, start);
  const after = text.slice(end);
  const insert = snippetText ?? '';
  const nextText = `${before}${insert}${after}`;
  const nextCursor = before.length + insert.length;
  return { nextText, nextCursor };
}

