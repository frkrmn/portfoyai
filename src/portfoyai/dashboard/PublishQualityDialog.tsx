import { AlertTriangle, ArrowRight, CheckCircle2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { Listing } from "../types";
import { auditPublishQuality } from "@/lib/publish-quality.mjs";
import type { ChecklistTarget } from "./overview-checklist";

type Props = {
  open: boolean;
  site: {
    business_name?: string;
    headline?: string;
    theme_config?: {
      content?: Record<string, unknown>;
      media?: Record<string, string | string[]>;
      seo?: { title?: { tr?: string }; description?: { tr?: string } };
    };
  };
  listings: Listing[];
  imageKeys: string[];
  unsaved: boolean;
  publishing: boolean;
  onClose: () => void;
  onNavigate: (target: ChecklistTarget) => void;
  onPublish: () => void;
};

export function PublishQualityDialog({ open, site, listings, imageKeys, unsaved, publishing, onClose, onNavigate, onPublish }: Props) {
  const { t } = useTranslation();
  if (!open) return null;
  const result = auditPublishQuality({ site, listings, imageKeys, unsaved });
  const groups = [{ key: "critical", items: result.critical }, { key: "warnings", items: result.warnings }] as const;
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#102d24]/70 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="publish-quality-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-[#fbfaf7] p-6 shadow-2xl sm:p-8">
      <div className="flex items-start justify-between gap-4"><div><h2 id="publish-quality-title" className="text-2xl font-semibold">{t("dashboard.publishQuality.title")}</h2><p className="mt-2 text-sm text-[#69756e]">{t("dashboard.publishQuality.description")}</p></div><Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label={t("common.cancel")}><X className="h-5 w-5" /></Button></div>
      {groups.map((group) => <div key={group.key} className="mt-6"><div className="mb-2 flex items-center gap-2 font-semibold">{group.key === "critical" ? <AlertTriangle className="h-5 w-5 text-red-700" /> : <AlertTriangle className="h-5 w-5 text-amber-600" />}<span>{t(`dashboard.publishQuality.${group.key}`, { count: group.items.length })}</span></div><div className="space-y-2">{group.items.length ? group.items.map((finding) => <button type="button" key={finding.id} onClick={() => { onNavigate(finding.target); onClose(); }} className="flex w-full items-center gap-3 rounded-xl border bg-white p-4 text-left text-sm hover:border-[#173f32]"><span className="flex-1">{t(`dashboard.publishQuality.findings.${finding.id}`, { count: finding.count })}</span><ArrowRight className="h-4 w-4 shrink-0" /></button>) : <div className="flex items-center gap-2 rounded-xl border bg-white p-4 text-sm text-emerald-800"><CheckCircle2 className="h-5 w-5" />{t(`dashboard.publishQuality.none.${group.key}`)}</div>}</div></div>)}
      <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button><Button type="button" onClick={onPublish} disabled={!result.canPublish || publishing}>{t(result.canPublish ? "dashboard.publishQuality.publish" : "dashboard.publishQuality.blocked")}</Button></div>
    </section>
  </div>;
}
