/**
 * Minimal outbound email via Resend's REST API (plain fetch — no SDK
 * dependency, consistent with how this codebase calls Twilio/Anthropic
 * directly). Best-effort: never throws, so a missing/failing email send
 * never breaks the request that triggered it (e.g. a contact form
 * submission is still saved even if notifying support fails).
 *
 * No email-sending integration existed anywhere in this codebase before
 * this — RESEND_API_KEY must be set for this to actually send; until then
 * it logs what it would have sent and returns.
 */
export async function sendNotificationEmail(subject: string, body: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFICATION_EMAIL || "moh@lanavix.com";

  if (!apiKey) {
    console.log(`[email] RESEND_API_KEY not configured — would have sent "${subject}" to ${to}`);
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "Lanavix <notifications@lanavix.com>",
        to: [to],
        subject,
        text: body,
      }),
    });
    if (!res.ok) {
      console.error("[email] Resend API error", await res.text());
    }
  } catch (e) {
    console.error("[email] failed to send", e);
  }
}
