import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, MessageCircle, Phone, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusDot, type LvStatus } from "@/components/StatusDot";
import { cn } from "@/lib/utils";
import { relativeTime, formatTime } from "@/lib/timeFormat";

export const Route = createFileRoute("/_authenticated/app/inbox")({
  component: Inbox,
});

interface ConversationRow {
  id: string;
  customer_name: string | null;
  customer_identifier: string;
  channel: string;
  status: string;
  started_at: string;
  last_message_at: string | null;
}

interface ConversationComputed extends ConversationRow {
  latestDirection: "inbound" | "outbound" | null;
  waitingSince: string | null;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  direction: string;
  message: string;
  sent_at: string;
}

const PAGE_SIZE = 30;
const POLL_INTERVAL_MS = 10000;
const PHONE_LIKE = /^\+?[\d\s().-]{7,}$/;

function conversationLabel(c: ConversationRow): string {
  if (c.customer_name) return c.customer_name;
  if (c.channel === "web_chat") return `Website visitor #${c.id.slice(0, 8)}`;
  return c.customer_identifier;
}

// Current main has no way to distinguish "a human took over this reply"
// from "the AI replied" - conversations.ai_paused doesn't exist in the
// schema and nothing writes it. Status here only reflects what's real:
// still waiting on a reply, or the AI already replied.
function conversationStatus(c: ConversationComputed): LvStatus {
  if (c.latestDirection === "inbound" || c.latestDirection === null) return "waiting_on_you";
  return "automated";
}

function channelLabel(channel: string): string {
  return channel === "web_chat" ? "Web chat" : "Text";
}

function Inbox() {
  const [conversations, setConversations] = useState<ConversationComputed[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [listError, setListError] = useState("");
  const [everCount, setEverCount] = useState<number | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState("");

  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;
  const threadEndRef = useRef<HTMLDivElement>(null);

  async function loadConversations(uptoPage: number, opts?: { silent?: boolean }) {
    if (!opts?.silent) setLoading(uptoPage === 0);
    if (!opts?.silent && uptoPage > 0) setLoadingMore(true);
    setListError("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    const limit = (uptoPage + 1) * PAGE_SIZE;
    const [{ data: convRows, error: convErr }, { count }] = await Promise.all([
      supabase
        .from("conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(limit),
      supabase
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);
    if (convErr) {
      console.error("[inbox] failed to load conversations", convErr);
      setListError("Couldn't load your conversations. Please refresh the page.");
      setLoading(false);
      setLoadingMore(false);
      return;
    }
    setEverCount(count ?? 0);

    const rows = (convRows as ConversationRow[]) ?? [];
    const ids = rows.map((r) => r.id);
    const { data: msgRows } = ids.length
      ? await supabase
          .from("conversation_messages")
          .select("conversation_id, direction, sent_at")
          .in("conversation_id", ids)
          .order("sent_at", { ascending: false })
      : { data: [] };

    const latestByConv = new Map<string, { direction: string; sent_at: string }>();
    for (const m of (msgRows as {
      conversation_id: string;
      direction: string;
      sent_at: string;
    }[]) ?? []) {
      if (!latestByConv.has(m.conversation_id)) latestByConv.set(m.conversation_id, m);
    }

    const computed: ConversationComputed[] = rows.map((c) => {
      const latest = latestByConv.get(c.id);
      return {
        ...c,
        latestDirection: (latest?.direction as "inbound" | "outbound" | undefined) ?? null,
        waitingSince: latest?.direction === "inbound" ? latest.sent_at : null,
      };
    });

    // Waiting-on-you conversations float to the top, oldest wait first
    // (same urgency logic as Overview's Needs You); everything else
    // follows by most recent activity.
    const waiting = computed
      .filter((c) => c.waitingSince)
      .sort((a, b) => new Date(a.waitingSince!).getTime() - new Date(b.waitingSince!).getTime());
    const rest = computed
      .filter((c) => !c.waitingSince)
      .sort(
        (a, b) =>
          new Date(b.last_message_at || b.started_at).getTime() -
          new Date(a.last_message_at || a.started_at).getTime(),
      );

    setConversations([...waiting, ...rest]);
    setHasMore(rows.length === limit);
    setPageIndex(uptoPage);
    setLoading(false);
    setLoadingMore(false);
  }

  async function loadMessages(conversationId: string, opts?: { silent?: boolean }) {
    if (!opts?.silent) setMessagesLoading(true);
    setMessagesError("");
    const { data, error } = await supabase
      .from("conversation_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("sent_at", { ascending: true })
      .limit(200);
    if (error) {
      console.error("[inbox] failed to load messages", error);
      setMessagesError("Couldn't load this conversation. Please try again.");
    } else {
      setMessages((data as MessageRow[]) ?? []);
    }
    if (!opts?.silent) setMessagesLoading(false);
  }

  function openConversation(id: string) {
    setSelectedId(id);
    setSeenIds((prev) => new Set(prev).add(id));
    loadMessages(id);
  }

  useEffect(() => {
    loadConversations(0);
    const interval = window.setInterval(() => {
      loadConversations(pageIndex, { silent: true });
      if (selectedIdRef.current) loadMessages(selectedIdRef.current, { silent: true });
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages, selectedId]);

  const selectedConversation = conversations.find((c) => c.id === selectedId) || null;
  // Same definition of "waiting" the row StatusDots use (conversationStatus) -
  // computing this from a different condition than the badges themselves
  // display is how you get a "you're caught up" banner sitting above a
  // list full of "Waiting on you" rows.
  const waitingCount = useMemo(
    () => conversations.filter((c) => conversationStatus(c) === "waiting_on_you").length,
    [conversations],
  );
  const isFirstRun = !loading && !listError && (everCount ?? 0) === 0;
  const isCaughtUp = !loading && !listError && (everCount ?? 0) > 0 && waitingCount === 0;

  return (
    <div className="lv-light min-h-full bg-background flex flex-col md:flex-row md:h-full">
      {/* Conversation list - primary view on mobile, left pane on desktop */}
      <div
        className={cn(
          "w-full md:w-[280px] lg:w-[360px] md:shrink-0 md:border-r md:border-border flex flex-col min-h-0",
          selectedId ? "hidden md:flex" : "flex",
        )}
      >
        <div className="px-4 md:px-5 py-4 border-b border-border shrink-0">
          <h1 className="lv-page-title text-foreground">Inbox</h1>
        </div>

        {listError && (
          <div className="mx-4 mt-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
            <p className="lv-meta text-destructive">{listError}</p>
          </div>
        )}

        {loading ? (
          <div className="p-4 space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-[64px] w-full rounded-md" />
            ))}
          </div>
        ) : isFirstRun ? (
          <div className="p-6 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-sm bg-accent text-primary">
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="lv-body text-foreground font-medium">No conversations yet</p>
            <p className="lv-meta text-muted-foreground mt-1">
              Customer texts and web chat messages will show up here.
            </p>
          </div>
        ) : (
          <>
            {isCaughtUp && (
              <div className="mx-4 mt-3 rounded-md border border-border bg-card px-3 py-2.5">
                <p className="lv-label text-foreground">You're caught up</p>
                <p className="lv-meta text-muted-foreground">No one's waiting on a reply.</p>
              </div>
            )}
            <ul className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
              {conversations.map((c) => {
                const unread = c.latestDirection === "inbound" && !seenIds.has(c.id);
                const active = c.id === selectedId;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => openConversation(c.id)}
                      className={cn(
                        "w-full text-left rounded-md px-3 py-3 min-h-[44px] transition-colors duration-150 ease-out",
                        active ? "bg-accent" : "hover:bg-accent",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "lv-body truncate",
                            unread
                              ? "text-foreground font-semibold"
                              : "text-foreground font-medium",
                          )}
                          title={conversationLabel(c)}
                        >
                          {conversationLabel(c)}
                        </span>
                        <span className="lv-meta text-muted-foreground shrink-0">
                          {relativeTime(c.last_message_at || c.started_at)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <StatusDot status={conversationStatus(c)} className="shrink-0" />
                        {unread && (
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-primary shrink-0"
                            aria-label="Unread"
                          />
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
            {hasMore && (
              <div className="p-3 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={loadingMore}
                  onClick={() => loadConversations(pageIndex + 1)}
                >
                  {loadingMore ? "Loading..." : "Load more"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail pane - fixed full-screen overlay on mobile, right pane on desktop */}
      <div
        className={cn(
          "flex-col min-h-0 min-w-0 bg-background",
          selectedId
            ? "fixed inset-0 z-30 flex md:static md:z-auto md:flex-1"
            : "hidden md:flex md:flex-1",
        )}
      >
        {!selectedConversation ? (
          <div className="hidden md:flex flex-1 items-center justify-center">
            <p className="lv-body text-muted-foreground">Select a conversation</p>
          </div>
        ) : (
          <>
            <div className="h-[52px] shrink-0 border-b border-border px-3 md:px-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="md:hidden flex h-9 w-9 items-center justify-center rounded-sm text-foreground hover:bg-accent shrink-0"
                aria-label="Back to conversations"
              >
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="lv-body text-foreground font-medium truncate">
                  {conversationLabel(selectedConversation)}
                </p>
                <div className="flex items-center gap-2">
                  <StatusDot status={conversationStatus(selectedConversation)} />
                  <span className="lv-meta text-muted-foreground">
                    · {channelLabel(selectedConversation.channel)}
                  </span>
                </div>
              </div>
              {PHONE_LIKE.test(selectedConversation.customer_identifier) && (
                <a
                  href={`tel:${selectedConversation.customer_identifier}`}
                  className="flex h-9 w-9 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground shrink-0"
                  aria-label="Call"
                >
                  <Phone className="h-4 w-4" aria-hidden="true" />
                </a>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messagesLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-2/3 rounded-md" />
                  <Skeleton className="h-10 w-1/2 rounded-md ml-auto" />
                  <Skeleton className="h-10 w-3/5 rounded-md" />
                </div>
              ) : messagesError ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
                  <p className="lv-meta text-destructive">{messagesError}</p>
                </div>
              ) : messages.length === 0 ? (
                <p className="lv-meta text-muted-foreground text-center mt-6">No messages yet</p>
              ) : (
                <>
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "flex",
                        m.direction === "outbound" ? "justify-end" : "justify-start",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] md:max-w-[70%] rounded-md px-3 py-2 lv-body",
                          m.direction === "outbound"
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-foreground",
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.message}</p>
                        <p
                          className={cn(
                            "lv-meta mt-1",
                            m.direction === "outbound"
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground",
                          )}
                        >
                          {formatTime(m.sent_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              )}
              <div ref={threadEndRef} />
            </div>

            {/* Slice 2 note: current main has no authenticated endpoint that
                sends an outbound message, and conversations has no ai_paused
                (or equivalent) column - every conversation_messages row
                today is written by an automated webhook (Telnyx SMS/voice,
                web chat, the quote follow-up cron), never by a signed-in
                user. Faking a working composer here would mean a
                contractor believes they replied (and paused the AI) when
                neither actually happened. The composer stays visible for
                layout/design parity but is disabled with an honest
                explanation instead - see the Slice 2 report for what a real
                send endpoint would need. */}
            <div className="shrink-0 border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <p className="lv-meta text-muted-foreground mb-2">
                Replying from Inbox isn't available yet - conversations are handled automatically by
                your AI receptionist.
              </p>
              <div className="flex items-end gap-2">
                <Textarea
                  value=""
                  readOnly
                  disabled
                  placeholder="Write a reply..."
                  className="min-h-[44px] max-h-32 resize-none"
                  aria-label="Reply message (not yet available)"
                />
                <Button size="icon" disabled aria-label="Send" className="shrink-0">
                  <Send className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
