import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_consumerAuthenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Same getSession() (not getUser()) pattern as the business auth guard
    // (_authenticated/route.tsx) - reads the persisted session and
    // silently refreshes the token instead of a live network round-trip
    // that can bounce a signed-in user on transient network flakiness.
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) throw redirect({ to: "/request/auth" });
    return { user: data.session.user };
  },
  component: () => <Outlet />,
});
