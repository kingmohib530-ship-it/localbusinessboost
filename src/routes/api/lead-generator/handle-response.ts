import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyTwilioRequest } from "@/lib/twilio.server";
import { classifyLeadResponse, syncLeadStatusToMonday } from "@/lib/leadGenerator.server";
import type { Json } from "@/integrations/supabase/types";

const EMPTY_TWIML = new Response(
  `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
  { headers: { "Content-Type": "text/xml" } },
);

const STATUS_BY_CLASSIFICATION: Record<string, string> = {
  interested: "responded",
  asked_question: "responded",
  needs_time: "nurture",
  not_interested: "dead",
  stop: "dead",
  wrong_number: "dead",
};

export const Route = createFileRoute("/api/lead-generator/handle-response")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const rawBody = await request.text();

          const isValid = await verifyTwilioRequest(request, rawBody);
          if (!isValid) {
            console.warn("[lead-generator/handle-response] invalid Twilio signature");
            return new Response("Forbidden", { status: 403 });
          }

          const params = new URLSearchParams(rawBody);
          const from = params.get("From") || "";
          const to = params.get("To") || "";
          const body = params.get("Body") || "";

          const { data: allowed, error: rlErr } = await supabaseAdmin.rpc("check_anon_rate_limit", {
            p_ip_address: from,
            p_route: "lead-generator-handle-response",
            p_max_requests: 20,
            p_window_seconds: 3600,
          });
          if (rlErr || !allowed) {
            return EMPTY_TWIML;
          }

          // Which business's outbound Twilio number received this reply —
          // same lookup pattern as missed-call.ts — scopes the lead search
          // to that business's own leads rather than matching phone alone.
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("twilio_phone_number", to)
            .maybeSingle();
          if (!profile) {
            return EMPTY_TWIML;
          }

          const { data: lead } = await supabaseAdmin
            .from("lead_profiles")
            .select("*")
            .eq("user_id", profile.id)
            .eq("phone", from)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (!lead) {
            return EMPTY_TWIML;
          }

          const anthropicKey = process.env.ANTHROPIC_API_KEY;
          const classification = anthropicKey
            ? await classifyLeadResponse(anthropicKey, body)
            : "asked_question";

          const now = new Date().toISOString();
          const history = Array.isArray(lead.outreach_history) ? [...lead.outreach_history] : [];
          if (history.length > 0) {
            const last = history[history.length - 1] as Record<string, unknown>;
            if (last && last.response === null) {
              last.response = body;
            } else {
              history.push({ channel: "sms", sent_at: now, message: "", response: body });
            }
          } else {
            history.push({ channel: "sms", sent_at: now, message: "", response: body });
          }

          const newStatus: string = STATUS_BY_CLASSIFICATION[classification] || lead.status || "new";

          await supabaseAdmin
            .from("lead_profiles")
            .update({
              outreach_history: history as unknown as Json,
              status: newStatus,
              updated_at: now,
            })
            .eq("id", lead.id);

          if (lead.monday_item_id) {
            await syncLeadStatusToMonday(lead.monday_item_id, newStatus, lead.priority || "warm");
          }

          // No calendar/booking-link integration exists in this codebase —
          // rather than fabricate one, an "interested" reply gets an
          // automatic follow-up SMS asking for availability directly.
          if (classification === "interested") {
            const twilioSid = process.env.TWILIO_ACCOUNT_SID;
            const twilioToken = process.env.TWILIO_AUTH_TOKEN;
            const twilioFrom = process.env.TWILIO_PHONE_NUMBER;
            if (twilioSid && twilioToken && twilioFrom) {
              const followUp = "Great! What day/time works best this week for a quick call?";
              await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                  Authorization: `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
                },
                body: new URLSearchParams({ From: twilioFrom, To: from, Body: followUp }).toString(),
              });
            }
          }

          return EMPTY_TWIML;
        } catch (err) {
          console.error("[lead-generator/handle-response]", err);
          return EMPTY_TWIML;
        }
      },
    },
  },
});
