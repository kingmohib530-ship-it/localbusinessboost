/**
 * AI Sales Follow-Up: creates and cancels the Day 1/5/14 nudge sequence
 * for a quote that didn't turn into a booking. Shared between sms-reply.ts
 * and the web-chat route so both channels detect and track quotes the
 * same way, even though only SMS can actually send the scheduled nudges
 * (web chat has no phone number to text unless the visitor typed one into
 * the conversation, which nothing captures today).
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { detectQuote, type QuoteExtraction } from "@/lib/aiReceptionist.server";

const DAY_OFFSETS = [1, 5, 14] as const;

/**
 * A booking just landed on this conversation, so any quote follow-up
 * still waiting on it is no longer relevant. Marks the follow-up "booked"
 * and its still-pending steps "cancelled" rather than deleting them, so
 * the dashboard can show the sequence actually worked.
 */
export async function cancelActiveQuoteFollowUp(conversationId: string): Promise<void> {
  const { data: followUp } = await supabaseAdmin
    .from("quote_follow_ups")
    .update({ status: "booked", updated_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("status", "active")
    .select("id")
    .maybeSingle();

  if (followUp) {
    await supabaseAdmin
      .from("quote_follow_up_steps")
      .update({ status: "cancelled" })
      .eq("follow_up_id", followUp.id)
      .eq("status", "pending");
  }
}

/**
 * Runs detectQuote on the conversation so far, and if a real quote was
 * just given, creates the tracking row (and the 3 scheduled steps, when
 * scheduleSteps is true and there's a phone number to text). Only ever
 * creates one active follow-up per conversation - the partial unique
 * index on quote_follow_ups(conversation_id) where status='active' is
 * what actually prevents a duplicate, not a check-then-insert here, so a
 * later quote on an already-tracked conversation just leaves the
 * existing sequence running rather than restarting it.
 */
export async function maybeStartQuoteFollowUp(
  apiKey: string,
  conversationId: string,
  userId: string,
  conversationHistory: { role: string; content: string }[],
  scheduleSteps: boolean,
): Promise<QuoteExtraction | null> {
  const extraction = await detectQuote(apiKey, conversationHistory);
  if (!extraction?.quoteGiven || extraction.confidence !== "high") return extraction;

  const now = new Date();
  const { data: created, error } = await supabaseAdmin
    .from("quote_follow_ups")
    .insert({
      conversation_id: conversationId,
      user_id: userId,
      service_type: extraction.serviceType,
      quoted_price: extraction.quotedPrice,
      quoted_at: now.toISOString(),
    })
    .select("id")
    .maybeSingle();

  if (error) {
    // Postgres 23505 (unique_violation) here means an active follow-up
    // already exists for this conversation - not a real failure.
    if (error.code !== "23505") {
      console.error("[quoteFollowUps] failed to create follow-up", error);
    }
    return extraction;
  }

  if (created && scheduleSteps) {
    const steps = DAY_OFFSETS.map((dayOffset) => ({
      follow_up_id: created.id,
      day_offset: dayOffset,
      scheduled_for: new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000).toISOString(),
    }));
    const { error: stepsErr } = await supabaseAdmin.from("quote_follow_up_steps").insert(steps);
    if (stepsErr) console.error("[quoteFollowUps] failed to create follow-up steps", stepsErr);
  }

  return extraction;
}
