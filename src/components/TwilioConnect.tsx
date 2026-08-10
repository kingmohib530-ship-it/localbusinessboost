import { useEffect, useState } from "react";
import { Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface TwilioConnectProps {
  /** Fires once Twilio credentials are verified against Twilio's own API and saved. */
  onConnected?: () => void;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  border: "1.5px solid var(--hd-border)",
  borderRadius: 10,
  fontSize: 14,
  color: "var(--hd-fg)",
  background: "var(--hd-glass)",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--hd-fg)",
  marginBottom: 6,
};

/**
 * Connects a business's own Twilio account: paste Account SID, Auth Token,
 * and phone number, we confirm it actually authenticates against Twilio's
 * own API before saving (the Auth Token goes straight to Supabase Vault,
 * never a plaintext column). Shared between Receptionist Setup and the
 * onboarding wizard - same /api/twilio-settings endpoint either way.
 */
export function TwilioConnect({ onConnected }: TwilioConnectProps) {
  const [loading, setLoading] = useState(true);
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);

  const connected = !!verifiedAt;

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("twilio_account_sid, twilio_phone_number, twilio_verified_at")
      .eq("id", user.id)
      .maybeSingle();
    setAccountSid(data?.twilio_account_sid || "");
    setPhoneNumber(data?.twilio_phone_number || "");
    setVerifiedAt(data?.twilio_verified_at || null);
    setLoading(false);
  }

  async function connect() {
    setSaving(true);
    setMsg("");
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setSaving(false);
      setOk(false);
      setMsg("Please sign in again and retry.");
      return;
    }
    try {
      const res = await fetch("/api/twilio-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          accountSid: accountSid.trim(),
          authToken: authToken.trim(),
          phoneNumber: phoneNumber.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setOk(true);
        setMsg("Connected! Your calls and texts now send from your own Twilio number.");
        setAuthToken("");
        await load();
        onConnected?.();
      } else {
        setOk(false);
        setMsg(data.error || "Could not connect. Please check your details and try again.");
      }
    } catch {
      setOk(false);
      setMsg("Network error. Please try again.");
    }
    setSaving(false);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Phone size={15} color="var(--hd-primary)" strokeWidth={1.75} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--hd-fg)" }}>Twilio account</span>
      </div>
      <p style={{ fontSize: 12, color: "var(--hd-muted)", marginBottom: 16, lineHeight: 1.5 }}>
        Your own Twilio account, so calls and texts send from your business's own number. Find your
        Account SID and Auth Token on your Twilio console's dashboard. We confirm your details with
        Twilio before saving them, and your Auth Token is encrypted - once saved it's never shown
        again, only replaced.
      </p>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Account SID</label>
        <input
          value={accountSid}
          onChange={(e) => setAccountSid(e.target.value)}
          placeholder="AC..."
          style={inputStyle}
          disabled={loading}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Auth Token</label>
        <input
          value={authToken}
          onChange={(e) => setAuthToken(e.target.value)}
          type="password"
          placeholder={
            connected ? "•••••••• (saved, enter a new one to replace it)" : "Your Twilio Auth Token"
          }
          style={inputStyle}
          disabled={loading}
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Phone number</label>
        <input
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="+15555550100"
          style={inputStyle}
          disabled={loading}
        />
      </div>

      <button
        onClick={connect}
        disabled={saving || loading}
        style={{
          padding: "10px 20px",
          background: "var(--hd-primary)",
          color: "var(--primary-foreground)",
          border: "none",
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 600,
          cursor: saving ? "not-allowed" : "pointer",
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? "Connecting..." : connected ? "Update connection" : "Connect Twilio"}
      </button>
      {msg && (
        <div
          style={{
            fontSize: 12,
            color: ok ? "var(--hd-primary-2)" : "var(--destructive)",
            marginTop: 8,
          }}
        >
          {msg}
        </div>
      )}

      <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--hd-border)" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--hd-fg)", marginBottom: 8 }}>
          Webhook URLs to paste into Twilio
        </div>
        <p style={{ fontSize: 12, color: "var(--hd-muted)", marginBottom: 10, lineHeight: 1.5 }}>
          On your Twilio number's configuration page, set these as the Voice and SMS webhook URLs.
        </p>
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 11,
            color: "var(--hd-muted)",
            background: "var(--hd-glass)",
            border: "1px solid var(--hd-border)",
            borderRadius: 6,
            padding: "8px 10px",
            marginBottom: 8,
            wordBreak: "break-all",
          }}
        >
          Voice: https://lanavix.com/api/twilio/missed-call
        </div>
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 11,
            color: "var(--hd-muted)",
            background: "var(--hd-glass)",
            border: "1px solid var(--hd-border)",
            borderRadius: 6,
            padding: "8px 10px",
            wordBreak: "break-all",
          }}
        >
          SMS: https://lanavix.com/api/twilio/sms-reply
        </div>
      </div>
    </div>
  );
}

export default TwilioConnect;
