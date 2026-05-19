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
  ico: "image/x-icon",
};

const PAGE_MAP = {
  "/": "index.html",
  "/home": "index.html",
  "/user_manual": "user_manual.html",
  "/help": "user_manual.html",
  "/manual": "user_manual.html",
  "/ping": null,
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    if (path === "/ping") {
      return new Response(
        JSON.stringify({
          status: "ok",
          service: "LaTeXSnipper User Manual",
          version: "2.3.2",
          timestamp: new Date().toISOString(),
        }),
        {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    let filePath = PAGE_MAP[path];

    if (!filePath) {
      const ext = path.split(".").pop() || "";
      const hasExt = /^[a-zA-Z0-9]+$/.test(ext) && ext.length <= 10;
      filePath = hasExt ? path.slice(1) : path.slice(1) + ".html";
    }

    if (url.searchParams.has("raw")) {
      filePath = "index.html";
    }

    try {
      const githubUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${filePath}`;
      const response = await fetch(githubUrl);

      if (!response.ok) {
        return new Response(
          `404 Not Found: ${path}`,
          {
            status: 404,
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      const content = await response.text();
      const ext = filePath.split(".").pop().toLowerCase();
      const mimeType = MIME_TYPES[ext] || "text/plain; charset=utf-8";

      return new Response(content, {
        headers: {
          "Content-Type": mimeType,
          "Cache-Control": "public, max-age=3600, s-maxage=86400",
          "Access-Control-Allow-Origin": "*",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch (err) {
      console.error("Error fetching from GitHub:", err);
      return new Response(
        `Error: ${err.message}`,
        {
          status: 500,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
  },
};