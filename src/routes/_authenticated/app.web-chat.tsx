import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { MessageCircle, Reply, CheckCircle2, Copy, Check, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusDot, type LvStatus } from "@/components/StatusDot";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/timeFormat";

export const Route = createFileRoute("/_authenticated/app/web-chat")({
  component: WebChatPage,
});

// Same "has a real, live subscription" definition used across the app
// (pricing.tsx, app.billing.tsx, the Stripe webhook, Outreach) - duplicated
// here since this is client code and those live in server-only files.
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due"]);

interface Conversation {
  id: string;
  customer_identifier: string;
  customer_name: string | null;
  started_at: string;
  notes: string | null;
}

interface ConversationComputed extends Conversation {
  latestDirection: "inbound" | "outbound" | null;
}

interface Message {
  id: string;
  direction: string;
  message: string;
  sent_at: string;
}

const PAGE_SIZE = 20;

function visitorLabel(conversation: Conversation): string {
  if (conversation.customer_name) return conversation.customer_name;
  return `Website visitor #${conversation.customer_identifier.slice(0, 8)}`;
}

// Matches Inbox's own status derivation exactly (app.inbox.tsx's
// conversationStatus): conversations.status only ever reaches "received" or
// "replied" for web chat in practice (the backend never writes "booked" or
// "no_response" - a booking becomes its own appointments row instead, shown
// as its own stat below), so status is derived from the latest message's
// direction rather than trusted from that column. Keeping both pages on
// the same real signal is what makes "this connects to Inbox" true rather
// than just a claim.
function conversationStatus(c: ConversationComputed): LvStatus {
  if (c.latestDirection === "inbound" || c.latestDirection === null) return "waiting_on_you";
  return "automated";
}

function WebChatPage() {
  const [userId, setUserId] = useState("");
  const [isPaidActive, setIsPaidActive] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
  const [embedCopied, setEmbedCopied] = useState(false);

  const [conversations, setConversations] = useState<ConversationComputed[]>([]);
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
    const { data } = await supabase
      .from("profiles")
      .select("subscription_tier, subscription_status")
      .eq("id", user.id)
      .maybeSingle();
    setSubscriptionTier(data?.subscription_tier ?? null);
    setIsPaidActive(
      !!data?.subscription_tier &&
        data.subscription_tier !== "starter" &&
        ACTIVE_SUBSCRIPTION_STATUSES.has(data?.subscription_status ?? ""),
    );
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
      .select("id, customer_identifier, customer_name, started_at, notes")
      .eq("user_id", user.id)
      .eq("channel", "web_chat")
      .order("started_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error("[web-chat] failed to load conversations", error);
      setLoadError("Couldn't load your web chat conversations. Please refresh the page.");
      setLoading(false);
      setLoadingMore(false);
      return;
    }
    const rows = (data as Conversation[]) ?? [];

    const ids = rows.map((r) => r.id);
    const { data: msgRows } = ids.length
      ? await supabase
          .from("conversation_messages")
          .select("conversation_id, direction, sent_at")
          .in("conversation_id", ids)
          .order("sent_at", { ascending: false })
      : { data: [] };
    const latestByConv = new Map<string, string>();
    for (const m of (msgRows as { conversation_id: string; direction: string }[]) ?? []) {
      if (!latestByConv.has(m.conversation_id)) latestByConv.set(m.conversation_id, m.direction);
    }
    const computed: ConversationComputed[] = rows.map((c) => ({
      ...c,
      latestDirection: (latestByConv.get(c.id) as "inbound" | "outbound" | undefined) ?? null,
    }));

    setConversations((prev) => (page === 0 ? computed : [...prev, ...computed]));
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

  return (
    <div className="lv-light min-h-full bg-background">
      <div className="max-w-[1080px] mx-auto px-4 md:px-8 py-6 md:py-8">
        <div className="mb-6">
          <h1 className="lv-page-title text-foreground">Web Chat</h1>
          <p className="lv-body text-muted-foreground mt-1">
            Let visitors on your website chat with your AI receptionist, day or night.
          </p>
        </div>

        {isPaidActive ? (
          <div className="rounded-md border border-border bg-card px-4 py-3 mb-6">
            <p className="lv-meta text-muted-foreground">
              Included on your {subscriptionTier ? `${subscriptionTier} ` : ""}plan — unlimited
              conversations.
            </p>
          </div>
        ) : (
          <div className="rounded-md border border-border bg-card px-4 py-3 mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="lv-label text-foreground">Web Chat requires an active plan</p>
              <p className="lv-meta text-muted-foreground mt-0.5">
                Subscribe to Solo, Crew, or Agency to unlock the website chat widget.
              </p>
            </div>
            <Button size="sm" asChild className="shrink-0">
              <Link to="/app/billing">Upgrade now</Link>
            </Button>
          </div>
        )}

        {loadError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 mb-6">
            <p className="lv-label text-destructive">Couldn't load conversations</p>
            <p className="lv-body text-foreground mt-0.5">{loadError}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                setPageIndex(0);
                loadConversations(0);
              }}
            >
              Try again
            </Button>
          </div>
        )}

        {/* Embed code + live preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="rounded-md border border-border bg-card p-5">
            <h2 className="lv-label text-foreground mb-1">Add it to your website</h2>
            <p className="lv-meta text-muted-foreground mb-3.5 leading-relaxed">
              Paste this snippet into your website's HTML (just before the closing{" "}
              <code className="lv-meta">&lt;/body&gt;</code> tag) to add a chat bubble that talks to
              visitors. It uses the greeting, business hours, and escalation rules configured in{" "}
              <Link to="/app/receptionist" className="text-primary underline underline-offset-2">
                Receptionist Setup
              </Link>
              .
            </p>
            <div className="relative">
              <pre
                aria-label="Web chat embed code"
                className="m-0 rounded-md border border-border bg-muted px-3.5 py-3 pr-11 text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap break-all"
              >
                <code>{embedSnippet || "Loading..."}</code>
              </pre>
              <button
                type="button"
                onClick={copyEmbedSnippet}
                disabled={!embedSnippet}
                aria-label="Copy embed code"
                className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-sm border border-border bg-card text-muted-foreground hover:bg-accent transition-colors duration-150 ease-out disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {embedCopied ? (
                  <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                ) : (
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </button>
            </div>
            <p className="lv-meta text-muted-foreground mt-2">
              The code above only identifies which business the widget belongs to - it isn't a
              secret and is safe to paste into your site's public HTML.
            </p>
          </div>

          <div className="rounded-md border border-border bg-card p-5">
            <h2 className="lv-label text-foreground mb-1">Live preview</h2>
            <p className="lv-meta text-muted-foreground mb-3.5 leading-relaxed">
              This is exactly what visitors see and use on your site. Click the bubble to try it.
            </p>
            {userId ? (
              <iframe
                title="Web chat widget preview"
                src={`/widget-preview.html?business=${userId}`}
                className="w-full rounded-md border border-border bg-muted"
                style={{ height: 360 }}
              />
            ) : (
              <div
                className="w-full rounded-md border border-border bg-muted flex items-center justify-center lv-meta text-muted-foreground"
                style={{ height: 360 }}
              >
                Loading preview...
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Chats started", value: stats.total, Icon: MessageCircle },
            { label: "Conversations handled", value: stats.replied, Icon: Reply },
            { label: "Appointments booked", value: stats.booked, Icon: CheckCircle2 },
          ].map((s) => (
            <div key={s.label} className="rounded-md border border-border bg-card p-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-accent text-primary mb-2.5">
                <s.Icon className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="lv-numbers text-foreground text-2xl">{s.value}</div>
              <div className="lv-meta text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="rounded-md border border-border bg-card p-5 space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[64px] w-full rounded-md" />
            ))}
          </div>
        )}

        {/* Empty state - guarded on !loadError too, otherwise a failed load
            (conversations stays []) would show this right next to the error
            message above, telling the contractor to add a snippet they may
            have already added. */}
        {!loading && !loadError && conversations.length === 0 && (
          <div className="rounded-md border border-border py-12 px-6 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-sm bg-accent text-primary">
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="lv-body text-foreground font-medium">No web chat conversations yet</p>
            <p className="lv-meta text-muted-foreground mt-1 max-w-sm mx-auto">
              Add the snippet above to your website, then visitor conversations will appear here.
              Try the live preview above to see it in action right now.
            </p>
          </div>
        )}

        {/* Conversation list + thread */}
        {conversations.length > 0 && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h2 className="lv-section text-foreground">Recent conversations</h2>
              <Button asChild variant="outline" size="sm" className="gap-1.5 shrink-0">
                <Link to="/app/inbox">
                  Open in Inbox <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </Button>
            </div>

            <div
              className={cn("grid gap-4", selected ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}
            >
              <div className="flex flex-col gap-2">
                {conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => loadMessages(conversation.id)}
                    className={cn(
                      "text-left rounded-md border bg-card px-4 py-3 min-h-[44px] hover:bg-accent transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selected === conversation.id ? "border-primary" : "border-border",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="lv-body text-foreground font-medium truncate">
                        {visitorLabel(conversation)}
                      </span>
                      <StatusDot status={conversationStatus(conversation)} className="shrink-0" />
                    </div>
                    <div className="lv-meta text-muted-foreground">
                      {relativeTime(conversation.started_at)} ago
                    </div>
                    {conversation.notes && (
                      <div className="lv-meta text-muted-foreground mt-1.5 truncate">
                        {conversation.notes}
                      </div>
                    )}
                  </button>
                ))}
                {hasMore && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="self-center mt-1 min-h-[44px]"
                    onClick={() => {
                      const next = pageIndex + 1;
                      setPageIndex(next);
                      loadConversations(next);
                    }}
                    disabled={loadingMore}
                  >
                    {loadingMore ? "Loading..." : "Load more"}
                  </Button>
                )}
              </div>

              {selected && selectedConversation && (
                <div className="rounded-md border border-border bg-card p-4 flex flex-col h-fit max-h-[500px]">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <div className="lv-body text-foreground font-medium truncate">
                        {visitorLabel(selectedConversation)}
                      </div>
                      <div className="lv-meta text-muted-foreground">Web chat conversation</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelected(null)}
                      aria-label="Close conversation"
                      className="shrink-0 flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-lg"
                    >
                      ×
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto flex flex-col gap-2">
                    {messages.length === 0 && (
                      <p className="lv-meta text-muted-foreground text-center mt-4">
                        No messages yet
                      </p>
                    )}
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex",
                          msg.direction === "outbound" ? "justify-end" : "justify-start",
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[80%] px-3 py-2 lv-body",
                            msg.direction === "outbound"
                              ? "bg-primary text-primary-foreground rounded-[12px_12px_2px_12px]"
                              : "bg-secondary text-foreground rounded-[12px_12px_12px_2px]",
                          )}
                        >
                          {msg.message}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
