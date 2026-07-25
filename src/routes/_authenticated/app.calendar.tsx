import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Calendar as CalendarIcon, Plus, X, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/calendar")({
  component: CalendarPage,
});

interface Appointment {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  service_type: string;
  scheduled_at: string;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
  estimated_value: number | null;
  notes: string | null;
  source: string;
}

const STATUS_STYLES: Record<Appointment["status"], { bg: string; color: string; label: string }> = {
  pending: { bg: "#fef3c7", color: "#b45309", label: "Pending" },
  confirmed: { bg: "var(--accent)", color: "var(--accent-2)", label: "Confirmed" },
  completed: { bg: "#dbeafe", color: "#1d4ed8", label: "Completed" },
  cancelled: { bg: "#fee2e2", color: "var(--destructive)", label: "Cancelled" },
  no_show: { bg: "var(--muted)", color: "var(--muted-foreground)", label: "No-show" },
};

function humanizeServiceType(s: string): string {
  return s
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function dateKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function formatDateHeading(key: string): string {
  const d = new Date(`${key}T00:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function formatMoney(cents: number | null): string {
  if (cents === null) return "—";
  return `$${cents.toLocaleString()}`;
}

type ModalState =
  | { mode: "create" }
  | { mode: "edit"; appointment: Appointment }
  | null;

const EMPTY_FORM = {
  customer_name: "",
  customer_phone: "",
  customer_email: "",
  service_type: "",
  scheduled_at: "",
  estimated_value: "",
  notes: "",
  status: "pending" as Appointment["status"],
};

function CalendarPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => { loadAppointments(); }, []);

  async function authHeader() {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("Please sign in again and retry.");
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  async function loadAppointments() {
    setLoading(true);
    setError("");
    try {
      const headers = await authHeader();
      const res = await fetch("/api/appointments", { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load appointments");
      setAppointments(data.appointments ?? []);
    } catch (err: any) {
      setError(err.message || "Failed to load appointments.");
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError("");
    setModal({ mode: "create" });
  }

  function openEdit(appt: Appointment) {
    setForm({
      customer_name: appt.customer_name,
      customer_phone: appt.customer_phone || "",
      customer_email: appt.customer_email || "",
      service_type: appt.service_type,
      scheduled_at: toLocalInputValue(appt.scheduled_at),
      estimated_value: appt.estimated_value != null ? String(appt.estimated_value) : "",
      notes: appt.notes || "",
      status: appt.status,
    });
    setFormError("");
    setModal({ mode: "edit", appointment: appt });
  }

  function toLocalInputValue(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  async function handleSave() {
    setFormError("");
    if (!form.customer_name.trim()) { setFormError("Customer name is required."); return; }
    if (!form.service_type.trim()) { setFormError("Service type is required."); return; }
    if (!form.scheduled_at) { setFormError("Date and time are required."); return; }

    const scheduledIso = new Date(form.scheduled_at).toISOString();

    if (modal?.mode === "create" && new Date(scheduledIso).getTime() <= Date.now()) {
      setFormError("Scheduled time must be in the future.");
      return;
    }

    setSaving(true);
    try {
      const headers = await authHeader();

      if (modal?.mode === "create") {
        const res = await fetch("/api/appointments", {
          method: "POST",
          headers,
          body: JSON.stringify({
            customer_name: form.customer_name.trim(),
            customer_phone: form.customer_phone.trim() || undefined,
            customer_email: form.customer_email.trim() || undefined,
            service_type: form.service_type.trim(),
            scheduled_at: scheduledIso,
            estimated_value: form.estimated_value ? Number(form.estimated_value) : null,
            notes: form.notes.trim() || undefined,
            source: "manual",
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create appointment");
      } else if (modal?.mode === "edit") {
        const res = await fetch(`/api/appointments/${modal.appointment.id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            status: form.status,
            scheduled_at: scheduledIso,
            notes: form.notes.trim() || null,
            estimated_value: form.estimated_value ? Number(form.estimated_value) : null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update appointment");
      }

      setModal(null);
      loadAppointments();
    } catch (err: any) {
      setFormError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (modal?.mode !== "edit") return;
    if (!confirm("Delete this appointment? This cannot be undone.")) return;
    setSaving(true);
    try {
      const headers = await authHeader();
      const res = await fetch(`/api/appointments/${modal.appointment.id}`, { method: "DELETE", headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete appointment");
      setModal(null);
      loadAppointments();
    } catch (err: any) {
      setFormError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const thisMonthAppointments = appointments.filter((a) => {
    const t = new Date(a.scheduled_at);
    return t >= monthStart && t < monthEnd;
  });
  const monthTotal = thisMonthAppointments.reduce((sum, a) => sum + (a.estimated_value || 0), 0);

  const groups = new Map<string, Appointment[]>();
  for (const a of appointments) {
    const key = dateKey(a.scheduled_at);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  }
  const sortedKeys = Array.from(groups.keys()).sort();

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    border: "1.5px solid var(--border)",
    borderRadius: 10,
    fontSize: 14,
    color: "var(--foreground)",
    background: "var(--input)",
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box" as const,
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1080, margin: "0 auto", fontFamily: "Inter,-apple-system,sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.025em", color: "var(--foreground)", margin: "0 0 6px" }}>Calendar</h1>
          <p style={{ fontSize: 15, color: "var(--muted-foreground)", margin: 0 }}>Appointments booked manually and through inbound texts.</p>
        </div>
        <button onClick={openCreate}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "var(--primary)", color: "var(--primary-foreground)", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          <Plus size={16} strokeWidth={2} /> Add Appointment
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, marginBottom: 24 }}>
        <div style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 14, padding: "16px 18px" }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
            <CalendarIcon size={16} color="var(--primary)" strokeWidth={1.75} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--foreground)", lineHeight: 1 }}>{thisMonthAppointments.length}</div>
          <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4 }}>Appointments this month</div>
        </div>
        <div style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 14, padding: "16px 18px" }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
            <DollarSign size={16} color="var(--primary)" strokeWidth={1.75} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--foreground)", lineHeight: 1 }}>{formatMoney(monthTotal)}</div>
          <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4 }}>Estimated value this month</div>
        </div>
      </div>

      {error && <p style={{ color: "var(--destructive)", fontSize: 13, marginBottom: 16 }}>{error}</p>}

      {!loading && appointments.length === 0 && !error && (
        <div style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 20, padding: "48px 32px", textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <CalendarIcon size={26} color="var(--primary)" strokeWidth={1.75} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)", marginBottom: 8 }}>No appointments yet</h3>
          <p style={{ fontSize: 14, color: "var(--muted-foreground)", maxWidth: 380, margin: "0 auto 24px", lineHeight: 1.6 }}>
            Add one manually, or they'll appear here automatically once a missed-call text-back confirms a booking.
          </p>
          <button onClick={openCreate}
            style={{ padding: "10px 24px", background: "var(--primary)", color: "var(--primary-foreground)", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            Add your first appointment →
          </button>
        </div>
      )}

      {sortedKeys.map((key) => (
        <div key={key} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>
            {formatDateHeading(key)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {groups.get(key)!
              .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
              .map((appt) => {
                const s = STATUS_STYLES[appt.status];
                return (
                  <div key={appt.id} onClick={() => openEdit(appt)}
                    style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 14, padding: "14px 18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>{appt.customer_name}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: s.bg, color: s.color }}>{s.label}</span>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
                        {humanizeServiceType(appt.service_type)} · {new Date(appt.scheduled_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        {appt.customer_phone ? ` · ${appt.customer_phone}` : ""}
                      </div>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>{formatMoney(appt.estimated_value)}</div>
                  </div>
                );
              })}
          </div>
        </div>
      ))}

      {modal && (
        <div
          onClick={() => !saving && setModal(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}
        >
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--card)", borderRadius: 20, padding: 28, maxWidth: 460, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: "var(--foreground)" }}>
                {modal.mode === "create" ? "Add Appointment" : "Appointment details"}
              </div>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}>
                <X size={20} />
              </button>
            </div>

            {modal.mode === "create" && (
              <>
                <Field label="Customer name *">
                  <input style={inputStyle} value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} placeholder="e.g. John Smith" />
                </Field>
                <Field label="Phone">
                  <input style={inputStyle} value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} placeholder="e.g. 404-555-0100" />
                </Field>
                <Field label="Email">
                  <input style={inputStyle} value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} placeholder="e.g. john@example.com" />
                </Field>
                <Field label="Service type *">
                  <input style={inputStyle} value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })} placeholder="e.g. HVAC repair" />
                </Field>
              </>
            )}

            {modal.mode === "edit" && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>{modal.appointment.customer_name}</div>
                  <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
                    {humanizeServiceType(modal.appointment.service_type)}
                    {modal.appointment.customer_phone ? ` · ${modal.appointment.customer_phone}` : ""}
                  </div>
                </div>
                <Field label="Status">
                  <select style={inputStyle} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Appointment["status"] })}>
                    {(["pending", "confirmed", "completed", "cancelled", "no_show"] as const).map((s) => (
                      <option key={s} value={s}>{STATUS_STYLES[s].label}</option>
                    ))}
                  </select>
                </Field>
              </>
            )}

            <Field label="Date and time *">
              <input type="datetime-local" style={inputStyle} value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
            </Field>
            <Field label="Estimated value ($)">
              <input type="number" min={0} step={1} style={inputStyle} value={form.estimated_value} onChange={(e) => setForm({ ...form, estimated_value: e.target.value })} placeholder="e.g. 450" />
            </Field>
            <Field label="Notes">
              <textarea style={{ ...inputStyle, resize: "vertical" as const }} rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
            </Field>

            {formError && <p style={{ color: "var(--destructive)", fontSize: 13, marginBottom: 14 }}>{formError}</p>}

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleSave} disabled={saving}
                style={{ flex: 1, padding: 12, background: "var(--primary)", color: "var(--primary-foreground)", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving..." : modal.mode === "create" ? "Add appointment" : "Save changes"}
              </button>
              {modal.mode === "edit" && (
                <button onClick={handleDelete} disabled={saving}
                  style={{ padding: "12px 18px", background: "var(--card)", color: "var(--destructive)", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", display: "block", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}
