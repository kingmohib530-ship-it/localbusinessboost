import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyTelnyxWebhookSignature } from "@/lib/telnyx.server";
import { loadBusinessContext, buildVoiceDynamicVariables } from "@/lib/aiReceptionist.server";

/**
 * PHASE 0 SPIKE - not wired to any real call yet. See the Voice AI
 * investigation for context: this is Telnyx's "dynamic variables" webhook,
 * fired once at the start of a call handled by an AI Assistant, to resolve
 * {{placeholder}}s in the Assistant's static Instructions template. Telnyx
 * enforces a hard 1-second response budget - if this is slow or errors,
 * the call proceeds with fallback values instead of failing, so every
 * branch below returns *something* rather than ever letting the request
 * hang or throw.
 *
 * UNCONFIRMED (this is the actual point of the spike): the exact request
 * body shape. Telnyx's own docs describe the built-in variables available
 * (telnyx_agent_target = the called number, telnyx_end_user_target = the
 * caller's number, call_control_id) but not the literal JSON envelope this
 * webhook receives them in. Every plausible field path is tried below and
 * the full raw body is always logged so the first real test call tells us
 * definitively what to keep and what to delete.
 */

const ACK_FALLBACK = () =>
  new Response(JSON.stringify({ dynamic_variables: FALLBACK_VARIABLES }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

// Used when the webhook fails closed for any reason (bad signature, no
// matching business, DB error) - the call must still get *some* Instructions
// content rather than an empty/broken template.
const FALLBACK_VARIABLES: Record<string, string> = {
  business_user_id: "",
  caller_phone: "",
  business_name: "our business",
  service: "our services",
  business_hours: "not specified - never make up hours, offer to have someone confirm",
  escalation_rules: "none configured - use your own judgment on what needs a human callback",
  known_facts: "none confirmed yet - never invent a price or promise a specific time",
};

/** Best-effort extraction across the field names/paths that are plausible
 * given Telnyx's documented variable names, since the literal envelope
 * isn't confirmed yet. Returns the first non-empty match. */
function pickString(body: Record<string, unknown>, paths: string[][]): string {
  for (const path of paths) {
    let value: unknown = body;
    for (const key of path) {
      if (value && typeof value === "object") value = (value as Record<string, unknown>)[key];
      else {
        value = undefined;
        break;
      }
    }
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export const Route = createFileRoute("/api/telnyx/voice-ai/dynamic-variables")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const rawBody = await request.text();
          const isValid = await verifyTelnyxWebhookSignature(request, rawBody);
          if (!isValid) {
            console.warn("[telnyx/voice-ai/dynamic-variables] invalid signature");
            return ACK_FALLBACK();
          }

          let body: Record<string, unknown> = {};
          try {
            body = JSON.parse(rawBody || "{}");
          } catch {
            console.error("[telnyx/voice-ai/dynamic-variables] non-JSON body", rawBody);
            return ACK_FALLBACK();
          }

          // PHASE 0: always log the raw payload - this is the actual
          // deliverable of the spike's dynamic-variables half. Remove once
          // the real shape is confirmed and the extraction paths below are
          // pruned to just the ones that hit.
          console.log("[telnyx/voice-ai/dynamic-variables] raw payload", JSON.stringify(body));

          const calledNumber = pickString(body, [
            ["telnyx_agent_target"],
            ["agent_target"],
            ["to"],
            ["data", "payload", "to"],
            ["params", "telnyx_agent_target"],
            ["params", "_meta", "telnyx_agent_target"],
          ]);
          const callerPhone = pickString(body, [
            ["telnyx_end_user_target"],
            ["end_user_target"],
            ["from"],
            ["data", "payload", "from"],
            ["params", "telnyx_end_user_target"],
            ["params", "_meta", "telnyx_end_user_target"],
          ]);

          if (!calledNumber) {
            console.warn(
              "[telnyx/voice-ai/dynamic-variables] could not find a called number in the payload",
            );
            return ACK_FALLBACK();
          }

          // Single consolidated query rather than the SMS path's
          // findBusinessByTelnyxNumber() + separate profile fetch - this
          // webhook has a hard 1s budget, so it can't afford two round
          // trips where one will do.
          const { data: profile, error } = await supabaseAdmin
            .from("profiles")
            .select("id, business_name, industry, business_hours, escalation_rules")
            .eq("telnyx_number", calledNumber)
            .maybeSingle();

          if (error) {
            console.error("[telnyx/voice-ai/dynamic-variables] profile lookup failed", error);
            return ACK_FALLBACK();
          }
          if (!profile) {
            console.warn("[telnyx/voice-ai/dynamic-variables] no business found for", calledNumber);
            // Fire-and-forget: logging an unmatched number must never eat
            // into the 1s budget on the path that's already returning a
            // fallback regardless of whether this insert succeeds.
            supabaseAdmin
              .from("unmatched_telnyx_webhooks")
              .insert({
                route: "voice-ai-dynamic-variables",
                to_number: calledNumber,
                from_number: callerPhone,
              })
              .then(
                () => {},
                () => {},
              );
            return ACK_FALLBACK();
          }

          const context = await loadBusinessContext(profile.id, profile);
          const variables = buildVoiceDynamicVariables(context, profile.id, callerPhone);

          return new Response(JSON.stringify({ dynamic_variables: variables }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          console.error("[telnyx/voice-ai/dynamic-variables]", err);
          return ACK_FALLBACK();
        }
      },
    },
  },
});
