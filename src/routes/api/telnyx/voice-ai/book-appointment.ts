import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyTelnyxWebhookSignature } from "@/lib/telnyx.server";
import { ESTIMATED_VALUE_MAP, SERVICE_TYPE_KEYS, type ServiceTypeKey } from "@/lib/serviceTypes";

/**
 * PHASE 0 SPIKE - not wired to any real call yet. Telnyx AI Assistant
 * webhook tool: `book_appointment`. Two of its parameters
 * (business_user_id, caller_phone) are configured in the dashboard as
 * hidden, dynamic-variable-bound values (never shown to or filled in by
 * the model) - see buildVoiceDynamicVariables. The rest are the fields the
 * model actually gathered from the caller.
 *
 * UNCONFIRMED: whether Telnyx posts these as a flat top-level JSON body
 * (what this assumes, matching the "body parameters ... passed to the
 * webhook as the body of the request" description in Telnyx's docs) or
 * wraps them under an envelope key. Raw body is always logged so the real
 * test call confirms this.
 *
 * appointments.source only allows 'manual' | 'inbound_sms' | 'lead_blast' |
 * 'web_chat' today (checked directly against the live DB constraint) - no
 * 'voice_ai' value exists yet. Widening that is real Phase 1 schema work,
 * deliberately not done in this spike, so this uses 'manual' for now.
 */

const ACK = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function isKnownServiceType(value: unknown): value is ServiceTypeKey {
  return typeof value === "string" && (SERVICE_TYPE_KEYS as readonly string[]).includes(value);
}

export const Route = createFileRoute("/api/telnyx/voice-ai/book-appointment")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const rawBody = await request.text();
          const isValid = await verifyTelnyxWebhookSignature(request, rawBody);
          if (!isValid) {
            console.warn("[telnyx/voice-ai/book-appointment] invalid signature");
            return new Response("Forbidden", { status: 403 });
          }

          let body: Record<string, unknown> = {};
          try {
            body = JSON.parse(rawBody || "{}");
          } catch {
            console.error("[telnyx/voice-ai/book-appointment] non-JSON body", rawBody);
            return ACK({ status: "error", message: "Could not read the request." }, 400);
          }

          // PHASE 0: always log the raw payload - remove once the real
          // shape is confirmed.
          console.log("[telnyx/voice-ai/book-appointment] raw payload", JSON.stringify(body));

          const businessUserId =
            typeof body.business_user_id === "string" ? body.business_user_id : "";
          const callerPhone = typeof body.caller_phone === "string" ? body.caller_phone : "";
          const customerName =
            typeof body.customer_name === "string" && body.customer_name.trim()
              ? body.customer_name.trim()
              : "Phone caller";
          const serviceTypeRaw = body.service_type;
          const scheduledAtRaw = typeof body.scheduled_at === "string" ? body.scheduled_at : "";
          const notes = typeof body.notes === "string" ? body.notes : null;

          if (!businessUserId) {
            console.error("[telnyx/voice-ai/book-appointment] missing business_user_id");
            return ACK({ status: "error", message: "Missing business context." }, 400);
          }

          const scheduledMs = Date.parse(scheduledAtRaw);
          if (isNaN(scheduledMs) || scheduledMs <= Date.now()) {
            return ACK({
              status: "error",
              message:
                "That time isn't valid or is in the past - ask the caller for a specific future day and time.",
            });
          }

          const serviceType: ServiceTypeKey | "other" = isKnownServiceType(serviceTypeRaw)
            ? serviceTypeRaw
            : "other";
          const estimatedValue =
            serviceType !== "other"
              ? ESTIMATED_VALUE_MAP[serviceType]
              : ESTIMATED_VALUE_MAP.default;

          const { data: appointment, error } = await supabaseAdmin
            .from("appointments")
            .insert({
              user_id: businessUserId,
              customer_name: customerName,
              customer_phone: callerPhone || null,
              service_type: serviceType,
              scheduled_at: new Date(scheduledMs).toISOString(),
              status: "confirmed",
              source: "manual",
              estimated_value: estimatedValue,
              notes,
            })
            .select()
            .single();

          if (error) {
            console.error("[telnyx/voice-ai/book-appointment] insert failed", error);
            return ACK({
              status: "error",
              message: "Could not save that appointment - let the caller know you'll follow up.",
            });
          }

          return ACK({
            status: "success",
            appointment_id: appointment.id,
            scheduled_at: appointment.scheduled_at,
            message: `Appointment confirmed for ${customerName}.`,
          });
        } catch (err) {
          console.error("[telnyx/voice-ai/book-appointment]", err);
          return ACK({ status: "error", message: "Something went wrong booking that." }, 500);
        }
      },
    },
  },
});
