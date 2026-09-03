import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isSupabaseAuthConfigured, supabase } from "@/lib/supabase";
import { getPendingPrompt } from "@/lib/pending-prompt";
import { useAuth } from "./auth";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-[#f4f1ea] px-5 py-8 text-[#17231e]">
      <div className="mx-auto max-w-md">
        <Link to="/" className="mb-10 flex items-center justify-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-[#173f32] text-white"><Home className="h-4 w-4" /></div>
          <span className="text-lg font-bold">{t("common.brand")}</span>
        </Link>
        {children}
      </div>
    </div>
  );
}

export function LoginPage() {
  const { t } = useTranslation();
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const hasPendingPrompt = Boolean(getPendingPrompt());
  const destination = (location.state as { from?: string } | null)?.from || "/dashboard";
  const isPendingPromptFlow = destination === "/auth" && hasPendingPrompt;

  if (!isLoading && user) return <Navigate to={destination} replace />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success(t(isPendingPromptFlow ? "auth.login.pendingSuccess" : "auth.login.success"));
    navigate(destination, { replace: true });
  };

  return <AuthLayout><Card className="rounded-[2rem] border-[#173f32]/10 bg-white"><CardHeader><CardTitle className="text-3xl">{t("auth.login.title")}</CardTitle><CardDescription>{t(isPendingPromptFlow ? "auth.login.pendingDescription" : "auth.login.description")}</CardDescription></CardHeader><CardContent><form onSubmit={submit} className="space-y-4"><div className="space-y-2"><Label htmlFor="login-email">{t("auth.login.emailLabel")}</Label><Input id="login-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div><div className="space-y-2"><Label htmlFor="login-password">{t("auth.login.passwordLabel")}</Label><Input id="login-password" type="password" autoComplete="current-password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></div><Button className="w-full rounded-full bg-[#173f32]" disabled={submitting || !isSupabaseAuthConfigured}>{t(submitting ? "auth.login.submitting" : "auth.login.submit")}</Button><Button type="button" variant="outline" className="w-full rounded-full" disabled={!isSupabaseAuthConfigured} onClick={() => void supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}${destination}` } })}>{t("auth.login.google")}</Button>{isPendingPromptFlow ? <Button asChild type="button" variant="ghost" className="w-full rounded-full"><Link to="/login" replace>{t("auth.login.dashboardInstead")}</Link></Button> : null}<p className="text-center text-sm text-slate-600">{t("auth.login.noAccount")} <Link className="font-semibold text-[#173f32] underline" to="/signup" state={{ from: destination }}>{t("auth.login.signupLink")}</Link></p>{!isSupabaseAuthConfigured ? <p className="text-center text-xs text-red-600">{t("auth.configMissing")}</p> : null}</form></CardContent></Card></AuthLayout>;
}

export function SignupPage() {
  const { t } = useTranslation();
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const hasPendingPrompt = Boolean(getPendingPrompt());
  const destination = (location.state as { from?: string } | null)?.from || (hasPendingPrompt ? "/auth" : "/dashboard");

  useEffect(() => {
    if (!isLoading && user) navigate(destination, { replace: true });
  }, [destination, isLoading, user, navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}${hasPendingPrompt ? "/auth" : "/dashboard"}` },
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    if (data.session) {
      toast.success(t(hasPendingPrompt ? "auth.signup.pendingSuccess" : "auth.signup.success"));
      navigate(destination, { replace: true });
    } else {
      setConfirmationSent(true);
    }
  };

  return <AuthLayout><Card className="rounded-[2rem] border-[#173f32]/10 bg-white"><CardHeader><CardTitle className="text-3xl">{t("auth.signup.title")}</CardTitle><CardDescription>{t(hasPendingPrompt ? "auth.signup.pendingDescription" : "auth.signup.description")}</CardDescription></CardHeader><CardContent>{confirmationSent ? <div className="space-y-4 text-sm leading-6"><p>{t("auth.signup.confirmationSent", { email })}</p><p>{t("auth.signup.confirmationHelp")}</p><Button asChild variant="outline" className="w-full rounded-full"><Link to="/login" state={{ from: destination }}>{t("auth.signup.backToLogin")}</Link></Button></div> : <form onSubmit={submit} className="space-y-4"><div className="space-y-2"><Label htmlFor="signup-email">{t("auth.signup.emailLabel")}</Label><Input id="signup-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div><div className="space-y-2"><Label htmlFor="signup-password">{t("auth.signup.passwordLabel")}</Label><Input id="signup-password" type="password" autoComplete="new-password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></div><Button className="w-full rounded-full bg-[#d86f45]" disabled={submitting || !isSupabaseAuthConfigured}>{t(submitting ? "auth.signup.submitting" : "auth.signup.submit")}</Button><Button type="button" variant="outline" className="w-full rounded-full" disabled={!isSupabaseAuthConfigured} onClick={() => void supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}${hasPendingPrompt ? "/auth" : "/dashboard"}` } })}>{t("auth.signup.google")}</Button><p className="text-center text-sm text-slate-600">{t("auth.signup.hasAccount")} <Link className="font-semibold underline" to="/login" state={{ from: destination }}>{t("auth.signup.loginLink")}</Link></p></form>}</CardContent></Card></AuthLayout>;
}
