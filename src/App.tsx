import { lazy, Suspense, useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { useCapacitor } from "@/hooks/useCapacitor";
import { OnboardingModal } from "@/components/OnboardingModal";
import { ErrorBoundary } from "@/components/system/ErrorBoundary";
import { RouteFallback } from "@/components/RouteFallback";
import { supabase } from "@/integrations/supabase/client";
import { syncCurrentUserReptiles } from "@/lib/reptiles/cloudSync";

// Core / frequently used pages — loaded with main bundle
import AuthPage from "./pages/AuthPage";
import TodayPage from "./pages/TodayPage";
import ReptilesPage from "./pages/ReptilesPage";
import NewReptilePage from "./pages/NewReptilePage";
import ReptileProfilePage from "./pages/ReptileProfilePage";
import EditReptilePage from "./pages/EditReptilePage";
import AddEventPage from "./pages/AddEventPage";
import JournalPage from "./pages/JournalPage";
import SettingsPage from "./pages/SettingsPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import NotFound from "./pages/NotFound";

// Heavier pages — lazy-loaded for smaller initial bundle
const CreatePairingPage = lazy(() => import("./pages/CreatePairingPage"));
const PairingDetailPage = lazy(() => import("./pages/PairingDetailPage"));
const ClutchDetailPage = lazy(() => import("./pages/ClutchDetailPage"));
const GeneticsCalculatorPage = lazy(() => import("./pages/GeneticsCalculatorPage"));
const AIAssistantPage = lazy(() => import("./pages/AIAssistantPage"));
const CareCardPage = lazy(() => import("./pages/CareCardPage"));
const ProfileSharePage = lazy(() => import("./pages/ProfileSharePage"));
const PassportPage = lazy(() => import("./pages/PassportPage"));
const PublicSharePage = lazy(() => import("./pages/PublicSharePage"));
const GrowthPage = lazy(() => import("./pages/GrowthPage"));
const HealthCheckPage = lazy(() => import("./pages/HealthCheckPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const TermsOfServicePage = lazy(() => import("./pages/TermsOfServicePage"));

const queryClient = new QueryClient();

function AppContent() {
  useCapacitor();

  useEffect(() => {
    if (!supabase) return;

    const runSync = (userId?: string) => {
      void syncCurrentUserReptiles(userId).catch((error) => {
        console.warn("Cloud reptile sync skipped:", error);
      });
    };

    supabase.auth.getSession().then(({ data }) => {
      const id = data.session?.user?.id;
      if (id) runSync(id);
    });

    const handleOnline = () => {
      void supabase.auth.getSession().then(({ data }) => {
        const id = data.session?.user?.id;
        if (id) runSync(id);
      });
    };
    window.addEventListener("online", handleOnline);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const id = session?.user?.id;
      if (!id) return;
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        runSync(id);
      }
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="app-shell min-h-screen bg-background">
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/" element={<Navigate to="/today" replace />} />
          <Route path="/today" element={<TodayPage />} />
          <Route path="/reptiles" element={<ReptilesPage />} />
          <Route path="/reptiles/new" element={<NewReptilePage />} />
          <Route path="/reptiles/:id" element={<ReptileProfilePage />} />
          <Route path="/reptiles/:id/edit" element={<EditReptilePage />} />
          <Route path="/add-event" element={<AddEventPage />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/breeding/pairings/new" element={<CreatePairingPage />} />
          <Route path="/breeding/pairings/:id" element={<PairingDetailPage />} />
          <Route path="/breeding/clutches/:id" element={<ClutchDetailPage />} />
          <Route path="/genetics" element={<GeneticsCalculatorPage />} />
          <Route path="/ai" element={<AIAssistantPage />} />
          <Route path="/care-card/:reptileId" element={<CareCardPage />} />
          <Route path="/share-profile/:reptileId" element={<ProfileSharePage />} />
          <Route path="/passport/:reptileId" element={<PassportPage />} />
          <Route path="/public/:shareType/:slug" element={<PublicSharePage />} />
          <Route path="/growth" element={<GrowthPage />} />
          <Route path="/health-check" element={<HealthCheckPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <BottomNav />
      <PwaInstallPrompt />
      <OnboardingModal />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" storageKey="reptile-ai-theme" enableSystem suppressHydrationWarning>
      <TooltipProvider>
        <ErrorBoundary>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
