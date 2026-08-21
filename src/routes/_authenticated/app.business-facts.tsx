import { createFileRoute, redirect } from "@tanstack/react-router";

// Business Facts is now the Knowledge tab on Receptionist (ReceptionistKnowledge.tsx),
// which has full functional parity with the standalone page this route used to render.
// Kept as a redirect rather than deleted outright so old bookmarks/deep links still land
// somewhere real instead of 404ing.
export const Route = createFileRoute("/_authenticated/app/business-facts")({
  beforeLoad: () => {
    throw redirect({ to: "/app/receptionist" });
  },
});
