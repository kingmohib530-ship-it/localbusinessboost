import { createFileRoute } from "@tanstack/react-router";
import { verifyVonageWebhookSignature } from "@/lib/vonage.server";

/**
 * Vonage's Application setup requires an Event URL alongside Answer URL,
 * even though the missed-call-text-back logic doesn't need it - that
 * logic fires entirely off answer_url (see voice-answer.ts's comment on
 * why: a call reaching a Lanavix-owned number already means the real
 * phone missed it, so there's no separate terminal CallStatus to wait
 * for). This route exists only to give the console a valid, signature-
 * verified target that safely acknowledges call-state events (ringing,
 * answered, completed, etc.) without acting on them.
 */
export const Route = createFileRoute("/api/vonage/voice-event")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const isValid = await verifyVonageWebhookSignature(request, rawBody);
        if (!isValid) {
          console.warn("[voice-event] invalid Vonage signature");
          return new Response("Forbidden", { status: 403 });
        }
        return new Response(null, { status: 200 });
      },
    },
  },
});
