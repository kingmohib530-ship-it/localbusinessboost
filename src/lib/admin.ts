import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Redirects non-admins to /app. Returns true once the current session has
 * been confirmed as an admin via profiles.is_admin (false/pending
 * otherwise — callers should render nothing until this flips true, same as
 * app.admin.tsx's existing pattern). This is a UI-only convenience guard,
 * not a security boundary — every real admin route re-checks is_admin
 * server-side (see admin-auth.server.ts / require-admin.ts). Re-runs on
 * every auth-state change so a stale session can't keep showing admin UI
 * after sign-out.
 */
export function useRequireAdmin(): boolean {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setAllowed(false);
        navigate({ to: "/app", replace: true });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;

      if (!profile?.is_admin) {
        setAllowed(false);
        navigate({ to: "/app", replace: true });
        return;
      }
      setAllowed(true);
    }

    check();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      check();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [navigate]);

  return allowed;
}
