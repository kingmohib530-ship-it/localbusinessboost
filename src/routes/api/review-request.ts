import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/review-request")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { customerName, customerPhone, jobDescription, googleReviewUrl } = await request.json();

          if (!customerPhone) {
            return Response.json({ error: "Customer phone is required" }, { status: 400 });
          }

          const supabase = createClient(
            process.env.VITE_SUPABASE_URL || "",
            process.env.VITE_SUPABASE_PUBLISHABLE_KEY || ""
          );

          const authHeader = request.headers.get("cookie") || "";
          const { data: { user } } = await supabase.auth.getUser();

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
              }
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

          // Save to database
          const adminSupabase = createClient(
            process.env.VITE_SUPABASE_URL || "",
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || ""
          );

          const { data: users } = await adminSupabase.auth.admin.listUsers();
          const firstUser = users?.users?.[0];

          if (firstUser) {
            await adminSupabase.from("review_requests").insert({
              user_id: firstUser.id,
              customer_name: customerName || null,
              customer_phone: customerPhone,
              job_description: jobDescription || null,
              google_review_url: googleReviewUrl || null,
              status: "sent",
            });
          }

          return Response.json({ success: true, message: "Review request sent!" });
        } catch (err) {
          console.error("[review-request]", err);
          return Response.json({ error: String(err) }, { status: 500 });
        }
      },
    },
  },
});
