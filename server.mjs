import { createServer as createHttpServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createServer as createViteServer, loadEnv } from "vite";
import apiHandler from "./api/index.js";

const fileEnv = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");
for (const [key, value] of Object.entries(fileEnv)) {
  if (process.env[key] === undefined) process.env[key] = value;
}

const portArgIndex = process.argv.indexOf("--port");
const port = Number(portArgIndex >= 0 ? process.argv[portArgIndex + 1] : process.env.PORT || 4173);
const hostArgIndex = process.argv.indexOf("--host");
const host = hostArgIndex >= 0 ? process.argv[hostArgIndex + 1] : "0.0.0.0";

const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
const sourceHtml = await readFile(new URL("./index.html", import.meta.url), "utf8");
const platformHtmlPaths = new Set(["/", "/pricing", "/auth", "/login", "/signup", "/dashboard"]);

const server = createHttpServer(async (request, response) => {
  const pathname = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`).pathname;
  if (pathname === "/api" || pathname.startsWith("/api/")) return apiHandler(request, response);
  if ((request.method === "GET" || request.method === "HEAD") && (platformHtmlPaths.has(pathname) || pathname.startsWith("/site/"))) {
    request.query = { route: "render-page", pagePath: pathname.replace(/^\//, "") };
    request.htmlTemplate = await vite.transformIndexHtml(pathname, sourceHtml);
    return apiHandler(request, response);
  }

  vite.middlewares(request, response);
});

server.listen(port, host, () => {
  console.info(`Fastate AI dev server running at http://localhost:${port}`);
});
