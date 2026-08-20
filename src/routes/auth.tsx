import { createFileRoute, useSearch, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: z.object({
    mode: z.enum(["signin", "signup", "forgot"]).optional(),
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

function getPasswordStrength(password: string): { score: number; label: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: "Too weak" };
  if (score === 2) return { score, label: "Weak" };
  if (score === 3) return { score, label: "Fair" };
  if (score === 4) return { score, label: "Strong" };
  return { score, label: "Very strong" };
}

function friendlyError(message: string): string {
  if (message.includes("Invalid login credentials"))
    return "Incorrect email or password. Please try again.";
  if (message.includes("Email not confirmed"))
    return "Please check your email and confirm your account first.";
  if (message.includes("User already registered"))
    return "An account with this email already exists. Try signing in instead.";
  if (message.includes("Password should be at least"))
    return "Password must be at least 8 characters.";
  if (message.includes("rate limit"))
    return "Too many attempts. Please wait a moment and try again.";
  if (message.includes("network"))
    return "Network error. Please check your connection and try again.";
  return message;
}

// Flip to false once Google OAuth is disabled in Supabase (Authentication > Providers)
const GOOGLE_OAUTH_ENABLED = true;

function AuthPage() {
  // /auth/reset-password is registered as a child route of this one (both
  // route files share the "auth." file-name prefix), so it only ever
  // renders if this component defers to it below instead of always
  // rendering its own sign-in/sign-up content. Checked after every hook
  // call (not as an early return above them) so hook order never changes
  // between renders of this same route component.
  const location = useLocation();
  const { mode, redirect } = useSearch({ from: "/auth" });
  const postAuthTarget = redirect && redirect.startsWith("/") ? redirect : "/app";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState<string | null>(null);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(mode === "forgot");
  const [resetEmailSent, setResetEmailSent] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  const emailValid = isValidEmail(email);
  const emailError = emailTouched && email.length > 0 && !emailValid;
  const strength = getPasswordStrength(password);

  const signIn = async () => {
    if (!emailValid) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!password) {
      toast.error("Please enter your password.");
      return;
    }
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
    if (!emailValid) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    setLoading(false);
    if (error) return toast.error(friendlyError(error.message));
    if (data.session) {
      // Not hardcoded to /onboarding: postAuthTarget carries a real
      // checkout deep-link when someone signs up from the pricing page
      // (see pricing.tsx's handleCheckout), and sending them to
      // /onboarding instead would drop that intent. Overview's own
      // beforeLoad already redirects any /app landing to /onboarding
      // when onboarding_completed is false, so the gate still applies
      // universally without this route needing to special-case it.
      toast.success("Account created! Taking you to the dashboard...");
      window.location.href = postAuthTarget;
    } else {
      setSignupSuccess(email.trim());
    }
  };

  const sendPasswordReset = async () => {
    if (!emailValid) {
      toast.error("Please enter a valid email address.");
      return;
    }
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

  if (location.pathname.startsWith("/auth/reset-password")) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <span className="lv-page-title text-foreground">Lanavix</span>
        </Link>

        <div className="rounded-md border border-border bg-card p-6 sm:p-8">
          {resetEmailSent ? (
            <div className="text-center space-y-4">
              <div className="h-10 w-10 rounded-sm bg-accent flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <div>
                <h1 className="lv-section text-foreground mb-1">Check your email</h1>
                <p className="lv-body text-muted-foreground">
                  If an account exists for{" "}
                  <span className="font-medium text-foreground">{resetEmailSent}</span>, we sent a
                  link to reset your password.
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full min-h-[44px]"
                onClick={() => {
                  setResetEmailSent(null);
                  setForgotPasswordMode(false);
                }}
              >
                Back to sign in
              </Button>
            </div>
          ) : forgotPasswordMode ? (
            <div className="space-y-4">
              <div>
                <h1 className="lv-section text-foreground mb-1">Reset your password</h1>
                <p className="lv-body text-muted-foreground">
                  Enter your email and we'll send you a reset link.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="forgot-email">Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setEmailTouched(true)}
                  placeholder="you@company.com"
                  onKeyDown={(e) => e.key === "Enter" && sendPasswordReset()}
                  autoComplete="email"
                  autoFocus
                  className="min-h-[44px]"
                />
              </div>
              <Button
                className="w-full min-h-[44px]"
                disabled={resetLoading}
                onClick={sendPasswordReset}
              >
                {resetLoading ? "Sending..." : "Send reset link"}
              </Button>
              <Button
                variant="ghost"
                className="w-full min-h-[44px]"
                onClick={() => setForgotPasswordMode(false)}
              >
                Back to sign in
              </Button>
            </div>
          ) : signupSuccess ? (
            <div className="text-center space-y-4">
              <div className="h-10 w-10 rounded-sm bg-accent flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <div>
                <h1 className="lv-section text-foreground mb-1">Check your email</h1>
                <p className="lv-body text-muted-foreground">
                  We sent a confirmation link to{" "}
                  <span className="font-medium text-foreground">{signupSuccess}</span>. Click it to
                  activate your account, then come back and sign in.
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full min-h-[44px]"
                onClick={() => setSignupSuccess(null)}
              >
                Back to sign in
              </Button>
            </div>
          ) : (
            <Tabs defaultValue={mode === "signup" ? "signup" : "signin"}>
              <TabsList className="grid grid-cols-2 w-full mb-6">
                <TabsTrigger value="signin" className="min-h-[36px]">
                  Sign in
                </TabsTrigger>
                <TabsTrigger value="signup" className="min-h-[36px]">
                  Create account
                </TabsTrigger>
              </TabsList>

              {(["signin", "signup"] as const).map((tabMode) => (
                <TabsContent key={tabMode} value={tabMode} className="space-y-4">
                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label htmlFor={`${tabMode}-email`}>Email</Label>
                    <div className="relative">
                      <Input
                        id={`${tabMode}-email`}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onBlur={() => setEmailTouched(true)}
                        placeholder="you@company.com"
                        className={cn(
                          "min-h-[44px]",
                          emailError
                            ? "border-destructive pr-9"
                            : email.length > 0 && emailValid
                              ? "pr-9"
                              : "",
                        )}
                        aria-invalid={emailError || undefined}
                        aria-describedby={emailError ? `${tabMode}-email-error` : undefined}
                        onKeyDown={(e) =>
                          e.key === "Enter" && (tabMode === "signin" ? signIn() : signUp())
                        }
                        autoComplete="email"
                      />
                      {email.length > 0 && emailTouched && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {emailValid ? (
                            <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
                          )}
                        </div>
                      )}
                    </div>
                    {emailError && (
                      <p id={`${tabMode}-email-error`} className="lv-meta text-destructive">
                        Please enter a valid email address (e.g. name@company.com)
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor={`${tabMode}-password`}>Password</Label>
                    <div className="relative">
                      <Input
                        id={`${tabMode}-password`}
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setPasswordTouched(true);
                        }}
                        placeholder="••••••••"
                        className="pr-9 min-h-[44px]"
                        onKeyDown={(e) =>
                          e.key === "Enter" && (tabMode === "signin" ? signIn() : signUp())
                        }
                        autoComplete={tabMode === "signin" ? "current-password" : "new-password"}
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

                    {/* Password strength — only on signup */}
                    {tabMode === "signup" && password.length > 0 && passwordTouched && (
                      <div className="pt-1 space-y-1">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div
                              key={i}
                              className={
                                i <= strength.score
                                  ? "h-1 flex-1 rounded-full bg-primary"
                                  : "h-1 flex-1 rounded-full bg-border"
                              }
                            />
                          ))}
                        </div>
                        <p className="lv-meta text-muted-foreground">
                          {strength.label}
                          {password.length < 8 && " · Minimum 8 characters required"}
                        </p>
                      </div>
                    )}
                    {tabMode === "signin" && (
                      <button
                        type="button"
                        onClick={() => setForgotPasswordMode(true)}
                        className="lv-meta text-muted-foreground hover:text-foreground transition-colors duration-150 ease-out"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>

                  <Button
                    className="w-full min-h-[44px]"
                    disabled={loading}
                    onClick={tabMode === "signin" ? signIn : signUp}
                  >
                    {loading
                      ? tabMode === "signin"
                        ? "Signing in..."
                        : "Creating account..."
                      : tabMode === "signin"
                        ? "Sign in"
                        : "Create account"}
                  </Button>

                  {GOOGLE_OAUTH_ENABLED && (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-border" />
                        <span className="lv-meta text-muted-foreground">OR</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>

                      <Button
                        variant="outline"
                        className="w-full min-h-[44px] gap-2.5"
                        onClick={google}
                      >
                        <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
                          <path
                            fill="#FFC107"
                            d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.5 6 29.6 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.2-.1-2.4-.4-3.5z"
                          />
                          <path
                            fill="#FF3D00"
                            d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.5 6 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
                          />
                          <path
                            fill="#4CAF50"
                            d="M24 44c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.4C29.6 35.4 27 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.3 44 24 44z"
                          />
                          <path
                            fill="#1976D2"
                            d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.7l6.6 5.4C41.5 35.8 44 30.3 44 24c0-1.2-.1-2.4-.4-3.5z"
                          />
                        </svg>
                        Continue with Google
                      </Button>
                    </>
                  )}

                  {/* Privacy note on signup */}
                  {tabMode === "signup" && (
                    <div className="rounded-sm border border-border bg-muted/40 px-4 py-3 space-y-1">
                      <p className="lv-label text-foreground">Your data is safe</p>
                      <p className="lv-meta text-muted-foreground">
                        We never sell your information. Your email is only used to manage your
                        Lanavix account and send service notifications. You can delete your account
                        any time.
                      </p>
                      <p className="lv-meta">
                        <Link
                          to="/privacy"
                          className="underline text-muted-foreground hover:text-foreground transition-colors duration-150 ease-out"
                        >
                          Privacy Policy
                        </Link>
                        {" · "}
                        <Link
                          to="/terms"
                          className="underline text-muted-foreground hover:text-foreground transition-colors duration-150 ease-out"
                        >
                          Terms of Service
                        </Link>
                      </p>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>

        <p className="text-center lv-meta text-muted-foreground mt-6">
          By continuing, you agree to Lanavix's{" "}
          <Link
            to="/terms"
            className="underline hover:text-foreground transition-colors duration-150 ease-out"
          >
            terms of service
          </Link>{" "}
          and{" "}
          <Link
            to="/privacy"
            className="underline hover:text-foreground transition-colors duration-150 ease-out"
          >
            privacy policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
