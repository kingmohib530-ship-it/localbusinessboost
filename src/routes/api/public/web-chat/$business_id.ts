import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { checkWebChatQuota, checkWebChatHourlyRateLimit } from "@/lib/planLimits.server";
import {
  loadBusinessContext,
  buildReceptionistSystemPrompt,
  generateReceptionistReply,
  detectBooking,
  deriveUrgency,
} from "@/lib/aiReceptionist.server";
import { ESTIMATED_VALUE_MAP, type ServiceTypeKey } from "@/lib/serviceTypes";

// Embeddable on any contractor's own website, so this has to be reachable
// cross-origin from wherever they host it - same reasoning the old (now
// removed) chatbot config endpoint used.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Whatever actually went wrong server-side (a bad embed snippet, a lapsed
// subscription, a database hiccup), the anonymous visitor on the other end
// gets the same generic line - they have no use for "Invalid business_id"
// or a plan-upgrade message meant for the contractor. Real detail still
// goes to console.error for us, and to the business's own activity feed
// when we know which business it is.
const WIDGET_GENERIC_ERROR = "Sorry, something went wrong. Please try again in a moment.";

/**
 * Best-effort note in the business's own activity feed so a lapsed plan or
 * broken embed doesn't fail silently from their side - they'd otherwise
 * have no way to know their website's chat widget stopped responding.
 * Never lets a failure here affect the reply already sent to the visitor.
 */
async function notifyBusinessWidgetIssue(businessId: string, reason: string) {
  try {
    await supabaseAdmin.from("activity_log").insert({
      user_id: businessId,
      type: "web_chat_widget_issue",
      summary: `Your website chat widget couldn't reply to a visitor: ${reason}`,
    });
  } catch (err) {
    console.error("[web-chat] failed to log widget issue", err);
  }
}

// A real browser loading the widget script on the contractor's own site
// always sends Origin on this cross-origin POST. A non-browser client
// hitting the endpoint directly (curl, a scraper, another business's
// script pointed at someone else's business_id) either omits it or sends
// something that doesn't match the confirmed website on file. Soft check,
// not a hard identity boundary - profiles.website is user-supplied and
// Origin is spoofable by anything that isn't a real browser - but it costs
// nothing and filters out the least sophisticated abuse. Only enforced
// when the business has actually confirmed a website; nothing to compare
// against otherwise.
function originMismatchesConfirmedWebsite(request: Request, website: string | null): boolean {
  if (!website) return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const originHost = new URL(origin).hostname.replace(/^www\./, "");
    const websiteHost = new URL(website).hostname.replace(/^www\./, "");
    return originHost !== websiteHost;
  } catch {
    return true;
  }
}

// Bounds both the prompt size sent to Anthropic and the plain cost of a
// single abusive message.
const MAX_MESSAGE_LENGTH = 1000;
const MAX_SESSION_ID_LENGTH = 200;

export const Route = createFileRoute("/api/public/web-chat/$business_id")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      // Lets the widget show a personalized greeting the moment it opens,
      // before the visitor types anything - same proactive-greeting
      // behavior missed-call.ts already gives SMS. business_name and
      // greeting_message are already shown publicly on the business's own
      // site, so nothing sensitive is exposed here. Not plan-gated: if a
      // subscription lapses, the widget should still open, and POST already
      // returns a clear "subscribe to continue" message instead of silently
      // hiding the whole widget.
      GET: async ({ params }) => {
        try {
          const businessId = params.business_id;
          if (!businessId || !UUID_RE.test(businessId)) {
            console.error("[web-chat GET] invalid business_id in embed", businessId);
            return Response.json({ error: WIDGET_GENERIC_ERROR }, { status: 400, headers: CORS });
          }

          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("business_name, greeting_message")
            .eq("id", businessId)
            .maybeSingle();

          if (!profile) {
            console.error("[web-chat GET] no business found for id", businessId);
            return Response.json({ error: WIDGET_GENERIC_ERROR }, { status: 404, headers: CORS });
          }

          const businessName = profile.business_name || "our business";
          return Response.json(
            {
              businessName,
              greeting: profile.greeting_message || `Hi! Welcome to ${businessName}. How can we help?`,
            },
            { headers: CORS },
          );
        } catch (err) {
          console.error("[web-chat GET]", err);
          return Response.json({ error: WIDGET_GENERIC_ERROR }, { status: 500, headers: CORS });
        }
      },
      POST: async ({ request, params }) => {
        try {
          const businessId = params.business_id;
          if (!businessId || !UUID_RE.test(businessId)) {
            console.error("[web-chat POST] invalid business_id in embed", businessId);
            return Response.json({ error: WIDGET_GENERIC_ERROR }, { status: 400, headers: CORS });
          }

          let body: { sessionId?: unknown; message?: unknown };
          try {
            body = await request.json();
          } catch {
            return Response.json({ error: WIDGET_GENERIC_ERROR }, { status: 400, headers: CORS });
          }

          const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
          const messageBody = typeof body.message === "string" ? body.message.trim() : "";
          if (!sessionId || sessionId.length > MAX_SESSION_ID_LENGTH) {
            return Response.json({ error: WIDGET_GENERIC_ERROR }, { status: 400, headers: CORS });
          }
          if (!messageBody || messageBody.length > MAX_MESSAGE_LENGTH) {
            return Response.json(
              { error: `Message must be between 1 and ${MAX_MESSAGE_LENGTH} characters.` },
              { status: 400, headers: CORS },
            );
          }

          // Layer 1: per-IP cap. Rotated IPs still hit layer 2 below.
          const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
          const { data: ipAllowed, error: ipRlErr } = await supabaseAdmin.rpc(
            "check_anon_rate_limit",
            {
              p_ip_address: ip,
              p_route: "public-web-chat",
              p_max_requests: 30,
              p_window_seconds: 3600,
            },
          );
          if (ipRlErr) {
            console.error("[web-chat] IP rate limit check failed");
            return Response.json(
              { error: "Service temporarily unavailable" },
              { status: 503, headers: CORS },
            );
          }
          if (!ipAllowed) {
            return Response.json(
              { error: "Too many messages. Please try again shortly." },
              { status: 429, headers: CORS },
            );
          }

          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select(
              "business_name, industry, business_hours, escalation_rules, website, subscription_tier, subscription_status",
            )
            .eq("id", businessId)
            .maybeSingle();

          if (!profile) {
            console.error("[web-chat POST] no business found for id", businessId);
            return Response.json({ error: WIDGET_GENERIC_ERROR }, { status: 404, headers: CORS });
          }

          // Layer 5: soft Origin check against the business's confirmed website.
          if (originMismatchesConfirmedWebsite(request, profile.website)) {
            return Response.json({ error: WIDGET_GENERIC_ERROR }, { status: 403, headers: CORS });
          }

          // Layer 4: plan gating - same feature bucket as SMS Missed-Call
          // Text-Back, same requirement (an active paid plan). quota.reason
          // is written for the contractor ("Subscribe to..."), never for
          // the anonymous visitor on their website - it goes to the
          // business's own activity feed instead.
          const quota = await checkWebChatQuota(businessId);
          if (!quota.allowed) {
            await notifyBusinessWidgetIssue(businessId, quota.reason || "plan not active");
            return Response.json({ error: WIDGET_GENERIC_ERROR }, { status: 403, headers: CORS });
          }

          // Layer 2: per-business hourly cap, independent of the per-IP one
          // above - the one that actually matters, since IP rotation defeats
          // layer 1 but not this.
          const hourlyOk = await checkWebChatHourlyRateLimit(businessId);
          if (!hourlyOk.allowed) {
            return Response.json({ error: hourlyOk.reason }, { status: 429, headers: CORS });
          }

          // Find or start this visitor's conversation.
          const { data: existing } = await supabaseAdmin
            .from("conversations")
            .select("id, status")
            .eq("user_id", businessId)
            .eq("channel", "web_chat")
            .eq("customer_identifier", sessionId)
            .maybeSingle();

          let conversationId = existing?.id;
          if (!conversationId) {
            const { data: created, error: createErr } = await supabaseAdmin
              .from("conversations")
              .insert({
                user_id: businessId,
                channel: "web_chat",
                customer_identifier: sessionId,
                status: "received",
                started_at: new Date().toISOString(),
              })
              .select("id")
              .single();
            if (createErr || !created) {
              console.error("[web-chat] failed to create conversation", createErr);
              return Response.json(
                { error: WIDGET_GENERIC_ERROR },
                { status: 500, headers: CORS },
              );
            }
            conversationId = created.id;
          }

          const now = new Date().toISOString();

          await supabaseAdmin.from("conversation_messages").insert({
            conversation_id: conversationId,
            user_id: businessId,
            direction: "inbound",
            message: messageBody,
            sent_at: now,
          });

          const { data: history } = await supabaseAdmin
            .from("conversation_messages")
            .select("direction, message")
            .eq("conversation_id", conversationId)
            .order("sent_at", { ascending: true })
            .limit(40);

          const conversationHistory = (history || []).map((m) => ({
            role: m.direction === "outbound" ? "assistant" : "user",
            content: m.message,
          }));

          const apiKey = process.env.ANTHROPIC_API_KEY;
          let aiReply = "Thanks for your message! We'll have someone reach out to you shortly.";

          if (apiKey) {
            const context = await loadBusinessContext(businessId, profile);
            const systemPrompt = buildReceptionistSystemPrompt(context, "web_chat");
            const reply = await generateReceptionistReply(
              apiKey,
              systemPrompt,
              conversationHistory,
            );
            if (reply) aiReply = reply;
          }

          const { data: savedReply } = await supabaseAdmin
            .from("conversation_messages")
            .insert({
              conversation_id: conversationId,
              user_id: businessId,
              direction: "outbound",
              message: aiReply,
            })
            .select()
            .single();

          await supabaseAdmin
            .from("conversations")
            .update({ status: "replied", last_message_at: new Date().toISOString() })
            .eq("id", conversationId);

          // Best-effort: did this exchange just confirm a booking? Same
          // conservative extraction sms-reply.ts uses, never lets a failure
          // here affect the reply already built above.
          if (apiKey) {
            try {
              const fullHistory = [...conversationHistory, { role: "assistant", content: aiReply }];
              const extraction = await detectBooking(apiKey, fullHistory);

              const scheduledMs = extraction?.scheduledAt
                ? Date.parse(extraction.scheduledAt)
                : NaN;
              const isFuture = !isNaN(scheduledMs) && scheduledMs > Date.now();

              if (extraction?.bookingConfirmed && extraction.confidence === "high" && isFuture) {
                const serviceKey: ServiceTypeKey | "other" =
                  extraction.serviceType && extraction.serviceType !== null
                    ? extraction.serviceType
                    : "other";
                const estimatedValue =
                  serviceKey !== "other" && serviceKey in ESTIMATED_VALUE_MAP
                    ? ESTIMATED_VALUE_MAP[serviceKey as ServiceTypeKey]
                    : ESTIMATED_VALUE_MAP.default;

                const { data: appointment, error: apptErr } = await supabaseAdmin
                  .from("appointments")
                  .insert({
                    user_id: businessId,
                    customer_name: extraction.customerName || "Website visitor",
                    service_type: serviceKey,
                    scheduled_at: new Date(scheduledMs).toISOString(),
                    status: "confirmed",
                    source: "web_chat",
                    estimated_value: estimatedValue,
                  })
                  .select()
                  .single();

                if (apptErr) {
                  console.error("[web-chat] failed to create appointment", apptErr);
                } else if (appointment && savedReply) {
                  await supabaseAdmin
                    .from("conversation_messages")
                    .update({ appointment_id: appointment.id })
                    .eq("id", savedReply.id);

                  await supabaseAdmin.from("conversation_intelligence").insert({
                    business_id: businessId,
                    service_type: serviceKey,
                    location_zip: null,
                    price_mentioned: estimatedValue,
                    urgency_level: deriveUrgency(scheduledMs),
                    outcome: "booked",
                    source_channel: "web_chat",
                    ai_confidence_score: 0.85,
                  });
                }
              }
            } catch (err) {
              console.error("[web-chat] booking detection/creation error", err);
            }
          }

          return Response.json({ reply: aiReply }, { headers: CORS });
        } catch (err) {
          console.error("[web-chat]", err);
          return Response.json({ error: WIDGET_GENERIC_ERROR }, { status: 500, headers: CORS });
        }
      },
    },
  },
});
