import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Home, Sparkles } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trackExperimentEvent, type PricingVariant } from "@/lib/experiment";
import { cn } from "@/lib/utils";
import { useAuth } from "./auth";
import { useTranslation } from "react-i18next";
import { LanguageToggle } from "@/components/LanguageToggle";

function FeatureList({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const proFeatures = ["unlimited", "branding", "domain", "export", "support"].map((key) => t(`pricing.features.${key}`));
  return <ul className={cn("space-y-3", compact && "text-sm")}>{proFeatures.map((feature) => <li key={feature} className="flex items-start gap-3"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#e6efe9] text-[#173f32]"><Check className="h-3 w-3" /></span><span>{feature}</span></li>)}</ul>;
}

function ProCard({ variant, onUpgrade, busy }: { variant: PricingVariant; onUpgrade: () => void; busy: boolean }) {
  const { t } = useTranslation();
  return <Card className={cn("relative overflow-hidden rounded-[2rem] bg-white shadow-none", variant === "B" ? "scale-[1.02] border-2 border-[#d86f45]" : "border-[#173f32]/10")}>
    {variant === "B" ? <div className="absolute right-5 top-5 rounded-full bg-[#d86f45] px-3 py-1 text-xs font-semibold text-white">{t("pricing.recommended")}</div> : null}
    <CardHeader className="p-7 pb-5"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#173f32] text-white"><Sparkles className="h-5 w-5" /></div><CardTitle className="pt-5 text-3xl">{t("pricing.proName")}</CardTitle><CardDescription>{t("pricing.proDescription")}</CardDescription><div className="pt-4"><span className="text-5xl font-semibold tracking-tight">$9</span><span className="ml-2 text-sm text-slate-500">{t("pricing.perMonth")}</span></div></CardHeader>
    <CardContent className="space-y-7 p-7 pt-2"><FeatureList /><Button onClick={onUpgrade} disabled={busy} className="h-12 w-full rounded-full bg-[#d86f45] text-white hover:bg-[#c96039]">{t(busy ? "pricing.saving" : "pricing.upgrade")}</Button><p className="text-center text-xs text-slate-500">{t("pricing.noCharge")}</p></CardContent>
  </Card>;
}

function FreeCard() {
  const { t } = useTranslation();
  return <Card className="rounded-[2rem] border-[#173f32]/10 bg-[#f8f7f3] shadow-none"><CardHeader className="p-7"><CardTitle className="text-3xl">{t("pricing.freeName")}</CardTitle><CardDescription>{t("pricing.freeDescription")}</CardDescription><div className="pt-4"><span className="text-5xl font-semibold tracking-tight">$0</span><span className="ml-2 text-sm text-slate-500">{t("pricing.perMonth")}</span></div></CardHeader><CardContent className="p-7 pt-0"><ul className="space-y-3 text-sm">{["listings", "publish", "leads", "branding"].map((key) => <li key={key} className={cn("flex gap-3", key === "branding" && "text-slate-500")}><Check className="h-4 w-4 text-[#173f32]" />{t(`pricing.freeFeatures.${key}`)}</li>)}</ul><Button disabled variant="outline" className="mt-7 h-12 w-full rounded-full">{t("pricing.currentPlan")}</Button></CardContent></Card>;
}

export function PricingPage() {
  const { t } = useTranslation();
  const { session, isLoading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const [variant, setVariant] = useState<PricingVariant | null>(null);
  const [error, setError] = useState("");
  const [upgrading, setUpgrading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const loggedView = useRef(false);
  const context = searchParams.get("context")?.slice(0, 120) || "manual_pricing_page_visit";

  useEffect(() => {
    if (authLoading || loggedView.current) return;
    loggedView.current = true;
    void trackExperimentEvent(session?.access_token, "pricing_view", context)
      .then((result) => setVariant(result.variant))
      .catch((reason) => setError(reason instanceof Error ? reason.message : t("pricing.loadError")));
  }, [authLoading, context, session?.access_token, t]);

  const upgrade = async () => {
    if (!variant) return;
    setUpgrading(true);
    setError("");
    try {
      const result = await trackExperimentEvent(session?.access_token, "upgrade_click", context);
      setVariant(result.variant);
      setConfirmed(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("pricing.upgradeError"));
    } finally {
      setUpgrading(false);
    }
  };

  return <div className="min-h-screen bg-[#f4f1ea] px-5 py-8 text-[#17231e] sm:px-8">
    <header className="mx-auto flex max-w-6xl items-center justify-between"><Link to="/" className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#173f32] text-white"><Home className="h-4 w-4" /></span><strong>{t("common.brand")}</strong></Link><div className="flex items-center gap-2"><LanguageToggle /><Button asChild variant="ghost" className="rounded-full"><Link to={session ? "/dashboard" : "/"}><ArrowLeft className="mr-2 h-4 w-4" />{t("pricing.back")}</Link></Button></div></header>
    <main className="mx-auto max-w-6xl py-16 sm:py-24"><div className="mx-auto max-w-2xl text-center"><span className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#d86f45]">{t("pricing.badge")}</span><h1 className="mt-7 text-5xl font-semibold tracking-[-0.05em] sm:text-6xl">{t("pricing.headline")}</h1><p className="mt-5 text-base leading-7 text-slate-600">{t("pricing.intro")}</p></div>
      {error ? <div role="alert" className="mx-auto mt-10 max-w-xl rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">{error}</div> : null}
      {confirmed ? <Card className="mx-auto mt-12 max-w-2xl rounded-[2rem] border-[#173f32]/10 bg-white text-center shadow-none"><CardContent className="p-10"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e6efe9] text-[#173f32]"><Check className="h-7 w-7" /></div><h2 className="mt-6 text-3xl font-semibold">{t("pricing.confirmedTitle")}</h2><p className="mt-4 leading-7 text-slate-600">{t("pricing.confirmedBody")}</p><Button asChild className="mt-7 rounded-full bg-[#173f32]"><Link to={session ? "/dashboard" : "/"}>{t("pricing.continue")}</Link></Button></CardContent></Card> : variant ? <div className={cn("mx-auto mt-14 grid gap-7", variant === "A" ? "max-w-xl" : "max-w-4xl items-center md:grid-cols-2")} data-testid={`pricing-variant-${variant}`}>{variant === "B" ? <FreeCard /> : null}<ProCard variant={variant} onUpgrade={() => void upgrade()} busy={upgrading} /></div> : !error ? <div className="mt-16 text-center text-sm text-slate-500">{t("pricing.loading")}</div> : null}
    </main>
  </div>;
}
