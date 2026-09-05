import { defineConfig } from "vite";
import { existsSync, readFileSync, renameSync } from "node:fs";
import { resolve } from "node:path";

const devIndex = resolve(__dirname, "index.dev.html");
const repoRoot = __dirname;

function isAppEntryUrl(url) {
  return (
    url === "/" ||
    url === "/index.html" ||
    url === "/EDHLOG/" ||
    url === "/EDHLOG/index.html"
  );
}

export default defineConfig({
  base: process.env.BASE_PATH || "./",
  plugins: [
    {
      name: "dev-index",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = (req.url || "").split("?")[0];

          // Repo root index.html is the GitHub Pages build artifact, not the dev entry.
          if (isAppEntryUrl(url)) {
            req.url = "/index.dev.html";
            return next();
          }

          // Pre-built deploy bundles in /assets are not Vite source modules.
          const assetMatch = url.match(/^\/(?:EDHLOG\/)?assets\/(index\.dev-[^/]+\.js)$/);
          if (assetMatch) {
            const filePath = resolve(repoRoot, "assets", assetMatch[1]);
            if (existsSync(filePath)) {
              res.setHeader("Content-Type", "application/javascript; charset=utf-8");
              res.end(readFileSync(filePath));
              return;
            }
          }

          next();
        });
      },
    },
    {
      name: "rename-build-html",
      closeBundle() {
        const builtDev = resolve("dist/index.dev.html");
        const builtIndex = resolve("dist/index.html");
        if (existsSync(builtDev)) {
          renameSync(builtDev, builtIndex);
        }
      },
    },
  ],
  build: {
    rollupOptions: {
      input: devIndex,
    },
  },
});
