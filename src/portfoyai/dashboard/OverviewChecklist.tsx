import { AlertCircle, ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardLead } from "@/lib/lead-realtime";
import type { Listing } from "../types";
import { buildOverviewChecklist, type ChecklistSite, type ChecklistTarget } from "./overview-checklist";

type Props = { site: ChecklistSite; listings: Listing[]; leads: DashboardLead[]; imageKeys: string[]; loading: boolean; error: boolean; onNavigate: (target: ChecklistTarget) => void };

export function OverviewChecklist({ site, listings, leads, imageKeys, loading, error, onNavigate }: Props) {
  const { t } = useTranslation();
  if (loading) return <Card><CardContent className="p-7 text-sm text-[#69756e]">{t("dashboard.overview.checklist.loading")}</CardContent></Card>;
  if (error) return <Card><CardContent className="flex gap-2 p-7 text-red-700"><AlertCircle className="h-5 w-5" />{t("dashboard.overview.checklist.error")}</CardContent></Card>;
  const result = buildOverviewChecklist(site, listings, leads, imageKeys);
  return (
    <Card className="rounded-[2rem] border-[#173f32]/10 bg-[#fbfaf7] shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between gap-4"><div><CardTitle>{t("dashboard.overview.checklist.title")}</CardTitle><CardDescription>{t("dashboard.overview.checklist.description", { completed: result.completed, count: result.items.length })}</CardDescription></div><strong className="text-3xl">%{result.percentage}</strong></div>
        <div role="progressbar" aria-label={t("dashboard.overview.checklist.progress")} aria-valuenow={result.percentage} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-[#173f32]/10"><div className="h-full bg-[#d86f45]" style={{ width: `${result.percentage}%` }} /></div>
        <div className="flex gap-4 text-xs text-[#69756e]"><span>{t("dashboard.overview.checklist.recentLeads", { count: result.recentLeads })}</span><span>{t("dashboard.overview.checklist.uncontactedLeads", { count: result.uncontactedLeads })}</span></div>
      </CardHeader>
      <CardContent className="space-y-2">
        {result.items.map((item) => <Button key={item.id} variant="outline" onClick={() => onNavigate(item.target)} className={cn("h-auto w-full justify-start whitespace-normal rounded-xl p-4 text-left", item.complete && "text-[#69756e]")}>{item.complete ? <CheckCircle2 className="mr-3 h-5 w-5 shrink-0 text-emerald-700" /> : <Circle className="mr-3 h-5 w-5 shrink-0" />}<span className="flex-1">{t(`dashboard.overview.checklist.items.${item.id}`, { count: item.count })}</span><ArrowRight className="ml-3 h-4 w-4 shrink-0" /></Button>)}
      </CardContent>
    </Card>
  );
}
