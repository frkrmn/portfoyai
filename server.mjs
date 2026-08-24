import { createServer as createHttpServer } from "node:http";
import { createServer as createViteServer, loadEnv } from "vite";
import dispatchApiRequest from "./server/api-router.mjs";

const fileEnv = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");
for (const [key, value] of Object.entries(fileEnv)) {
  if (process.env[key] === undefined) process.env[key] = value;
}

const portArgIndex = process.argv.indexOf("--port");
const port = Number(portArgIndex >= 0 ? process.argv[portArgIndex + 1] : process.env.PORT || 4173);
const hostArgIndex = process.argv.indexOf("--host");
const host = hostArgIndex >= 0 ? process.argv[hostArgIndex + 1] : "0.0.0.0";

const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });

const server = createHttpServer(async (request, response) => {
  const pathname = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`).pathname;
  if (pathname.startsWith("/api/")) return dispatchApiRequest(request, response);

  vite.middlewares(request, response);
});

server.listen(port, host, () => {
  console.info(`PortföyAI dev server running at http://localhost:${port}`);
});
