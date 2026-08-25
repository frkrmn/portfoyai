import { getSupabaseClient, methodNotAllowed, sendJson, uuidPattern } from "../api-utils.mjs";

const queryValue = (request, name) => {
  const value = request.query?.[name];
  if (typeof value === "string") return value;
  return new URL(request.url || "/", `http://${request.headers.host || "localhost"}`).searchParams.get(name) || "";
};

export default async function handler(request, response) {
  if (request.method !== "GET") return methodNotAllowed(response, ["GET"]);
  const resource = queryValue(request, "locationResource");
  try {
    if (resource === "provinces") {
      const countryCode = (queryValue(request, "country") || "TR").trim().toUpperCase();
      if (!/^[A-Z]{2}$/.test(countryCode)) return sendJson(response, 400, { error: "A valid ISO alpha-2 country code is required." });
      const country = await getSupabaseClient().from("countries").select("id, code, name").eq("code", countryCode).maybeSingle();
      if (country.error) throw new Error(`Failed to load country: ${country.error.message}`);
      if (!country.data) return sendJson(response, 404, { error: "Country not found." });
      const result = await getSupabaseClient().from("provinces").select("id, name").eq("country_id", country.data.id).order("name");
      if (result.error) throw new Error(`Failed to load provinces: ${result.error.message}`);
      return sendJson(response, 200, { country: country.data, provinces: result.data || [] });
    }
    if (resource === "districts") {
      const provinceId = queryValue(request, "province");
      if (!uuidPattern.test(provinceId)) return sendJson(response, 400, { error: "A valid province id is required." });
      const result = await getSupabaseClient().from("districts").select("id, name").eq("province_id", provinceId).order("name");
      if (result.error) throw new Error(`Failed to load districts: ${result.error.message}`);
      return sendJson(response, 200, { districts: result.data || [] });
    }
    if (resource === "neighborhoods") {
      const districtId = queryValue(request, "district");
      if (!uuidPattern.test(districtId)) return sendJson(response, 400, { error: "A valid district id is required." });
      const result = await getSupabaseClient().from("neighborhoods").select("id, name").eq("district_id", districtId).order("name");
      if (result.error) throw new Error(`Failed to load neighborhoods: ${result.error.message}`);
      return sendJson(response, 200, { neighborhoods: result.data || [] });
    }
    return sendJson(response, 404, { error: "Location resource not found." });
  } catch (error) {
    console.error("[locations] Fetch failed", error);
    return sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
  }
}
