import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const templateIds = ["warm-editorial", "clean-modern", "neighborhood-friendly", "investment-focused", "urgent-deals", "guided-match", "land-plots", "bold-luxury"] as const;
export type SwitchableTemplateId = typeof templateIds[number];
type SelectionContext = { audience: string; region: string; reason: { tr: string; en?: string } };
type Props = { siteId: string; slug: string; currentTemplateId?: string; selectionContext?: SelectionContext; canUndo: boolean; saving: boolean; onApply: (id: SwitchableTemplateId) => Promise<boolean | undefined>; onUndo: () => Promise<void> };

export function TemplateSwitcher({ siteId, slug, currentTemplateId, selectionContext, canUndo, saving, onApply, onUndo }: Props) {
  const { t, i18n } = useTranslation();
  const current = templateIds.includes(currentTemplateId as SwitchableTemplateId) ? currentTemplateId as SwitchableTemplateId : "warm-editorial";
  const [candidate, setCandidate] = useState<SwitchableTemplateId>(current);
  useEffect(() => setCandidate(current), [current]);
  const changed = candidate !== current;
  const preview = (id: string) => `/site/${slug}?previewSiteId=${siteId}&templateId=${id}`;
  return <Card className="rounded-[2rem] border-[#173f32]/10 bg-[#fbfaf7] xl:col-span-2">
    <CardHeader><CardTitle>{t("dashboard.templateSwitch.title")}</CardTitle><CardDescription>{t("dashboard.templateSwitch.description")}</CardDescription></CardHeader>
    <CardContent className="space-y-5">
      {selectionContext ? <div className="rounded-2xl border border-[#173f32]/10 bg-[#edf1eb] p-5"><div className="text-xs font-semibold uppercase tracking-wider text-[#527064]">{t("dashboard.templateSwitch.whyTitle")}</div><p className="mt-2 font-medium">{t("dashboard.templateSwitch.selectedFor", { audience: selectionContext.audience, region: selectionContext.region })}</p><p className="mt-2 text-sm leading-6 text-[#5f6e66]">{i18n.resolvedLanguage === "en" ? selectionContext.reason.en || selectionContext.reason.tr : selectionContext.reason.tr}</p></div> : <div className="rounded-xl border bg-white p-4 text-sm text-[#69756e]">{t("dashboard.templateSwitch.reasonEmpty")}</div>}
      <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => setCandidate(templateIds[(templateIds.indexOf(current) + 1) % templateIds.length])}>{t("dashboard.templateSwitch.another")}</Button><Button type="button" variant="outline" onClick={() => setCandidate("clean-modern")}>{t("dashboard.templateSwitch.simpler")}</Button><Button type="button" variant="outline" onClick={() => setCandidate("bold-luxury")}>{t("dashboard.templateSwitch.premium")}</Button><Select value={candidate} onValueChange={(value: SwitchableTemplateId) => setCandidate(value)}><SelectTrigger className="w-[240px] bg-white"><SelectValue /></SelectTrigger><SelectContent>{templateIds.map((id) => <SelectItem key={id} value={id}>{t(`dashboard.templateSwitch.templates.${id}`)}</SelectItem>)}</SelectContent></Select></div>
      {changed ? <div className="grid gap-4 lg:grid-cols-2"><div><div className="mb-2 text-xs font-semibold text-[#69756e]">{t("dashboard.templateSwitch.current")}</div><iframe title={t("dashboard.templateSwitch.current")} src={preview(current)} className="h-[480px] w-full rounded-2xl border bg-white" /></div><div><div className="mb-2 text-xs font-semibold text-[#69756e]">{t("dashboard.templateSwitch.candidate")}</div><iframe key={candidate} title={t("dashboard.templateSwitch.candidate")} src={preview(candidate)} className="h-[480px] w-full rounded-2xl border bg-white" /></div></div> : <p className="rounded-xl border bg-white p-4 text-sm text-[#69756e]">{t("dashboard.templateSwitch.choose")}</p>}
      <div className="flex flex-wrap gap-2"><Button disabled={!changed || saving} onClick={() => void onApply(candidate)}>{t(saving ? "common.saving" : "dashboard.templateSwitch.apply")}</Button><Button variant="outline" disabled={!canUndo || saving} onClick={() => void onUndo()}>{t("dashboard.templateSwitch.undo")}</Button></div><p className="text-xs text-[#69756e]">{t("dashboard.templateSwitch.preserved")}</p>
    </CardContent>
  </Card>;
}
