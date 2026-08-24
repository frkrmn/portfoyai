import dispatchApiRequest from "../server/api-router.mjs";

export const config = { api: { bodyParser: { sizeLimit: "8mb" } } };

const rewritePath = (request) => {
  const queryValue = request.query?.route;
  if (Array.isArray(queryValue)) return queryValue.join("/");
  if (typeof queryValue === "string") return queryValue;
  const url = new URL(request.url || "/", `${request.headers["x-forwarded-proto"] || "http"}://${request.headers.host || "localhost"}`);
  return url.pathname === "/api" ? url.searchParams.get("route") : null;
};

export default function handler(request, response) {
  const route = rewritePath(request)?.replace(/^\/+|\/+$/g, "");
  if (route) request.routedApiPath = `/api/${route}`;
  return dispatchApiRequest(request, response);
}
