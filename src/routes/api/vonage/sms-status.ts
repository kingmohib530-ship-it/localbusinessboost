import { createFileRoute } from "@tanstack/react-router";
import { verifyVonageWebhookSignature } from "@/lib/vonage.server";

/**
 * Vonage's Messages capability requires a Status URL (delivery receipts:
 * delivered/failed/rejected/etc.) alongside the Inbound URL. Nothing in
 * this app currently tracks delivery status against conversation_messages
 * - that would need a new column and is a real feature, not something to
 * add as a side effect of wiring up a required dashboard field. This
 * route exists only to give the console a valid, signature-verified
 * target that safely acknowledges receipts without acting on them.
 */
export const Route = createFileRoute("/api/vonage/sms-status")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const isValid = await verifyVonageWebhookSignature(request, rawBody);
        if (!isValid) {
          console.warn("[sms-status] invalid Vonage signature");
          return new Response("Forbidden", { status: 403 });
        }
        return new Response(null, { status: 200 });
      },
    },
  },
});
