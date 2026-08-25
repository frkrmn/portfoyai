import assert from "node:assert/strict";

const baseUrl = process.env.LOCATIONS_E2E_URL || "http://127.0.0.1:4173";
const get = async (path) => {
  const response = await fetch(`${baseUrl}${path}`);
  const payload = await response.json();
  assert.equal(response.status, 200, JSON.stringify(payload));
  return payload;
};

const provincesPayload = await get("/api/locations/provinces?country=TR");
assert.equal(provincesPayload.country.code, "TR");
assert.equal(provincesPayload.provinces.length, 81);

const results = {};
for (const expectedProvince of ["İSTANBUL", "ANKARA", "İZMİR"]) {
  const province = provincesPayload.provinces.find((item) => item.name === expectedProvince);
  assert.ok(province, `${expectedProvince} was not seeded.`);
  const districtsPayload = await get(`/api/locations/districts?province=${province.id}`);
  assert.ok(districtsPayload.districts.length > 0, `${expectedProvince} has no districts.`);
  const district = districtsPayload.districts[0];
  const neighborhoodsPayload = await get(`/api/locations/neighborhoods?district=${district.id}`);
  assert.ok(neighborhoodsPayload.neighborhoods.length > 0, `${expectedProvince}/${district.name} has no neighborhoods.`);
  results[expectedProvince] = {
    districtCount: districtsPayload.districts.length,
    sampleDistrict: district.name,
    neighborhoodCount: neighborhoodsPayload.neighborhoods.length,
    sampleNeighborhood: neighborhoodsPayload.neighborhoods[0].name,
  };
}

console.info(JSON.stringify({ country: provincesPayload.country, provinceCount: provincesPayload.provinces.length, results }, null, 2));
