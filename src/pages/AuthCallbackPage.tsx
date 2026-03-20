import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Completing sign-in…");

  useEffect(() => {
    const run = async () => {
      try {
        setStatus("Finalizing session…");

        // Supabase reads the OAuth PKCE code from the current URL.
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession();

        if (exchangeError) {
          setStatus("Could not finalize sign-in. Checking session…");
        }

        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;

        if (session) {
          setStatus("Sign-in complete.");
          navigate("/", { replace: true });
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
  }, [navigate]);

  return (
    <div className="page-container">
      <div className="page-content page-content-top loading-min-height flex items-center justify-center">
        <div className="animate-pulse text-sm text-muted-foreground">{status}</div>
      </div>
    </div>
  );
}

