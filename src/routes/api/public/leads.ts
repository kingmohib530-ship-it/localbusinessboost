import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createMondayItem } from "@/lib/monday.server";


const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const DEFAULT_BUSINESS_ID = "00000000-0000-0000-0000-000000000001";

const LeadSchema = z.object({
  business_id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(200),
  business_name: z.string().trim().max(200).optional().or(z.literal("")),
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
          const { business_id, name, business_name, email, phone, message } = parsed.data;
          const resolvedBusinessId = business_id ?? DEFAULT_BUSINESS_ID;

          // Ensure business exists (multi-tenant safety)
          const { data: business, error: bizErr } = await supabaseAdmin
            .from("businesses")
            .select("id")
            .eq("id", resolvedBusinessId)
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
              business_id: resolvedBusinessId,
              name,
              email: email || null,
              phone: phone || null,
              message: business_name ? `[${business_name}] ${message || ""}`.trim() : (message || null),
              source: "chatbot",
            });

          if (insertErr) throw insertErr;

          // Push to monday.com (non-blocking — don't fail the lead capture)
          try {
            const columnValues: Record<string, unknown> = {
              color_mm40t58z: { label: "New from Chatbot" },
              text_mm408bbv: "Chatbot",
            };
            if (business_name) {
              columnValues.text_mm40qp3y = business_name;
            }
            if (email) {
              columnValues.email_mm40q7z1 = { email, text: email };
            }
            if (phone) {
              columnValues.text_mm40k4r8 = phone;
            }
            await createMondayItem(name, columnValues);
          } catch (mondayErr) {
            console.error("[leads POST] monday.com sync failed", mondayErr);
          }



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
