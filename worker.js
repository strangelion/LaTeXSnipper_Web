/**
 * LaTeXSnipper 用户手册 - Cloudflare Worker
 * 根据域名区分站点：从 GitHub 仓库获取静态文件，视频走 R2
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
  mp4: "video/mp4",
  webm: "video/webm",
};

const BINARY_TYPES = ["png", "jpg", "jpeg", "gif", "svg", "ico"];

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
  async fetch(request) {
    const url = new URL(request.url);
    const host = url.hostname;
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

    let site = "home";
    if (host === "help.interknot.dpdns.org") {
      site = "help";
    }

    let filePath;
    if (path === "/") {
      filePath = site === "help" ? "user_manual.html" : "index.html";
    } else {
      const ext = path.split(".").pop() || "";
      const hasExt = /^[a-zA-Z0-9]+$/.test(ext) && ext.length <= 10;
      filePath = hasExt ? path.slice(1) : path.slice(1) + ".html";
    }

    // 视频走 R2，直接 302 重定向
    if (filePath.endsWith(".mp4") || filePath.endsWith(".webm")) {
      const r2Url = `https://video.interknot.dpdns.org/${filePath}`;
      return new Response(null, {
        status: 302,
        headers: {
          "Location": r2Url,
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // favicon 返回 icon.png
    if (filePath.endsWith(".ico")) {
      const pngUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/icon.png`;
      const icoResp = await fetch(pngUrl);
      if (!icoResp.ok) {
        return new Response(null, { status: 204, headers: corsHeaders() });
      }
      const icoContent = await icoResp.arrayBuffer();
      return new Response(icoContent, {
        headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400", ...corsHeaders() },
      });
    }

    // 其他文件从 GitHub 获取
    const githubUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${filePath}`;
    const response = await fetch(githubUrl);

    if (!response.ok) {
      return errorResponse(`404 Not Found: ${path}`, 404);
    }

    const ext = filePath.split(".").pop().toLowerCase();
    const isBinary = BINARY_TYPES.includes(ext);
    const mimeType = getMimeType(filePath);
    const headers = {
      "Content-Type": mimeType,
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      ...corsHeaders(),
      "X-Content-Type-Options": "nosniff",
    };

    const content = isBinary ? await response.arrayBuffer() : await response.text();
    return new Response(content, { headers });
  },
};

const BINARY_TYPES = ["png", "jpg", "jpeg", "gif", "svg", "ico", "mp4", "webm"];

const VIDEO_CACHE_TTL = 60 * 60 * 24 * 7; // 7 days in seconds

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

async function fetchWithCache(url, options, isVideo) {
  const cache = await caches.open("latex-snipper-v1");
  const cacheKey = url;

  // 对于视频，优先从缓存读取
  if (isVideo) {
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      return { response: cachedResponse, fromCache: true };
    }
  }

  // 从 GitHub 获取
  const response = await fetch(url, options);

  // 视频存入缓存（可缓存的响应）
  if (isVideo && response.ok) {
    const responseToCache = response.clone();
    const headers = {};
    responseToCache.headers.forEach((v, k) => headers[k] = v);
    const body = await responseToCache.arrayBuffer();
    
    const cachedResponse = new Response(body, {
      status: responseToCache.status,
      statusText: responseToCache.statusText,
      headers: {
        ...headers,
        "Cache-Control": `public, max-age=${VIDEO_CACHE_TTL}`,
      },
    });
    
    try {
      await cache.put(cacheKey, cachedResponse);
    } catch (e) {
      // 缓存写入失败（如存储配额），继续使用
    }
    
    return { response, fromCache: false };
  }

  return { response, fromCache: false };
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const host = url.hostname;
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (path === "/ping") {
      return jsonResponse({
        status: "ok",
        service: "LaTeXSnipper User Manual",
        version: "2.3.4",
        timestamp: new Date().toISOString(),
      });
    }

    let site = "home";
    if (host === "help.interknot.dpdns.org") {
      site = "help";
    }

    let filePath;
    if (path === "/") {
      filePath = site === "help" ? "user_manual.html" : "index.html";
    } else {
      const ext = path.split(".").pop() || "";
      const hasExt = /^[a-zA-Z0-9]+$/.test(ext) && ext.length <= 10;
      filePath = hasExt ? path.slice(1) : path.slice(1) + ".html";
    }

    try {
      const isVideo = filePath.endsWith(".mp4") || filePath.endsWith(".webm");
      const isIco = filePath.endsWith(".ico");
      const githubUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${filePath}`;

      if (isIco) {
        const pngUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/icon.png`;
        const icoResp = await fetch(pngUrl);
        if (!icoResp.ok) {
          return new Response(null, { status: 204, headers: corsHeaders() });
        }
        const icoContent = await icoResp.arrayBuffer();
        return new Response(icoContent, {
          headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400", ...corsHeaders() },
        });
      }

// 视频走 R2 自定义域名，直接返回 302 重定向
      if (isVideo) {
        const r2Url = `https://video.interknot.dpdns.org/${filePath}`;
        return new Response(null, {
          status: 302,
          headers: {
            "Location": r2Url,
            "Cache-Control": "public, max-age=3600",
            ...corsHeaders(),
          },
        });
      }
    } catch (err) {
      console.error("Error fetching from GitHub:", err);
      return errorResponse(`Error: ${err.message}`, 500);
    }
  },
};