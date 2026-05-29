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

def slugify(text):
    """Generate an ASCII URL-friendly ID from Chinese/mixed text."""
    s = text.strip().lower()
    mapping = {
        '开': 'kai', '始': 'shi', '使': 'shi', '用': 'yong', '前': 'qian',
        '必': 'bi', '读': 'du', '主': 'zhu', '窗': 'chuang', '口': 'kou',
        '功': 'gong', '能': 'neng', '入': 'ru', '与': 'yu', '识': 'shi',
        '别': 'bie', '流': 'liu', '程': 'cheng', '本': 'ben', '地': 'di',
        '模': 'mo', '型': 'xing', '相': 'xiang', '关': 'guan', '问': 'wen',
        '题': 'ti', '外': 'wai', '部': 'bu', '安': 'an', '装': 'zhuang',
        '和': 'he', '环': 'huan', '境': 'jing', '网': 'wang', '络': 'luo',
        '更': 'geng', '新': 'xin', '效': 'xiao', '果': 'guo', '技': 'ji',
        '巧': 'qiao', '特': 'te', '定': 'ding', '平': 'ping', '台': 'tai',
        '其': 'qi', '他': 'ta', '软': 'ruan', '件': 'jian', '冲': 'chong',
        '突': 'tu', '有': 'you', '反': 'fan', '馈': 'kui', '源': 'yuan',
        '码': 'ma', '运': 'yun', '行': 'xing', '发': 'fa', '者': 'zhe',
        '常': 'chang', '见': 'jian', '集': 'ji', '配': 'pei', '置': 'zhi',
        '展': 'zhan', '示': 'shi', '性': 'xing', '参': 'can', '考': 'kao',
        '指': 'zhi', '南': 'nan', '介': 'jie', '绍': 'shao', '项': 'xiang',
        '目': 'mu', '内': 'nei', '校': 'xiao', '正': 'zheng',
        '编': 'bian', '辑': 'ji', '器': 'qi', '设': 'she', '备': 'bei',
        '键': 'jian', '盘': 'pan', '快': 'kuai', '捷': 'jie', '方': 'fang',
        '式': 'shi', '自': 'zi', '动': 'dong', '检': 'jian', '测': 'ce',
        '更': 'geng', '多': 'duo', '说': 'shuo', '明': 'ming',
        '回': 'hui', '归': 'gui', '分': 'fen', '析': 'xi', '项': 'xiang',
        '目': 'mu',
    }
    result = []
    for ch in s:
        if 'a' <= ch <= 'z' or '0' <= ch <= '9' or ch == '-':
            result.append(ch)
        elif ch in mapping:
            result.append(mapping[ch])
        elif ch.isspace() or ch in '._:;,':
            result.append('-')
    import re
    r = re.sub(r'-+', '-', ''.join(result)).strip('-')
    return r if r else 'heading'

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
        # heading markers (= h1, == h2, === h3)
        if ch == '=':
            j = i
            while j < n and text[j] == '=': j += 1
            if j - i >= 1 and (j >= n or text[j] == ' '):
                yield ('HEADING_MARKER', text[i:j])
                i = j
                continue
        # list markers (only at line start, not mid-paragraph like "X11 + GPU")
        if ch in '-+' and (i+1 < n and text[i+1] == ' '):
            if i == 0 or (i > 0 and text[i-1] == '\n'):
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
                if not label:
                    label = slugify(title)
                aid = f' id="{esc(label)}"' if label else ''
                out.append(f'<h{level}{aid}>{inline(esc(title))}</h{level}>\n')
                i += 1; continue
            # === / == / = heading markers
            hm2 = re.match(r'^(={1,})\s*(.+)$', s)
            if hm2:
                level = len(hm2.group(1))
                title = hm2.group(2)
                # optional <label> at end
                lm2 = re.search(r'\s*<([^>]+)>\s*$', title)
                label = lm2.group(1) if lm2 else ''
                if label:
                    title = title[:lm2.start()].rstrip()
                else:
                    label = slugify(title)
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
            if not label:
                label = slugify(title)
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
            else:
                # auto-generate ID from title text
                label = slugify(title)
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
                    elif nt2 in ('TEXT', 'CHAR', 'BREAK', 'STR', 'CODE', 'HASH', 'LIST', 'PAREN', 'BRACK', 'BRACE', 'HEADING_MARKER'):
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


def enhance_volumes(html_content):
    """将卷标题增强为醒目分割条，但跳过目录块内的标题。"""
    vol_pattern = re.compile(
        r'(<p><strong>(第[一二两三]卷\s*[··]?\s*.+?)</strong></p>)',
        re.DOTALL
    )

    result = []
    pos = 0
    for m in vol_pattern.finditer(html_content):
        start, end = m.start(), m.end()
        # 检查前面最近的 block-gray 开始/结束标记
        before = html_content[max(0, start-2000):start]
        in_block_gray = (
            '<div class="block block-gray">' in before
            and before.rfind('<div class="block block-gray">') > before.rfind('</div>')
        )
        result.append(html_content[pos:start])
        if in_block_gray:
            result.append(m.group(0))
        else:
            title = m.group(2)
            result.append(f'<div class="volume-divider"><div class="volume-divider-inner"><span class="volume-label">{title}</span></div></div>')
        pos = end
    result.append(html_content[pos:])
    return ''.join(result)


def build_toc(content):
    """从生成的 HTML content 中提取标题，构建目录列表。
    返回 (toc_items, volume_indices)，其中 toc_items 为 (level, id, text) 列表，
    volume_indices 为每个 volume 在 toc_items 中的起止索引。
    """
    toc = []
    # 提取标准 <h1>/<h2>/<h3> 标题
    pattern = r'<h([1-3])\s*(?:id="([^"]*)")?\s*>(.*?)</h\1>'
    for m in re.finditer(pattern, content):
        level = int(m.group(1))
        hid = m.group(2) or ''
        raw_text = m.group(3)
        text = re.sub(r'<[^>]+>', '', raw_text)
        if hid:
            toc.append((level, hid, text))

    # 提取正文中 Typst 语法风格的标题（如 <p>=Heading <sec-id></p> 或 <p>=Heading</p>）
    ph_pattern = r'<p>=+([^<]+?)(?:\s*&lt;([^&]+)&gt;)?\s*</p>'
    for m in re.finditer(ph_pattern, content):
        raw_text = m.group(1).strip()
        hid = m.group(2).strip() if m.group(2) else ''
        level = 1  # 都按 h1 处理，因为无法区分级别
        text = re.sub(r'<[^>]+>', '', raw_text)
        if not hid:
            hid = slugify(text)
        if raw_text and not any(hid == h[1] for h in toc):
            toc.append((level, hid, text))

    # 通过 volume-divider 定位分卷
    vp = re.compile(r'<span class="volume-label">([^<]+)</span>')
    vdivs = list(vp.finditer(content))
    vol_divisions = []
    for idx, (lvl, hid, txt) in enumerate(toc):
        pos = content.find(f'id="{hid}"')
        if pos < 0:
            pos = content.find(f'href="#{hid}"')
        vol = 0
        for vi, vd in enumerate(vdivs):
            if pos > vd.start():
                vol = vi + 1
        if not vol_divisions or vol_divisions[-1]['vol'] != vol:
            vol_divisions.append({
                'vol': vol,
                'start': idx,
                'title': vdivs[vol-1].group(1) if vol > 0 else ''
            })
    return toc, vol_divisions


# ── main ──
def main():
    with open(TYP_FILE, encoding='utf-8') as f:
        source = f.read()

    content = parse_typ(source)
    # 增强分卷分隔
    content = enhance_volumes(content)

    theme_script = (
        "<script>try{var s=localStorage.getItem('latexSnipper-theme');"
        "if(s==='dark'||s==='light')document.documentElement."
        "setAttribute('data-theme',s)}catch(e){}</script>"
    )

    sidebar_script = (
        '<script>'
        '!function(){'
        'var ls=document.getElementById("sidebar"),lc=document.getElementById("sidebarClose");'
        'var rs=document.getElementById("rightSidebar"),rc=document.getElementById("rightSidebarClose");'
        'var fa=document.getElementById("floatArrow");'
        'var el=document.getElementById("edgeHoverLeft"),er=document.getElementById("edgeHoverRight");'
        'function openLS(){if(rs)rs.classList.remove("open");if(ls){ls.style.pointerEvents="";ls.classList.add("open")}}'
        'function openRS(){if(ls)ls.classList.remove("open");if(rs){rs.style.pointerEvents="";rs.classList.add("open")}}'
        'function closeAll(){if(ls){ls.classList.remove("open");ls.style.pointerEvents="none"}if(rs){rs.classList.remove("open");rs.style.pointerEvents="none"}}'
        # Edge hover zones - mouse touches screen edge to open sidebar
        'if(el){el.addEventListener("mouseenter",function(){openLS()})}'
        'if(er){er.addEventListener("mouseenter",function(){openRS()})}'
        # Sidebar self hover
        'if(ls){'
        'var h=null;'
        'ls.addEventListener("mouseenter",function(){openLS();clearTimeout(h);h=null});'
        'ls.addEventListener("mouseleave",function(){h=setTimeout(function(){ls.classList.remove("open")},300)});'
        'if(lc)lc.addEventListener("click",function(ev){ev.stopPropagation();ls.classList.remove("open");ls.style.pointerEvents="none";clearTimeout(h)});'
        '}'
        'if(rs){'
        'var h2=null;'
        'rs.addEventListener("mouseenter",function(){openRS();clearTimeout(h2);h2=null});'
        'rs.addEventListener("mouseleave",function(){h2=setTimeout(function(){rs.classList.remove("open")},300)});'
        'if(rc)rc.addEventListener("click",function(ev){ev.stopPropagation();rs.classList.remove("open");rs.style.pointerEvents="none";clearTimeout(h2)});'
        '}'
        'if(fa){'
        'var side="left",arrowY=window.innerHeight*0.5;'
        'var dragging=false,startX=0,startY=0,startArrowY=0,hasMoved=false;'
        'var saved=null;try{saved=JSON.parse(localStorage.getItem("latexSnipper-floatArrow"))}catch(e){}'
        'if(saved){side=saved.side||"left";arrowY=saved.y||arrowY;arrowY=Math.max(60,Math.min(window.innerHeight-60,arrowY))}'
        'function updateArrow(){'
        'fa.classList.remove("side-left","side-right");'
        'fa.classList.add("side-"+side);'
        'if(side==="left"){fa.style.left="6px";fa.style.right="auto"}'
        'else{fa.style.right="6px";fa.style.left="auto"}'
        'fa.style.top=arrowY+"px";'
        '}'
        'function savePos(){try{localStorage.setItem("latexSnipper-floatArrow",JSON.stringify({side:side,y:arrowY}))}catch(e){}}'
        'function onDown(e){'
        'e.preventDefault();dragging=true;hasMoved=false;'
        'var cx=e.touches?e.touches[0].clientX:e.clientX;'
        'var cy=e.touches?e.touches[0].clientY:e.clientY;'
        'startX=cx;startY=cy;startArrowY=arrowY;'
        'fa.classList.add("dragging");'
        '}'
        'function onMove(e){'
        'if(!dragging)return;'
        'var cx=e.touches?e.touches[0].clientX:e.clientX;'
        'var cy=e.touches?e.touches[0].clientY:e.clientY;'
        'var dx=cx-startX,dy=cy-startY;'
        'if(Math.abs(dx)>3||Math.abs(dy)>3)hasMoved=true;'
        'arrowY=Math.max(40,Math.min(window.innerHeight-40,startArrowY+dy));'
        'fa.style.top=arrowY+"px";'
        'if(cx<window.innerWidth*0.5){fa.classList.remove("side-right");fa.classList.add("side-left")}'
        'else{fa.classList.remove("side-left");fa.classList.add("side-right")}'
        'fa.style.left=(cx<window.innerWidth*0.5)?"6px":"auto";'
        'fa.style.right=(cx>=window.innerWidth*0.5)?"6px":"auto";'
        '}'
        'function onUp(e){'
        'if(!dragging)return;'
        'dragging=false;fa.classList.remove("dragging");'
        'var cx;if(e.changedTouches)cx=e.changedTouches[0].clientX;else cx=e.clientX;'
        'side=cx<window.innerWidth*0.5?"left":"right";'
        'updateArrow();savePos();'
        'if(!hasMoved){'
        'if(side==="left"){if(ls&&ls.classList.contains("open"))closeAll();else openLS()}'
        'else{if(rs&&rs.classList.contains("open"))closeAll();else openRS()}'
        '}'
        '}'
        'fa.addEventListener("touchstart",onDown,{passive:false});'
        'fa.addEventListener("touchmove",onMove,{passive:false});'
        'fa.addEventListener("touchend",onUp);'
        'fa.addEventListener("mousedown",onDown);'
        'window.addEventListener("mousemove",function(e){if(dragging)onMove(e)});'
        'window.addEventListener("mouseup",function(e){if(dragging)onUp(e)});'
        'updateArrow();'
        '}'
        'document.addEventListener("click",function(e){'
        'if(ls&&ls.classList.contains("open")&&!ls.contains(e.target)&&e.target!==fa&&!fa.contains(e.target))closeAll();'
        'if(rs&&rs.classList.contains("open")&&!rs.contains(e.target)&&e.target!==fa&&!fa.contains(e.target))closeAll();'
        '});'
        '}();'
        'function tb(a){var r=[];a.forEach(function(l){var i=l.getAttribute("href");if(i&&i[0]==="#"){var e=document.getElementById(i.slice(1));if(e)r.push({el:e,link:l})}});return r}'
        'function hu(h,a){var t=window.scrollY+120;var c=null;for(var i=0;i<h.length;i++){var o=h[i];if(o.el.offsetTop<=t)c=o;else break}'
        'a.forEach(function(l){l.classList.remove("active")});if(c)c.link.classList.add("active")}'
        '!function(){'
        'var s=document.getElementById("sidebar");if(!s)return;var a=s.querySelectorAll(".toc-list a,.toc-list span");'
        'a=Array.from(a).filter(function(l){return l.tagName==="A"});if(!a.length)return;var h=tb(a);'
        'function u(){hu(h,a)}'
        'window.addEventListener("scroll",u,{passive:true});u()'
        '}();'
        '!function(){'
        'var s=document.getElementById("rightSidebar");if(!s)return;var a=s.querySelectorAll(".rs-list a,.rs-list span");'
        'a=Array.from(a).filter(function(l){return l.tagName==="A"});if(!a.length)return;var h=tb(a);'
        'function u(){hu(h,a)}'
        'window.addEventListener("scroll",u,{passive:true});u()'
        '}();'
        '!function(){'
        'var s=document.getElementById("sidebar");'
        'if(!s)return;'
        's.addEventListener("click",function(e){var l=e.target.closest("a");if(l&&l.getAttribute("href")&&l.getAttribute("href")[0]==="#"){'
        'var t=document.getElementById(l.getAttribute("href").slice(1));if(t){e.preventDefault();t.scrollIntoView({behavior:"smooth",block:"start"})}'
        's.classList.remove("open")'
        '}})'
        '}();'
        '!function(){'
        'var s=document.getElementById("rightSidebar");'
        'if(!s)return;'
        's.addEventListener("click",function(e){var l=e.target.closest("a");if(l&&l.getAttribute("href")&&l.getAttribute("href")[0]==="#"){'
        'var t=document.getElementById(l.getAttribute("href").slice(1));if(t){e.preventDefault();t.scrollIntoView({behavior:"smooth",block:"start"})}'
        's.classList.remove("open")'
        '}})'
        '}();'
        '</script>'
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

    # ── 构建目录（含分卷信息）──
    toc_items, vol_divisions = build_toc(content)
    # 生成带分卷分割的 TOC HTML
    def render_toc_items(toc_items, vol_divisions, cls_prefix):
        lines = []
        div_idx = 0
        next_vol_start = vol_divisions[div_idx + 1]['start'] if div_idx + 1 < len(vol_divisions) else len(toc_items)
        for i, (level, hid, text) in enumerate(toc_items):
            # 如果到了分卷边界（且不是第一个标题），插入分卷分割
            if div_idx + 1 < len(vol_divisions) and i == vol_divisions[div_idx + 1]['start']:
                vol_title = vol_divisions[div_idx + 1]['title']
                lines.append(f'<li class="{cls_prefix}-vol-divider"><span>{esc(vol_title)}</span></li>')
                div_idx += 1
            indent = '  ' * (level - 1)
            cls = f'{cls_prefix}-h{level}'
            lines.append(
                f'{indent}<li class="{cls}"><a href="#{esc(hid)}">{esc(text)}</a></li>'
            )
        return '\n'.join(lines)

    toc_html = render_toc_items(toc_items, vol_divisions, 'toc')
    right_toc_html = render_toc_items(toc_items, vol_divisions, 'rs')

    sidebar_html = f"""<nav class="sidebar" id="sidebar">
    <div class="sidebar-header"><svg class="sidebar-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> 目录<button class="sidebar-close" id="sidebarClose" title="收起">✕</button></div>
  <div class="sidebar-inner">
    <ul class="toc-list">
{toc_html}
    </ul>
  </div>
</nav>"""

    right_sidebar_html = f"""<aside class="right-sidebar" id="rightSidebar">
    <div class="rs-header"><button class="rs-close" id="rightSidebarClose" title="收起">✕</button><svg class="sidebar-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> 目录</div>
  <div class="rs-inner">
    <ul class="rs-list" id="rsList">
{right_toc_html}
    </ul>
  </div>
</aside>"""

    # ── 增强分卷分隔（将卷标题替换为醒目分割条）──
    sidebar_css = """\
  /* ── 左右导航栏共用 ── */
  .sidebar, .right-sidebar { position: fixed; top: 0; bottom: 0; width: 260px; z-index: 1100; background: var(--card-bg); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-color: var(--border-color); border-style: solid; border-width: 0; box-shadow: var(--card-shadow); transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease; opacity: 0; overflow-y: auto; display: flex; flex-direction: column; }
  .sidebar { left: 0; border-right-width: 1px; transform: translateX(-100%); }
  .right-sidebar { right: 0; border-left-width: 1px; transform: translateX(100%); }
  .sidebar.open { transform: translateX(0); opacity: 1; }
  .right-sidebar.open { transform: translateX(0); opacity: 1; }
  /* 目录头和叉号 sticky 固定，不随目录滚动 */
  .sidebar-header, .rs-header { position: sticky; top: 0; z-index: 2; background: var(--card-bg); font-weight: 700; font-size: 0.95rem; color: var(--fg); padding: 0.75rem 0.75rem; margin: 0; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; gap: 6px; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
  /* 叉号绝对定位在内侧：左栏叉号在右，右栏叉号在左 */
  .sidebar-close { position: absolute; right: 0.75rem; }
  .rs-close { position: absolute; left: 0.75rem; }
  .sidebar-icon { flex-shrink: 0; }
  .sidebar-inner, .rs-inner { flex: 1; overflow-y: auto; padding: 0.5rem 0.75rem 1rem; }
  .toc-list, .rs-list { list-style: none; margin: 0; padding: 0; }
  .toc-list li, .rs-list li { margin: 0; }
  .toc-list a, .rs-list a { display: block; padding: 0.3rem 0.5rem; color: var(--muted); text-decoration: none; font-size: 0.82rem; border-radius: 6px; transition: background 0.15s, color 0.15s; line-height: 1.4; }
  .toc-list a:hover, .rs-list a:hover { background: rgba(128,128,128,0.08); color: var(--fg); }
  .toc-list a.active, .rs-list a.active { color: var(--accent); background: rgba(59,130,246,0.08); font-weight: 600; }
  .toc-h2, .rs-h2 { padding-left: 1rem; }
  .toc-h3, .rs-h3 { padding-left: 2rem; }
  .toc-h2 a, .rs-h2 a { font-size: 0.8rem; }
  .toc-h3 a, .rs-h3 a { font-size: 0.78rem; }
  /* ── 分卷分割线 ── */
  .toc-vol-divider, .rs-vol-divider { padding: 0.6rem 0.5rem 0.3rem; border-top: 1px solid var(--border-color); margin-top: 0.3rem; }
  .toc-vol-divider span, .rs-vol-divider span { font-size: 0.72rem; font-weight: 600; color: var(--accent); opacity: 0.8; text-transform: uppercase; letter-spacing: 0.5px; }
  /* ── 顶栏自动隐藏 ── */
  .top-nav-trigger { position: fixed; top: 0; left: 0; right: 0; height: 8px; z-index: 1001; cursor: default; }
  .top-nav { transform: translateY(-100%) !important; opacity: 0; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease !important; }
  .top-nav-trigger:hover ~ .top-nav, .top-nav:hover { transform: translateY(0) !important; opacity: 1; }
  .at-top .top-nav { transform: translateY(0) !important; opacity: 1; }
  .spacer-top { height: 56px; }
    /* ── 浮动可拖动箭头按钮 ── */
  .float-arrow { position: fixed; z-index: 1080; width: 42px; height: 42px; border-radius: 50%; background: var(--card-bg); border: 1px solid var(--border-color); box-shadow: 0 2px 16px rgba(0,0,0,0.10); cursor: grab; display: flex; align-items: center; justify-content: center; user-select: none; -webkit-user-select: none; touch-action: none; transition: box-shadow 0.2s, border-color 0.2s, left 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), right 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
  .float-arrow:active { cursor: grabbing; }
  .float-arrow.dragging { box-shadow: 0 8px 32px rgba(0,0,0,0.18); border-color: var(--accent); transform: scale(1.08); transition: none; }
  .float-arrow:hover { border-color: var(--accent); }
  .float-arrow svg { width: 20px; height: 20px; color: var(--accent); pointer-events: none; transition: transform 0.3s ease; }
  .float-arrow.side-left svg { transform: rotate(0deg); }
  .float-arrow.side-right svg { transform: rotate(180deg); }
  @media (max-width: 768px) { .float-arrow { width: 38px; height: 38px; } .float-arrow svg { width: 18px; height: 18px; } }
  /* ── 鼠标靠边悬停触发区域（隐形） ── */
  .edge-hover-left { position: fixed; top: 0; left: 0; width: 20px; bottom: 0; z-index: 1090; cursor: default; }
  .edge-hover-right { position: fixed; top: 0; right: 0; width: 20px; bottom: 0; z-index: 1090; cursor: default; }
  /* ── 收起按钮 ── */
  .sidebar-close, .rs-close { background: none; border: none; cursor: pointer; font-size: 1.1rem; color: var(--muted); padding: 0.2rem; border-radius: 4px; display: flex; align-items: center; justify-content: center; transition: background 0.15s; width: 26px; height: 26px; flex-shrink: 0; }
  .sidebar-close:hover, .rs-close:hover { background: rgba(128,128,128,0.1); color: var(--fg); }
  /* ── PDF 下载链接 ── */
  .download-pdf-link { margin-left: auto; display: inline-flex; align-items: center; gap: 4px; font-size: 0.82rem; color: var(--muted); text-decoration: none; padding: 4px 10px; border-radius: 6px; transition: background 0.15s, color 0.15s; }
  .download-pdf-link:hover { background: rgba(128,128,128,0.08); color: var(--fg); }
  .dl-icon { flex-shrink: 0; display: block; }
  /* ── 分卷分隔条 ── */
  .volume-divider { margin: 2rem 0; position: relative; }
  .volume-divider-inner { display: flex; align-items: center; justify-content: center; position: relative; }
  .volume-divider-inner::before { content: ''; position: absolute; left: 0; right: 0; top: 50%; height: 2px; background: linear-gradient(90deg, transparent, var(--accent), var(--accent), transparent); opacity: 0.25; }
  .volume-label { position: relative; z-index: 1; background: var(--card-bg); padding: 0.4rem 1.5rem; font-size: 1rem; font-weight: 700; color: var(--accent); border-radius: 20px; border: 1px solid var(--border-color); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
  @media (max-width: 768px) { .sidebar, .right-sidebar { width: 220px; } .toc-list a, .rs-list a { font-size: 0.78rem; } }
"""

    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>LaTeXSnipper 用户手册 v2.3.2</title>
{theme_script}
<link rel="stylesheet" href="styles/styles.css">
<style>
@media (max-width: 600px) {{  html {{ overflow-x: hidden; }}  body.manual {{ overflow-x: hidden; width: 100%; max-width: 100vw; }}  .code-block pre {{ word-break: break-word; white-space: pre-wrap; }}  pre code {{ word-break: break-word; }}  img {{ max-width: 100% !important; height: auto; }}  .code-block {{ max-width: 100%; }} }}
{sidebar_css}
</style>
</head>
<body class="manual">
<div class="top-nav-trigger" id="topNavTrigger"></div>
<nav class="top-nav"><div class="inner"><a href="index.html">主页</a><a href="https://github.com/SakuraMathcraft/LaTeXSnipper" target="_blank" rel="noopener">GitHub 仓库</a><a class="download-pdf-link" href="/dl/release/LaTeXSnipper_Manual.pdf" target="_blank" rel="noopener"><svg class="dl-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> 下载 PDF</a><button class="theme-toggle" id="themeToggle" title="切换日/夜模式"><svg class="theme-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg><span class="theme-label">黑夜</span></button></div></nav>
<div class="spacer-top"></div>

<!-- 浮动可拖动箭头按钮 -->
<div class="float-arrow side-left" id="floatArrow" title="拖动到左右两边 | 点击打开目录">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
</div>

<!-- 鼠标靠边悬停触发区域 -->
<div class="edge-hover-left" id="edgeHoverLeft"></div>
<div class="edge-hover-right" id="edgeHoverRight"></div>

<!-- 左侧导航栏（鼠标悬停打开） -->
{sidebar_html}

<!-- 右侧导航栏（鼠标悬停打开） -->
{right_sidebar_html}

{content}

<button class="back-to-top" id="backToTop" title="回到顶部" aria-label="回到顶部">
    <svg class="btt-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 19V5" />
      <path d="M5 12l7-7 7 7" />
    </svg>
  </button>
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
      toggle.innerHTML = isDark() ? '<svg class=\"theme-icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"5\"/><line x1=\"12\" y1=\"1\" x2=\"12\" y2=\"3\"/><line x1=\"12\" y1=\"21\" x2=\"12\" y2=\"23\"/><line x1=\"4.22\" y1=\"4.22\" x2=\"5.64\" y2=\"5.64\"/><line x1=\"18.36\" y1=\"18.36\" x2=\"19.78\" y2=\"19.78\"/><line x1=\"1\" y1=\"12\" x2=\"3\" y2=\"12\"/><line x1=\"21\" y1=\"12\" x2=\"23\" y2=\"12\"/><line x1=\"4.22\" y1=\"19.78\" x2=\"5.64\" y2=\"18.36\"/><line x1=\"18.36\" y1=\"5.64\" x2=\"19.78\" y2=\"4.22\"/></svg><span class=\"theme-label\">\u767d\u5929</span>' : '<svg class=\"theme-icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z\"/></svg><span class=\"theme-label\">\u9ed1\u591c</span>';
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

// 滚动到顶部时显示顶栏
(function() {{
  const root = document.documentElement;
  function updateAtTop() {{
    root.classList.toggle('at-top', window.scrollY < 10);
  }}
  updateAtTop();
  window.addEventListener('scroll', updateAtTop, {{ passive: true }});
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
{sidebar_script}
</body>
</html>
"""

    # Add assets/images/ prefix to all local image paths
    def fix_image_path(m):
        src = m.group(1)
        alt = m.group(2)
        rest = m.group(3) or ''
        # Don't rewrite external URLs
        if src.startswith('http://') or src.startswith('https://'):
            return m.group(0)
        # Don't double-prefix
        if src.startswith('assets/'):
            return m.group(0)
        return f'<img src="assets/images/{src}" alt="{alt}"{rest} loading="lazy" decoding="async">'
    html = re.sub(r'<img src="([^"]+)" alt="([^"]*)"(.*?)>', fix_image_path, html)

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
