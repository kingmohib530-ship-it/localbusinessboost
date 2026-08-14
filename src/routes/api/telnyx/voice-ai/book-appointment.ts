import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyTelnyxWebhookSignature } from "@/lib/telnyx.server";
import { ESTIMATED_VALUE_MAP, SERVICE_TYPE_KEYS, type ServiceTypeKey } from "@/lib/serviceTypes";

/**
 * PHASE 0 SPIKE - Telnyx AI Assistant webhook tool: `book_appointment`.
 * Only four params are defined on the Tool in the dashboard - all
 * model-supplied, nothing hidden/dynamic-variable-bound. business_user_id
 * and caller_phone come instead from voice_ai_call_context, looked up by
 * the call_control_id Telnyx sends in the x-telnyx-call-control-id
 * request header (confirmed real - see the async-tools docs) - written
 * there by dynamic-variables.ts at call start. This sidesteps the
 * dashboard having no clear way to bind a fixed/templated value into a
 * Body Parameter.
 *
 * Model-supplied body params confirmed flat top-level (not wrapped in an
 * envelope key) against a real call - matches "body parameters ... passed
 * to the webhook as the body of the request" from Telnyx's docs.
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

          // PHASE 0: always log the raw payload and the call-control header -
          // remove once the real shape is confirmed.
          const callControlIdHeader = request.headers.get("x-telnyx-call-control-id");
          console.log(
            "[telnyx/voice-ai/book-appointment] raw payload",
            JSON.stringify(body),
            "x-telnyx-call-control-id:",
            callControlIdHeader,
          );

          const customerName =
            typeof body.customer_name === "string" && body.customer_name.trim()
              ? body.customer_name.trim()
              : "Phone caller";
          const serviceTypeRaw = body.service_type;
          const scheduledAtRaw = typeof body.scheduled_at === "string" ? body.scheduled_at : "";
          const notes = typeof body.notes === "string" ? body.notes : null;

          // Fall back to a call_control_id in the body defensively, in case
          // a sync tool call carries it differently than the documented
          // async-tool header - not confirmed either way yet.
          const callControlId =
            callControlIdHeader ||
            (typeof body.call_control_id === "string" ? body.call_control_id : "");
          if (!callControlId) {
            console.error(
              "[telnyx/voice-ai/book-appointment] no call_control_id in header or body",
            );
            return ACK({ status: "error", message: "Missing call context." }, 400);
          }

          const { data: callContext, error: contextError } = await supabaseAdmin
            .from("voice_ai_call_context")
            .select("business_user_id, caller_phone")
            .eq("call_control_id", callControlId)
            .maybeSingle();

          if (contextError || !callContext) {
            console.error(
              "[telnyx/voice-ai/book-appointment] no call context found for",
              callControlId,
              contextError,
            );
            return ACK({ status: "error", message: "Missing business context." }, 400);
          }

          const businessUserId = callContext.business_user_id;
          const callerPhone = callContext.caller_phone || "";

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
