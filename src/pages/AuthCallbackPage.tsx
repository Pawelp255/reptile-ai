import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState("Completing sign-in…");

  useEffect(() => {
    const run = async () => {
      try {
        setStatus("Finalizing session…");

        // Supabase will parse the current URL (code/state) from the redirect.
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession();

        if (exchangeError) {
          setStatus("Could not finalize sign-in. Checking session…");
        }

        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;

        // Optional: allow callers to specify a post-login redirect.
        const params = new URLSearchParams(location.search);
        const nextRaw = params.get("redirectTo") || params.get("next") || "/";
        const next = nextRaw.startsWith("/") ? nextRaw : "/";

        if (session) {
          setStatus("Sign-in complete.");
          navigate(next, { replace: true });
          return;
        }

        toast.error("Sign-in failed. Please try again.");
        navigate("/auth", { replace: true });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Sign-in failed";
        toast.error(message);
        navigate("/auth", { replace: true });
      }
    };

    run();
  }, [location.search, navigate]);

  return (
    <div className="page-container">
      <div className="page-content page-content-top loading-min-height flex items-center justify-center">
        <div className="animate-pulse text-sm text-muted-foreground">{status}</div>
      </div>
    </div>
  );
}

