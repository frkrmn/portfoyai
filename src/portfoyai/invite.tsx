import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "./auth";

type Preview = { email: string; role: string; workspace_name: string; expires_at: string; accepted: boolean };

export function WorkspaceInvitationPage() {
  const { token = "" } = useParams(); const { session, user, isLoading } = useAuth(); const navigate = useNavigate();
  const [preview, setPreview] = useState<Preview | null>(null); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { void fetch(`/api/invitations/${token}`).then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error); setPreview(payload.invitation); }).catch((cause) => setError(cause instanceof Error ? cause.message : "Davet yüklenemedi.")); }, [token]);
  const accept = async () => { if (!session) return; setBusy(true); setError(""); try { const response = await fetch(`/api/invitations/${token}`, { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` } }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error); navigate("/dashboard", { replace: true }); } catch (cause) { setError(cause instanceof Error ? cause.message : "Davet kabul edilemedi."); } finally { setBusy(false); } };
  return <main className="grid min-h-screen place-items-center bg-[#f4f1ea] p-5"><Card className="w-full max-w-lg rounded-[2rem]"><CardHeader><CardTitle>Workspace daveti</CardTitle><CardDescription>{preview ? `${preview.workspace_name} çalışma alanına ${preview.role} rolüyle davet edildiniz.` : "Davet doğrulanıyor…"}</CardDescription></CardHeader><CardContent className="space-y-4">{preview ? <><p className="text-sm text-slate-600">Davet edilen hesap: <strong>{preview.email}</strong></p>{preview.accepted ? <p role="status" className="text-sm text-emerald-700">Bu davet daha önce kabul edildi.</p> : null}{!isLoading && !user ? <Button asChild><Link to="/login" state={{ from: `/invite/${token}` }}>Giriş yap ve devam et</Link></Button> : null}{user ? <Button onClick={() => void accept()} disabled={busy || preview.accepted}>{busy ? "Kabul ediliyor…" : "Daveti kabul et"}</Button> : null}</> : null}{error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}</CardContent></Card></main>;
}
