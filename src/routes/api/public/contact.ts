import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const ContactSchema = z.object({
  name: z.string().trim().min(1).max(200),
  business_name: z.string().trim().max(200).optional().or(z.literal("")),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  message: z.string().trim().max(4000).optional().or(z.literal("")),
});

export const Route = createFileRoute("/api/public/contact")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          let body: unknown;
          try {
            body = await request.json();
          } catch {
            return Response.json(
              { success: false, message: "Invalid JSON body" },
              { status: 400, headers: CORS },
            );
          }

          const parsed = ContactSchema.safeParse(body);
          if (!parsed.success) {
            return Response.json(
              {
                success: false,
                message: "Validation failed",
                errors: parsed.error.flatten().fieldErrors,
              },
              { status: 400, headers: CORS },
            );
          }
          const { name, business_name, email, phone, message } = parsed.data;

          if (!email && !phone) {
            return Response.json(
              { success: false, message: "Provide at least an email or phone number" },
              { status: 400, headers: CORS },
            );
          }

          const { error: insertErr } = await supabaseAdmin
            .from("contact_submissions")
            .insert({
              name,
              business_name: business_name || null,
              email: email || null,
              phone: phone || null,
              message: message || null,
            });

          if (insertErr) throw insertErr;

          return Response.json(
            { success: true, message: "Submission received" },
            { status: 201, headers: CORS },
          );
        } catch (err) {
          console.error("[public/contact POST]", err);
          return Response.json(
            { success: false, message: "Internal server error" },
            { status: 500, headers: CORS },
          );
        }
      },
    },
  },
});
