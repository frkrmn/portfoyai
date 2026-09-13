import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dashboardQueryKeys, dashboardRequest } from "@/lib/dashboard-query";

type Preferences = { email_enabled: boolean; whatsapp_enabled: boolean; browser_enabled: boolean; email_to: string; whatsapp_to: string };
type Delivery = { id: string; lead_id: string; listing_id: string | null; channel: string; status: string; attempts: number; last_error: string | null; created_at: string };

export function LeadNotificationSettings({ userId, authHeaders, leads }: { userId: string; authHeaders: Record<string, string>; leads: Array<{ id: string; name: string; phone: string }> }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const key = dashboardQueryKeys.notifications(userId);
  const notificationQuery = useQuery({ queryKey: key, queryFn: ({ signal }) => dashboardRequest<{ preferences: Preferences; deliveries: Delivery[] }>("/api/lead-notifications", authHeaders, signal) });
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  useEffect(() => { if (notificationQuery.data?.preferences) setPreferences(notificationQuery.data.preferences); }, [notificationQuery.data?.preferences]);
  const deliveries = useMemo(() => notificationQuery.data?.deliveries || [], [notificationQuery.data?.deliveries]);
  const updateCache = (update: (current: { preferences: Preferences; deliveries: Delivery[] }) => { preferences: Preferences; deliveries: Delivery[] }) => queryClient.setQueryData(key, (current: { preferences: Preferences; deliveries: Delivery[] } | undefined) => current ? update(current) : current);
  const saveMutation = useMutation({
    mutationFn: (next: Preferences) => dashboardRequest("/api/lead-notifications", authHeaders, undefined, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) }),
    onMutate: async (next) => { await queryClient.cancelQueries({ queryKey: key }); const previous = queryClient.getQueryData(key); updateCache((current) => ({ ...current, preferences: next })); return { previous }; },
    onError: (_error, _next, context) => queryClient.setQueryData(key, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  const deliveryMutation = useMutation({
    mutationFn: ({ method, id, status }: { method: "POST" | "PATCH"; id: string; status?: string }) => dashboardRequest("/api/lead-notifications", authHeaders, undefined, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(method === "POST" ? { delivery_id: id } : { delivery_id: id, status }) }),
    onMutate: async ({ id, status }) => { await queryClient.cancelQueries({ queryKey: key }); if (status) updateCache((current) => ({ ...current, deliveries: current.deliveries.map((item) => item.id === id ? { ...item, status } : item) })); },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  const { mutate: mutateDelivery } = deliveryMutation;
  useEffect(() => {
    if (!preferences?.browser_enabled || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    deliveries.filter((item) => item.channel === "browser" && item.status === "ready").forEach((delivery) => {
      const lead = leads.find((item) => item.id === delivery.lead_id);
      if (!lead) return;
      new Notification(t("dashboard.leads.notifications.browserTitle"), { body: `${lead.name} · ${lead.phone}`, tag: delivery.id });
      mutateDelivery({ method: "PATCH", id: delivery.id, status: "delivered" });
    });
  }, [deliveries, leads, mutateDelivery, preferences?.browser_enabled, t]);
  if (!preferences) return null;
  const toggle = (key: "email_enabled" | "whatsapp_enabled" | "browser_enabled") => setPreferences({ ...preferences, [key]: !preferences[key] });
  const save = async () => { await saveMutation.mutateAsync(preferences); };
  const allowBrowser = async () => { if (typeof Notification !== "undefined" && await Notification.requestPermission() === "granted") setPreferences({ ...preferences, browser_enabled: true }); };
  const retry = async (id: string) => { await deliveryMutation.mutateAsync({ method: "POST", id }); };
  return <section className="mb-6 rounded-2xl border bg-white p-5"><div className="flex items-center gap-2"><Bell className="h-4 w-4" /><h3 className="font-semibold">{t("dashboard.leads.notifications.title")}</h3></div><div className="mt-4 grid gap-4 md:grid-cols-3"><label className="flex items-center gap-2"><input type="checkbox" checked={preferences.email_enabled} onChange={() => toggle("email_enabled")} />{t("dashboard.leads.notifications.email")}</label><label className="flex items-center gap-2"><input type="checkbox" checked={preferences.whatsapp_enabled} onChange={() => toggle("whatsapp_enabled")} />{t("dashboard.leads.notifications.whatsapp")}</label><label className="flex items-center gap-2"><input type="checkbox" checked={preferences.browser_enabled} onChange={() => toggle("browser_enabled")} />{t("dashboard.leads.notifications.browser")}</label><div><Label>{t("dashboard.leads.notifications.emailTo")}</Label><Input value={preferences.email_to || ""} onChange={(event) => setPreferences({ ...preferences, email_to: event.target.value })} /></div><div><Label>{t("dashboard.leads.notifications.whatsappTo")}</Label><Input value={preferences.whatsapp_to || ""} onChange={(event) => setPreferences({ ...preferences, whatsapp_to: event.target.value })} /></div><div className="flex items-end gap-2"><Button onClick={() => void save()} disabled={saveMutation.isPending}>{t("common.save")}</Button><Button variant="outline" onClick={() => void allowBrowser()}>{t("dashboard.leads.notifications.allowBrowser")}</Button></div></div>{deliveries.length ? <div className="mt-5 space-y-2 border-t pt-4">{deliveries.slice(0, 8).map((delivery) => <div key={delivery.id} className="flex flex-wrap items-center justify-between gap-2 text-xs"><span>{delivery.channel} · {t(`dashboard.leads.notifications.status.${delivery.status}`)} · {t("dashboard.leads.notifications.attempts", { count: delivery.attempts })}{delivery.listing_id ? ` · ${t("dashboard.leads.listing")}` : ""}</span>{delivery.status === "failed" ? <Button size="sm" variant="outline" onClick={() => void retry(delivery.id)} disabled={deliveryMutation.isPending}><RefreshCw className="mr-1 h-3 w-3" />{t("dashboard.leads.notifications.retry")}</Button> : null}{delivery.last_error ? <span className="w-full text-red-700">{delivery.last_error}</span> : null}</div>)}</div> : null}</section>;
}
