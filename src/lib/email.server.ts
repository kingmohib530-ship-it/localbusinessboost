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
async function sendEmail(opts: { to: string; subject: string; text: string; html?: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(`[email] RESEND_API_KEY not configured — would have sent "${opts.subject}" to ${opts.to}`);
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
        to: [opts.to],
        subject: opts.subject,
        text: opts.text,
        ...(opts.html ? { html: opts.html } : {}),
      }),
    });
    if (!res.ok) {
      console.error("[email] Resend API error", await res.text());
    }
  } catch (e) {
    console.error("[email] failed to send", e);
  }
}

/** Sends an internal notification to the team inbox (contact form, etc). */
export async function sendNotificationEmail(subject: string, body: string): Promise<void> {
  const to = process.env.NOTIFICATION_EMAIL || "moh@lanavix.com";
  await sendEmail({ to, subject, text: body });
}

/** Sends an arbitrary email to an external recipient (e.g. the audit report). */
export async function sendExternalEmail(to: string, subject: string, text: string, html?: string): Promise<void> {
  await sendEmail({ to, subject, text, html });
}
