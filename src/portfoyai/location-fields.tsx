import { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { readApiJson } from "@/lib/api";
import { useTranslation } from "react-i18next";

export type LocationSelection = {
  country_id?: string | null;
  province_id?: string | null;
  district_id?: string | null;
  neighborhood_id?: string | null;
};

type LocationOption = { id: string; name: string };
type LocationNames = { province: string; district: string; neighborhood: string };

export function LocationHierarchyFields({ value, legacyDistrict, onChange, idPrefix = "location" }: {
  value: LocationSelection;
  legacyDistrict?: string;
  onChange: (selection: LocationSelection, names: LocationNames) => void;
  idPrefix?: string;
}) {
  const { t } = useTranslation();
  const [countryId, setCountryId] = useState(value.country_id || "");
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState({ provinces: true, districts: false, neighborhoods: false });
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading((current) => ({ ...current, provinces: true }));
    fetch("/api/locations/provinces?country=TR", { signal: controller.signal })
      .then(async (response) => {
        const payload = await readApiJson<{ error?: string; country?: LocationOption; provinces?: LocationOption[] }>(response);
        if (!response.ok) throw new Error(payload.error || t("dashboard.locations.loadProvincesError"));
        setCountryId(payload.country?.id || "");
        setProvinces(payload.provinces || []);
      })
      .catch((reason) => { if (!(reason instanceof DOMException && reason.name === "AbortError")) setError(reason instanceof Error ? reason.message : t("dashboard.locations.loadProvincesError")); })
      .finally(() => { if (!controller.signal.aborted) setLoading((current) => ({ ...current, provinces: false })); });
    return () => controller.abort();
  }, [t]);

  useEffect(() => {
    if (!value.province_id) { setDistricts([]); return; }
    const controller = new AbortController();
    setLoading((current) => ({ ...current, districts: true }));
    fetch(`/api/locations/districts?province=${encodeURIComponent(value.province_id)}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await readApiJson<{ error?: string; districts?: LocationOption[] }>(response);
        if (!response.ok) throw new Error(payload.error || t("dashboard.locations.loadDistrictsError"));
        setDistricts(payload.districts || []);
      })
      .catch((reason) => { if (!(reason instanceof DOMException && reason.name === "AbortError")) setError(reason instanceof Error ? reason.message : t("dashboard.locations.loadDistrictsError")); })
      .finally(() => { if (!controller.signal.aborted) setLoading((current) => ({ ...current, districts: false })); });
    return () => controller.abort();
  }, [t, value.province_id]);

  useEffect(() => {
    if (!value.district_id) { setNeighborhoods([]); return; }
    const controller = new AbortController();
    setLoading((current) => ({ ...current, neighborhoods: true }));
    fetch(`/api/locations/neighborhoods?district=${encodeURIComponent(value.district_id)}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await readApiJson<{ error?: string; neighborhoods?: LocationOption[] }>(response);
        if (!response.ok) throw new Error(payload.error || t("dashboard.locations.loadNeighborhoodsError"));
        setNeighborhoods(payload.neighborhoods || []);
      })
      .catch((reason) => { if (!(reason instanceof DOMException && reason.name === "AbortError")) setError(reason instanceof Error ? reason.message : t("dashboard.locations.loadNeighborhoodsError")); })
      .finally(() => { if (!controller.signal.aborted) setLoading((current) => ({ ...current, neighborhoods: false })); });
    return () => controller.abort();
  }, [t, value.district_id]);

  const names = useMemo<LocationNames>(() => ({
    province: provinces.find((item) => item.id === value.province_id)?.name || "",
    district: districts.find((item) => item.id === value.district_id)?.name || "",
    neighborhood: neighborhoods.find((item) => item.id === value.neighborhood_id)?.name || "",
  }), [districts, neighborhoods, provinces, value.district_id, value.neighborhood_id, value.province_id]);

  return <div className="space-y-3 md:col-span-2">
    <div className="grid gap-4 md:grid-cols-3">
      <div className="space-y-2"><Label htmlFor={`${idPrefix}-province`}>{t("dashboard.locations.province")}</Label><Select value={value.province_id || undefined} onValueChange={(provinceId) => {
        const province = provinces.find((item) => item.id === provinceId)?.name || "";
        onChange({ country_id: countryId, province_id: provinceId, district_id: null, neighborhood_id: null }, { province, district: "", neighborhood: "" });
      }} disabled={loading.provinces || !provinces.length}><SelectTrigger id={`${idPrefix}-province`}><SelectValue placeholder={loading.provinces ? t("dashboard.locations.loading") : t("dashboard.locations.selectProvince")} /></SelectTrigger><SelectContent>{provinces.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label htmlFor={`${idPrefix}-district`}>{t("dashboard.locations.district")}</Label><Select value={value.district_id || undefined} onValueChange={(districtId) => {
        const district = districts.find((item) => item.id === districtId)?.name || "";
        onChange({ country_id: countryId, province_id: value.province_id, district_id: districtId, neighborhood_id: null }, { ...names, district, neighborhood: "" });
      }} disabled={!value.province_id || loading.districts || !districts.length}><SelectTrigger id={`${idPrefix}-district`}><SelectValue placeholder={loading.districts ? t("dashboard.locations.loading") : t("dashboard.locations.selectDistrict")} /></SelectTrigger><SelectContent>{districts.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label htmlFor={`${idPrefix}-neighborhood`}>{t("dashboard.locations.neighborhood")}</Label><Select value={value.neighborhood_id || undefined} onValueChange={(neighborhoodId) => {
        const neighborhood = neighborhoods.find((item) => item.id === neighborhoodId)?.name || "";
        onChange({ country_id: countryId, province_id: value.province_id, district_id: value.district_id, neighborhood_id: neighborhoodId }, { ...names, neighborhood });
      }} disabled={!value.district_id || loading.neighborhoods || !neighborhoods.length}><SelectTrigger id={`${idPrefix}-neighborhood`}><SelectValue placeholder={loading.neighborhoods ? t("dashboard.locations.loading") : t("dashboard.locations.selectNeighborhood")} /></SelectTrigger><SelectContent>{neighborhoods.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>
    </div>
    {legacyDistrict && !value.district_id ? <p className="text-xs text-amber-700">{t("dashboard.locations.legacy", { location: legacyDistrict })}</p> : null}
    {error ? <p role="alert" className="text-xs text-red-700">{error}</p> : null}
  </div>;
}
