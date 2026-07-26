import { createFileRoute } from "@tanstack/react-router";

// Placeholder so the /_consumerAuthenticated guard has a path-contributing
// child (a pathless layout with none collapses to "/" and collides with
// index.tsx). The real request form replaces this.
export const Route = createFileRoute("/_consumerAuthenticated/request/new")({
  component: () => <div className="p-8">Coming soon.</div>,
});
