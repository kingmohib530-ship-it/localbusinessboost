import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Sparkles, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
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
  if (score === 4) return { score, label: "Strong", color: "#22c55e" };
  return { score, label: "Very strong", color: "#10b981" };
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

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

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
    navigate({ to: "/app" });
  };

  const signUp = async () => {
    if (!emailValid) { toast.error("Please enter a valid email address."); return; }
    if (password.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    setLoading(false);
    if (error) return toast.error(friendlyError(error.message));
    if (data.user) {
      toast.success("Account created! Taking you to the dashboard...");
      navigate({ to: "/app" });
    }
  };

  const google = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/app` },
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

        <div className="glass rounded-2xl p-8 shadow-2xl">
          <Tabs defaultValue="signin">
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
                </div>

                <Button
                  className="w-full"
                  disabled={loading}
                  onClick={mode === "signin" ? signIn : signUp}
                >
                  {loading ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
                </Button>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">OR</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <Button variant="outline" className="w-full" onClick={google}>
                  Continue with Google
                </Button>

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
