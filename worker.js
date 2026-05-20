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

    // 视频走 R2，直接代理（同域避免 autoplay 问题）
    if (filePath.endsWith(".mp4") || filePath.endsWith(".webm")) {
      const r2Url = `https://video.interknot.dpdns.org/${filePath}`;
      const fetchOpts = {};
      const range = request.headers.get("Range");
      if (range) fetchOpts.headers = { Range: range };
      const videoResp = await fetch(r2Url, fetchOpts);
      if (!videoResp.ok && videoResp.status !== 206) {
        return errorResponse(`Video not found: ${path}`, 404);
      }
      const mimeType = getMimeType(filePath);
      const headers = {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=86400",
        "Accept-Ranges": "bytes",
        ...corsHeaders(),
      };
      if (videoResp.status === 206) {
        headers["Content-Range"] = videoResp.headers.get("Content-Range") || "";
        return new Response(videoResp.body, { status: 206, headers });
      }
      headers["Content-Length"] = videoResp.headers.get("Content-Length") || "";
      return new Response(videoResp.body, { headers });
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

