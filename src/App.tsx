import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PortfoyAIProvider } from "./portfoyai/store";
import {
  AuthPage,
  DashboardPage,
  LandingPage,
  ListingDetailPage,
  NotFoundPage,
  PublicSitePage,
} from "./portfoyai/views";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PortfoyAIProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/site/:subdomain" element={<PublicSitePage />} />
              <Route path="/site/:subdomain/listings/:listingId" element={<ListingDetailPage />} />
              <Route path="/home" element={<Navigate to="/" replace />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </PortfoyAIProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
