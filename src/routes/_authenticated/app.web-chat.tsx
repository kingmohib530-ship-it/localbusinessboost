import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { MessageCircle, Reply, CheckCircle2, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GlowPanel } from "@/components/GlowPanel";
import { useMountReveal } from "@/hooks/use-mount-reveal";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

export const Route = createFileRoute("/_authenticated/app/web-chat")({
  component: WebChatPage,
});

interface Conversation {
  id: string;
  customer_identifier: string;
  customer_name: string | null;
  started_at: string;
  status: string;
  notes: string | null;
}

interface Message {
  id: string;
  direction: string;
  message: string;
  sent_at: string;
}

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  received: { bg: "var(--muted)", color: "var(--muted-foreground)", label: "Started" },
  replied: { bg: "var(--accent)", color: "var(--accent-2)", label: "Replied" },
  booked: { bg: "var(--accent)", color: "var(--accent-2)", label: "Booked ✓" },
  no_response: { bg: "var(--muted)", color: "var(--muted-foreground)", label: "No response" },
};

const PAGE_SIZE = 20;

function visitorLabel(conversation: Conversation): string {
  if (conversation.customer_name) return conversation.customer_name;
  return `Website visitor #${conversation.customer_identifier.slice(0, 8)}`;
}

function WebChatPage() {
  const [userId, setUserId] = useState("");
  const [embedCopied, setEmbedCopied] = useState(false);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [chatStats, setChatStats] = useState({ total: 0, replied: 0 });
  const [appointmentsBooked, setAppointmentsBooked] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    loadProfile();
    loadConversations(0);
    loadChatStats();
    loadAppointmentsBooked();
  }, []);

  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
  }

  const embedSnippet = userId
    ? `<script src="${window.location.origin}/lanavix-widget.js" data-business="${userId}" async></script>`
    : "";

  async function copyEmbedSnippet() {
    try {
      await navigator.clipboard.writeText(embedSnippet);
      setEmbedCopied(true);
      setTimeout(() => setEmbedCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy - please select and copy the code manually.");
    }
  }

  /**
   * Independent of the paginated conversation list below - "replied" needs
   * an accurate all-time count regardless of how many pages have loaded.
   * Counts use head:true, a real SQL COUNT rather than a row fetch.
   */
  async function loadChatStats() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const [total, replied] = await Promise.all([
      supabase
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("channel", "web_chat"),
      supabase
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("channel", "web_chat")
        .in("status", ["replied", "booked"]),
    ]);
    setChatStats({ total: total.count ?? 0, replied: replied.count ?? 0 });
  }

  async function loadAppointmentsBooked() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { count } = await supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("source", "web_chat");
    setAppointmentsBooked(count || 0);
  }

  async function loadConversations(page: number) {
    if (page === 0) setLoading(true);
    else setLoadingMore(true);
    setLoadError("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setLoadingMore(false);
      return;
    }
    const from = page * PAGE_SIZE;
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", user.id)
      .eq("channel", "web_chat")
      .order("started_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error("[web-chat] failed to load conversations", error);
      setLoadError("Couldn't load your web chat conversations. Please refresh the page.");
    }
    const rows = data || [];
    setConversations((prev) => (page === 0 ? rows : [...prev, ...rows]));
    setHasMore(rows.length === PAGE_SIZE);
    setLoading(false);
    setLoadingMore(false);
  }

  async function loadMessages(conversationId: string) {
    setSelected(conversationId);
    const { data } = await supabase
      .from("conversation_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("sent_at", { ascending: true });
    setMessages(data || []);
  }

  const stats = {
    total: chatStats.total,
    replied: chatStats.replied,
    booked: appointmentsBooked,
  };

  const selectedConversation = conversations.find((c) => c.id === selected);
  const reducedMotion = usePrefersReducedMotion();
  const { step, delay } = useMountReveal();

  return (
    <div
      style={{
        padding: "24px 32px",
        maxWidth: 1080,
        margin: "0 auto",
        fontFamily: "Inter,-apple-system,sans-serif",
      }}
    >
      {/* Header */}
      <div className={step} style={{ marginBottom: 28, ...delay(0) }}>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: "-0.025em",
            color: "var(--foreground)",
            margin: "0 0 6px",
          }}
        >
          Web Chat
        </h1>
        <p style={{ fontSize: 15, color: "var(--muted-foreground)", margin: 0 }}>
          Let visitors on your website chat with your AI receptionist, day or night.
        </p>
      </div>

      {loadError && (
        <p style={{ color: "var(--destructive)", fontSize: 13, marginBottom: 20 }}>{loadError}</p>
      )}

      {/* Embed code + live preview */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div
          className={`${step} glass-dark`}
          style={{ borderRadius: 16, padding: 24, ...delay(1) }}
        >
          <div
            style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}
          >
            Add it to your website
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--muted-foreground)",
              marginBottom: 14,
              lineHeight: 1.5,
            }}
          >
            Paste this snippet into your website's HTML (just before the closing &lt;/body&gt; tag)
            to add a chat bubble that talks to visitors. It uses the greeting, business hours, and
            escalation rules configured on the Receptionist Setup tab.
          </div>
          <div style={{ position: "relative" }}>
            <pre
              style={{
                margin: 0,
                padding: "12px 44px 12px 14px",
                background: "var(--muted)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                fontSize: 12,
                fontFamily: "monospace",
                color: "var(--foreground)",
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              {embedSnippet || "Loading..."}
            </pre>
            <button
              onClick={copyEmbedSnippet}
              disabled={!embedSnippet}
              aria-label="Copy embed code"
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                padding: 6,
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                cursor: embedSnippet ? "pointer" : "not-allowed",
                display: "flex",
              }}
            >
              {embedCopied ? (
                <Check size={14} color="var(--accent-2)" />
              ) : (
                <Copy size={14} color="var(--muted-foreground)" />
              )}
            </button>
          </div>
        </div>

        <div
          className={`${step} glass-dark`}
          style={{ borderRadius: 16, padding: 24, ...delay(2) }}
        >
          <div
            style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}
          >
            Live preview
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--muted-foreground)",
              marginBottom: 14,
              lineHeight: 1.5,
            }}
          >
            This is exactly what visitors see and use on your site. Click the bubble to try it.
          </div>
          {userId ? (
            <iframe
              title="Web chat widget preview"
              src={`/widget-preview.html?business=${userId}`}
              style={{
                width: "100%",
                height: 360,
                border: "1px solid var(--border)",
                borderRadius: 10,
                background: "var(--muted)",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: 360,
                border: "1px solid var(--border)",
                borderRadius: 10,
                background: "var(--muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--muted-foreground)",
                fontSize: 13,
              }}
            >
              Loading preview...
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}
      >
        {[
          { label: "Chats started", value: stats.total, Icon: MessageCircle },
          { label: "Conversations handled", value: stats.replied, Icon: Reply },
          { label: "Appointments booked", value: stats.booked, Icon: CheckCircle2 },
        ].map((s, i) => (
          <GlowPanel
            key={s.label}
            reducedMotion={reducedMotion}
            className={`${step} glass-dark hover-lift-dark rounded-2xl`}
            style={{ padding: "16px 18px", ...delay(i + 3) }}
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
              <s.Icon size={16} color="var(--primary)" strokeWidth={1.75} />
            </div>
            <div
              style={{ fontSize: 26, fontWeight: 800, color: "var(--foreground)", lineHeight: 1 }}
            >
              {s.value}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4 }}>
              {s.label}
            </div>
          </GlowPanel>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div
          className="glass-dark"
          style={{
            borderRadius: 20,
            padding: 48,
            textAlign: "center",
            color: "var(--muted-foreground)",
            fontSize: 14,
          }}
        >
          Loading...
        </div>
      )}

      {/* Empty state */}
      {!loading && conversations.length === 0 && (
        <div
          className={`${step} glass-dark`}
          style={{ borderRadius: 20, padding: "48px 32px", textAlign: "center", ...delay(6) }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <MessageCircle size={26} color="var(--primary)" strokeWidth={1.75} />
          </div>
          <h3
            style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)", marginBottom: 8 }}
          >
            No web chat conversations yet
          </h3>
          <p
            style={{
              fontSize: 14,
              color: "var(--muted-foreground)",
              maxWidth: 380,
              margin: "0 auto",
              lineHeight: 1.6,
            }}
          >
            Add the snippet above to your website, then visitor conversations will appear here. Try
            the live preview above to see it in action right now.
          </p>
        </div>
      )}

      {/* Conversation list + thread */}
      {conversations.length > 0 && (
        <div
          style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1fr" : "1fr", gap: 16 }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {conversations.map((conversation) => {
              const s = STATUS_COLORS[conversation.status] || STATUS_COLORS.received;
              return (
                <GlowPanel
                  key={conversation.id}
                  reducedMotion={reducedMotion}
                  onClick={() => loadMessages(conversation.id)}
                  className="glass-dark hover-lift-dark rounded-2xl"
                  style={{
                    border: `1.5px solid ${selected === conversation.id ? "var(--primary)" : "var(--border)"}`,
                    padding: "14px 18px",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>
                      {visitorLabel(conversation)}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: s.bg,
                        color: s.color,
                      }}
                    >
                      {s.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
                    {new Date(conversation.started_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>
                  {conversation.notes && (
                    <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 6 }}>
                      {conversation.notes}
                    </div>
                  )}
                </GlowPanel>
              );
            })}
            {hasMore && (
              <button
                onClick={() => {
                  const next = pageIndex + 1;
                  setPageIndex(next);
                  loadConversations(next);
                }}
                disabled={loadingMore}
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
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            )}
          </div>

          {selected && selectedConversation && (
            <div
              className="glass-dark hd-blur-in"
              style={{
                borderRadius: 16,
                padding: 20,
                display: "flex",
                flexDirection: "column",
                height: "fit-content",
                maxHeight: 500,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>
                    {visitorLabel(selectedConversation)}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                    Web chat conversation
                  </div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  style={{
                    fontSize: 18,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--muted-foreground)",
                  }}
                >
                  ×
                </button>
              </div>
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {messages.length === 0 && (
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--muted-foreground)",
                      textAlign: "center",
                      marginTop: 16,
                    }}
                  >
                    No messages yet
                  </p>
                )}
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      display: "flex",
                      justifyContent: msg.direction === "outbound" ? "flex-end" : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "80%",
                        padding: "8px 12px",
                        borderRadius:
                          msg.direction === "outbound"
                            ? "12px 12px 2px 12px"
                            : "12px 12px 12px 2px",
                        background:
                          msg.direction === "outbound" ? "var(--primary)" : "var(--secondary)",
                        color:
                          msg.direction === "outbound"
                            ? "var(--primary-foreground)"
                            : "var(--foreground)",
                        fontSize: 13,
                      }}
                    >
                      {msg.message}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
