import { useState } from "react";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type FactType = "service" | "pricing" | "hours" | "service_area" | "general" | "faq";

export const FACT_TYPE_LABELS: Record<FactType, string> = {
  service: "Service",
  pricing: "Pricing",
  hours: "Hours",
  service_area: "Service area",
  general: "General",
  faq: "FAQ",
};

export interface AddFactFormProps {
  /** Pins the fact_type and hides the type picker, for a step that's already scoped to one kind of fact. */
  fixedType?: FactType;
  placeholder?: string;
  /** Fires after a successful insert, with the fact_type actually saved. */
  onAdded?: (factType: FactType) => void;
}

const inputStyle: React.CSSProperties = {
  padding: "10px 14px",
  border: "1.5px solid var(--hd-border)",
  borderRadius: 10,
  fontSize: 14,
  color: "var(--hd-fg)",
  background: "var(--hd-glass)",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

/**
 * The one place a business fact gets manually typed in and saved, shared
 * between Business Facts (general-purpose, full type picker) and the
 * onboarding wizard's facts step (pinned to a single type per section).
 * Same business_facts insert either way: source 'setup_form', status
 * 'active' - manual entries go straight in, no conflict-checking against
 * existing facts (that's only for the sync path, see businessFacts.server.ts).
 */
export function AddFactForm({ fixedType, placeholder, onAdded }: AddFactFormProps) {
  const [factType, setFactType] = useState<FactType>(fixedType || "service");
  const [factText, setFactText] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  async function add() {
    if (!factText.trim()) {
      setError("Enter a fact first.");
      return;
    }
    setAdding(true);
    setError("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setAdding(false);
      return;
    }
    const type = fixedType || factType;
    const { error: insertError } = await supabase.from("business_facts").insert({
      user_id: user.id,
      fact_type: type,
      fact_text: factText.trim(),
      source: "setup_form",
      status: "active",
    });
    setAdding(false);
    if (insertError) {
      setError("Could not save this fact. Please try again.");
      return;
    }
    setFactText("");
    onAdded?.(type);
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {!fixedType && (
          <select
            value={factType}
            onChange={(e) => setFactType(e.target.value as FactType)}
            style={{ ...inputStyle, flex: "0 0 160px" }}
          >
            {(Object.keys(FACT_TYPE_LABELS) as FactType[]).map((t) => (
              <option key={t} value={t}>
                {FACT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        )}
        <input
          value={factText}
          onChange={(e) => setFactText(e.target.value)}
          placeholder={placeholder || "e.g. Drain cleaning starts at $150"}
          style={{ ...inputStyle, flex: "1 1 260px" }}
        />
        <button
          onClick={add}
          disabled={adding}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 18px",
            background: "var(--hd-primary)",
            color: "var(--primary-foreground)",
            border: "none",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Plus size={14} /> {adding ? "Adding..." : "Add"}
        </button>
      </div>
      {error && <p style={{ fontSize: 12, color: "var(--destructive)", marginTop: 8 }}>{error}</p>}
    </div>
  );
}

export default AddFactForm;
