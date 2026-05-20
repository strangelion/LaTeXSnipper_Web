/**
 * LaTeXSnipper 用户手册 - Cloudflare Worker
 * 根据域名区分站点：从 GitHub 仓库获取静态文件
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
        version: "2.3.3",
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
      const githubUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${filePath}`;
      const response = await fetch(githubUrl);

      if (!response.ok) {
        return errorResponse(`404 Not Found: ${path}`, 404);
      }

      const ext = filePath.split(".").pop().toLowerCase();
      const isBinary = BINARY_TYPES.includes(ext);
      const content = isBinary ? await response.arrayBuffer() : await response.text();
      const mimeType = getMimeType(filePath);

      return new Response(content, {
        headers: {
          "Content-Type": mimeType,
          "Cache-Control": "public, max-age=3600, s-maxage=86400",
          ...corsHeaders(),
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch (err) {
      console.error("Error fetching from GitHub:", err);
      return errorResponse(`Error: ${err.message}`, 500);
    }
  },
};