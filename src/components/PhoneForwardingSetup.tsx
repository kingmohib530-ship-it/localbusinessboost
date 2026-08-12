import { useEffect, useState } from "react";
import { Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface PhoneForwardingSetupProps {
  /** Fires once a Vonage number is provisioned (first time) or re-confirmed. */
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

const codeBoxStyle: React.CSSProperties = {
  fontFamily: "monospace",
  fontSize: 12,
  color: "var(--hd-fg)",
  background: "var(--hd-glass)",
  border: "1px solid var(--hd-border)",
  borderRadius: 6,
  padding: "8px 10px",
  marginBottom: 6,
};

/**
 * Confirms a contractor's real business phone number, then Lanavix
 * auto-provisions a dedicated Vonage number behind it - no Twilio signup,
 * no separate billing, nothing to authenticate. Shared between
 * Receptionist Setup and the onboarding wizard - same /api/phone-setup
 * endpoint either way.
 */
export function PhoneForwardingSetup({ onConnected }: PhoneForwardingSetupProps) {
  const [loading, setLoading] = useState(true);
  const [forwardingPhoneNumber, setForwardingPhoneNumber] = useState("");
  const [vonageNumber, setVonageNumber] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);

  const connected = !!vonageNumber;

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
      .select("forwarding_phone_number, vonage_number")
      .eq("id", user.id)
      .maybeSingle();
    setForwardingPhoneNumber(data?.forwarding_phone_number || "");
    setVonageNumber(data?.vonage_number || null);
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
      const res = await fetch("/api/phone-setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ forwardingPhoneNumber: forwardingPhoneNumber.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setOk(true);
        setMsg(
          "Your number is ready. Set up call forwarding below to start receiving missed calls.",
        );
        setVonageNumber(data.vonageNumber);
        onConnected?.();
      } else {
        setOk(false);
        setMsg(data.error || "Could not set this up. Please check your number and try again.");
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
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--hd-fg)" }}>
          Business phone number
        </span>
      </div>
      <p style={{ fontSize: 12, color: "var(--hd-muted)", marginBottom: 16, lineHeight: 1.5 }}>
        Enter your real business phone number. Lanavix automatically sets up a dedicated line behind
        it - no separate account, nothing to sign up for or pay for on your own.
      </p>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Your business phone number</label>
        <input
          value={forwardingPhoneNumber}
          onChange={(e) => setForwardingPhoneNumber(e.target.value)}
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
        {saving ? "Setting up..." : connected ? "Update number" : "Set up my number"}
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

      {connected && (
        <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--hd-border)" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--hd-fg)", marginBottom: 8 }}>
            Forward your missed calls to {vonageNumber}
          </div>
          <p style={{ fontSize: 12, color: "var(--hd-muted)", marginBottom: 10, lineHeight: 1.5 }}>
            Important: set up <strong>conditional</strong> forwarding (no answer / busy only), not
            forwarding for every call. Lanavix only texts back calls that actually reach this
            number, so your real phone should still ring first - this number only picks up what you
            miss.
          </p>
          <div style={codeBoxStyle}>
            On most carriers (AT&T, T-Mobile): dial *61*{vonageNumber}#
          </div>
          <div style={codeBoxStyle}>To also forward on busy: dial *67*{vonageNumber}#</div>
          <p style={{ fontSize: 11, color: "var(--hd-muted)", lineHeight: 1.5 }}>
            Verizon and some other carriers use different codes or handle this in your phone's
            settings app instead - if the code above doesn't work, search "conditional call
            forwarding" for your carrier, or call their support line. To turn forwarding off later,
            dial #61# (and #67# if you set that one too).
          </p>
        </div>
      )}
    </div>
  );
}

export default PhoneForwardingSetup;
