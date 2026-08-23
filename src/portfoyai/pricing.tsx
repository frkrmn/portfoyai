import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Home, Sparkles } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trackExperimentEvent, type PricingVariant } from "@/lib/experiment";
import { cn } from "@/lib/utils";
import { useAuth } from "./auth";

const proFeatures = [
  "Sınırsız aktif ilan",
  "PortföyAI markasını kaldırma",
  "Özel alan adı (yakında)",
  "Talepleri dışa aktarma",
  "Öncelikli destek",
];

function FeatureList({ compact = false }: { compact?: boolean }) {
  return <ul className={cn("space-y-3", compact && "text-sm")}>{proFeatures.map((feature) => <li key={feature} className="flex items-start gap-3"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#e6efe9] text-[#173f32]"><Check className="h-3 w-3" /></span><span>{feature}</span></li>)}</ul>;
}

function ProCard({ variant, onUpgrade, busy }: { variant: PricingVariant; onUpgrade: () => void; busy: boolean }) {
  return <Card className={cn("relative overflow-hidden rounded-[2rem] bg-white shadow-none", variant === "B" ? "scale-[1.02] border-2 border-[#d86f45]" : "border-[#173f32]/10")}>
    {variant === "B" ? <div className="absolute right-5 top-5 rounded-full bg-[#d86f45] px-3 py-1 text-xs font-semibold text-white">Önerilen</div> : null}
    <CardHeader className="p-7 pb-5"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#173f32] text-white"><Sparkles className="h-5 w-5" /></div><CardTitle className="pt-5 text-3xl">Pro</CardTitle><CardDescription>Portföyünüz büyürken sınırlar geride kalsın.</CardDescription><div className="pt-4"><span className="text-5xl font-semibold tracking-tight">$9</span><span className="ml-2 text-sm text-slate-500">/ ay</span></div></CardHeader>
    <CardContent className="space-y-7 p-7 pt-2"><FeatureList /><Button onClick={onUpgrade} disabled={busy} className="h-12 w-full rounded-full bg-[#d86f45] text-white hover:bg-[#c96039]">{busy ? "Kaydediliyor..." : "Pro'ya Geç"}</Button><p className="text-center text-xs text-slate-500">Şimdilik ödeme alınmaz.</p></CardContent>
  </Card>;
}

function FreeCard() {
  return <Card className="rounded-[2rem] border-[#173f32]/10 bg-[#f8f7f3] shadow-none"><CardHeader className="p-7"><CardTitle className="text-3xl">Başlangıç</CardTitle><CardDescription>Siteyi yayınlamak ve ilk portföyünüzü yönetmek için.</CardDescription><div className="pt-4"><span className="text-5xl font-semibold tracking-tight">$0</span><span className="ml-2 text-sm text-slate-500">/ ay</span></div></CardHeader><CardContent className="p-7 pt-0"><ul className="space-y-3 text-sm"><li className="flex gap-3"><Check className="h-4 w-4 text-[#173f32]" />5 aktif ilan</li><li className="flex gap-3"><Check className="h-4 w-4 text-[#173f32]" />Site yayınlama</li><li className="flex gap-3"><Check className="h-4 w-4 text-[#173f32]" />Talep toplama</li><li className="flex gap-3 text-slate-500"><Check className="h-4 w-4" />PortföyAI markasıyla</li></ul><Button disabled variant="outline" className="mt-7 h-12 w-full rounded-full">Mevcut plan</Button></CardContent></Card>;
}

export function PricingPage() {
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
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Fiyatlandırma yüklenemedi."));
  }, [authLoading, context, session?.access_token]);

  const upgrade = async () => {
    if (!variant) return;
    setUpgrading(true);
    setError("");
    try {
      const result = await trackExperimentEvent(session?.access_token, "upgrade_click", context);
      setVariant(result.variant);
      setConfirmed(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "İlginiz kaydedilemedi.");
    } finally {
      setUpgrading(false);
    }
  };

  return <div className="min-h-screen bg-[#f4f1ea] px-5 py-8 text-[#17231e] sm:px-8">
    <header className="mx-auto flex max-w-6xl items-center justify-between"><Link to="/" className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#173f32] text-white"><Home className="h-4 w-4" /></span><strong>PortföyAI</strong></Link><Button asChild variant="ghost" className="rounded-full"><Link to={session ? "/dashboard" : "/"}><ArrowLeft className="mr-2 h-4 w-4" />Geri dön</Link></Button></header>
    <main className="mx-auto max-w-6xl py-16 sm:py-24"><div className="mx-auto max-w-2xl text-center"><span className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#d86f45]">Portföyünüzle birlikte büyüyün</span><h1 className="mt-7 text-5xl font-semibold tracking-[-0.05em] sm:text-6xl">Daha fazlasını yayınlamaya hazır mısınız?</h1><p className="mt-5 text-base leading-7 text-slate-600">Pro ile ilan sınırını kaldırın, markanızı öne çıkarın ve taleplerinizi kolayca yönetin.</p></div>
      {error ? <div role="alert" className="mx-auto mt-10 max-w-xl rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">{error}</div> : null}
      {confirmed ? <Card className="mx-auto mt-12 max-w-2xl rounded-[2rem] border-[#173f32]/10 bg-white text-center shadow-none"><CardContent className="p-10"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e6efe9] text-[#173f32]"><Check className="h-7 w-7" /></div><h2 className="mt-6 text-3xl font-semibold">İlginizi not ettik</h2><p className="mt-4 leading-7 text-slate-600">Ödeme altyapımız çok yakında aktif olacak — ilginizi not ettik, sizi bilgilendireceğiz.</p><Button asChild className="mt-7 rounded-full bg-[#173f32]"><Link to={session ? "/dashboard" : "/"}>Devam et</Link></Button></CardContent></Card> : variant ? <div className={cn("mx-auto mt-14 grid gap-7", variant === "A" ? "max-w-xl" : "max-w-4xl items-center md:grid-cols-2")} data-testid={`pricing-variant-${variant}`}>{variant === "B" ? <FreeCard /> : null}<ProCard variant={variant} onUpgrade={() => void upgrade()} busy={upgrading} /></div> : !error ? <div className="mt-16 text-center text-sm text-slate-500">Planınız hazırlanıyor...</div> : null}
    </main>
  </div>;
}

