import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PortfoyAIProvider } from "./portfoyai/store";
import { AuthProvider } from "./portfoyai/auth";
import { useAuth } from "./portfoyai/auth";
import { useTranslation } from "react-i18next";

const queryClient = new QueryClient();
const LandingPage = lazy(() => import("./portfoyai/views/landing").then((module) => ({ default: module.LandingPage })));
const AuthPage = lazy(() => import("./portfoyai/views/auth").then((module) => ({ default: module.AuthPage })));
const GeneratedSitePreviewPage = lazy(() => import("./portfoyai/views/generation").then((module) => ({ default: module.GeneratedSitePreviewPage })));
const NotFoundPage = lazy(() => import("./portfoyai/views/not-found").then((module) => ({ default: module.NotFoundPage })));
const LoginPage = lazy(() => import("./portfoyai/auth-pages").then((module) => ({ default: module.LoginPage })));
const SignupPage = lazy(() => import("./portfoyai/auth-pages").then((module) => ({ default: module.SignupPage })));
const DashboardPage = lazy(() => import("./portfoyai/dashboard").then((module) => ({ default: module.DashboardPage })));
const PricingPage = lazy(() => import("./portfoyai/pricing").then((module) => ({ default: module.PricingPage })));
const PlatformContentAdminPage = lazy(() => import("./portfoyai/platform-content-admin").then((module) => ({ default: module.PlatformContentAdminPage })));
const SiteRenderer = lazy(() => import("./templates/SiteRenderer").then((module) => ({ default: module.SiteRenderer })));
const RouteLoading = () => {
  const { t } = useTranslation();
  return <div className="grid min-h-screen place-items-center bg-[#f4f1ea] text-sm text-slate-600">{t("common.loading")}</div>;
};

function RequireAuth({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <div className="grid min-h-screen place-items-center bg-[#f4f1ea] text-sm text-slate-600">{t("auth.sessionLoading")}</div>;
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
            <Suspense fallback={<RouteLoading />}><Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<RequireAuth><AuthPage /></RequireAuth>} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
              <Route path="/admin/landing-content" element={<RequireAuth><PlatformContentAdminPage /></RequireAuth>} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/preview/:siteId" element={<RequireAuth><GeneratedSitePreviewPage /></RequireAuth>} />
              <Route path="/site/:slug" element={<SiteRenderer view="home" />} />
              <Route path="/site/:slug/listings" element={<SiteRenderer view="listings" />} />
              <Route path="/site/:slug/listings/:listingId" element={<SiteRenderer view="detail" />} />
              <Route path="/site/:slug/team" element={<SiteRenderer view="team" />} />
              <Route path="/home" element={<Navigate to="/" replace />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes></Suspense>
          </BrowserRouter>
        </PortfoyAIProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
