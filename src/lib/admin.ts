import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const ADMIN_EMAILS = ["kingmohib530@gmail.com", "mohibanwari111@gmail.com"];

/**
 * Redirects non-admins to /app. Returns true once the current user has been
 * confirmed as an admin (false/pending otherwise — callers should render
 * nothing until this flips true, same as app.admin.tsx's existing pattern).
 */
export function useRequireAdmin(): boolean {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return;
      if (!user || !ADMIN_EMAILS.includes(user.email ?? "")) {
        navigate({ to: "/app", replace: true });
        return;
      }
      setAllowed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return allowed;
}
