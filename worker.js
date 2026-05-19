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
  png: "image/png",
  ico: "image/x-icon",
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    let path = url.pathname;

    if (path === "/") {
      path = "index.html";
    } else if (!path.includes(".")) {
      path = path.slice(1) + ".html";
    } else {
      path = path.slice(1);
    }

    const ext = path.split(".").pop().toLowerCase();
    const mimeType = MIME_TYPES[ext] || "text/plain; charset=utf-8";

    try {
      const githubUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${path}`;
      const response = await fetch(githubUrl);

      if (!response.ok) {
        return new Response(`404 Not Found: ${path}`, {
          status: 404,
          headers: { "Content-Type": "text/plain" },
        });
      }

      return new Response(await response.text(), {
        headers: {
          "Content-Type": mimeType,
          "Cache-Control": "public, max-age=3600",
        },
      });
    } catch (err) {
      return new Response(`Error: ${err.message}`, { status: 500 });
    }
  },
};