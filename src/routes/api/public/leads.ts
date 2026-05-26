import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const LeadSchema = z.object({
  business_id: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  message: z.string().trim().max(4000).optional().or(z.literal("")),
});

export const Route = createFileRoute("/api/public/leads")({
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

          const parsed = LeadSchema.safeParse(body);
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
          const { business_id, name, email, phone, message } = parsed.data;

          // Ensure business exists (multi-tenant safety)
          const { data: business, error: bizErr } = await supabaseAdmin
            .from("businesses")
            .select("id")
            .eq("id", business_id)
            .maybeSingle();

          if (bizErr) throw bizErr;
          if (!business) {
            return Response.json(
              { success: false, message: "Business not found" },
              { status: 404, headers: CORS },
            );
          }

          const { error: insertErr } = await supabaseAdmin
            .from("leads")
            .insert({
              business_id,
              name,
              email: email || null,
              phone: phone || null,
              message: message || null,
              source: "chatbot",
            });

          if (insertErr) throw insertErr;

          return Response.json(
            { success: true, message: "Lead saved successfully" },
            { status: 201, headers: CORS },
          );
        } catch (err) {
          console.error("[leads POST]", err);
          return Response.json(
            { success: false, message: "Internal server error" },
            { status: 500, headers: CORS },
          );
        }
      },
    },
  },
});
