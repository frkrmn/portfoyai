import { createServer as createHttpServer } from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer, loadEnv } from "vite";

const fileEnv = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");
for (const [key, value] of Object.entries(fileEnv)) {
  if (process.env[key] === undefined) process.env[key] = value;
}

const portArgIndex = process.argv.indexOf("--port");
const port = Number(portArgIndex >= 0 ? process.argv[portArgIndex + 1] : process.env.PORT || 4173);
const hostArgIndex = process.argv.indexOf("--host");
const host = hostArgIndex >= 0 ? process.argv[hostArgIndex + 1] : "0.0.0.0";

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
};

const readJsonBody = async (request) => {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 32_768) throw new Error("Request body is too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
};

const siteConfigSchemaPath = fileURLToPath(new URL("./server/site-config.schema.json", import.meta.url));

const runCodexSiteConfig = (prompt) =>
  new Promise((resolve, reject) => {
    const model = process.env.CODEX_SITE_BUILDER_MODEL || "gpt-5.6-sol";
    const child = spawn(
      "codex",
      [
        "exec",
        "--model",
        model,
        "--config",
        'model_reasoning_effort="max"',
        "--sandbox",
        "read-only",
        "--skip-git-repo-check",
        "--ephemeral",
        "--ignore-user-config",
        "--ignore-rules",
        "--output-schema",
        siteConfigSchemaPath,
        "-",
      ],
      {
        cwd: process.cwd(),
        env: process.env,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );

    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("Codex site generation timed out after 180 seconds."));
    }, 180_000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      if (stdout.length > 256_000) child.kill("SIGTERM");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 256_000) child.kill("SIGTERM");
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        return reject(new Error(`Codex CLI exited with code ${code}: ${stderr.trim().slice(-2000)}`));
      }
      try {
        resolve({ config: JSON.parse(stdout.trim()), model, stderr });
      } catch {
        reject(new Error(`Codex returned invalid JSON: ${stdout.trim().slice(-1000)}`));
      }
    });

    child.stdin.end(
      [
        "You are the brand design engine for PortföyAI, a premium Turkish real-estate website builder.",
        "Convert the user's description into one confident website identity.",
        "Return only the JSON object required by the supplied schema.",
        "The headline must be polished Turkish and no longer than 12 words.",
        "Use sophisticated, accessible colors with strong text contrast. Avoid generic bright SaaS gradients.",
        "Do not inspect files, call tools, or modify anything.",
        "",
        `USER BUSINESS DESCRIPTION:\n${prompt}`,
      ].join("\n"),
    );
  });

const handleGenerateTheme = async (request, response) => {
  try {
    const body = await readJsonBody(request);
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (prompt.length < 10) {
      return sendJson(response, 400, { error: "Please describe the real-estate business in at least 10 characters." });
    }

    console.info("[generate-theme] Starting authenticated Codex generation with gpt-5.6-sol at max reasoning effort");
    const startedAt = Date.now();
    const result = await runCodexSiteConfig(prompt);
    console.info(`[generate-theme] Codex structured response received in ${Date.now() - startedAt}ms; model=${result.model}`);
    return sendJson(response, 200, {
      config: result.config,
      meta: {
        provider: "openai-codex-session",
        model: result.model,
        reasoning_effort: "max",
        authenticated_by: "local Codex session",
      },
    });
  } catch (error) {
    console.error("[generate-theme] Codex generation failed", error);
    return sendJson(response, 500, { error: error instanceof Error ? error.message : "Unexpected Codex generation error" });
  }
};

const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: "spa",
});

const server = createHttpServer(async (request, response) => {
  const pathname = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`).pathname;
  if (pathname === "/api/generate-theme") {
    if (request.method !== "POST") {
      response.setHeader("Allow", "POST");
      return sendJson(response, 405, { error: "Method not allowed" });
    }
    return handleGenerateTheme(request, response);
  }
  vite.middlewares(request, response, () => {
    sendJson(response, 404, { error: "Not found" });
  });
});

server.listen(port, host, () => {
  console.info(`PortföyAI dev server running at http://localhost:${port}`);
});
