const text = (value, max = 160) => typeof value === "string" ? value.trim().slice(0, max) : "";
const finite = (value, min, max) => {
  if (value === "" || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
};

const deedTypes = new Set(["independent", "shared", "allocation", "unknown"]);
const verificationStatuses = new Set(["unverified", "owner_declared", "document_checked", "official_source"]);
const infrastructureValues = new Set(["road", "electricity", "water", "sewer", "natural_gas", "internet"]);
const documentKinds = new Set(["deed", "zoning", "survey", "other"]);

export function sanitizeLandDetails(value, { publicView = false, siteId = "", listingId = "" } = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const coordinates = {
    lat: finite(value.coordinates?.lat, -90, 90),
    lng: finite(value.coordinates?.lng, -180, 180),
  };
  const details = {
    block: text(value.block, 40) || null,
    parcel: text(value.parcel, 40) || null,
    zoning_status: text(value.zoning_status, 300) || null,
    deed_type: deedTypes.has(value.deed_type) ? value.deed_type : "unknown",
    frontage_m: finite(value.frontage_m, 0, 100_000),
    infrastructure: Array.isArray(value.infrastructure) ? [...new Set(value.infrastructure.filter((item) => infrastructureValues.has(item)))].slice(0, 6) : [],
    slope_percent: finite(value.slope_percent, 0, 100),
    intended_use: text(value.intended_use, 200) || null,
    coordinates: coordinates.lat == null || coordinates.lng == null ? null : coordinates,
    verification_status: verificationStatuses.has(value.verification_status) ? value.verification_status : "unverified",
    verified_at: Number.isFinite(Date.parse(value.verified_at)) ? value.verified_at : null,
  };
  if (publicView) return details;
  const prefix = siteId && listingId ? `${siteId}/${listingId}/` : "";
  return {
    ...details,
    source: {
      label: text(value.source?.label, 200) || null,
      url: /^https?:\/\//.test(value.source?.url || "") ? text(value.source.url, 1000) : null,
      checked_at: Number.isFinite(Date.parse(value.source?.checked_at)) ? value.source.checked_at : null,
    },
    documents: Array.isArray(value.documents) ? value.documents.flatMap((document) => {
      const path = text(document?.path, 500);
      if (!prefix || !path.startsWith(prefix) || !documentKinds.has(document?.kind)) return [];
      return [{ id: text(document.id, 100), name: text(document.name, 200), path, kind: document.kind, mime_type: text(document.mime_type, 100), size: finite(document.size, 1, 10_485_760), uploaded_at: Number.isFinite(Date.parse(document.uploaded_at)) ? document.uploaded_at : null }];
    }).slice(0, 20) : [],
  };
}

export function landMapUrl(details) {
  const coordinates = sanitizeLandDetails(details, { publicView: true }).coordinates;
  return coordinates ? `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}` : null;
}
