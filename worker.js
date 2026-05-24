/**
 * LaTeXSnipper 用户手册 - Cloudflare Worker
 * 从 GitHub 仓库获取静态文件并智能缓存
 */

const GITHUB_OWNER = "strangelion";
const GITHUB_REPO = "LaTeXSnipper_user_manual";

// 允许的文件扩展名白名单（防止路径遍历和信息泄露）
const ALLOWED_EXTENSIONS = new Set([
  "html", "css", "js", "json", "png", "jpg", "jpeg", "gif", "svg",
  "ico", "wasm", "mp4", "webm", "otf", "ttf", "woff2", "typ", "pdf",
]);

// 禁止的路径模式
const BLOCKED_PATH_PATTERNS = [
  /\.\./,           // 路径遍历
  /~/,              // 用户目录
  /^\//,            // 已在前面处理
  /\.env/i,         // 环境文件
  /\.git/i,         // Git 文件
  /\/\./,           // 隐藏文件
  /node_modules/i,  // 依赖目录
];

function getBranch(env) {
  const branch = env.GITHUB_BRANCH || env.CF_PAGES_BRANCH || "master";
  // 分支名只允许字母、数字、横线、下划线、斜线、点
  return branch.replace(/[^a-zA-Z0-9\-_/.]/g, "").slice(0, 100);
}

function isPreview(env) {
  return env.DEPLOY_ENV === "preview" || getBranch(env) !== "master";
}

// HTML 转义，防止 XSS
function escapeHtml(str) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return str.replace(/[&<>"']/g, (c) => map[c]);
}

const MIME_TYPES = {
  html: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "application/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  wasm: "application/wasm",
  mp4: "video/mp4",
  webm: "video/webm",
  otf: "font/otf",
  ttf: "font/ttf",
  woff2: "font/woff2",
};

function getMimeType(p) {
  const ext = p.split(".").pop().toLowerCase();
  return MIME_TYPES[ext] || "text/plain; charset=utf-8";
}

function isHashedAsset(p) {
  return /\/assets\/[^/]+-[A-Za-z0-9_-]{8,}\.\w+$/.test(p);
}

function isStaticAsset(p) {
  return /\.(png|jpe?g|gif|svg|ico|otf|ttf|woff2|pdf|wasm)$/i.test(p);
}

function cacheControl(p) {
  if (isHashedAsset(p)) {
    return "public, max-age=31536000, immutable";
  }
  if (isStaticAsset(p)) {
    return "public, max-age=86400, s-maxage=604800";
  }
  if (p.endsWith(".html")) {
    return "public, max-age=0, s-maxage=600, must-revalidate";
  }
  return "public, max-age=0, s-maxage=3600, must-revalidate";
}

// 验证文件路径安全性
function isSafePath(p) {
  // 检查禁止模式
  for (const pattern of BLOCKED_PATH_PATTERNS) {
    if (pattern.test(p)) return false;
  }
  // 检查扩展名白名单
  const ext = p.split(".").pop().toLowerCase();
  if (ext && !ALLOWED_EXTENSIONS.has(ext)) return false;
  // 路径长度限制
  if (p.length > 256) return false;
  return true;
}

function securityHeaders(isHtml) {
  const headers = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-XSS-Protection": "0",  // 已废弃但保留以兼容旧浏览器
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  };
  if (isHtml) {
    // CSP：限制脚本和样式来源
    headers["Content-Security-Policy"] = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'none'",
    ].join("; ");
  }
  return headers;
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

// ── 反爬虫 / 恶意机器人检测 ──
const BAD_BOT_PATTERNS = [
  // 漏洞扫描器
  /nuclei/i, /nikto/i, /nessus/i, /burp/i, /sqlmap/i, /hydra/i,
  /metasploit/i, /masscan/i, /zgrab/i, /gobuster/i, /dirbuster/i,
  /wpscan/i, /joomla/i, /drupal/i, /wordpress/i,
  // AI 数据抓取（激进型）
  /Bytespider/i, /Bytedance/i, /PetalBot/i,
  /SemrushBot/i, /AhrefsBot/i, /DotBot/i,
  /MegaIndex/i, /SeznamBot/i, /YandexBot/i,
  /DataForSeoBot/i, /serpstatbot/i,
  // 垃圾流量
  /MJ12bot/i, /BrandVerity/i, /BLEXBot/i,
  /Gigabot/i, /ltx71/i, /Nimbostratus/i,
  /ZoominfoBot/i, /Webharvy/i, /TinEye-bot/i,
  /Scrapy/i, /python-requests/i, /python-urllib/i,
  /wget/i, /curl/i, /libwww/i, /Go-http-client/i,
];

function isBadBot(userAgent) {
  if (!userAgent) return true; // 空 UA 视为可疑
  if (userAgent.length < 30) return true; // 过短的 UA 可疑
  for (const pattern of BAD_BOT_PATTERNS) {
    if (pattern.test(userAgent)) return true;
  }
  return false;
}

// 简易频率限制（每个 IP 每秒最多 N 个请求）
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 5000;  // 5 秒窗口
const RATE_LIMIT_MAX = 120;       // 窗口内最多请求数

function isRateLimited(ip) {
  const now = Date.now();
  let entry = rateLimitMap.get(ip);
  if (!entry || now - entry.reset > RATE_LIMIT_WINDOW) {
    entry = { count: 1, reset: now };
    rateLimitMap.set(ip, entry);
    return false;
  }
  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) return true;
  return false;
}

// 定期清理频率限制表，防止内存泄漏
function cleanupRateLimit() {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now - entry.reset > RATE_LIMIT_WINDOW * 2) {
      rateLimitMap.delete(ip);
    }
  }
}

// ── 压缩支持 ──
// 对文本类响应启用 gzip/brotli 压缩，大幅减小传输体积
const COMPRESSIBLE_TYPES = new Set([
  "text/html", "text/css", "application/javascript", "application/json",
  "image/svg+xml", "text/plain", "text/xml",
]);

function isCompressible(contentType) {
  for (const t of COMPRESSIBLE_TYPES) {
    if (contentType.startsWith(t)) return true;
  }
  return false;
}

async function compressResponse(response, request) {
  if (response.status === 304 || response.status === 204) return response;
  const contentType = response.headers.get("Content-Type") || "";
  if (!isCompressible(contentType)) return response;
  // 响应体太小不值得压缩
  const body = await response.clone().arrayBuffer();
  if (body.byteLength < 1024) return response;

  const acceptEncoding = request.headers.get("Accept-Encoding") || "";
  let encoding = null;
  if (acceptEncoding.includes("br")) {
    encoding = "br";
  } else if (acceptEncoding.includes("gzip")) {
    encoding = "gzip";
  }
  if (!encoding) return response;

  const compressed = new Uint8Array(body).stream().pipeThrough(
    encoding === "br"
      ? new CompressionStream("br")
      : new CompressionStream("gzip")
  );

  const reader = compressed.getReader();
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const totalLen = chunks.reduce((s, c) => s + c.length, 0);
  const compressedBody = new Uint8Array(totalLen);
  let off = 0;
  for (const c of chunks) { compressedBody.set(c, off); off += c.length; }

  const headers = new Headers(response.headers);
  headers.set("Content-Encoding", encoding);
  headers.set("Vary", "Accept-Encoding");
  // 压缩后的响应不应有 Content-Length（因为解压后长度不同）
  headers.delete("Content-Length");

  return new Response(compressedBody, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// 带重试的 fetch，处理 GitHub 偶发网络错误
async function fetchWithRetry(url, maxRetries = 2) {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetch(url);
    } catch (err) {
      lastError = err;
      if (i < maxRetries - 1) {
        // 短暂等待后重试（指数退避）
        await new Promise((r) => setTimeout(r, 200 * Math.pow(2, i)));
      }
    }
  }
  throw lastError;
}

function jsonResponse(data) {
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(),
      ...securityHeaders(false),
    },
  });
}

// ── 错误页面渲染 ──
// 生成美观的错误页面，替代纯文本响应
async function renderErrorPage(statusCode, title, message, requestPath, request) {
  const safeCode = escapeHtml(String(statusCode));
  const safeTitle = escapeHtml(title);
  const safeMsg = escapeHtml(message);
  const safePath = escapeHtml(requestPath || "/");
  const now = escapeHtml(new Date().toISOString());

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5">
<title>${safeCode} ${safeTitle} — LaTeXSnipper</title>
<style>
  :root {
    --bg: #f8fafc; --fg: #0f172a; --accent: #2563eb; --accent-hover: #1d4ed8;
    --muted: #64748b; --border-color: #e2e8f0;
    --card-bg: rgba(255,255,255,0.78); --card-shadow: 0 8px 32px rgba(2,6,23,0.08);
    --hdr-bg: rgba(255,255,255,0.6);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0f111a; --fg: #e2e8f0; --muted: #94a3b8; --accent: #60a5fa; --accent-hover: #3b82f6;
      --border-color: #1e293b; --card-bg: rgba(30,34,48,0.82); --card-shadow: 0 8px 32px rgba(0,0,0,0.35);
      --hdr-bg: rgba(15,17,26,0.82);
    }
  }
  *{box-sizing:border-box;margin:0;padding:0}
  html{background:var(--bg)}
  body{font-family:"Segoe UI","Noto Sans CJK SC","Microsoft YaHei",sans-serif;color:var(--fg);line-height:1.6;background:transparent;min-height:100vh;display:flex;flex-direction:column}
  .top-nav{background:var(--hdr-bg);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-bottom:1px solid var(--border-color);padding:0 1.25rem;height:48px;display:flex;align-items:center;gap:1rem}
  .top-nav a{color:var(--fg);text-decoration:none;font-size:.9rem}
  .top-nav a:hover{color:var(--accent)}
  .top-nav .brand{font-weight:700;font-size:1rem}
  .error-wrap{flex:1;display:flex;align-items:center;justify-content:center;padding:2rem 1.25rem}
  .error-card{text-align:center;max-width:560px;width:100%}
  .error-code{font-size:7rem;font-weight:900;line-height:1;background:linear-gradient(135deg,var(--accent),#a855f7,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:-.03em;margin-bottom:.5rem}
  .error-title{font-size:1.4rem;font-weight:700;margin-bottom:.75rem}
  .error-desc{font-size:1.05rem;color:var(--muted);margin-bottom:2rem;line-height:1.7}
  .error-actions{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;margin-bottom:2rem}
  .btn{display:inline-flex;align-items:center;gap:.5rem;padding:.75rem 1.5rem;border-radius:12px;font-weight:600;font-size:.95rem;text-decoration:none;transition:background .2s,transform .2s}
  .btn:active{transform:scale(.97)}
  .btn-primary{background:var(--accent);color:#fff}
  .btn-primary:hover{background:var(--accent-hover)}
  .btn-outline{color:var(--fg);border:1px solid var(--border-color);backdrop-filter:blur(4px)}
  .btn-outline:hover{background:rgba(128,128,128,.08);border-color:var(--accent)}
  .debug-box{margin-top:2rem;padding:1rem 1.25rem;border-radius:12px;background:var(--card-bg);border:1px solid var(--border-color);font-size:.82rem;color:var(--muted);text-align:left}
  .debug-box summary{cursor:pointer;font-weight:600;color:var(--fg);margin-bottom:.5rem;user-select:none}
  .debug-box code{font-family:"SF Mono","Cascadia Code","Consolas",monospace;font-size:.78rem;word-break:break-all}
  .footer{text-align:center;padding:1rem;color:var(--muted);font-size:.82rem;border-top:1px solid var(--border-color)}
  @media (max-width:640px){.error-code{font-size:5rem}.error-title{font-size:1.15rem}.error-desc{font-size:.9rem}.error-actions{flex-direction:column;align-items:center}.btn{width:100%;max-width:260px;justify-content:center}}
</style>
</head>
<body>
<nav class="top-nav">
  <a href="/" class="brand">LaTeXSnipper</a>
  <a href="/user_manual.html">用户手册</a>
  <a href="/download.html">下载</a>
  <a href="https://github.com/SakuraMathcraft/LaTeXSnipper" target="_blank" rel="noopener">GitHub</a>
</nav>
<div class="error-wrap">
  <div class="error-card">
    <div class="error-code">${safeCode}</div>
    <h1 class="error-title">${safeTitle}</h1>
    <p class="error-desc">${safeMsg}</p>
    <div class="error-actions">
      <a href="/" class="btn btn-primary">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        返回首页
      </a>
      <a href="/user_manual.html" class="btn btn-outline">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        查看用户手册
      </a>
      <a href="/download.html" class="btn btn-outline">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12l4 4 4-4"/><line x1="12" y1="8" x2="12" y2="16"/></svg>
        下载软件
      </a>
    </div>
    <details class="debug-box">
      <summary>技术信息（调试用）</summary>
      <p>请求路径：<code>${safePath}</code></p>
      <p>时间戳：<code>${now}</code></p>
      <p>HTTP 状态码：<code>${safeCode}</code></p>
      <p>服务：LaTeXSnipper User Manual Worker v2.3.6</p>
    </details>
  </div>
</div>
<footer class="footer">&copy; 2026 LaTeXSnipper — 开源项目</footer>
</body>
</html>`;

  const response = new Response(html, {
    status: statusCode,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...corsHeaders(),
      ...securityHeaders(true),
    },
  });
  return request ? compressResponse(response, request).catch(() => response) : response;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // ── 反爬虫检测 ──
    const userAgent = request.headers.get("User-Agent") || "";
    const clientIP = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "unknown";

    // 恶意机器人直接拦截
    if (isBadBot(userAgent)) {
      return new Response("Forbidden", {
        status: 403,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          ...corsHeaders(),
          ...securityHeaders(false),
        },
      });
    }

    // 频率限制
    if (isRateLimited(clientIP)) {
      return new Response("Too Many Requests", {
        status: 429,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Retry-After": "30",
          ...corsHeaders(),
          ...securityHeaders(false),
        },
      });
    }

    // 定期清理频率表（每 500 次请求执行一次）
    if (Math.random() < 0.002) cleanupRateLimit();

    // 只允许 GET 和 OPTIONS
    if (request.method !== "GET" && request.method !== "OPTIONS" && request.method !== "HEAD") {
      return renderErrorPage(405, "方法不允许",
        "服务器不支持此 HTTP 请求方法。请使用 GET 或 HEAD 方式访问。",
        path, request);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // HEAD 请求复用 GET 逻辑但只返回头
    const isHead = request.method === "HEAD";

    if (path === "/ping") {
      return jsonResponse({
        status: "ok",
        service: "LaTeXSnipper User Manual",
        version: "2.3.6",
        timestamp: new Date().toISOString(),
      });
    }

    try {
      // ── 模型文件代理（R2）──
      // 通过 Worker 代理模型文件，避免暴露 R2 直链
      // 仅允许从本站页面访问，防止恶意下载
      if (path.startsWith("/models/")) {
        const referer = request.headers.get("Referer") || "";
        const origin = url.origin;
        // 仅允许本站页面或无 Referer（浏览器直接访问）
        if (referer && !referer.startsWith(origin)) {
          return renderErrorPage(403, "禁止访问",
            "模型文件仅允许从本站页面加载。请访问 ocr_demo.html 使用在线识别功能。",
            path, request);
        }

        // 频率限制：模型文件较大，单独限制
        if (isRateLimited("model:" + clientIP)) {
          return new Response("Too Many Requests — 模型下载频率过高，请稍后再试", {
            status: 429,
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Retry-After": "120",
              ...corsHeaders(),
              ...securityHeaders(false),
            },
          });
        }

        // R2 模型存储 URL（从环境变量或使用默认值）
        const R2_MODEL_BASE = env.R2_MODEL_BASE || "https://release.interknot.dpdns.org";
        const modelUrl = R2_MODEL_BASE + path;
        const modelResp = await fetch(modelUrl);

        if (!modelResp.ok) {
          return renderErrorPage(404, "模型文件未找到",
            "模型文件尚未部署到 R2。请联系管理员。",
            path, request);
        }

        const modelContent = await modelResp.arrayBuffer();
        return new Response(modelContent, {
          headers: {
            "Content-Type": "application/octet-stream",
            "Cache-Control": "public, max-age=86400, s-maxage=604800",
            ...corsHeaders(),
            ...securityHeaders(false),
          },
        });
      }

      // 路径解析
      let filePath;
      if (path === "/") {
        filePath = "dist/index.html";
      } else {
        const ext = path.split(".").pop() || "";
        const hasExt = /^[a-zA-Z0-9]+$/.test(ext) && ext.length <= 10;
        const rawPath = hasExt ? path.slice(1) : path.slice(1) + ".html";
        filePath = "dist/" + rawPath;
      }

      // 安全检查
      if (!isSafePath(filePath)) {
        return renderErrorPage(400, "请求无效",
          "请求路径包含不安全的字符或模式，服务器拒绝处理。请检查 URL 是否正确，或返回首页浏览其他内容。",
          path, request);
      }

      const branch = getBranch(env);
      const githubUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${branch}/${filePath}`;
      const resp = await fetchWithRetry(githubUrl);

      if (!resp.ok) {
        // favicon 回退到 icon.png
        if (path.endsWith(".ico")) {
          const pngUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${branch}/public/icon.png`;
          const pngResp = await fetchWithRetry(pngUrl);
          if (pngResp.ok) {
          return new Response(isHead ? null : await pngResp.arrayBuffer(), {
            headers: {
              "Content-Type": "image/png",
              "Cache-Control": "public, max-age=86400",
              ...corsHeaders(),
              ...securityHeaders(false),
            },
          });
        }
        return new Response(null, { status: 204, headers: corsHeaders() });
      }
      return renderErrorPage(404, "页面未找到",
        "你访问的页面可能已被移动、删除，或者地址输入有误。请检查 URL 是否正确，或使用下方链接浏览其他内容。",
        path, request);
    }

    const mimeType = getMimeType(filePath);
    const isHtml = filePath.endsWith(".html");
    const isBinary = /\.(png|jpe?g|gif|svg|ico|otf|ttf|woff2|wasm|pdf)$/i.test(filePath);
    const content = isBinary ? await resp.arrayBuffer() : await resp.text();

    const headers = {
      "Content-Type": mimeType,
      "Cache-Control": cacheControl(filePath),
      ...corsHeaders(),
      ...securityHeaders(isHtml),
    };

    // 预览分支 HTML 注入横幅（分支名已在上层转义）
    if (isPreview(env) && isHtml && typeof content === "string") {
      headers["X-Deploy-Env"] = "preview";
      headers["X-Branch"] = branch;
      const safeBranch = escapeHtml(branch);
      const previewBanner = `
<div style="
  position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
  background: linear-gradient(135deg, #f97316, #dc2626);
  color: #fff; text-align: center; padding: 6px 12px;
  font-family: system-ui, -apple-system, sans-serif; font-size: 13px;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
">
  <span style="font-weight: 700;">预览分支</span>
  <code style="background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 4px;">${safeBranch}</code>
  <span style="opacity: 0.8;">仅用于测试</span>
  <a href="/" style="color: #fff; text-decoration: underline; opacity: 0.8;">切换到正式版</a>
</div>`;
      const modified = content.replace("<body>", `<body>${previewBanner}`);
      const previewResp = new Response(isHead ? null : modified, { headers });
      try {
        return await compressResponse(previewResp, request);
      } catch {
        return previewResp;
      }
    }

    const finalResp = new Response(isHead ? null : content, { headers });
    try {
      return await compressResponse(finalResp, request);
    } catch {
      return finalResp;
    }
    } catch (err) {
      console.error(`Worker error for path "${path}":`, err);
      return renderErrorPage(500, "服务器内部错误",
        "服务器暂时无法处理你的请求，请稍后重试。如果问题持续存在，请联系我们。",
        path, request);
    }
  },
};
