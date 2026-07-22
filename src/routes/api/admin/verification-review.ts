import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateAdmin } from "@/lib/admin-auth.server";

const PROFILE_ACTIONS = ["approve", "reject", "request_info"] as const;
const DOC_STATUSES = ["approved", "rejected", "pending"] as const;

export const Route = createFileRoute("/api/admin/verification-review")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authenticateAdmin(request);
        if ("error" in auth) return auth.error;

        let body: any;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        // Per-document status update.
        if (body?.documentId) {
          const { documentId, status } = body as { documentId: string; status: string };
          if (!DOC_STATUSES.includes(status as (typeof DOC_STATUSES)[number])) {
            return Response.json({ error: `status must be one of: ${DOC_STATUSES.join(", ")}` }, { status: 400 });
          }
          const { error } = await supabaseAdmin
            .from("verification_documents")
            .update({ status, admin_notes: body.notes ?? null })
            .eq("id", documentId);
          if (error) {
            console.error("[verification-review] document update failed", error);
            return Response.json({ error: "Failed to update document" }, { status: 500 });
          }
          return Response.json({ success: true });
        }

        // Profile-level verification decision.
        const { userId, action, notes } = body as { userId: string; action: string; notes?: string };
        if (!userId) return Response.json({ error: "userId is required" }, { status: 400 });
        if (!PROFILE_ACTIONS.includes(action as (typeof PROFILE_ACTIONS)[number])) {
          return Response.json({ error: `action must be one of: ${PROFILE_ACTIONS.join(", ")}` }, { status: 400 });
        }

        // There is no "rejected" value in profiles.verification_status's check
        // constraint — reject and request_info both reset the applicant to
        // "unverified" with an explanatory note so they can resubmit; only
        // approve promotes them to "verified".
        const nextStatus = action === "approve" ? "verified" : "unverified";

        const { error } = await supabaseAdmin
          .from("profiles")
          .update({
            verification_status: nextStatus,
            verification_reviewed_at: new Date().toISOString(),
            verification_notes: notes?.trim() || null,
          })
          .eq("id", userId);

        if (error) {
          console.error("[verification-review] profile update failed", error);
          return Response.json({ error: "Failed to update verification status" }, { status: 500 });
        }

        return Response.json({ success: true, verification_status: nextStatus });
      },
    },
  },
});
