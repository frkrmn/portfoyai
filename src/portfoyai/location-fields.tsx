import { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { readApiJson } from "@/lib/api";

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
        if (!response.ok) throw new Error(payload.error || "İller yüklenemedi.");
        setCountryId(payload.country?.id || "");
        setProvinces(payload.provinces || []);
      })
      .catch((reason) => { if (!(reason instanceof DOMException && reason.name === "AbortError")) setError(reason instanceof Error ? reason.message : "İller yüklenemedi."); })
      .finally(() => { if (!controller.signal.aborted) setLoading((current) => ({ ...current, provinces: false })); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!value.province_id) { setDistricts([]); return; }
    const controller = new AbortController();
    setLoading((current) => ({ ...current, districts: true }));
    fetch(`/api/locations/districts?province=${encodeURIComponent(value.province_id)}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await readApiJson<{ error?: string; districts?: LocationOption[] }>(response);
        if (!response.ok) throw new Error(payload.error || "İlçeler yüklenemedi.");
        setDistricts(payload.districts || []);
      })
      .catch((reason) => { if (!(reason instanceof DOMException && reason.name === "AbortError")) setError(reason instanceof Error ? reason.message : "İlçeler yüklenemedi."); })
      .finally(() => { if (!controller.signal.aborted) setLoading((current) => ({ ...current, districts: false })); });
    return () => controller.abort();
  }, [value.province_id]);

  useEffect(() => {
    if (!value.district_id) { setNeighborhoods([]); return; }
    const controller = new AbortController();
    setLoading((current) => ({ ...current, neighborhoods: true }));
    fetch(`/api/locations/neighborhoods?district=${encodeURIComponent(value.district_id)}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await readApiJson<{ error?: string; neighborhoods?: LocationOption[] }>(response);
        if (!response.ok) throw new Error(payload.error || "Mahalleler yüklenemedi.");
        setNeighborhoods(payload.neighborhoods || []);
      })
      .catch((reason) => { if (!(reason instanceof DOMException && reason.name === "AbortError")) setError(reason instanceof Error ? reason.message : "Mahalleler yüklenemedi."); })
      .finally(() => { if (!controller.signal.aborted) setLoading((current) => ({ ...current, neighborhoods: false })); });
    return () => controller.abort();
  }, [value.district_id]);

  const names = useMemo<LocationNames>(() => ({
    province: provinces.find((item) => item.id === value.province_id)?.name || "",
    district: districts.find((item) => item.id === value.district_id)?.name || "",
    neighborhood: neighborhoods.find((item) => item.id === value.neighborhood_id)?.name || "",
  }), [districts, neighborhoods, provinces, value.district_id, value.neighborhood_id, value.province_id]);

  return <div className="space-y-3 md:col-span-2">
    <div className="grid gap-4 md:grid-cols-3">
      <div className="space-y-2"><Label htmlFor={`${idPrefix}-province`}>İl</Label><Select value={value.province_id || undefined} onValueChange={(provinceId) => {
        const province = provinces.find((item) => item.id === provinceId)?.name || "";
        onChange({ country_id: countryId, province_id: provinceId, district_id: null, neighborhood_id: null }, { province, district: "", neighborhood: "" });
      }} disabled={loading.provinces || !provinces.length}><SelectTrigger id={`${idPrefix}-province`}><SelectValue placeholder={loading.provinces ? "İller yükleniyor..." : "İl seçin"} /></SelectTrigger><SelectContent>{provinces.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label htmlFor={`${idPrefix}-district`}>İlçe</Label><Select value={value.district_id || undefined} onValueChange={(districtId) => {
        const district = districts.find((item) => item.id === districtId)?.name || "";
        onChange({ country_id: countryId, province_id: value.province_id, district_id: districtId, neighborhood_id: null }, { ...names, district, neighborhood: "" });
      }} disabled={!value.province_id || loading.districts || !districts.length}><SelectTrigger id={`${idPrefix}-district`}><SelectValue placeholder={loading.districts ? "İlçeler yükleniyor..." : "İlçe seçin"} /></SelectTrigger><SelectContent>{districts.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label htmlFor={`${idPrefix}-neighborhood`}>Mahalle</Label><Select value={value.neighborhood_id || undefined} onValueChange={(neighborhoodId) => {
        const neighborhood = neighborhoods.find((item) => item.id === neighborhoodId)?.name || "";
        onChange({ country_id: countryId, province_id: value.province_id, district_id: value.district_id, neighborhood_id: neighborhoodId }, { ...names, neighborhood });
      }} disabled={!value.district_id || loading.neighborhoods || !neighborhoods.length}><SelectTrigger id={`${idPrefix}-neighborhood`}><SelectValue placeholder={loading.neighborhoods ? "Mahalleler yükleniyor..." : "Mahalle seçin"} /></SelectTrigger><SelectContent>{neighborhoods.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>
    </div>
    {legacyDistrict && !value.district_id ? <p className="text-xs text-amber-700">Mevcut konum metni: {legacyDistrict}. Değiştirmediğiniz sürece bu değer korunur.</p> : null}
    {error ? <p role="alert" className="text-xs text-red-700">{error}</p> : null}
  </div>;
}
