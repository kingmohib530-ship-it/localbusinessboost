import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/auth/reset-password")({
  ssr: false,
  head: () => ({ meta: [{ title: "Reset password — Lanavix" }] }),
  component: ResetPasswordPage,
});

function friendlyError(message: string): string {
  if (message.includes("Password should be at least"))
    return "Password must be at least 8 characters.";
  if (message.includes("session"))
    return "This reset link has expired or already been used. Please request a new one.";
  return message;
}

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // The recovery link's #access_token is parsed automatically by the
    // Supabase client (detectSessionInUrl), which fires PASSWORD_RECOVERY.
    // We only allow setting a new password once that recovery session exists.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async () => {
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords don't match.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(friendlyError(error.message));
    setDone(true);
    toast.success("Password updated!");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <span className="lv-page-title text-foreground">Lanavix</span>
        </Link>

        <div className="rounded-md border border-border bg-card p-6 sm:p-8">
          {done ? (
            <div className="text-center space-y-4">
              <div className="h-10 w-10 rounded-sm bg-accent flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <div>
                <h1 className="lv-section text-foreground mb-1">Password updated</h1>
                <p className="lv-body text-muted-foreground">
                  You can now sign in with your new password.
                </p>
              </div>
              <Button className="w-full min-h-[44px]" onClick={() => navigate({ to: "/auth" })}>
                Go to sign in
              </Button>
            </div>
          ) : !ready ? (
            <div className="text-center space-y-3">
              <h1 className="lv-section text-foreground">Verifying your link…</h1>
              <p className="lv-body text-muted-foreground">
                If this doesn't update in a few seconds, your reset link may have expired.{" "}
                <Link
                  to="/auth"
                  search={{ mode: "forgot" }}
                  className="underline text-foreground hover:text-muted-foreground transition-colors duration-150 ease-out"
                >
                  Request a new one
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h1 className="lv-section text-foreground mb-1">Set a new password</h1>
                <p className="lv-body text-muted-foreground">
                  Choose a new password for your account.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pr-9 min-h-[44px]"
                    autoComplete="new-password"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-150 ease-out"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="min-h-[44px]"
                />
              </div>
              <Button className="w-full min-h-[44px]" disabled={loading} onClick={submit}>
                {loading ? "Updating…" : "Update password"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
