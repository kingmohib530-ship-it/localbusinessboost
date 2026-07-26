import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, TrendingUp, Gauge, Inbox, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { SERVICE_TYPE_LABELS, type ServiceTypeKey } from "@/lib/serviceTypes";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/network")({
  component: NetworkPage,
});

interface ConsumerAppointmentRow {
  status: string;
  created_at: string | null;
}

interface IncomingRequestRow {
  id: string;
  created_at: string;
  consumer_requests: {
    service_type: string;
    city: string;
    description: string | null;
  } | null;
}

interface AcceptedContact {
  email: string | null;
  phone: string | null;
  fullName: string | null;
}

const PAGE_SIZE = 20;

function NetworkPage() {
  const [loading, setLoading] = useState(true);
  const [accept, setAccept] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveOk, setSaveOk] = useState(true);
  const [appointments, setAppointments] = useState<ConsumerAppointmentRow[]>([]);
  const [loadError, setLoadError] = useState("");

  const [incoming, setIncoming] = useState<IncomingRequestRow[]>([]);
  const [incomingLoading, setIncomingLoading] = useState(true);
  const [incomingLoadingMore, setIncomingLoadingMore] = useState(false);
  const [incomingError, setIncomingError] = useState("");
  const [incomingHasMore, setIncomingHasMore] = useState(false);
  const [incomingPageIndex, setIncomingPageIndex] = useState(0);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [acceptedContacts, setAcceptedContacts] = useState<Record<string, AcceptedContact>>({});

  useEffect(() => {
    loadData();
    loadIncoming(0);
  }, []);

  async function loadIncoming(page: number) {
    if (page === 0) setIncomingLoading(true);
    else setIncomingLoadingMore(true);
    setIncomingError("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setIncomingLoading(false);
      setIncomingLoadingMore(false);
      return;
    }
    const from = page * PAGE_SIZE;
    const { data, error } = await supabase
      .from("consumer_request_matches")
      .select("id, created_at, consumer_requests(service_type, city, description)")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error("[network] failed to load incoming requests", error);
      setIncomingError("Couldn't load incoming requests. Please refresh the page.");
    }
    const rows = (data as unknown as IncomingRequestRow[]) || [];
    setIncoming((prev) => (page === 0 ? rows : [...prev, ...rows]));
    setIncomingHasMore(rows.length === PAGE_SIZE);
    setIncomingLoading(false);
    setIncomingLoadingMore(false);
  }

  async function respond(matchId: string, action: "accept" | "decline") {
    setRespondingId(matchId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Please sign in again and retry.");

      const res = await fetch(`/api/consumer-requests/${matchId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Couldn't respond to this request. Please try again.");

      if (action === "accept") {
        setAcceptedContacts((prev) => ({ ...prev, [matchId]: data.consumer }));
        toast.success("Request accepted — contact info below.");
      } else {
        setIncoming((prev) => prev.filter((r) => r.id !== matchId));
        toast.success("Request declined.");
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong. Please try again.");
    } finally {
      setRespondingId(null);
    }
  }

  async function loadData() {
    setLoading(true);
    setLoadError("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const [{ data: profile, error: profileError }, { data: appts, error: apptsError }] =
      await Promise.all([
        supabase.from("profiles").select("accept_consumer_leads").eq("id", user.id).single(),
        supabase
          .from("appointments")
          .select("status, created_at")
          .eq("user_id", user.id)
          .eq("source", "consumer_marketplace"),
      ]);

    if (profileError || apptsError) {
      console.error("[network] failed to load data", profileError || apptsError);
      setLoadError("Couldn't load your network data. Please refresh the page.");
    }

    setAccept(profile?.accept_consumer_leads ?? true);
    setAppointments((appts as ConsumerAppointmentRow[]) ?? []);
    setLoading(false);
  }

  async function toggleAccept() {
    const next = !accept;
    setAccept(next);
    setSaving(true);
    setSaveMsg("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ accept_consumer_leads: next })
      .eq("id", user.id);
    if (error) {
      setAccept(!next);
      setSaveOk(false);
      setSaveMsg("Could not save — please try again.");
    } else {
      setSaveOk(true);
      setSaveMsg("Saved!");
    }
    setSaving(false);
  }

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const thisMonth = appointments.filter(
    (a) => a.created_at && new Date(a.created_at) >= monthStart,
  );
  const leadsThisMonth = thisMonth.length;
  const keptCount = thisMonth.filter(
    (a) => a.status !== "cancelled" && a.status !== "no_show",
  ).length;
  const conversionRate = leadsThisMonth > 0 ? Math.round((keptCount / leadsThisMonth) * 100) : null;

  return (
    <div
      style={{
        padding: "24px 32px",
        maxWidth: 1080,
        margin: "0 auto",
        fontFamily: "Inter,-apple-system,sans-serif",
      }}
    >
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: "-0.025em",
            color: "var(--foreground)",
            margin: "0 0 6px",
          }}
        >
          Network
        </h1>
        <p style={{ fontSize: 15, color: "var(--muted-foreground)", margin: 0 }}>
          Leads from consumers who text the Lanavix Local marketplace number.
        </p>
      </div>

      {loading && (
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 16 }}>
          Loading...
        </p>
      )}
      {loadError && (
        <p style={{ color: "var(--destructive)", fontSize: 13, marginBottom: 16 }}>{loadError}</p>
      )}

      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, marginBottom: 24 }}
      >
        <div
          style={{
            background: "var(--card)",
            border: "1.5px solid var(--border)",
            borderRadius: 14,
            padding: "16px 18px",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 10,
            }}
          >
            <Users size={16} color="var(--primary)" strokeWidth={1.75} />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--foreground)", lineHeight: 1 }}>
            {loading ? "—" : leadsThisMonth}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4 }}>
            Consumer leads this month
          </div>
        </div>
        <div
          style={{
            background: "var(--card)",
            border: "1.5px solid var(--border)",
            borderRadius: 14,
            padding: "16px 18px",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 10,
            }}
          >
            <TrendingUp size={16} color="var(--primary)" strokeWidth={1.75} />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--foreground)", lineHeight: 1 }}>
            {loading ? "—" : conversionRate === null ? "—" : `${conversionRate}%`}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4 }}>
            Kept (not cancelled / no-show)
          </div>
        </div>
      </div>

      <div
        style={{
          background: "var(--card)",
          border: "1.5px solid var(--border)",
          borderRadius: 16,
          padding: 24,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}
            >
              Accept consumer marketplace leads
            </div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
              When on, consumers who text Lanavix Local looking for your service in your city can be
              matched and booked directly onto your calendar.
            </div>
          </div>
          <Switch checked={accept} onCheckedChange={toggleAccept} disabled={saving || loading} />
        </div>
        {saveMsg && (
          <div
            style={{
              fontSize: 12,
              color: saveOk ? "var(--accent-2)" : "var(--destructive)",
              marginTop: 10,
            }}
          >
            {saveMsg}
          </div>
        )}
      </div>

      <div
        style={{
          background: "var(--card)",
          border: "1.5px solid var(--border)",
          borderRadius: 16,
          padding: 24,
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Inbox size={16} color="var(--primary)" strokeWidth={1.75} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>
            Incoming requests
          </div>
        </div>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 14 }}>
          Consumers who requested a service through Lanavix Network. Review and accept before any
          contact happens — declining lets us offer it to the next matched business.
        </p>

        {incomingError && (
          <p style={{ fontSize: 12, color: "var(--destructive)", marginBottom: 10 }}>
            {incomingError}
          </p>
        )}

        {incomingLoading ? (
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Loading...</p>
        ) : incoming.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
            No incoming requests right now.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {incoming.map((row) => {
              const details = row.consumer_requests;
              const contact = acceptedContacts[row.id];
              return (
                <div
                  key={row.id}
                  style={{ padding: "12px 14px", background: "var(--muted)", borderRadius: 10 }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
                        {details
                          ? SERVICE_TYPE_LABELS[details.service_type as ServiceTypeKey] ||
                            details.service_type
                          : "Service request"}
                        {details?.city ? ` · ${details.city}` : ""}
                      </div>
                      {details?.description && (
                        <div
                          style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}
                        >
                          {details.description}
                        </div>
                      )}
                    </div>
                    {!contact && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => respond(row.id, "accept")}
                          disabled={respondingId === row.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "7px 14px",
                            background: "var(--primary)",
                            color: "var(--primary-foreground)",
                            border: "none",
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          <Check size={13} /> Accept
                        </button>
                        <button
                          onClick={() => respond(row.id, "decline")}
                          disabled={respondingId === row.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "7px 14px",
                            background: "var(--card)",
                            color: "var(--destructive)",
                            border: "1.5px solid var(--border)",
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          <X size={13} /> Decline
                        </button>
                      </div>
                    )}
                  </div>
                  {contact && (
                    <div style={{ fontSize: 12, color: "var(--accent-2)", marginTop: 8 }}>
                      Accepted — contact: {contact.fullName || "the customer"}
                      {contact.phone ? `, ${contact.phone}` : ""}
                      {contact.email ? `, ${contact.email}` : ""}
                    </div>
                  )}
                </div>
              );
            })}
            {incomingHasMore && (
              <button
                onClick={() => {
                  const next = incomingPageIndex + 1;
                  setIncomingPageIndex(next);
                  loadIncoming(next);
                }}
                disabled={incomingLoadingMore}
                style={{
                  alignSelf: "center",
                  marginTop: 4,
                  padding: "8px 16px",
                  background: "var(--card)",
                  color: "var(--foreground)",
                  border: "1.5px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {incomingLoadingMore ? "Loading..." : "Load more"}
              </button>
            )}
          </div>
        )}
      </div>

      <div
        style={{
          background: "var(--card)",
          border: "1.5px solid var(--border)",
          borderRadius: 16,
          padding: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Gauge size={16} color="var(--primary)" strokeWidth={1.75} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>
            Network Score
          </div>
        </div>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6, margin: 0 }}>
          Coming soon — your Network Score will rank how often you're matched to consumer leads
          based on response speed, reviews, and booking completion rate.
        </p>
      </div>
    </div>
  );
}
