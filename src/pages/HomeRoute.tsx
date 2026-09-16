import { lazy } from "react";
import { Navigate } from "react-router-dom";
import { isInstalledAppExperience } from "@/lib/native/appExperience";

const LandingPage = lazy(() => import("@/pages/LandingPage"));

/**
 * Marketing homepage for the public web origin.
 * Capacitor and installed PWAs keep using /today (PWA start_url).
 */
export function HomeRoute() {
  if (isInstalledAppExperience()) {
    return <Navigate to="/today" replace />;
  }
  return <LandingPage />;
}
