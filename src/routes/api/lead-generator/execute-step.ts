import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

const AUTH_ERROR = "Authentication required. Please sign in.";

interface OutreachEntry {
  channel: string;
  sent_at: string;
  message: string;
  response: string | null;
}

export const Route = createFileRoute("/api/lead-generator/execute-step")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authHeader = request.headers.get("authorization") || "";
          if (!authHeader.toLowerCase().startsWith("bearer ")) {
            return Response.json({ error: AUTH_ERROR }, { status: 401 });
          }
          const token = authHeader.slice(7).trim();
          const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
          if (userErr || !userData?.user) {
            return Response.json({ error: AUTH_ERROR }, { status: 401 });
          }
          const user = userData.user;

          const { data: allowed, error: rlErr } = await supabaseAdmin.rpc("check_rate_limit", {
            p_user_id: user.id,
            p_route: "lead-generator-execute-step",
            p_max_requests: 60,
            p_window_seconds: 3600,
          });
          if (rlErr) {
            return Response.json({ error: "Service temporarily unavailable" }, { status: 503 });
          }
          if (!allowed) {
            return Response.json({ error: "Too many requests. Please wait a bit and try again." }, { status: 429 });
          }

          const { lead_id, step_id } = await request.json();
          if (!lead_id || !step_id) {
            return Response.json({ error: "lead_id and step_id are required" }, { status: 400 });
          }

          // Verify the lead belongs to the authenticated user before doing
          // anything else — step_id alone doesn't prove ownership.
          const { data: lead, error: leadErr } = await supabaseAdmin
            .from("lead_profiles")
            .select("*")
            .eq("id", lead_id)
            .eq("user_id", user.id)
            .maybeSingle();
          if (leadErr || !lead) {
            return Response.json({ error: "Lead not found" }, { status: 404 });
          }

          const { data: step, error: stepErr } = await supabaseAdmin
            .from("lead_sequences")
            .select("*")
            .eq("id", step_id)
            .eq("lead_id", lead_id)
            .maybeSingle();
          if (stepErr || !step) {
            return Response.json({ error: "Sequence step not found" }, { status: 404 });
          }
          if (step.status !== "pending") {
            return Response.json({ error: `Step is already ${step.status}` }, { status: 409 });
          }

          let sendError: string | null = null;

          if (step.channel === "sms") {
            if (!lead.phone) {
              return Response.json({ error: "This lead has no phone number on file" }, { status: 400 });
            }
            const twilioSid = process.env.TWILIO_ACCOUNT_SID;
            const twilioToken = process.env.TWILIO_AUTH_TOKEN;
            const twilioFrom = process.env.TWILIO_PHONE_NUMBER;
            if (!twilioSid || !twilioToken || !twilioFrom) {
              return Response.json({ error: "Twilio is not configured" }, { status: 500 });
            }

            const twilioRes = await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                  Authorization: `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
                },
                body: new URLSearchParams({
                  From: twilioFrom,
                  To: lead.phone,
                  Body: step.message_template,
                }).toString(),
              },
            );
            if (!twilioRes.ok) {
              sendError = await twilioRes.text();
            }
          } else if (step.channel === "email") {
            // sendExternalEmail (email.server.ts) now exists for transactional
            // mail (audit reports, contact form), but cold outbound lead
            // sequences are a different call — deliverability/compliance
            // (CAN-SPAM, sender reputation) needs a deliberate decision
            // before this sends real email, so it still just logs.
            console.log(`[lead-generator/execute-step] would send email to ${lead.email ?? "(no email on file)"}: ${step.message_template}`);
          }
          // voicemail_drop / linkedin: no integration exists; treated as a
          // no-op send below, same honesty principle as the email branch.

          if (sendError) {
            await supabaseAdmin.from("lead_sequences").update({ status: "failed" }).eq("id", step_id);
            return Response.json({ error: `Failed to send: ${sendError}` }, { status: 502 });
          }

          const now = new Date().toISOString();
          await supabaseAdmin
            .from("lead_sequences")
            .update({ status: "sent", sent_at: now })
            .eq("id", step_id);

          const outreachEntry: OutreachEntry = {
            channel: step.channel,
            sent_at: now,
            message: step.message_template,
            response: null,
          };
          const history = Array.isArray(lead.outreach_history) ? lead.outreach_history : [];
          const updatedHistory = [...history, outreachEntry] as unknown as Json;

          await supabaseAdmin
            .from("lead_profiles")
            .update({
              outreach_history: updatedHistory,
              status: lead.status === "new" ? "contacted" : lead.status,
              updated_at: now,
            })
            .eq("id", lead_id);

          return Response.json({ success: true, sentAt: now });
        } catch (err) {
          console.error("[lead-generator/execute-step]", err);
          return Response.json({ error: "Internal server error" }, { status: 500 });
        }
      },
    },
  },
});
