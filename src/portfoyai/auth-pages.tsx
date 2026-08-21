import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isSupabaseAuthConfigured, supabase } from "@/lib/supabase";
import { useAuth } from "./auth";
import { toast } from "sonner";

function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f4f1ea] px-5 py-8 text-[#17231e]">
      <div className="mx-auto max-w-md">
        <Link to="/" className="mb-10 flex items-center justify-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-[#173f32] text-white"><Home className="h-4 w-4" /></div>
          <span className="text-lg font-bold">PortföyAI</span>
        </Link>
        {children}
      </div>
    </div>
  );
}

export function LoginPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const destination = (location.state as { from?: string } | null)?.from || "/dashboard";

  if (!isLoading && user) return <Navigate to={destination} replace />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Giriş yapıldı. Tarayıcınızdaki taslak hesabınıza bağlandı.");
    navigate(destination, { replace: true });
  };

  return <AuthLayout><Card className="rounded-[2rem] border-[#173f32]/10 bg-white"><CardHeader><CardTitle className="text-3xl">Giriş yap</CardTitle><CardDescription>Sitelerinizi yönetmek ve yayınlamak için hesabınıza girin.</CardDescription></CardHeader><CardContent><form onSubmit={submit} className="space-y-4"><div className="space-y-2"><Label htmlFor="login-email">E-posta</Label><Input id="login-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div><div className="space-y-2"><Label htmlFor="login-password">Şifre</Label><Input id="login-password" type="password" autoComplete="current-password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></div><Button className="w-full rounded-full bg-[#173f32]" disabled={submitting || !isSupabaseAuthConfigured}>{submitting ? "Giriş yapılıyor..." : "Giriş yap"}</Button><Button type="button" variant="outline" className="w-full rounded-full" disabled={!isSupabaseAuthConfigured} onClick={() => void supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/dashboard` } })}>Google ile devam et</Button><p className="text-center text-sm text-slate-600">Hesabınız yok mu? <Link className="font-semibold text-[#173f32] underline" to="/signup">Kaydolun</Link></p>{!isSupabaseAuthConfigured ? <p className="text-center text-xs text-red-600">Supabase istemci ortam değişkenleri eksik.</p> : null}</form></CardContent></Card></AuthLayout>;
}

export function SignupPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  useEffect(() => {
    if (!isLoading && user) navigate("/dashboard", { replace: true });
  }, [isLoading, user, navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    if (data.session) {
      toast.success("Hesabınız oluşturuldu. Misafir taslağınız hesabınıza bağlanıyor.");
      navigate("/dashboard", { replace: true });
    } else {
      setConfirmationSent(true);
    }
  };

  return <AuthLayout><Card className="rounded-[2rem] border-[#173f32]/10 bg-white"><CardHeader><CardTitle className="text-3xl">Hesap oluştur</CardTitle><CardDescription>Bu tarayıcıda oluşturduğunuz misafir site, doğrulamadan sonra otomatik olarak hesabınıza bağlanır.</CardDescription></CardHeader><CardContent>{confirmationSent ? <div className="space-y-4 text-sm leading-6"><p><strong>{email}</strong> adresine doğrulama bağlantısı gönderdik.</p><p>Bağlantıyı bu tarayıcıda açtığınızda oturum açılır ve mevcut session_id ile oluşturulan taslak hesabınıza taşınır.</p><Button asChild variant="outline" className="w-full rounded-full"><Link to="/login">Giriş sayfasına dön</Link></Button></div> : <form onSubmit={submit} className="space-y-4"><div className="space-y-2"><Label htmlFor="signup-email">E-posta</Label><Input id="signup-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div><div className="space-y-2"><Label htmlFor="signup-password">Şifre</Label><Input id="signup-password" type="password" autoComplete="new-password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></div><Button className="w-full rounded-full bg-[#d86f45]" disabled={submitting || !isSupabaseAuthConfigured}>{submitting ? "Hesap oluşturuluyor..." : "Kaydol ve sitemi sahiplen"}</Button><Button type="button" variant="outline" className="w-full rounded-full" disabled={!isSupabaseAuthConfigured} onClick={() => void supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/dashboard` } })}>Google ile kaydol</Button><p className="text-center text-sm text-slate-600">Zaten hesabınız var mı? <Link className="font-semibold underline" to="/login">Giriş yapın</Link></p></form>}</CardContent></Card></AuthLayout>;
}
