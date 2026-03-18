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

        // Supabase will parse the current URL (code/state) when no args are provided.
        const { error } = await supabase.auth.exchangeCodeForSession();

        if (error) {
          // If there's nothing to exchange (or exchange failed), still try to read session.
          await supabase.auth.getSession();
        }

        // Optional: allow callers to specify a post-login redirect.
        const params = new URLSearchParams(location.search);
        const next = params.get("redirectTo") || params.get("next") || "/";

        navigate(next, { replace: true });
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

