import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "vite";

const sourceUrl = "https://raw.githubusercontent.com/bertugfahriozer/il_ilce_mahalle/master/il_ilce_mahalle.json";
const batchSize = 500;
const env = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const inBatches = async (rows, action) => {
  for (let start = 0; start < rows.length; start += batchSize) await action(rows.slice(start, start + batchSize));
};

const allRows = async (table, columns, query = (builder) => builder) => {
  const rows = [];
  for (let start = 0; ; start += 1000) {
    const result = await query(supabase.from(table).select(columns)).range(start, start + 999);
    if (result.error) throw new Error(`Failed to read ${table}: ${result.error.message}`);
    rows.push(...result.data);
    if (result.data.length < 1000) return rows;
  }
};

const response = await fetch(sourceUrl);
if (!response.ok) throw new Error(`Location source download failed (${response.status}).`);
const source = await response.json();
if (!source || Array.isArray(source) || typeof source !== "object") throw new Error("Location source has an unexpected shape.");
const sourceSummary = {
  provinces: Object.keys(source).length,
  districts: Object.values(source).reduce((total, province) => total + Object.keys(province).length, 0),
  neighborhoods: Object.values(source).reduce((total, province) => total + Object.values(province).reduce((count, names) => count + new Set(names).size, 0), 0),
};
if (process.argv.includes("--dry-run")) {
  const samples = Object.fromEntries(["İSTANBUL", "ANKARA", "İZMİR"].map((province) => [province, {
    districts: Object.keys(source[province] || {}).length,
    firstDistrict: Object.keys(source[province] || {})[0] || null,
    firstNeighborhood: Object.values(source[province] || {})[0]?.[0] || null,
  }]));
  console.info(JSON.stringify({ source: sourceUrl, ...sourceSummary, samples }, null, 2));
  process.exit(0);
}

const countryResult = await supabase.from("countries").upsert({ code: "TR", name: "Türkiye" }, { onConflict: "code" }).select("id").single();
if (countryResult.error) throw new Error(`Turkey seed failed: ${countryResult.error.message}`);
const countryId = countryResult.data.id;

const provinceNames = Object.keys(source);
await inBatches(provinceNames.map((name) => ({ country_id: countryId, name })), async (batch) => {
  const result = await supabase.from("provinces").upsert(batch, { onConflict: "country_id,name", ignoreDuplicates: true });
  if (result.error) throw new Error(`Province batch failed: ${result.error.message}`);
});
const provinces = await allRows("provinces", "id,name,country_id", (builder) => builder.eq("country_id", countryId));
const provinceByName = new Map(provinces.map((row) => [row.name, row.id]));

const districtRows = provinceNames.flatMap((provinceName) => Object.keys(source[provinceName]).map((name) => ({ province_id: provinceByName.get(provinceName), name })));
await inBatches(districtRows, async (batch) => {
  const result = await supabase.from("districts").upsert(batch, { onConflict: "province_id,name", ignoreDuplicates: true });
  if (result.error) throw new Error(`District batch failed: ${result.error.message}`);
});
const provinceIds = [...provinceByName.values()];
const districts = await allRows("districts", "id,name,province_id", (builder) => builder.in("province_id", provinceIds));
const districtByPath = new Map(districts.map((row) => [`${row.province_id}:${row.name}`, row.id]));

const neighborhoodRows = [];
for (const provinceName of provinceNames) {
  const provinceId = provinceByName.get(provinceName);
  for (const [districtName, names] of Object.entries(source[provinceName])) {
    const districtId = districtByPath.get(`${provinceId}:${districtName}`);
    for (const name of new Set(names)) neighborhoodRows.push({ district_id: districtId, name });
  }
}
await inBatches(neighborhoodRows, async (batch) => {
  const result = await supabase.from("neighborhoods").upsert(batch, { onConflict: "district_id,name", ignoreDuplicates: true });
  if (result.error) throw new Error(`Neighborhood batch failed: ${result.error.message}`);
});

console.info(JSON.stringify({ source: sourceUrl, country: "TR", provinces: provinceNames.length, districts: districtRows.length, neighborhoods: neighborhoodRows.length, batchSize }, null, 2));
