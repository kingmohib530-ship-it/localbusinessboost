import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles, Eye, EyeOff, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/auth/reset-password")({
  ssr: false,
  head: () => ({ meta: [{ title: "Reset password — Lanavix" }] }),
  component: ResetPasswordPage,
});

function friendlyError(message: string): string {
  if (message.includes("Password should be at least")) return "Password must be at least 8 characters.";
  if (message.includes("session")) return "This reset link has expired or already been used. Please request a new one.";
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
    if (password.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    if (password !== confirmPassword) { toast.error("Passwords don't match."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(friendlyError(error.message));
    setDone(true);
    toast.success("Password updated!");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background bg-radial-glow px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="h-9 w-9 rounded-lg gradient-primary flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-display font-bold tracking-tight">Lanavix</span>
        </Link>

        <div className="glass rounded-2xl p-8 shadow-sm">
          {done ? (
            <div className="text-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="font-display font-bold text-lg mb-1">Password updated</h2>
                <p className="text-sm text-muted-foreground">You can now sign in with your new password.</p>
              </div>
              <Button className="w-full" onClick={() => navigate({ to: "/auth" })}>
                Go to sign in
              </Button>
            </div>
          ) : !ready ? (
            <div className="text-center space-y-3">
              <h2 className="font-display font-bold text-lg">Verifying your link…</h2>
              <p className="text-sm text-muted-foreground">
                If this doesn't update in a few seconds, your reset link may have expired.{" "}
                <Link to="/auth" className="underline hover:text-foreground transition-colors">Request a new one</Link>.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="font-display font-bold text-lg mb-1">Set a new password</h2>
                <p className="text-sm text-muted-foreground">Choose a new password for your account.</p>
              </div>
              <div className="space-y-1">
                <Label>New password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Confirm new password</Label>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
              <Button className="w-full" disabled={loading} onClick={submit}>
                {loading ? "Updating…" : "Update password"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
