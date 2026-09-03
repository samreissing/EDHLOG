import { defineConfig } from "vite";
import { existsSync, renameSync } from "node:fs";
import { resolve } from "node:path";

const devIndex = resolve(__dirname, "index.dev.html");

export default defineConfig({
  base: process.env.BASE_PATH || "./",
  plugins: [
    {
      name: "dev-index",
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url === "/" || req.url === "/index.html") {
            req.url = "/index.dev.html";
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
