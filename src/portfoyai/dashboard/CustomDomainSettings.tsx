import { useEffect, useState } from "react";
import { Globe, RefreshCw, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readApiJson } from "@/lib/api";

type DomainRecord = { domain: string; status: "pending" | "verified" | "error"; ssl_status: "pending" | "active" | "error"; dns_records: Array<{ type: string; name: string; value: string }>; error_code?: string | null; error_message?: string | null; last_checked_at?: string | null };

export function CustomDomainSettings({ siteId, authHeaders }: { siteId: string; authHeaders: Record<string, string> }) {
  const { t } = useTranslation();
  const [record, setRecord] = useState<DomainRecord | null>(null);
  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/sites/${siteId}/domain`, { headers: authHeaders, signal: controller.signal }).then((response) => readApiJson<{ domain: DomainRecord | null }>(response)).then((payload) => { setRecord(payload.domain); setDomain(payload.domain?.domain || ""); }).catch((error) => { if (error?.name !== "AbortError") toast.error(t("dashboard.domain.loadError")); });
    return () => controller.abort();
  }, [authHeaders, siteId, t]);
  const mutate = async (method: "POST" | "DELETE", action?: "connect" | "verify") => {
    setBusy(true);
    try {
      const response = await fetch(`/api/sites/${siteId}/domain`, { method, headers: { ...authHeaders, "Content-Type": "application/json" }, ...(method === "POST" ? { body: JSON.stringify({ action, domain }) } : {}) });
      const payload = await readApiJson<{ domain?: DomainRecord | null; error?: string }>(response);
      if (payload.domain) setRecord(payload.domain);
      if (!response.ok) throw new Error(payload.error || t("dashboard.domain.error"));
      if (method === "DELETE") { setRecord(null); setDomain(""); }
      toast.success(t(method === "DELETE" ? "dashboard.domain.removed" : "dashboard.domain.updated"));
    } catch (error) { toast.error(error instanceof Error ? error.message : t("dashboard.domain.error")); }
    finally { setBusy(false); }
  };
  const statusLabel = (status: string) => t(`dashboard.domain.status_${status}`);
  return <div className="space-y-4 rounded-2xl border bg-white p-4" data-custom-domain-settings><div className="flex items-center gap-2"><Globe className="h-5 w-5 text-[#173f32]" /><div><div className="font-semibold">{t("dashboard.domain.title")}</div><p className="text-xs text-slate-500">{t("dashboard.domain.description")}</p></div></div><div className="flex flex-col gap-2 sm:flex-row"><div className="flex-1 space-y-1"><Label htmlFor="custom-domain">{t("dashboard.domain.label")}</Label><Input id="custom-domain" placeholder={t("dashboard.domain.placeholder")} value={domain} disabled={busy || Boolean(record)} onChange={(event) => setDomain(event.target.value)} /></div>{!record ? <Button className="sm:self-end" disabled={busy || !domain.trim()} onClick={() => void mutate("POST", "connect")}>{t("dashboard.domain.connect")}</Button> : null}</div>{record ? <><div className="flex flex-wrap gap-2"><Badge variant={record.status === "verified" ? "default" : record.status === "error" ? "destructive" : "secondary"}>{t("dashboard.domain.domainStatus")}: {statusLabel(record.status)}</Badge><Badge variant={record.ssl_status === "active" ? "default" : record.ssl_status === "error" ? "destructive" : "secondary"}>SSL: {statusLabel(record.ssl_status)}</Badge></div>{record.error_message ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{record.error_message}</p> : null}<div><div className="text-sm font-semibold">{t("dashboard.domain.dnsTitle")}</div><p className="mt-1 text-xs text-slate-500">{t("dashboard.domain.dnsHelp")}</p><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[480px] text-left text-sm"><thead><tr className="border-b"><th className="p-2">{t("dashboard.domain.type")}</th><th className="p-2">{t("dashboard.domain.name")}</th><th className="p-2">{t("dashboard.domain.value")}</th></tr></thead><tbody>{record.dns_records.map((dns, index) => <tr key={`${dns.type}-${dns.name}-${index}`} className="border-b"><td className="p-2 font-mono">{dns.type}</td><td className="p-2 font-mono">{dns.name}</td><td className="break-all p-2 font-mono">{dns.value}</td></tr>)}</tbody></table></div></div><div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => void mutate("POST", "verify")}><RefreshCw className="mr-2 h-4 w-4" />{t("dashboard.domain.verify")}</Button><Button variant="outline" disabled={busy} onClick={() => void mutate("DELETE")}><Trash2 className="mr-2 h-4 w-4" />{t("dashboard.domain.remove")}</Button></div>{record.last_checked_at ? <p className="text-xs text-slate-500">{t("dashboard.domain.lastChecked", { date: new Date(record.last_checked_at).toLocaleString() })}</p> : null}</> : null}</div>;
}
