/**
 * LaTeXSnipper 用户手册 - Cloudflare Worker
 * 从 GitHub 仓库获取静态文件
 */

const GITHUB_OWNER = "strangelion";
const GITHUB_REPO = "LaTeXSnipper_user_manual";
const GITHUB_BRANCH = "master";

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
};

const BINARY_TYPES = ["png", "jpg", "jpeg", "gif", "svg", "ico", "wasm"];

function getMimeType(path) {
  const ext = path.split(".").pop().toLowerCase();
  return MIME_TYPES[ext] || "text/plain; charset=utf-8";
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(data) {
  return new Response(JSON.stringify(data, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders() },
  });
}

function errorResponse(message, status = 500) {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", ...corsHeaders() },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (path === "/ping") {
      return jsonResponse({
        status: "ok",
        service: "LaTeXSnipper User Manual",
        version: "2.3.5",
        timestamp: new Date().toISOString(),
      });
    }

    let filePath;
    if (path === "/") {
      filePath = "dist/index.html";
    } else {
      const ext = path.split(".").pop() || "";
      const hasExt = /^[a-zA-Z0-9]+$/.test(ext) && ext.length <= 10;
      const rawPath = hasExt ? path.slice(1) : path.slice(1) + ".html";
      // Vite 构建产物（index.html 和 assets/*）在 dist/ 目录下
      if (rawPath.startsWith("assets/") || rawPath === "index.html") {
        filePath = "dist/" + rawPath;
      } else {
        filePath = rawPath;
      }
    }

    // WASM + 字体走 R2（release 桶，同域避免跨域问题）
    if (filePath.endsWith(".wasm") || filePath.endsWith(".otf") || filePath.endsWith(".ttf")) {
      const r2Url = `https://release.interknot.dpdns.org/${filePath}`;
      const r2Resp = await fetch(r2Url);
      if (!r2Resp.ok) {
        // R2 没有，回退到 GitHub
        console.log(`[worker] R2 miss, fallback to GitHub: ${filePath}`);
      } else {
        const mimeType = getMimeType(filePath);
        const headers = {
          "Content-Type": mimeType,
          "Cache-Control": "public, max-age=604800, immutable",
          ...corsHeaders(),
        };
        // 写入 Cloudflare 边缘缓存
        const cached = new Response(r2Resp.body, { headers });
        ctx.waitUntil(caches.default.put(new Request(url.toString(), { method: "GET" }), cached.clone()));
        return cached;
      }
    }

    // favicon 返回 icon.png（从 public/ 目录获取）
    if (filePath.endsWith(".ico")) {
      const pngUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/public/icon.png`;
      const icoResp = await fetch(pngUrl);
      if (!icoResp.ok) {
        return new Response(null, { status: 204, headers: corsHeaders() });
      }
      const icoContent = await icoResp.arrayBuffer();
      return new Response(icoContent, {
        headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400", ...corsHeaders() },
      });
    }

    // 其他文件从 GitHub 获取（使用 Cloudflare Cache API 加速）
    const cache = caches.default;
    const cacheKey = new Request(url.toString(), { method: "GET" });
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }

    const githubUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${filePath}`;
    const response = await fetch(githubUrl);

    if (!response.ok) {
      return errorResponse(`404 Not Found: ${path}`, 404);
    }

    const ext = filePath.split(".").pop().toLowerCase();
    const isBinary = BINARY_TYPES.includes(ext);
    const mimeType = getMimeType(filePath);
    
    // 大文件（WASM、字体、图片）缓存更长时间
    const isLargeAsset = filePath.endsWith(".wasm") || filePath.endsWith(".otf") || filePath.endsWith(".ttf") || filePath.endsWith(".png") || filePath.endsWith(".jpg") || filePath.endsWith(".jpeg");
    let cacheControl;
    if (filePath.endsWith(".html") || filePath.endsWith(".css") || filePath.endsWith(".js")) {
      cacheControl = "public, max-age=0, s-maxage=3600, must-revalidate";
    } else if (isLargeAsset) {
      cacheControl = "public, max-age=86400, s-maxage=604800, immutable";
    } else {
      cacheControl = "public, max-age=3600, s-maxage=86400";
    }
    
    const headers = {
      "Content-Type": mimeType,
      "Cache-Control": cacheControl,
      ...corsHeaders(),
      "X-Content-Type-Options": "nosniff",
    };

    const content = isBinary ? await response.arrayBuffer() : await response.text();
    const newResponse = new Response(content, { headers });
    
    // 只有成功的响应才缓存到 Cloudflare 边缘
    if (response.ok) {
      const ttl = isLargeAsset ? 604800 : 86400; // 大文件7天，其他1天
      ctx.waitUntil(cache.put(cacheKey, newResponse.clone()));
    }
    
    return newResponse;
  },
};

