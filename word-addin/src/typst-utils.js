/**
 * JS port of src/backend/typst_utils.py
 * LaTeX→Typst pre/post processing for browser-side use.
 * Used by the Office Add-in (no Python runtime available).
 */

// ---------------------------------------------------------------------------
// Pre-processing: fix LaTeX that pandoc can't handle
// ---------------------------------------------------------------------------

function _isTextLikeContent(content) {
  const c = (content || '').trim();
  if (!c) return true;
  if (/\\[a-zA-Z]/.test(c)) return false;
  if (/[\^_]/.test(c)) return false;
  if (/[+\-*/=<>]/.test(c)) return false;
  if (/\d/.test(c)) return false;
  return true;
}

/**
 * Pre-process LaTeX math to avoid known pandoc conversion losses.
 * Fixes textcolor, color, stackrel, cfrac, varnothing, sideset, displaylines.
 */
export function preprocessLatexForTypst(latex) {
  let text = String(latex || '');

  // 1. \textcolor{color}{content} → extract content, preserving math/text
  text = text.replace(
    /\\textcolor\s*\{([^}]*)\}\{([^}]*)\}/g,
    (_, color, content) => {
      if (_isTextLikeContent(content)) {
        return '\\text{' + content + '}';
      }
      return '{' + content + '}';
    }
  );

  // 2. \color{color} → strip (stateful color can't be preserved)
  text = text.replace(/\\color\s*\{[^}]*\}\s*/g, '');

  // 3. \stackrel{text}{sym} → wrap text in \text{} so pandoc handles it
  text = text.replace(
    /\\stackrel\s*\{([^}]*)\}\{([^}]*)\}/g,
    (_, above, below) => {
      if (_isTextLikeContent(above) && !above.startsWith('\\')) {
        above = '\\text{' + above + '}';
      }
      return '\\stackrel{' + above + '}{' + below + '}';
    }
  );

  // 4. \displaylines{...} → simple \\-separated form (brace-counting)
  text = _fixDisplaylines(text);

  // 5. Replace snippet placeholders #? with \Box
  text = text.replace(/#\?/g, '\\Box');

  // 6. Simple pattern replacements
  text = text.replace(/\\cfrac/g, '\\frac');
  text = text.replace(/\\sideset\{[^}]*\}\{[^}]*\}/g, '');
  text = text.replace(/\\varnothing\b/g, '\\emptyset');

  return text;
}

function _fixDisplaylines(text) {
  const re = /\\displaylines\s*\{/g;
  const result = [];
  let pos = 0;

  while (true) {
    const m = re.exec(text);
    if (!m) { result.push(text.slice(pos)); break; }
    result.push(text.slice(pos, m.index));

    // Brace-count to find the matching closing }
    let depth = 1;
    let i = m.index + m[0].length;
    while (i < text.length && depth > 0) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') depth--;
      i++;
    }
    if (depth !== 0) { result.push(text.slice(m.index)); pos = text.length; break; }

    const inner = text.slice(m.index + m[0].length, i - 1);
    const lines = inner.split(/\\\\/).map(s => s.trim()).filter(Boolean);
    result.push(lines.join(' \\\\ '));
    pos = i;
  }
  return result.join('');
}


// ---------------------------------------------------------------------------
// Post-processing: fix pandoc artifacts in Typst output
// ---------------------------------------------------------------------------

/**
 * Clean up pandoc conversion artifacts in Typst math output.
 * Fixes: oo→infinity, escaped parens, compose→circle, diameter→emptyset, etc.
 */
export function cleanPandocTypstArtifacts(typst) {
  let text = String(typst || '');

  // Fix pandoc artifact: {= X) → = X)
  text = text.replace(/\{=\s*([^}{)]*)\)/g, '= $1)');

  // Fix pandoc converting \infty to "oo"
  text = text.replace(/\boo\b/g, 'infinity');

  // Fix pandoc escaping \(, \), \/, \|
  text = text.replace(/\\\(/g, '(');
  text = text.replace(/\\\)/g, ')');
  text = text.replace(/\\\//g, '/');
  text = text.replace(/\\\|/g, '|');

  // Fix pandoc mapping: \circ → compose
  text = text.replace(/\^compose\b/g, '^degree');
  text = text.replace(/\bcompose\b/g, 'circle');

  // Fix pandoc mapping: \varnothing → diameter
  text = text.replace(/\bdiameter\b/g, 'emptyset');

  // Strip orphaned trailing }
  while (text.endsWith('}') && (text.match(/\{/g) || []).length < (text.match(/\}/g) || []).length) {
    text = text.slice(0, -1);
  }

  return text;
}

/** Add {} around big-operator bodies for correct Typst grouping. */
export function ensureTypstMathGrouping(typst) {
  let text = cleanPandocTypstArtifacts((typst || '').trim());
  const OP = '(?:integral|sum|prod|lim)';
  const LIMIT_ATOM = '(?:\\([^)]*\\)|[^\\s{}()]+)';
  const LIMITS = `(?:_${LIMIT_ATOM})?(?:\\^${LIMIT_ATOM})?`;
  const BODY = '([^}]+?)';
  const SENTINEL = '(dif\\s+\\S+)';

  function _maybeWrap(m) {
    const body = (m[3] || '').trim();
    if (!body || !_hasTopLevelBinaryOp(body)) return m[0];
    if (body.startsWith('{')) return m[0];
    const prefix = m[0].slice(0, m[0].indexOf(body));
    const suffix = m[0].slice(m[0].indexOf(body) + body.length);
    return prefix + '{' + body + '}' + suffix;
  }

  const re1 = new RegExp(`\\b(${OP})(${LIMITS})\\s+(?<body>${BODY})\\s+${SENTINEL}`);
  const re2 = new RegExp(`\\b(${OP})(${LIMITS})\\s+(?<body>${BODY})(?=\\s*$|\\s*\\})`);

  // Simulated named groups via numbered groups
  text = text.replace(new RegExp(`\\b(${OP})(${LIMITS})\\s+(${BODY})\\s+${SENTINEL}`, 'g'), _maybeWrap);
  text = text.replace(new RegExp(`\\b(${OP})(${LIMITS})\\s+(${BODY})(?=\\s*$|\\s*\\})`, 'g'), _maybeWrap);

  return text;
}

function _hasTopLevelBinaryOp(body) {
  let depth = 0;
  for (const ch of body) {
    if (ch === '(' || ch === '{') depth++;
    else if (ch === ')' || ch === '}') depth--;
    else if (depth === 0 && '+-*/'.includes(ch)) return true;
  }
  return false;
}


// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/** Return true if content contains LaTeX backslash commands. */
export function looksLikeLatexMath(text) {
  return /\\[a-zA-Z]/.test(String(text || ''));
}
