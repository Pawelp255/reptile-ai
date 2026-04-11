import { lazy, Suspense } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { useCapacitor } from "@/hooks/useCapacitor";
import { OnboardingModal } from "@/components/OnboardingModal";
import { ErrorBoundary } from "@/components/system/ErrorBoundary";
import { RouteFallback } from "@/components/RouteFallback";

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
import CreatePairingPage from "./pages/CreatePairingPage";
import PairingDetailPage from "./pages/PairingDetailPage";
import ClutchDetailPage from "./pages/ClutchDetailPage";
import NotFound from "./pages/NotFound";

// Heavier pages — lazy-loaded for smaller initial bundle
const GeneticsCalculatorPage = lazy(() => import("./pages/GeneticsCalculatorPage"));
const AIAssistantPage = lazy(() => import("./pages/AIAssistantPage"));
const CareCardPage = lazy(() => import("./pages/CareCardPage"));
const ProfileSharePage = lazy(() => import("./pages/ProfileSharePage"));
const PassportPage = lazy(() => import("./pages/PassportPage"));
const PublicSharePage = lazy(() => import("./pages/PublicSharePage"));
const GrowthPage = lazy(() => import("./pages/GrowthPage"));
const HealthCheckPage = lazy(() => import("./pages/HealthCheckPage"));

const queryClient = new QueryClient();

function AppContent() {
  useCapacitor();

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/" element={<TodayPage />} />
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <BottomNav />
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
