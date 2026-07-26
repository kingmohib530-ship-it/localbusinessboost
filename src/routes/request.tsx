import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/request")({
  head: () => ({ meta: [{ title: "Request a service — Lanavix" }] }),
  component: RequestLanding,
});

function RequestLanding() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background bg-radial-glow px-4">
      <div className="w-full max-w-lg text-center space-y-6">
        <h1 className="text-3xl font-display font-bold tracking-tight">Need a local pro?</h1>
        <p className="text-muted-foreground">
          Tell us what you need and we'll match you with a vetted local business. They review your
          request and reach out once they accept it — no spam, no cold calls.
        </p>
        <Button asChild size="lg">
          <Link to="/request/auth">Get started</Link>
        </Button>
      </div>
    </div>
  );
}
