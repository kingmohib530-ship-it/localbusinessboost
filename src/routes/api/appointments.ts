import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const AUTH_ERROR = "Authentication required. Please sign in.";
const RATE_LIMIT_ERROR = "Too many requests. Please wait a bit and try again.";

async function authenticate(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return { error: Response.json({ error: AUTH_ERROR }, { status: 401 }) };
  }
  const token = authHeader.slice(7).trim();
  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user) {
    return { error: Response.json({ error: AUTH_ERROR }, { status: 401 }) };
  }
  return { user: userData.user };
}

async function checkRateLimit(userId: string, route: string, maxRequests: number) {
  const { data: allowed, error } = await supabaseAdmin.rpc("check_rate_limit", {
    p_user_id: userId,
    p_route: route,
    p_max_requests: maxRequests,
    p_window_seconds: 3600,
  });
  if (error) {
    console.error(`[appointments] rate limit check failed for ${route}`);
    return { response: Response.json({ error: "Service temporarily unavailable" }, { status: 503 }) };
  }
  if (!allowed) {
    return { response: Response.json({ error: RATE_LIMIT_ERROR }, { status: 429 }) };
  }
  return {};
}

const CreateAppointmentSchema = z.object({
  customer_name: z.string().trim().min(1).max(200),
  customer_phone: z.string().trim().max(50).optional(),
  customer_email: z.string().trim().email().max(255).optional(),
  service_type: z.string().trim().min(1).max(100),
  scheduled_at: z
    .string()
    .refine((v) => !isNaN(Date.parse(v)), "Invalid date")
    .refine((v) => new Date(v).getTime() > Date.now(), "scheduled_at must be in the future"),
  estimated_value: z.number().int().positive().nullable().optional(),
  notes: z.string().trim().max(2000).optional(),
  source: z
    .enum(["manual", "inbound_sms", "lead_blast", "consumer_marketplace", "web_chat"])
    .optional(),
});

export const Route = createFileRoute("/api/appointments")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await authenticate(request);
        if (auth.error) return auth.error;
        const user = auth.user!;

        const rl = await checkRateLimit(user.id, "appointments-list", 60);
        if (rl.response) return rl.response;

        const url = new URL(request.url);
        const start = url.searchParams.get("start");
        const end = url.searchParams.get("end");

        if (start && isNaN(Date.parse(start))) {
          return Response.json({ error: "Invalid 'start' date" }, { status: 400 });
        }
        if (end && isNaN(Date.parse(end))) {
          return Response.json({ error: "Invalid 'end' date" }, { status: 400 });
        }

        let query = supabaseAdmin
          .from("appointments")
          .select("*")
          .eq("user_id", user.id)
          .order("scheduled_at", { ascending: true });

        if (start) query = query.gte("scheduled_at", new Date(start).toISOString());
        if (end) query = query.lte("scheduled_at", new Date(end).toISOString());

        const { data, error } = await query;
        if (error) {
          console.error("[appointments GET]", error);
          return Response.json({ error: "Failed to load appointments" }, { status: 500 });
        }

        return Response.json({ appointments: data ?? [] });
      },

      POST: async ({ request }) => {
        const auth = await authenticate(request);
        if (auth.error) return auth.error;
        const user = auth.user!;

        const rl = await checkRateLimit(user.id, "appointments-create", 30);
        if (rl.response) return rl.response;

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const parsed = CreateAppointmentSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
            { status: 400 },
          );
        }
        const d = parsed.data;

        const { data, error } = await supabaseAdmin
          .from("appointments")
          .insert({
            user_id: user.id,
            customer_name: d.customer_name,
            customer_phone: d.customer_phone || null,
            customer_email: d.customer_email || null,
            service_type: d.service_type,
            scheduled_at: new Date(d.scheduled_at).toISOString(),
            estimated_value: d.estimated_value ?? null,
            notes: d.notes || null,
            source: d.source ?? "manual",
          })
          .select()
          .single();

        if (error) {
          console.error("[appointments POST]", error);
          return Response.json({ error: "Failed to create appointment" }, { status: 500 });
        }

        return Response.json({ appointment: data }, { status: 201 });
      },
    },
  },
});
