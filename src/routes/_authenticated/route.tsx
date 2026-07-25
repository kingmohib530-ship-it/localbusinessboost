import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Use getSession() rather than getUser(): it reads the persisted session
    // from storage (transparently refreshing the access token if needed)
    // instead of making a live network round-trip on every navigation. That
    // network call being flaky or slow was forcing users back to /auth even
    // though their refresh token was still perfectly valid.
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) throw redirect({ to: "/auth" });
    return { user: data.session.user };
  },
  component: () => <Outlet />,
});
