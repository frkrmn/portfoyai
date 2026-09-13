import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const templateIds = ["warm-editorial", "clean-modern", "neighborhood-friendly", "investment-focused", "urgent-deals", "guided-match", "land-plots", "bold-luxury"] as const;
export type SwitchableTemplateId = typeof templateIds[number];

export function TemplateSwitcher({ siteId, slug, currentTemplateId, canUndo, saving, onApply, onUndo }: { siteId: string; slug: string; currentTemplateId?: string; canUndo: boolean; saving: boolean; onApply: (id: SwitchableTemplateId) => Promise<boolean | undefined>; onUndo: () => Promise<void> }) {
  const { t } = useTranslation();
  const current = templateIds.includes(currentTemplateId as SwitchableTemplateId) ? currentTemplateId as SwitchableTemplateId : "warm-editorial";
  const [candidate, setCandidate] = useState<SwitchableTemplateId>(current);
  useEffect(() => setCandidate(current), [current]);
  const chooseAnother = () => setCandidate(templateIds[(templateIds.indexOf(current) + 1) % templateIds.length]);
  const changed = candidate !== current;
  const preview = (id: string) => `/site/${slug}?previewSiteId=${siteId}&templateId=${id}`;
  return <Card className="rounded-[2rem] border-[#173f32]/10 bg-[#fbfaf7] xl:col-span-2"><CardHeader><CardTitle>{t("dashboard.templateSwitch.title")}</CardTitle><CardDescription>{t("dashboard.templateSwitch.description")}</CardDescription></CardHeader><CardContent className="space-y-5"><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={chooseAnother}>{t("dashboard.templateSwitch.another")}</Button><Button type="button" variant="outline" onClick={() => setCandidate("clean-modern")}>{t("dashboard.templateSwitch.simpler")}</Button><Button type="button" variant="outline" onClick={() => setCandidate("bold-luxury")}>{t("dashboard.templateSwitch.premium")}</Button><Select value={candidate} onValueChange={(value: SwitchableTemplateId) => setCandidate(value)}><SelectTrigger className="w-[240px] bg-white"><SelectValue /></SelectTrigger><SelectContent>{templateIds.map((id) => <SelectItem key={id} value={id}>{t(`dashboard.templateSwitch.templates.${id}`)}</SelectItem>)}</SelectContent></Select></div>{changed ? <div className="grid gap-4 lg:grid-cols-2"><div><div className="mb-2 text-xs font-semibold text-[#69756e]">{t("dashboard.templateSwitch.current")}</div><iframe title={t("dashboard.templateSwitch.current")} src={preview(current)} className="h-[480px] w-full rounded-2xl border bg-white" /></div><div><div className="mb-2 text-xs font-semibold text-[#69756e]">{t("dashboard.templateSwitch.candidate")}</div><iframe key={candidate} title={t("dashboard.templateSwitch.candidate")} src={preview(candidate)} className="h-[480px] w-full rounded-2xl border bg-white" /></div></div> : <p className="rounded-xl border bg-white p-4 text-sm text-[#69756e]">{t("dashboard.templateSwitch.choose")}</p>}<div className="flex flex-wrap gap-2"><Button disabled={!changed || saving} onClick={() => void onApply(candidate)}>{t(saving ? "common.saving" : "dashboard.templateSwitch.apply")}</Button><Button variant="outline" disabled={!canUndo || saving} onClick={() => void onUndo()}>{t("dashboard.templateSwitch.undo")}</Button></div><p className="text-xs text-[#69756e]">{t("dashboard.templateSwitch.preserved")}</p></CardContent></Card>;
}
