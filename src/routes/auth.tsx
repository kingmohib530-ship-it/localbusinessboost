import { createFileRoute, useSearch, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Sparkles, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: z.object({
    mode: z.enum(["signin", "signup"]).optional(),
    // Where to send the user after a successful sign-in/sign-up — e.g. back
    // to /checkout/start?plan=solo when they hit a paid plan while signed out.
    redirect: z.string().optional(),
  }),
  head: () => ({ meta: [{ title: "Sign in — Lanavix" }] }),
  component: AuthPage,
});

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: "Too weak", color: "#ef4444" };
  if (score === 2) return { score, label: "Weak", color: "#f97316" };
  if (score === 3) return { score, label: "Fair", color: "#eab308" };
  if (score === 4) return { score, label: "Strong", color: "#1F6F54" };
  return { score, label: "Very strong", color: "#2F8A6A" };
}

function friendlyError(message: string): string {
  if (message.includes("Invalid login credentials")) return "Incorrect email or password. Please try again.";
  if (message.includes("Email not confirmed")) return "Please check your email and confirm your account first.";
  if (message.includes("User already registered")) return "An account with this email already exists. Try signing in instead.";
  if (message.includes("Password should be at least")) return "Password must be at least 8 characters.";
  if (message.includes("rate limit")) return "Too many attempts. Please wait a moment and try again.";
  if (message.includes("network")) return "Network error. Please check your connection and try again.";
  return message;
}

// Flip to true once Google OAuth is enabled in Supabase (Authentication > Providers)
const GOOGLE_OAUTH_ENABLED = true;

function AuthPage() {
  const { mode, redirect } = useSearch({ from: "/auth" });
  const postAuthTarget = redirect && redirect.startsWith("/") ? redirect : "/app";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState<string | null>(null);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  const emailValid = isValidEmail(email);
  const emailError = emailTouched && email.length > 0 && !emailValid;
  const strength = getPasswordStrength(password);

  const signIn = async () => {
    if (!emailValid) { toast.error("Please enter a valid email address."); return; }
    if (!password) { toast.error("Please enter your password."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) return toast.error(friendlyError(error.message));
    toast.success("Welcome back!");
    // postAuthTarget may carry a query string (e.g. /checkout/start?plan=solo)
    // which doesn't fit navigate()'s typed {to, search} shape, so use a plain
    // browser navigation here instead.
    window.location.href = postAuthTarget;
  };

  const signUp = async () => {
    if (!emailValid) { toast.error("Please enter a valid email address."); return; }
    if (password.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    setLoading(false);
    if (error) return toast.error(friendlyError(error.message));
    if (data.session) {
      toast.success("Account created! Taking you to the dashboard...");
      window.location.href = postAuthTarget;
    } else {
      setSignupSuccess(email.trim());
    }
  };

  const sendPasswordReset = async () => {
    if (!emailValid) { toast.error("Please enter a valid email address."); return; }
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setResetLoading(false);
    if (error) return toast.error(friendlyError(error.message));
    setResetEmailSent(email.trim());
  };

  const google = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${postAuthTarget}` },
    });
    if (error) toast.error(friendlyError(error.message));
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
          {resetEmailSent ? (
            <div className="text-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="font-display font-bold text-lg mb-1">Check your email</h2>
                <p className="text-sm text-muted-foreground">
                  If an account exists for <span className="font-medium text-foreground">{resetEmailSent}</span>, we sent a link to reset your password.
                </p>
              </div>
              <Button variant="outline" className="w-full" onClick={() => { setResetEmailSent(null); setForgotPasswordMode(false); }}>
                Back to sign in
              </Button>
            </div>
          ) : forgotPasswordMode ? (
            <div className="space-y-4">
              <div>
                <h2 className="font-display font-bold text-lg mb-1">Reset your password</h2>
                <p className="text-sm text-muted-foreground">Enter your email and we'll send you a reset link.</p>
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setEmailTouched(true)}
                  placeholder="you@company.com"
                  onKeyDown={(e) => e.key === "Enter" && sendPasswordReset()}
                  autoComplete="email"
                />
              </div>
              <Button className="w-full" disabled={resetLoading} onClick={sendPasswordReset}>
                {resetLoading ? "Sending…" : "Send reset link"}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setForgotPasswordMode(false)}>
                Back to sign in
              </Button>
            </div>
          ) : signupSuccess ? (
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

            {(["signin", "signup"] as const).map((mode) => (
              <TabsContent key={mode} value={mode} className="space-y-4">

                {/* Email */}
                <div className="space-y-1">
                  <Label>Email</Label>
                  <div className="relative">
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => setEmailTouched(true)}
                      placeholder="you@company.com"
                      className={emailError ? "border-red-500 pr-10" : email.length > 0 && emailValid ? "border-green-500 pr-10" : ""}
                      onKeyDown={(e) => e.key === "Enter" && (mode === "signin" ? signIn() : signUp())}
                      autoComplete="email"
                    />
                    {email.length > 0 && emailTouched && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {emailValid
                          ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                          : <XCircle className="h-4 w-4 text-red-500" />
                        }
                      </div>
                    )}
                  </div>
                  {emailError && (
                    <p className="text-xs text-red-500 mt-1">Please enter a valid email address (e.g. name@company.com)</p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <Label>Password</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setPasswordTouched(true); }}
                      placeholder="••••••••"
                      className="pr-10"
                      onKeyDown={(e) => e.key === "Enter" && (mode === "signin" ? signIn() : signUp())}
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Password strength — only on signup */}
                  {mode === "signup" && password.length > 0 && passwordTouched && (
                    <div className="mt-2 space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div
                            key={i}
                            className="h-1 flex-1 rounded-full transition-all"
                            style={{ background: i <= strength.score ? strength.color : "var(--border)" }}
                          />
                        ))}
                      </div>
                      <p className="text-xs" style={{ color: strength.color }}>{strength.label}</p>
                      {password.length < 8 && (
                        <p className="text-xs text-muted-foreground">Minimum 8 characters required</p>
                      )}
                    </div>
                  )}
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => setForgotPasswordMode(true)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>

                <Button
                  className="w-full"
                  disabled={loading}
                  onClick={mode === "signin" ? signIn : signUp}
                >
                  {loading ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
                </Button>

                {GOOGLE_OAUTH_ENABLED && (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground">OR</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    <Button variant="outline" className="w-full gap-2.5" onClick={google}>
                      <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
                        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.5 6 29.6 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.2-.1-2.4-.4-3.5z"/>
                        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.5 6 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                        <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.4C29.6 35.4 27 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.3 44 24 44z"/>
                        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.7l6.6 5.4C41.5 35.8 44 30.3 44 24c0-1.2-.1-2.4-.4-3.5z"/>
                      </svg>
                      Continue with Google
                    </Button>
                  </>
                )}

                {/* Privacy note on signup */}
                {mode === "signup" && (
                  <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground space-y-1">
                    <p className="font-semibold text-foreground/80">🔒 Your data is safe</p>
                    <p>We never sell your information. Your email is only used to manage your Lanavix account and send service notifications. You can delete your account any time.</p>
                    <p>
                      <Link to="/privacy" className="underline hover:text-foreground transition-colors">Privacy Policy</Link>
                      {" · "}
                      <Link to="/terms" className="underline hover:text-foreground transition-colors">Terms of Service</Link>
                    </p>
                  </div>
                )}

              </TabsContent>
            ))}
          </Tabs>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing, you agree to Lanavix's{" "}
          <Link to="/terms" className="underline hover:text-foreground transition-colors">terms of service</Link>
          {" "}and{" "}
          <Link to="/privacy" className="underline hover:text-foreground transition-colors">privacy policy</Link>.
        </p>
      </div>
    </div>
  );
}
