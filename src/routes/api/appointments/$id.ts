import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { TablesUpdate } from "@/integrations/supabase/types";

const AUTH_ERROR = "Authentication required. Please sign in.";
const RATE_LIMIT_ERROR = "Too many requests. Please wait a bit and try again.";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    console.error(`[appointments/$id] rate limit check failed for ${route}`);
    return { response: Response.json({ error: "Service temporarily unavailable" }, { status: 503 }) };
  }
  if (!allowed) {
    return { response: Response.json({ error: RATE_LIMIT_ERROR }, { status: 429 }) };
  }
  return {};
}

const UpdateAppointmentSchema = z
  .object({
    status: z.enum(["pending", "confirmed", "completed", "cancelled", "no_show"]).optional(),
    scheduled_at: z
      .string()
      .refine((v) => !isNaN(Date.parse(v)), "Invalid date")
      .refine((v) => new Date(v).getTime() > Date.now(), "scheduled_at must be in the future")
      .optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    estimated_value: z.number().int().positive().nullable().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, "At least one field must be provided");

export const Route = createFileRoute("/api/appointments/$id")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const auth = await authenticate(request);
        if (auth.error) return auth.error;
        const user = auth.user!;

        const id = params.id;
        if (!id || !UUID_RE.test(id)) {
          return Response.json({ error: "Invalid appointment id" }, { status: 400 });
        }

        const rl = await checkRateLimit(user.id, "appointments-update", 30);
        if (rl.response) return rl.response;

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const parsed = UpdateAppointmentSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
            { status: 400 },
          );
        }
        const d = parsed.data;

        const update: TablesUpdate<"appointments"> = { updated_at: new Date().toISOString() };
        if (d.status !== undefined) update.status = d.status;
        if (d.scheduled_at !== undefined) update.scheduled_at = new Date(d.scheduled_at).toISOString();
        if (d.notes !== undefined) update.notes = d.notes;
        if (d.estimated_value !== undefined) update.estimated_value = d.estimated_value;

        const { data, error } = await supabaseAdmin
          .from("appointments")
          .update(update)
          .eq("id", id)
          .eq("user_id", user.id)
          .select()
          .maybeSingle();

        if (error) {
          console.error("[appointments PATCH]", error);
          return Response.json({ error: "Failed to update appointment" }, { status: 500 });
        }
        if (!data) {
          return Response.json({ error: "Appointment not found" }, { status: 404 });
        }

        return Response.json({ appointment: data });
      },

      DELETE: async ({ request, params }) => {
        const auth = await authenticate(request);
        if (auth.error) return auth.error;
        const user = auth.user!;

        const id = params.id;
        if (!id || !UUID_RE.test(id)) {
          return Response.json({ error: "Invalid appointment id" }, { status: 400 });
        }

        const rl = await checkRateLimit(user.id, "appointments-delete", 30);
        if (rl.response) return rl.response;

        const { data, error } = await supabaseAdmin
          .from("appointments")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id)
          .select()
          .maybeSingle();

        if (error) {
          console.error("[appointments DELETE]", error);
          return Response.json({ error: "Failed to delete appointment" }, { status: 500 });
        }
        if (!data) {
          return Response.json({ error: "Appointment not found" }, { status: 404 });
        }

        return Response.json({ success: true });
      },
    },
  },
});
