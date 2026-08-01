import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2 } from "lucide-react";
import { SERVICE_TYPE_KEYS, SERVICE_TYPE_LABELS, type ServiceTypeKey } from "@/lib/serviceTypes";

export const Route = createFileRoute("/_consumerAuthenticated/request/new")({
  component: NewRequestPage,
});

function NewRequestPage() {
  const [serviceType, setServiceType] = useState<ServiceTypeKey | "">("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ matchCount: number } | null>(null);

  useEffect(() => {
    supabase
      .from("consumer_profiles")
      .select("city")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.city) setCity(data.city);
      });
  }, []);

  const submit = async () => {
    if (!serviceType) {
      setError("Pick a service type.");
      return;
    }
    if (!city.trim()) {
      setError("Enter your city.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Please sign in again and retry.");

      const res = await fetch("/api/consumer-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          serviceType,
          city: city.trim(),
          description: description.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't submit your request. Please try again.");
      setResult({ matchCount: data.matchCount });
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background bg-radial-glow px-4">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg mb-1">Request sent</h2>
            <p className="text-sm text-muted-foreground">
              {result.matchCount > 0
                ? `We matched you with ${result.matchCount} local business${result.matchCount === 1 ? "" : "es"}. We'll notify you as soon as one accepts.`
                : "We don't have a matching business in your area yet — we're adding more every week. We'll keep this request on file."}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setResult(null);
              setServiceType("");
              setDescription("");
            }}
          >
            Submit another request
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background bg-radial-glow px-4 py-12">
      <div className="w-full max-w-md">
        <div className="glass rounded-2xl p-8 shadow-sm space-y-4">
          <div>
            <h1 className="font-display font-bold text-lg mb-1">What do you need?</h1>
            <p className="text-sm text-muted-foreground">
              We'll match you with a vetted local business. They review your request and reach out
              once they accept it.
            </p>
          </div>

          <div className="space-y-1">
            <Label>Service type</Label>
            <Select value={serviceType} onValueChange={(v) => setServiceType(v as ServiceTypeKey)}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a service" />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_TYPE_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {SERVICE_TYPE_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>City</Label>
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Austin, TX"
            />
          </div>

          <div className="space-y-1">
            <Label>Details (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Anything the business should know — what's going on, when you need it, etc."
              rows={4}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button className="w-full" disabled={submitting} onClick={submit}>
            {submitting ? "Sending…" : "Send request"}
          </Button>
        </div>
      </div>
    </div>
  );
}
