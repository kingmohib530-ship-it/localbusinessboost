import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { loadBusinessVonageNumber, sendVonageSms } from "@/lib/vonageProvisioning.server";
import { checkReviewRequestQuota, checkSmsHourlyRateLimit } from "@/lib/planLimits.server";

const AUTH_ERROR = "Authentication required. Please sign in.";
const RATE_LIMIT_ERROR = "Too many requests. Please wait a bit and try again.";

function businessFooter(): string {
  return "\n\nManaged by Lanavix";
}

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
          const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
          if (userErr || !userData?.user) {
            return Response.json({ error: AUTH_ERROR }, { status: 401 });
          }
          const user = userData.user;

          // ===== Rate limit: 20 requests per hour per user =====
          const { data: allowed, error: rlErr } = await supabaseAdmin.rpc("check_rate_limit", {
            p_user_id: user.id,
            p_route: "review-request",
            p_max_requests: 20,
            p_window_seconds: 3600,
          });
          if (rlErr) {
            console.error("[api/review-request] rate limit check failed");
            return Response.json({ error: "Service temporarily unavailable" }, { status: 503 });
          }
          if (!allowed) {
            return Response.json({ error: RATE_LIMIT_ERROR }, { status: 429 });
          }

          const quota = await checkReviewRequestQuota(user.id);
          if (!quota.allowed) {
            return Response.json({ error: quota.reason }, { status: 402 });
          }
          const hourlyOk = await checkSmsHourlyRateLimit(user.id);
          if (!hourlyOk.allowed) {
            return Response.json({ error: hourlyOk.reason }, { status: 429 });
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
          const message = `Hi${nameStr}! Thanks for choosing us${jobStr} — we hope everything went smoothly! If you have a moment, an honest Google review means the world to a small business: ${reviewLink} 🙏${businessFooter()}`;

          // Send via the business's own Lanavix-provisioned Vonage number
          const vonageNumber = await loadBusinessVonageNumber(user.id);
          if (!vonageNumber) {
            return Response.json(
              {
                error:
                  "Set up your phone number in Receptionist Setup before sending review requests.",
              },
              { status: 400 },
            );
          }

          const sendResult = await sendVonageSms(vonageNumber, customerPhone, message);
          if (!sendResult.ok) {
            console.error("[review-request] Vonage send failed", sendResult.error);
            return Response.json(
              { error: "Failed to send the review request. Please try again." },
              { status: 500 },
            );
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
          return Response.json({ error: "Internal server error" }, { status: 500 });
        }
      },
    },
  },
});
