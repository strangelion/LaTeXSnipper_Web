#!/usr/bin/env python3
"""Convert user_manual.typ -> user_manual.html."""

import re, json, subprocess, sys, os

TYP_FILE = "user_manual.typ"
HTML_FILE = "user_manual.html"

# ── helpers ──
def esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def inline(text):
    """Convert Typst inline markup to HTML."""
    text = re.sub(r'\*(.+?)\*', r'<strong>\1</strong>', text)
    text = re.sub(r'`(.+?)`', r'<code>\1</code>', text)
    text = re.sub(r'#link\(<([^>]+)>\)\[([^\]]*)\]', r'<a href="#\1">\2</a>', text)
    text = re.sub(r'#link\(&lt;([^&]+)&gt;\)\[([^\]]*)\]', r'<a href="#\1">\2</a>', text)
    # #text(...)[content] — handle nested parens in args
    # #text(weight: "bold", ...) — convert to <strong>
    text = re.sub(r'#text\(\s*weight:\s*"bold"\s*\)\[([^\]]*)\]', r'<strong>\1</strong>', text)
    text = re.sub(r'#text\(\s*weight:\s*"bold"\s*,\s*"([^"]*)"\s*\)', r'<strong>\1</strong>', text)
    # #text(...)[content] — handle nested parens in args
    text = re.sub(r'#text\((?:[^()]|\([^()]*\))*\)\[([^\]]*)\]', r'\1', text)
    # #text(...) with no brackets — strip entirely (handle nested parens)
    text = re.sub(r'#text\((?:[^()]|\([^()]*\))*\)', '', text)
    # #v(...), #line(...), #pagebreak() — strip
    text = re.sub(r'#(?:v|line|pagebreak)\s*\([^)]*\)', '', text)
    # #block(...), #rect(...), #align(...) — strip (handle 1 level of nested parens)
    text = re.sub(r'#(?:block|rect|align)\((?:[^()]|\([^()]*\))*\)', '', text)
    # #set, #show, #let directives
    text = re.sub(r'#(?:set|show|let)\s+\S+\s*\([^)]*\)', '', text)
    text = re.sub(r'#(?:set|show|let)\s+\S+', '', text)
    return text

# ── Pre-processing ──
def preprocess(source):
    """Convert #text(...)[content] to Typst inline syntax or plain text."""
    result = []
    i, n = 0, len(source)
    while i < n:
        # Look for #text(
        idx = source.find('#text(', i)
        if idx == -1 or idx > i:
            result.append(source[i:idx if idx != -1 else n])
            if idx == -1: break
            i = idx
        # We are at #text(
        start = idx
        j = idx + 6  # len('#text(')
        # Read args inside parens, tracking depth for nested (rgb(...))
        paren_depth = 1
        has_bold = False
        while j < n and paren_depth > 0:
            if source[j] == '(':
                paren_depth += 1
            elif source[j] == ')':
                paren_depth -= 1
            elif source[j] == '"' and j+5 < n and source[j:j+6] == '"bold"':
                has_bold = True
            j += 1
        # After parens, expect [
        while j < n and source[j] != '[':
            if source[j] == '\n':
                break
            j += 1
        if j < n and source[j] == '[':
            j += 1  # skip [
            bracket_depth = 1
            body_start = j
            while j < n and bracket_depth > 0:
                if source[j] == '[':
                    bracket_depth += 1
                elif source[j] == ']':
                    bracket_depth -= 1
                j += 1
            body = source[body_start:j-1]  # content inside matched []
            replacement = f'*{body}*' if has_bold else body
            result.append(replacement)
            i = j
        else:
            result.append(source[i:j])
            i = j
    return ''.join(result)

# ── Typst tokeniser ──
def tokenise(text):
    text = preprocess(text)
    """Yield (type, value) tokens from Typst source."""
    i, n = 0, len(text)
    while i < n:
        ch = text[i]
        # comments
        if ch == '/' and i+1 < n and text[i+1] == '/':
            # Don't treat :// in URLs as comment (e.g., http://127.0.0.1:11434)
            if i > 0 and text[i-1] == ':':
                # Part of URL, skip the // as plain text
                yield ('TEXT', text[i:i+2])
                i += 2
                continue
            j = text.index('\n', i) if '\n' in text[i:] else n
            yield ('COMMENT', text[i:j])
            i = j
            continue
            j = text.index('\n', i) if '\n' in text[i:] else n
            yield ('COMMENT', text[i:j])
            i = j
            continue
        # strings
        if ch == '"':
            j = i+1
            while j < n and text[j] != '"':
                if text[j] == '\\': j += 1
                j += 1
            j += 1
            yield ('STR', text[i:j])
            i = j
            continue
        # brackets
        if ch in '()':
            yield ('PAREN', ch)
            i += 1; continue
        if ch in '{}':
            yield ('BRACE', ch)
            i += 1; continue
        if ch in '[]':
            yield ('BRACK', ch)
            i += 1; continue
        # hash directive
        if ch == '#':
            j = i+1
            while j < n and (text[j].isalnum() or text[j] == '-'):
                j += 1
            yield ('HASH', text[i:j])
            i = j
            continue
        # line break
        if ch == '\\' and (i+1 >= n or text[i+1] in '\n\r'):
            yield ('BREAK', '\\')
            i += 1
            if i < n and text[i] in '\n\r': i += 1
            if i < n and text[i] in '\n\r': i += 1
            continue
        # heading markers
        if ch == '=':
            j = i
            while j < n and text[j] == '=': j += 1
            if j - i >= 2 and (j >= n or text[j] == ' '):
                yield ('HEADING_MARKER', text[i:j])
                i = j
                continue
        # list markers
        if ch in '-+' and (i+1 < n and text[i+1] == ' '):
            yield ('LIST', ch)
            i += 2
            continue
        # newline
        if ch == '\n':
            yield ('NEWLINE', '\n')
            i += 1
            continue
        # text (non-whitespace, non-newline)
        if not ch.isspace():
            j = i
            special = set('#"(){}[]\\=')
            while j < n:
                c = text[j]
                if c in special or c in '-+' or c == '\n' or (c == '/' and j+1 < n and text[j+1] == '/'):
                    break
                j += 1
            if j > i:
                yield ('TEXT', text[i:j])
                i = j
                continue
        # other whitespace (skip)
        if ch.isspace():
            i += 1
            continue
        # fallback
        yield ('CHAR', ch)
        i += 1

# ── Block-level parser ──
def parse_typ(source):
    tokens = list(tokenise(source))
    pos = [0]
    n = len(tokens)

    def peek():
        return tokens[pos[0]] if pos[0] < n else ('EOF', '')

    def consume():
        t = tokens[pos[0]]; pos[0] += 1; return t

    def skip_to_balanced(open_type, close_type, open_ch, close_ch):
        # consume the opening token
        ot, ov = consume()
        assert ot == open_type and ov == open_ch
        depth = 1
        result = []
        while pos[0] < n and depth > 0:
            tt, tv = consume()
            # Skip bracket/brace bodies as units (so inner () don't confuse depth)
            if tt == 'BRACK' and tv == '[':
                result.append(tv)
                bd = 1
                while pos[0] < n and bd > 0:
                    bt, bv = consume()
                    result.append(bv)
                    if bt == 'BRACK' and bv == '[':
                        bd += 1
                    elif bt == 'BRACK' and bv == ']':
                        bd -= 1
            elif tt == 'BRACE' and tv == '{':
                result.append(tv)
                bd = 1
                while pos[0] < n and bd > 0:
                    bt, bv = consume()
                    result.append(bv)
                    if bt == 'BRACE' and bv == '{':
                        bd += 1
                    elif bt == 'BRACE' and bv == '}':
                        bd -= 1
            elif tt == open_type and tv == open_ch:
                depth += 1
                result.append(tv)
            elif tt == close_type and tv == close_ch:
                depth -= 1
                if depth > 0: result.append(tv)
            elif depth > 0:
                result.append(tv)
        return ''.join(result)

    def skip_callout_args():
        """Skip balanced parentheses after a callout name."""
        while pos[0] < n:
            tt, tv = peek()
            if tt == 'PAREN' and tv == '(':
                return skip_to_balanced('PAREN', 'PAREN', '(', ')')
            if tt == 'HASH' or (tt == 'TEXT' and not tv.startswith('#')):
                break
            consume()
        return ''

    def read_bracket_body():
        """Read content inside [...] brackets, return as string."""
        # skip newlines before [
        while peek()[0] == 'NEWLINE': consume()
        tt, tv = consume()
        assert tt == 'BRACK' and tv == '['
        depth = 1
        body = []
        while pos[0] < n and depth > 0:
            tt, tv = consume()
            if tt == 'BRACK' and tv == '[':
                depth += 1
                body.append(tv)
            elif tt == 'BRACK' and tv == ']':
                depth -= 1
                if depth > 0: body.append(tv)
            elif tt == 'BREAK':
                body.append('\n')
            elif depth > 0:
                body.append(tv)
        return ''.join(body)

    def content_to_html(txt):
        """Convert text content to inline HTML."""
        return inline(esc(txt))

    def process_body_text(txt):
        """Convert body text (with newlines) to HTML fragments."""
        lines = txt.replace('\r', '').split('\n')
        out = []
        i, ln = 0, len(lines)
        while i < ln:
            s = lines[i].strip()
            if not s:
                i += 1
                continue
            if s == '\\':
                out.append('<br>\n'); i += 1; continue
            if s.startswith('//'):
                i += 1; continue
            if s.startswith('#v') or s.startswith('#line') or s.startswith('#pagebreak') or s.startswith('#set'):
                i += 1; continue
            if s.startswith('#block') or s.startswith('#rect'):
                # Process multi-line #block(...)[...] content (extract bracket body)
                i += 1
                # Find bracket body start
                if not re.search(r'\)\s*\[', s):
                    while i < ln:
                        ns = lines[i].strip()
                        i += 1
                        if re.search(r'\)\s*\[', ns):
                            break
                        if ns == ')':
                            if i < ln:
                                ns2 = lines[i].strip()
                                if ns2.startswith('['):
                                    i += 1
                                    break
                            break
                # Read and process bracket body content
                body_lines = []
                bdepth = 0
                while i < ln:
                    ns = lines[i]
                    i += 1
                    st = ns.strip()
                    if st == ']' and bdepth == 0:
                        break
                    bdepth += st.count('[') - st.count(']')
                    if bdepth < 0:
                        bdepth = 0
                        break
                    body_lines.append(ns)
                body = ''.join(body_lines)
                if body.strip():
                    out.append(process_body_text(body))
                continue
            if s.startswith('#align'):
                # #align(dir)[content] → <div class="center">content</div>
                # args and bracket start are on this line: #align(center)[
                i += 1
                # Read bracket body content (starts on same or next line)
                body_lines = []
                bdepth = 0
                while i < ln:
                    ns = lines[i]
                    i += 1
                    st = ns.strip()
                    if st == ']' and bdepth == 0:
                        break
                    bdepth += st.count('[') - st.count(']')
                    if bdepth < 0:
                        bdepth = 0
                        break
                    body_lines.append(ns)
                body = ''.join(body_lines)
                if body.strip():
                    out.append(f'<div class="center">\n{process_body_text(body)}\n</div>\n')
                continue
            if s.startswith('#image('):
                im = re.search(r'#image\(\s*"([^"]+)"', s)
                src = esc(im.group(1)) if im else ''
                out.append(f'<div class="center"><img src="{src}" alt=""></div>\n')
                i += 1; continue
            if re.match(r'^(fill:|inset:|radius:|stroke:|width:|height:)', s):
                i += 1; continue
            if s == ')[':
                i += 1; continue
            if s.startswith('+') and len(s) > 1:
                content = s[1:].lstrip()
                items = [inline(esc(content))]
                i += 1
                while i < ln:
                    ns = lines[i].strip()
                    if ns.startswith('+') and len(ns) > 1:
                        items.append(inline(esc(ns[1:].lstrip())))
                        i += 1
                    else:
                        break
                out.append('<ul>\n' + '\n'.join(f'<li>{x}</li>' for x in items) + '\n</ul>\n')
                continue
            if s.startswith('-') and len(s) > 1:
                content = s[1:].lstrip()
                items = [inline(esc(content))]
                i += 1
                while i < ln:
                    ns = lines[i].strip()
                    if ns.startswith('-') and len(ns) > 1:
                        items.append(inline(esc(ns[1:].lstrip())))
                        i += 1
                    else:
                        break
                out.append('<ul>\n' + '\n'.join(f'<li>{x}</li>' for x in items) + '\n</ul>\n')
                continue
            # #heading(level: N)[title] <label>
            hm = re.match(r'#heading\(level:\s*(\d+)\)\[([^\]]*)\]', s)
            if hm:
                level, title = int(hm.group(1)), hm.group(2)
                label = ''
                # Check for <label> on same line after the ]
                m2 = re.search(r'<([^>]+)>', s[hm.end():])
                if m2:
                    label = m2.group(1)
                else:
                    # Check next line
                    if i+1 < ln:
                        ns = lines[i+1].strip()
                        m3 = re.match(r'<([^>]+)>', ns)
                        if m3:
                            label = m3.group(1)
                            i += 1
                aid = f' id="{esc(label)}"' if label else ''
                out.append(f'<h{level}{aid}>{inline(esc(title))}</h{level}>\n')
                i += 1; continue
            # === / == heading markers
            hm2 = re.match(r'^(={2,})\s*(.+)$', s)
            if hm2:
                level = len(hm2.group(1))
                title = hm2.group(2)
                # optional <label> at end
                lm2 = re.search(r'\s*<([^>]+)>\s*$', title)
                label = lm2.group(1) if lm2 else ''
                if label:
                    title = title[:lm2.start()].rstrip()
                aid = f' id="{esc(label)}"' if label else ''
                out.append(f'<h{level}{aid}>{inline(esc(title))}</h{level}>\n')
                i += 1; continue
            # #info-block("title", [body]) — multi-line
            if s.startswith('#info-block('):
                # Read until ])
                lines_buf = [s]
                i += 1
                while i < ln:
                    ns = lines[i].strip()
                    lines_buf.append(ns)
                    i += 1
                    if ns.rstrip().endswith('])'):
                        break
                # Extract title and body
                full = '\n'.join(lines_buf)
                m3 = re.search(r'#info-block\("([^"]*)"\s*,\s*\[([\s\S]*)\]\)', full)
                if m3:
                    ctitle = m3.group(1)
                    cbody = m3.group(2)
                    out.append(f'<div class="callout info">\n<div class="callout-title">{esc(ctitle)}</div>\n<div class="callout-body">{process_body_text(cbody)}</div>\n</div>\n')
                continue
            # Fenced code block (``` ... ```)
            if s.startswith('```'):
                fence = s
                lang = s[3:].strip()
                code_lines = []
                i += 1
                while i < ln:
                    ns = lines[i]
                    i += 1
                    if ns.strip().startswith('```') and ns.strip() == '```':
                        break
                    code_lines.append(ns)
                code = ''.join(code_lines).rstrip('\n')
                # Escape HTML entities and wrap in pre/code with copy button
                code_html = esc(code)
                lang_attr = f' class="language-{esc(lang)}"' if lang else ''
                out.append(f'<div class="code-block"><pre{lang_attr}><button class="copy-btn" onclick="copyCode(this)">\u590d\u5236</button><code>{code_html}</code></pre></div>\n')
                continue
            out.append(f'<p>{inline(esc(s))}</p>\n')
            i += 1
        return ''.join(out)

    out = []
    while pos[0] < n:
        tt, tv = peek()

        # Skip comments
        if tt == 'COMMENT':
            consume(); continue

        # pagebreak
        if tt == 'HASH' and tv == '#pagebreak':
            consume(); skip_callout_args()
            out.append('<div class="spacer-lg"></div>\n')
            continue

        # #align(center)[...]
        if tt == 'HASH' and tv == '#align':
            consume(); skip_callout_args()
            body = read_bracket_body()
            out.append(f'<div class="center">\n{process_body_text(body)}\n</div>\n')
            continue

        # #image(...)
        if tt == 'HASH' and tv == '#image':
            consume()
            args = skip_callout_args()
            m = re.search(r'"([^"]+)"', args)
            src = m.group(1) if m else ''
            # check for width in remaining tokens
            w = ''
            out.append(f'<div class="center"><img src="{esc(src)}" alt=""{w}></div>\n')
            continue

        # #line(...)
        if tt == 'HASH' and tv == '#line':
            consume(); skip_callout_args()
            out.append('<hr>\n')
            continue

        # #v(...) — skip
        if tt == 'HASH' and tv == '#v':
            consume(); skip_callout_args()
            continue

        # #set / #show / #let — skip entire directive
        if tt == 'HASH' and tv in ('#set', '#show', '#let'):
            consume()
            while pos[0] < n:
                p = peek()
                if p[0] == 'PAREN' and p[1] == '(':
                    skip_callout_args()
                elif p[0] == 'BRACK' and p[1] == '[':
                    read_bracket_body()
                elif p[0] == 'BRACE' and p[1] == '{':
                    skip_to_balanced('BRACE', 'BRACE', '{', '}')
                elif p[0] == 'NEWLINE':
                    consume()
                    # blank line = stop
                    if pos[0] < n and peek()[0] == 'NEWLINE':
                        break
                elif p[0] == 'HASH':
                    break  # next directive starts
                else:
                    consume()
                    continue
                # consumed a balanced block — keep going for more (e.g. = {...})
                continue
            continue

        # #heading(level: N)[title] <label>
        if tt == 'HASH' and tv == '#heading':
            consume()
            args = skip_callout_args()  # (level: N)
            # parse level from args
            lm = re.search(r'level:\s*(\d+)', args)
            level = int(lm.group(1)) if lm else 2
            title = read_bracket_body()
            # optional <label> (may be TEXT '<sec' + CHAR '-' + TEXT 'quick>' due to tokeniser)
            label = ''
            if peek()[0] == 'CHAR' and peek()[1] == '<':
                consume()
                label_tokens = []
                while pos[0] < n:
                    ch = consume()
                    if ch[0] == 'CHAR' and ch[1] == '>':
                        break
                    label_tokens.append(ch[1])
                label = ''.join(label_tokens)
            elif peek()[0] == 'TEXT' and peek()[1].startswith('<'):
                # Tokeniser split <label> into TEXT '<sec' + CHAR '-' + TEXT 'quick>'
                tv_full = consume()[1]  # e.g. '<sec'
                label_tokens = [tv_full[1:]]  # strip leading '<'
                while pos[0] < n:
                    ch = consume()
                    if ch[0] == 'TEXT' and ch[1].endswith('>'):
                        label_tokens.append(ch[1][:-1])  # strip trailing '>'
                        break
                    else:
                        label_tokens.append(ch[1])
                label = ''.join(label_tokens)
            aid = f' id="{esc(label)}"' if label else ''
            out.append(f'<h{level}{aid}>{inline(esc(title))}</h{level}>\n')
            continue

        # == / === headings
        if tt == 'HEADING_MARKER':
            consume()
            level = len(tv)
            # read rest of line as title
            title_parts = []
            while pos[0] < n:
                ntt, ntv = peek()
                if ntt == 'NEWLINE' or ntt == 'EOF':
                    break
                consume()
                title_parts.append(ntv)
            title = ''.join(title_parts).strip()
            # strip <label> from end of title
            lm = re.search(r'\s*<([^>]+)>\s*$', title)
            label = lm.group(1) if lm else ''
            if label:
                title = title[:lm.start()].rstrip()
            aid = f' id="{esc(label)}"' if label else ''
            out.append(f'<h{level}{aid}>{inline(esc(title))}</h{level}>\n')
            # consume trailing newline
            if peek()[0] == 'NEWLINE': consume()
            continue

        # Callout blocks: #xxx-block("title", [...] )
        callout_match = None
        for cname, (cls, _) in {
            'error-block': ('error', ''),
            'warn-block': ('warn', ''),
            'tip-block': ('tip', ''),
            'info-block': ('info', ''),
        }.items():
            if tt == 'HASH' and tv == f'#{cname}':
                callout_match = (cname, cls)
                break
        if callout_match:
            cname, cls = callout_match
            consume()
            args = skip_callout_args()  # ("title", [body])
            # extract title from args (first quoted string)
            tm = re.search(r'"([^"]*)"', args)
            title = esc(tm.group(1)) if tm else ''
            # extract body from args (content inside [...] brackets)
            bm = re.search(r'\[(.*)\]', args, re.DOTALL)
            body = bm.group(1) if bm else ''
            body_html = process_body_text(body)
            out.append(
                f'<div class="callout {cls}">\n'
                f'<div class="callout-title">{title}</div>\n'
                f'<div class="callout-body">{body_html}</div>\n'
                f'</div>\n'
            )
            continue

        # #block(...)[...] / #rect(...)[...]
        if tt == 'HASH' and tv in ('#block', '#rect'):
            consume()
            args = skip_callout_args()  # capture args for fill color detection
            body = read_bracket_body()
            if '最后警告' in body:
                out.append(f'<div class="warn-box">\n{process_body_text(body)}\n</div>\n')
            elif '#ffe6e6' in args:
                out.append(f'<div class="warn-box">\n{process_body_text(body)}\n</div>\n')
            else:
                cls = 'block'
                if '#FFF3E0' in args: cls = 'block block-orange'
                elif '#F5F5F5' in args or '#FAFAFA' in args: cls = 'block block-gray'
                out.append(f'<div class="{cls}">\n{process_body_text(body)}\n</div>\n')
            continue

        # #set text(...) / #set par(...) — skip
        if tt == 'HASH' and tv.startswith('#set '):
            consume()
            if peek()[0] == 'PAREN' and peek()[1] == '(':
                skip_callout_args()
            continue

        # #text(...)[...] standalone — only consume if followed by [...]
        if tt == 'HASH' and tv.startswith('#text'):
            consume()
            skip_callout_args()
            while peek()[0] == 'NEWLINE': consume()
            if peek()[0] == 'BRACK' and peek()[1] == '[':
                body = read_bracket_body()
                out.append(f'<p>{inline(esc(body))}</p>\n')
            continue

        # code block (```...```) — check raw tokens
        if tt == 'HASH' and tv == '#raw':
            consume()
            # skip the show-rule block
            if peek()[0] == 'BRACE':
                skip_to_balanced('BRACE', 'BRACE', '{', '}')
            elif peek()[0] == 'BRACK':
                read_bracket_body()
            continue

        # #link(...) standalone
        if tt == 'HASH' and tv.startswith('#link'):
            consume()
            # skip the parens
            args2 = skip_callout_args()
            # <label> part (args like (<sec-quick>))
            lm2 = re.search(r'<([^>]+)>', args2)
            label = lm2.group(1) if lm2 else ''
            while peek()[0] == 'NEWLINE': consume()
            if peek()[0] == 'BRACK' and peek()[1] == '[':
                body = read_bracket_body()
                out.append(f'<p><a href="#{esc(label)}">{inline(esc(body))}</a></p>\n')
            continue

        # Lists (- / +)
        if tt == 'LIST':
            ch = tv
            consume()
            items = []
            # read the first item text until newline
            item_text = []
            while pos[0] < n:
                nt, nv = peek()
                if nt == 'NEWLINE':
                    consume(); break
                if nt == 'LIST' or nt == 'HASH':
                    break
                consume()
                item_text.append(nv)
            items.append(inline(esc(''.join(item_text).strip())))
            # continue collecting consecutive list items
            while peek()[0] == 'LIST' and peek()[1] == ch:
                consume()
                item_text = []
                while pos[0] < n:
                    nt, nv = peek()
                    if nt == 'NEWLINE':
                        consume(); break
                    if nt == 'LIST' or nt == 'HASH':
                        break
                    consume()
                    item_text.append(nv)
                items.append(inline(esc(''.join(item_text).strip())))
            tag = 'ol' if ch == '+' else 'ul'
            lis = '\n'.join(f'<li>{x}</li>' for x in items)
            out.append(f'<{tag}>\n{lis}\n</{tag}>\n')
            continue

        # Plain text paragraph
        if tt == 'TEXT' or tt == 'CHAR':
            # Check if this is a fenced code block
            first_tok = tv if tt == 'TEXT' else ''
            if first_tok.startswith('```') or (tt == 'CHAR' and first_tok == '`' and pos[0]+2 < n and tokens[pos[0]][0] == 'CHAR' and tokens[pos[0]][1] == '`' and tokens[pos[0]+1][0] == 'CHAR' and tokens[pos[0]+1][1] == '`'):
                # Fenced code block detected
                fence_line = first_tok
                consume()
                # If the fence is split across CHAR tokens, finish reading it
                if tt == 'CHAR':
                    # Already consumed opening `, consume the other two
                    for _ in range(2):
                        if pos[0] < n and peek()[0] == 'CHAR' and peek()[1] == '`':
                            consume()
                # Read rest of the opening line (for language)
                lang_parts = []
                while pos[0] < n:
                    nt2, nv2 = peek()
                    if nt2 == 'NEWLINE':
                        consume(); break
                    if nt2 in ('TEXT', 'CHAR'):
                        consume(); lang_parts.append(nv2)
                    else:
                        break
                lang = ''.join(lang_parts).strip()
                # Read code lines until closing ```
                code_lines = []
                while pos[0] < n:
                    nt2, nv2 = peek()
                    if nt2 == 'NEWLINE':
                        consume()
                        # Check if next tokens start with ```
                        if pos[0] < n:
                            t3, v3 = peek()
                            if t3 == 'CHAR' and v3 == '`' and pos[0]+2 < n and tokens[pos[0]+1][0] == 'CHAR' and tokens[pos[0]+1][1] == '`' and tokens[pos[0]+2][0] == 'CHAR' and tokens[pos[0]+2][1] == '`':
                                # Consume closing ```
                                for _ in range(3):
                                    if pos[0] < n and peek()[0] == 'CHAR' and peek()[1] == '`':
                                        consume()
                                # Skip rest of line
                                while pos[0] < n:
                                    if peek()[0] == 'NEWLINE':
                                        consume(); break
                                    consume()
                                break
                            elif t3 == 'TEXT' and v3 == '```' and len(v3) == 3:
                                # Text token contains just ```
                                consume()
                                if peek()[0] == 'NEWLINE': consume()
                                break
                            elif t3 == 'TEXT' and v3.startswith('```'):
                                consume()
                                if peek()[0] == 'NEWLINE': consume()
                                break
                        code_lines.append('\n')
                    elif nt2 in ('TEXT', 'CHAR', 'BREAK', 'STR', 'CODE', 'HASH', 'LIST', 'PAREN', 'BRACK', 'BRACE'):
                        consume()
                        if nt2 == 'BREAK':
                            code_lines.append('\n')
                        else:
                            code_lines.append(nv2)
                    else:
                        break
                code = ''.join(code_lines).rstrip('\n')
                # Escape HTML entities and wrap
                lang_attr = f' class="language-{esc(lang)}"' if lang else ''
                out.append(f'<div class="code-block"><pre{lang_attr}><button class="copy-btn" onclick="copyCode(this)">\u590d\u5236</button><code>{esc(code)}</code></pre></div>\n')
            else:
                para = []
                while pos[0] < n:
                    nt, nv = peek()
                    if nt == 'NEWLINE':
                        consume()
                        # Don't continue paragraph if next line is a fenced code block
                        nnt, nnv = peek()
                        if nnt == 'NEWLINE':
                            break
                        if nnt == 'TEXT' and nnv.startswith('```'):
                            break
                        if nnt in ('TEXT', 'CHAR', 'HASH', 'STR', 'BRACK', 'PAREN', 'BRACE'):
                            continue
                        break
                    if nt in ('TEXT', 'CHAR', 'BREAK', 'STR', 'BRACK', 'PAREN', 'BRACE'):
                        consume()
                        if nt == 'BREAK':
                            para.append('<br>')
                        else:
                            para.append(nv)
                    else:
                        break
                text = ''.join(para).strip()
                if text:
                    out.append(f'<p>{inline(esc(text))}</p>\n')
            continue

        # List items
        if tt == 'LIST':
            consume()
            marker = tv
            items = []
            item_parts = []
            # Include content after list marker (next token(s))
            if peek()[0] in ('TEXT', 'CHAR', 'HASH', 'STR'):
                item_parts.append(consume()[1])
            # Read rest of item, handling inline HASH directives
            while pos[0] < n:
                nt, nv = peek()
                if nt == 'NEWLINE':
                    consume()
                    nnt, nnv = peek()
                    if nnt == 'NEWLINE':
                        break
                    if nnt == 'LIST' and nnv == marker:
                        items.append(''.join(item_parts).strip())
                        item_parts = []
                        consume()
                        if peek()[0] in ('TEXT', 'CHAR', 'HASH', 'STR'):
                            item_parts.append(consume()[1])
                        continue
                    # continuation line
                    if nnt in ('TEXT', 'CHAR', 'HASH', 'STR', 'LIST', 'BRACK', 'PAREN', 'BRACE'):
                        item_parts.append(' ')
                        continue
                    break
                elif nt == 'BREAK':
                    consume(); item_parts.append('<br>')
                elif nt in ('TEXT', 'CHAR', 'STR', 'CODE', 'BRACK', 'PAREN', 'BRACE'):
                    consume(); item_parts.append(nv)
                elif nt == 'HASH':
                    # check for #link, #image, etc. inline directives
                    consume()
                    if peek()[0] == 'PAREN' and peek()[1] == '(':
                        skip_callout_args()
                    if peek()[0] == 'BRACK' and peek()[1] == '[':
                        body = read_bracket_body()
                        item_parts.append(inline(esc(body)))
                elif nt in ('PAREN', 'BRACK', 'BRACE'):
                    consume(); item_parts.append(nv)
                else:
                    break
            items.append(''.join(item_parts).strip())
            tag = 'ul'
            out.append(f'<{tag}>\n')
            for item in items:
                out.append(f'<li>{inline(esc(item))}</li>\n')
            out.append(f'</{tag}>\n')
            continue

        # Skip newlines and unknown tokens
        consume()

    return ''.join(out)


# ── main ──
def main():
    with open(TYP_FILE, encoding='utf-8') as f:
        source = f.read()

    content = parse_typ(source)

    theme_script = (
        "<script>try{var s=localStorage.getItem('latexSnipper-theme');"
        "if(s==='dark'||s==='light')document.documentElement."
        "setAttribute('data-theme',s)}catch(e){}</script>"
    )

    manual_script = (
        '<script>'
        '!function(){'
        'var b=document.getElementById("themeToggle"),d=document.documentElement;'
        'b&&b.addEventListener("click",function(){'
        'var n="dark"===d.getAttribute("data-theme");'
        'd.setAttribute("data-theme",n?"light":"dark");'
        'try{localStorage.setItem("latexSnipper-theme",n?"light":"dark")}catch(e){}})'
        '}();'
        '!function(){'
        'var b=document.getElementById("backToTop");'
        'if(b){'
        'var s=function(){window.scrollY>400?b.classList.add("visible"):b.classList.remove("visible")};'
        'window.addEventListener("scroll",s,{passive:!0});'
        'b.addEventListener("click",function(){window.scrollTo({top:0,behavior:"smooth"})});'
        's()}}();'
        'function copyCode(b){'
        'var c=b.nextElementSibling.textContent;'
        'navigator.clipboard.writeText(c).then(function(){'
        'b.textContent="\\u5df2\\u590d\\u5236";'
        'b.classList.add("copied");'
        'setTimeout(function(){'
        'b.classList.add("copied-fade");'
        'setTimeout(function(){'
        'b.textContent="\\u590d\\u5236";'
        'b.classList.remove("copied","copied-fade")'
        '},600)},800)'
        '}).catch(function(){'
        'var t=document.createElement("textarea");'
        't.value=c;t.style.position="fixed";t.style.opacity="0";'
        'document.body.appendChild(t);t.select();'
        'document.execCommand("copy");'
        'document.body.removeChild(t);'
        'b.textContent="\\u5df2\\u590d\\u5236";'
        'setTimeout(function(){b.textContent="\\u590d\\u5236"},1500)})}'
        '</script>'
    )

    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>LaTeXSnipper 用户手册 v2.3.2</title>
{theme_script}
<link rel="stylesheet" href="styles.css">
</head>
<body class="manual">
<nav class="top-nav"><div class="inner"><a href="index.html">主页</a><a href="https://github.com/SakuraMathcraft/LaTeXSnipper" target="_blank" rel="noopener">GitHub 仓库</a><button class="theme-toggle" id="themeToggle" title="切换日/夜模式">🌙</button></div></nav>
<div class="spacer-top"></div>

{content}

<button class="back-to-top" id="backToTop" title="回到顶部" aria-label="回到顶部"><span class="btt-arrow">▲</span><span class="btt-text">顶部</span></button>
<script>
// 主题切换
(function() {{
  const toggle = document.getElementById('themeToggle');
  const root = document.documentElement;
  const STORAGE_KEY = 'latexSnipper-theme';
  
  function lsGet() {{
    try {{ return localStorage.getItem(STORAGE_KEY); }} catch (e) {{ return null; }}
  }}
  function lsSet(v) {{
    try {{ if (v) localStorage.setItem(STORAGE_KEY, v); else localStorage.removeItem(STORAGE_KEY); }} catch (e) {{}}
  }}
  
  function loadTheme() {{
    const saved = lsGet();
    if (saved === 'dark' || saved === 'light') {{
      root.setAttribute('data-theme', saved);
    }} else {{
      root.removeAttribute('data-theme');
    }}
  }}
  
  function isDark() {{
    const attr = root.getAttribute('data-theme');
    if (attr === 'dark') return true;
    if (attr === 'light') return false;
    return matchMedia('(prefers-color-scheme: dark)').matches;
  }}
  
  if (toggle) {{
    function updateIcon() {{
      toggle.textContent = isDark() ? '☀️' : '🌙';
    }}
    loadTheme();
    updateIcon();
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {{
      loadTheme();
      updateIcon();
    }});
    
    toggle.addEventListener('click', () => {{
      if (isDark()) {{
        root.setAttribute('data-theme', 'light');
      }} else {{
        root.setAttribute('data-theme', 'dark');
      }}
      lsSet(root.getAttribute('data-theme'));
      updateIcon();
    }});
  }}
}})();

// 回到顶部按钮
(function() {{
  const btn = document.getElementById('backToTop');
  if (!btn) return;
  let fadeTimer = null;
  const FADE_DELAY = 4000;
  
  function toggle() {{
    if (window.scrollY > 400) {{
      btn.classList.add('visible');
      startFadeTimer();
    }} else {{
      btn.classList.remove('visible');
      btn.classList.remove('faded');
      clearFadeTimer();
    }}
  }}
  
  function startFadeTimer() {{
    clearFadeTimer();
    fadeTimer = setTimeout(() => {{ btn.classList.add('faded'); }}, FADE_DELAY);
  }}
  
  function clearFadeTimer() {{
    if (fadeTimer) {{ clearTimeout(fadeTimer); fadeTimer = null; }}
  }}
  
  window.addEventListener('scroll', toggle, {{ passive: true }});
  btn.addEventListener('click', () => {{
    window.scrollTo({{ top: 0, behavior: 'smooth' }});
  }});
  btn.addEventListener('mouseenter', () => {{
    btn.classList.remove('faded');
    clearFadeTimer();
  }});
  btn.addEventListener('mouseleave', () => {{
    startFadeTimer();
  }});
  toggle();
}})();

// 复制代码
function copyCode(btn) {{
  const code = btn.nextElementSibling.textContent;
  navigator.clipboard.writeText(code).then(() => {{
    btn.textContent = '已复制';
    btn.classList.add('copied');
    setTimeout(() => {{
      btn.classList.add('copied-fade');
      setTimeout(() => {{
        btn.textContent = '复制';
        btn.classList.remove('copied', 'copied-fade');
      }}, 600);
    }}, 800);
  }}).catch(() => {{
    const ta = document.createElement('textarea');
    ta.value = code; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    btn.textContent = '已复制';
    setTimeout(() => {{ btn.textContent = '复制'; }}, 1500);
  }});
}}
</script>
</body>
</html>
"""

    # Inline PNG images as base64
    import base64
    def inline_base64(m):
        src = m.group(1)
        if os.path.isfile(src) and src.lower().endswith('.png'):
            with open(src, 'rb') as imgf:
                b64 = base64.b64encode(imgf.read()).decode('ascii')
            return f'<img src="data:image/png;base64,{b64}" alt="{m.group(2)}">'
        return m.group(0)
    html = re.sub(r'<img src="([^"]+)" alt="([^"]*)">', inline_base64, html)

    with open(HTML_FILE, 'w', encoding='utf-8') as f:
        f.write(html)

    h1s = content.count('<h1')
    h2s = content.count('<h2')
    h3s = content.count('<h3')
    calls = content.count('class="callout ')
    warned = content.count('class="warn-box"')
    print(f"[OK] {HTML_FILE}: {h1s} h1, {h2s} h2, {h3s} h3, {calls} callouts, {warned} warn-box")

if __name__ == '__main__':
    main()
