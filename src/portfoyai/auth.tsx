import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSiteSessionId } from "@/lib/site-session";
import { isSupabaseAuthConfigured, supabase } from "@/lib/supabase";

type ClaimResult = { claimedSiteIds: string[] };

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isClaiming: boolean;
  claimResult: ClaimResult | null;
  claimError: string | null;
  retryClaim: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const claimGuestSites = async (accessToken: string): Promise<ClaimResult> => {
  const response = await fetch("/api/auth/claim-sites", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Session-ID": getSiteSessionId(),
    },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Guest site could not be linked to the account.");
  return payload;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  const runClaim = useCallback(async (nextSession: Session) => {
    setIsClaiming(true);
    setClaimError(null);
    try {
      setClaimResult(await claimGuestSites(nextSession.access_token));
    } catch (error) {
      console.error("[auth] guest site claim failed", error);
      setClaimError(error instanceof Error ? error.message : "Guest site could not be linked to the account.");
    } finally {
      setIsClaiming(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseAuthConfigured) {
      setIsLoading(false);
      return;
    }

    const claimForSession = async (nextSession: Session | null) => {
      setSession(nextSession);
      if (nextSession) {
        await runClaim(nextSession);
      } else {
        setClaimResult(null);
        setClaimError(null);
      }
      setIsLoading(false);
    };

    void supabase.auth.getSession().then(({ data }) => claimForSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // Defer network work until Supabase has released its auth-state callback lock.
      window.setTimeout(() => void claimForSession(nextSession), 0);
    });
    return () => listener.subscription.unsubscribe();
  }, [runClaim]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    isLoading,
    isClaiming,
    claimResult,
    claimError,
    retryClaim: async () => {
      if (session) await runClaim(session);
    },
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  }), [session, isLoading, isClaiming, claimResult, claimError, runClaim]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
