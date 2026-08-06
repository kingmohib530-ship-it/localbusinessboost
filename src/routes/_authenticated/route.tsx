import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  // With ssr:false, beforeLoad doesn't run on the server - the server
  // renders this pendingComponent as a fallback instead while the client
  // runs beforeLoad and decides whether to show the dashboard or redirect
  // to /auth. Without an explicit one here, the router falls back to a
  // default that doesn't render identically on server vs. client for this
  // route, which was throwing a real hydration-mismatch error on every
  // unauthenticated visit to any /app/* page. Returning the same fixed
  // `null` on both sides removes the mismatch.
  pendingComponent: () => null,
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
