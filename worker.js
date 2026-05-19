/**
 * LaTeXSnipper 用户手册 - Cloudflare Worker
 *
 * 部署方式：
 *  1. 将 HTML/CSS/JS 文件推送到 GitHub 仓库的根目录
 *  2. 登录 Cloudflare Dashboard → Workers & Pages → Create Worker
 *  3. 将本文件内容粘贴到代码编辑器
 *  4. 部署 Worker
 *
 * 文件结构（GitHub 仓库根目录）：
 *  index.html        → 主页
 *  user_manual.html  → 用户手册
 *  styles.css        → 样式
 *  script.js         → 脚本
 *
 * Routes:
 *  /                         → index.html
 *  /user_manual              → user_manual.html
 *  /ping                     → 健康检查
 */

// ── KV binding ──────────────────────────────────────────────────
// 在 Cloudflare Dashboard 中创建 KV Namespace 后绑定到此变量
// 或使用 wrangler.toml 配置

// ── 配置 ────────────────────────────────────────────────────────
const CONFIG = {
  CACHE_MAX_AGE: 3600, // 浏览器缓存时间（秒）
  CDN_CACHE_MAX_AGE: 86400, // Cloudflare CDN 缓存时间（秒）
  // GitHub 仓库配置（用于存储静态网页文件）
  GITHUB_OWNER: "strangelion",      // GitHub 用户名
  GITHUB_REPO: "LaTeXSnipper_user_manual", // 仓库名
  GITHUB_BRANCH: "main",             // 分支名
};

// 可按路径映射的页面（可扩展）
const PAGE_ROUTE_MAP = {
  '/': 'index.html',
  '/home': 'index.html',
  '/help': 'user_manual.html',
  '/user_manual': 'user_manual.html',
  '/manual': 'user_manual.html',
};

// ── MIME types ───────────────────────────────────────────────────
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
  pdf: "application/pdf",
  txt: "text/plain; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  typ: "text/plain; charset=utf-8",
};

function getMimeType(path) {
  const ext = (path.split(".").pop() || "").toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

// ── 响应构造工具 ────────────────────────────────────────────────
function createResponse(body, status, contentType, extraHeaders = {}) {
  const headers = {
    "Content-Type": contentType || "text/plain; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "X-Content-Type-Options": "nosniff",
    ...extraHeaders,
  };
  return new Response(body, { status, headers });
}

function jsonResponse(data, status = 200) {
  return createResponse(JSON.stringify(data, null, 2), status, MIME_TYPES.json);
}

function htmlResponse(html, status = 200, cacheAge = CONFIG.CDN_CACHE_MAX_AGE) {
  return createResponse(html, status, MIME_TYPES.html, {
    "Cache-Control": `public, max-age=${CONFIG.CACHE_MAX_AGE}, s-maxage=${cacheAge}`,
  });
}

// ── 路由处理 ────────────────────────────────────────────────────

/**
 * GET / → 返回用户手册首页
 * 从 KV 中读取 user_manual.html
 */
async function handleIndex(request, env) {
  // 兼容旧接口，转发到通用页面处理器
  return handlePage(request, env);
}

/**
 * 通用页面处理：根据请求路径从 KV 返回对应页面
 * 支持将路径映射到不同的 KV key（例如 `/help` -> `pages/help.html`）
 */
async function handlePage(request, env) {
  const url = new URL(request.url);
  const rawPath = url.pathname || '/';
  const host = url.hostname;
  // 规范化：去掉尾部斜杠（除根路径）
  const pathname = rawPath === '/' ? '/' : rawPath.replace(/\/+$|^\/+|\s+/g, '') && ('/' + rawPath.replace(/^\/+|\s+|\/+$/g, ''));

  // 先查映射表
  let mappedKey = PAGE_ROUTE_MAP[pathname] || null;
  // help 子域名根路径直接返回用户手册页面
  if (pathname === '/' && host === 'help.interknot.dpdns.org') {
    mappedKey = CONFIG.PAGE_KEY;
  }
  // 带已知扩展名的文件不追加 .html（因为已有扩展名）
  const STATIC_EXTS = ['css', 'js', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'pdf', 'txt', 'md', 'typ', 'html'];
  const ext = (pathname.split('.').pop() || '').toLowerCase();

// 静态文件直接用原路径，HTML 页面补 .html 后缀
let inferredKey;
if (mappedKey) {
  inferredKey = mappedKey;
} else if (pathname === '/') {
  inferredKey = 'index.html';
} else if (STATIC_EXTS.includes(ext)) {
  inferredKey = pathname.substring(1); // 去掉前导 /
} else {
  inferredKey = pathname.substring(1) + '.html';
}

  try {
    let html = null;

    // 从 GitHub 仓库获取文件
    const githubUrl = `https://raw.githubusercontent.com/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}/${CONFIG.GITHUB_BRANCH}/${inferredKey}`;
    const response = await fetch(githubUrl);
    if (response.ok) {
      html = await response.text();
    }

    if (!html) {
      // 根路径下优先回退到内置 HTML，否则返回 404
      if (pathname === '/' || pathname === '/home') {
        return htmlResponse(FALLBACK_HTML, 200, 0);
      }
      return handleNotFound(request);
    }

    if (url.searchParams.has('raw')) {
      return createResponse(html, 200, MIME_TYPES.txt);
    }

    // 根据文件类型返回正确的 MIME 类型
    // HTML 使用带缓存的 htmlResponse，静态资源（如 CSS）使用正确 MIME
    if (STATIC_EXTS.includes(ext)) {
      return createResponse(html, 200, getMimeType(inferredKey));
    }
    return htmlResponse(html);
  } catch (err) {
    console.error('Failed to load page from KV:', err);
    if (pathname === '/' || pathname === '/home') {
      return htmlResponse(FALLBACK_HTML, 200, 0);
    }
    return handleNotFound(request);
  }
}

/**
 * GET /ping → 健康检查
 */
function handlePing() {
  return jsonResponse({
    status: "ok",
    service: "LaTeXSnipper User Manual",
    version: "2.3.2",
    timestamp: new Date().toISOString(),
  });
}

/**
 * OPTIONS → CORS 预检
 */
function handleCors(request) {
  const headers = new Headers();
  const origin = request.headers.get("Origin") || "*";

  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  headers.set("Access-Control-Max-Age", "86400");

  return new Response(null, { status: 204, headers });
}

/**
 * 404 处理
 */
function handleNotFound(request) {
  const url = new URL(request.url);
  return createResponse(
    `404 Not Found: ${url.pathname}`,
    404,
    MIME_TYPES.txt
  );
}

// ── 路由表 ──────────────────────────────────────────────────────
const ROUTES = [
  { method: "GET", pattern: /^\/$/ },
  { method: "GET", pattern: /^\/ping\/?$/ },
];

// ── 主入口 ──────────────────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    const { method } = request;
    const url = new URL(request.url);
    const pathname = url.pathname;

    // OPTIONS 预检
    if (method === "OPTIONS") {
      return handleCors(request);
    }

    // GET /
    // GET /ping
    if (method === "GET" && pathname === "/ping") {
      return handlePing();
    }

    // 所有其他 GET 请求尝试作为页面处理（可根据路径从 KV 返回不同页面）
    if (method === "GET") {
      return handlePage(request, env);
    }

    // 404
    return handleNotFound(request);
  },
};

// ── 回退 HTML（当 KV 中没有数据时显示） ──────────────────────────
const FALLBACK_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>LaTeXSnipper 用户手册</title>
<style>
  :root {
    --bg: #ffffff; --fg: #1a1a1a; --fg-muted: #555;
    --accent: #1565C0; --border: #e0e0e0; --code-bg: #f5f5f5;
    --red: #C62828; --orange: #E65100; --green: #2E7D32; --blue: #1565C0;
    --red-bg: #ffebee; --orange-bg: #fff3e0; --green-bg: #e8f5e9; --blue-bg: #e3f2fd;
    --radius: 4px;
    --mono: "Cascadia Code","Fira Code","Consolas","Courier New",monospace;
    --sans: "Segoe UI","Noto Sans CJK SC","Microsoft YaHei","PingFang SC",sans-serif;
    --max-w: 820px;
  }
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body {
    font-family: var(--sans); font-size: 15px; line-height: 1.75;
    color: var(--fg); background: var(--bg);
    max-width: var(--max-w); margin: 0 auto; padding: 2rem 1.5rem 4rem;
    text-align: center;
  }
  .card {
    background: var(--blue-bg); border: 1px solid var(--blue);
    border-radius: 8px; padding: 2rem; margin: 2rem 0;
  }
  h1 { font-size: 1.6rem; color: var(--accent); margin-bottom: 1rem; }
  p { margin: 0.5rem 0; color: var(--fg-muted); }
  code {
    font-family: var(--mono); font-size: 0.85rem;
    background: var(--code-bg); padding: 0.15em 0.4em;
    border-radius: 3px; border: 1px solid #ddd;
  }
  .steps {
    text-align: left; max-width: 600px; margin: 1.5rem auto;
    background: #fafafa; border-radius: 8px; padding: 1.5rem;
  }
  .steps ol { padding-left: 1.5rem; }
  .steps li { margin: 0.5rem 0; }
</style>
</head>
<body>
  <h1> LaTeXSnipper 用户手册</h1>
  <p style="font-size:1.1rem;color:var(--accent)">v2.3.2</p>

  <div class="card">
    <h2 style="font-size:1.2rem;color:var(--orange)"> 部署说明</h2>
    <p>手册内容尚未上传到 KV 存储。</p>
    <p>请按以下步骤完成部署：</p>
  </div>

  <div class="steps">
    <h3>快速部署步骤</h3>
    <ol>
      <li>创建 KV Namespace 并绑定到此 Worker（变量名 <code>LATEXSNIPPER_KV</code>）</li>
      <li>将 <code>user_manual.html</code> 上传到 KV：
        <br><code>npx wrangler kv:key put --binding=LATEXSNIPPER_KV "pages/user_manual.html" --path=./user_manual.html</code>
      </li>
      <li>等待几秒后刷新此页面</li>
    </ol>
  </div>

  <p style="margin-top:2rem;font-size:0.85rem;color:#999">
    Worker 运行正常 · Cloudflare Workers
  </p>
</body>
</html>`;
