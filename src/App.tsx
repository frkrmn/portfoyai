import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PortfoyAIProvider } from "./portfoyai/store";
import { AuthProvider } from "./portfoyai/auth";
import { useAuth } from "./portfoyai/auth";
import { LoginPage, SignupPage } from "./portfoyai/auth-pages";
import {
  AuthPage,
  GeneratedSitePreviewPage,
  LandingPage,
  NotFoundPage,
} from "./portfoyai/views";
import { DashboardPage } from "./portfoyai/dashboard";
import { PricingPage } from "./portfoyai/pricing";
import { SiteRenderer } from "./templates/SiteRenderer";

const queryClient = new QueryClient();

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <div className="grid min-h-screen place-items-center bg-[#f4f1ea] text-sm text-slate-600">Oturum yükleniyor...</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  return children;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
        <PortfoyAIProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<RequireAuth><AuthPage /></RequireAuth>} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/preview/:siteId" element={<RequireAuth><GeneratedSitePreviewPage /></RequireAuth>} />
              <Route path="/site/:slug" element={<SiteRenderer view="home" />} />
              <Route path="/site/:slug/listings" element={<SiteRenderer view="listings" />} />
              <Route path="/site/:slug/listings/:listingId" element={<SiteRenderer view="detail" />} />
              <Route path="/home" element={<Navigate to="/" replace />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </PortfoyAIProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
