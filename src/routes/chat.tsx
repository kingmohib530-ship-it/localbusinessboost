import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Bot, CheckCircle2, Loader2, Send } from "lucide-react";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Talk to us — LUNAVX" },
      { name: "description", content: "Tell us about your business and we'll be in touch." },
      { property: "og:title", content: "Talk to us — LUNAVX" },
      { property: "og:description", content: "Tell us about your business and we'll be in touch." },
    ],
  }),
  component: PublicChatPage,
});

type Status = "idle" | "submitting" | "success" | "error";

function PublicChatPage() {
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/public/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          business_name: businessName,
          email,
          phone,
          message,
        }),
      });
      const data = (await res.json()) as { success: boolean; message?: string };
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Submission failed");
      }
      setStatus("success");
      setName("");
      setBusinessName("");
      setEmail("");
      setPhone("");
      setMessage("");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Submission failed");
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <div className="h-14 w-14 rounded-2xl gradient-primary mx-auto flex items-center justify-center mb-4 glow-primary">
            <Bot className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight">
            Tell us about your business
          </h1>
          <p className="mt-3 text-muted-foreground">
            Share a few details and our team will reach out shortly.
          </p>
        </div>

        <Card className="p-6 md:p-8">
          {status === "success" ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4" />
              <h2 className="font-display font-bold text-xl">Thanks — we got it.</h2>
              <p className="text-muted-foreground text-sm mt-2">
                We'll be in touch at the contact details you provided.
              </p>
              <Button
                className="mt-6"
                variant="outline"
                onClick={() => setStatus("idle")}
              >
                Submit another
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Your name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={200}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="business">Business name</Label>
                <Input
                  id="business"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  maxLength={200}
                  className="mt-1.5"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={255}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={50}
                    className="mt-1.5"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="message">How can we help?</Label>
                <Textarea
                  id="message"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={4000}
                  className="mt-1.5"
                />
              </div>

              {errorMsg && (
                <p className="text-sm text-destructive">{errorMsg}</p>
              )}

              <Button
                type="submit"
                disabled={status === "submitting" || !name.trim() || (!email.trim() && !phone.trim())}
                className="w-full"
                size="lg"
              >
                {status === "submitting" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Send <Send className="h-4 w-4" />
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Provide at least an email or phone so we can reply.
              </p>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
