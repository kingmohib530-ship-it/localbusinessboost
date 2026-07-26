import { createFileRoute, useSearch, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/request/auth")({
  ssr: false,
  validateSearch: z.object({ mode: z.enum(["signin", "signup"]).optional() }),
  head: () => ({ meta: [{ title: "Sign in — Lanavix" }] }),
  component: ConsumerAuthPage,
});

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

function friendlyError(message: string): string {
  if (message.includes("Invalid login credentials")) return "Incorrect email or password. Please try again.";
  if (message.includes("Email not confirmed")) return "Please check your email and confirm your account first.";
  if (message.includes("User already registered")) return "An account with this email already exists. Try signing in instead.";
  if (message.includes("Password should be at least")) return "Password must be at least 8 characters.";
  if (message.includes("rate limit")) return "Too many attempts. Please wait a moment and try again.";
  return message;
}

function ConsumerAuthPage() {
  const { mode } = useSearch({ from: "/request/auth" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [signupSuccess, setSignupSuccess] = useState<string | null>(null);

  const signIn = async () => {
    if (!isValidEmail(email)) { setError("Please enter a valid email address."); return; }
    if (!password) { setError("Please enter your password."); return; }
    setLoading(true);
    setError("");
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (signInError) { setError(friendlyError(signInError.message)); return; }
    window.location.href = "/request/new";
  };

  const signUp = async () => {
    if (!isValidEmail(email)) { setError("Please enter a valid email address."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    setError("");
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      // account_type is what handle_new_user() branches on to create a
      // consumer_profiles row instead of a business profiles row.
      options: { data: { account_type: "consumer" } },
    });
    setLoading(false);
    if (signUpError) { setError(friendlyError(signUpError.message)); return; }
    if (data.session) {
      window.location.href = "/request/new";
    } else {
      setSignupSuccess(email.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background bg-radial-glow px-4">
      <div className="w-full max-w-md">
        <Link to="/request" className="flex items-center justify-center gap-2 mb-8">
          <span className="text-xl font-display font-bold tracking-tight">Lanavix</span>
        </Link>

        <div className="glass rounded-2xl p-8 shadow-sm">
          {signupSuccess ? (
            <div className="text-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="font-display font-bold text-lg mb-1">Check your email</h2>
                <p className="text-sm text-muted-foreground">
                  We sent a confirmation link to <span className="font-medium text-foreground">{signupSuccess}</span>.
                  Click it to activate your account, then come back and sign in.
                </p>
              </div>
              <Button variant="outline" className="w-full" onClick={() => setSignupSuccess(null)}>
                Back to sign in
              </Button>
            </div>
          ) : (
            <Tabs defaultValue={mode === "signup" ? "signup" : "signin"}>
              <TabsList className="grid grid-cols-2 w-full mb-6">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>

              {(["signin", "signup"] as const).map((tab) => (
                <TabsContent key={tab} value={tab} className="space-y-4">
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      onKeyDown={(e) => e.key === "Enter" && (tab === "signin" ? signIn() : signUp())}
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      onKeyDown={(e) => e.key === "Enter" && (tab === "signin" ? signIn() : signUp())}
                      autoComplete={tab === "signin" ? "current-password" : "new-password"}
                    />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button className="w-full" disabled={loading} onClick={tab === "signin" ? signIn : signUp}>
                    {loading ? "Working…" : tab === "signin" ? "Sign in" : "Create account"}
                  </Button>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Are you a business?{" "}
          <Link to="/auth" className="underline hover:text-foreground transition-colors">Sign in here</Link>.
        </p>
      </div>
    </div>
  );
}
