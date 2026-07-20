import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const AUTH_ERROR = "Authentication required. Please sign in.";
const RATE_LIMIT_ERROR = "Too many requests. Please wait a bit and try again.";

const RequestSchema = z.object({
  customerName: z.string().trim().max(200).optional().or(z.literal("")),
  customerPhone: z.string().trim().min(1).max(50),
  jobDescription: z.string().trim().max(500).optional().or(z.literal("")),
  googleReviewUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
});

export const Route = createFileRoute("/api/review-request")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // ===== Auth: verify Supabase JWT (same pattern as /api/lead-blast) =====
          const authHeader = request.headers.get("authorization") || "";
          if (!authHeader.toLowerCase().startsWith("bearer ")) {
            return Response.json({ error: AUTH_ERROR }, { status: 401 });
          }
          const token = authHeader.slice(7).trim();
          const { data: userData, error: userErr } =
            await supabaseAdmin.auth.getUser(token);
          if (userErr || !userData?.user) {
            return Response.json({ error: AUTH_ERROR }, { status: 401 });
          }
          const user = userData.user;

          // ===== Rate limit: 20 requests per hour per user =====
          const { data: allowed, error: rlErr } = await supabaseAdmin.rpc(
            "check_rate_limit",
            {
              p_user_id: user.id,
              p_route: "review-request",
              p_max_requests: 20,
              p_window_seconds: 3600,
            },
          );
          if (rlErr) {
            console.error("[api/review-request] rate limit check failed");
            return Response.json({ error: "Service temporarily unavailable" }, { status: 503 });
          }
          if (!allowed) {
            return Response.json({ error: RATE_LIMIT_ERROR }, { status: 429 });
          }

          const body = await request.json();
          const parsed = RequestSchema.safeParse(body);
          if (!parsed.success) {
            return Response.json(
              { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
              { status: 400 },
            );
          }
          const { customerName, customerPhone, jobDescription, googleReviewUrl } = parsed.data;

          // Build the SMS message
          const reviewLink = googleReviewUrl || "https://search.google.com/local/reviews";
          const nameStr = customerName ? `, ${customerName.split(" ")[0]}` : "";
          const jobStr = jobDescription ? ` on the ${jobDescription}` : "";
          const message = `Hi${nameStr}! Thanks for choosing us${jobStr} — we hope everything went smoothly! If you have a moment, an honest Google review means the world to a small business: ${reviewLink} 🙏`;

          // Send via Twilio if configured
          const twilioSid = process.env.TWILIO_ACCOUNT_SID;
          const twilioToken = process.env.TWILIO_AUTH_TOKEN;
          const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

          if (twilioSid && twilioToken && twilioFrom) {
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
                  To: customerPhone,
                  Body: message,
                }).toString(),
              },
            );

            if (!twilioRes.ok) {
              const err = await twilioRes.text();
              return Response.json({ error: `Twilio error: ${err}` }, { status: 500 });
            }
          } else {
            return Response.json({
              error: "Twilio not connected. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to Vercel environment variables."
            }, { status: 400 });
          }

          // Save to database, attributed to the actual authenticated caller
          await supabaseAdmin.from("review_requests").insert({
            user_id: user.id,
            customer_name: customerName || null,
            customer_phone: customerPhone,
            job_description: jobDescription || null,
            google_review_url: googleReviewUrl || null,
            status: "sent",
          });

          return Response.json({ success: true, message: "Review request sent!" });
        } catch (err) {
          console.error("[review-request]", err);
          return Response.json({ error: String(err) }, { status: 500 });
        }
      },
    },
  },
});
