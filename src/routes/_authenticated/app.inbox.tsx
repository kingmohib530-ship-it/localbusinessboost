import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2, MessageCircle, Phone, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusDot, type LvStatus } from "@/components/StatusDot";
import { cn } from "@/lib/utils";
import { relativeTime, formatTime } from "@/lib/timeFormat";

export const Route = createFileRoute("/_authenticated/app/inbox")({
  // Deep-link support (Slice 16) for Action Queue - a plain uuid check, no
  // ownership assumption baked in here. An absent/invalid param just never
  // matches anything real; ownership itself is still enforced the normal
  // way, by RLS + the explicit user_id filter on every query below.
  validateSearch: z.object({
    conversation: z.string().uuid().optional(),
  }),
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
  ai_paused: boolean;
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
const MAX_MESSAGE_LENGTH = 1600;

function conversationLabel(c: ConversationRow): string {
  if (c.customer_name) return c.customer_name;
  if (c.channel === "web_chat") return `Website visitor #${c.id.slice(0, 8)}`;
  return c.customer_identifier;
}

// "Waiting on you" / "Automated" here is about whether the AI already
// replied to the latest inbound message - a different concept from
// automation on/off (ai_paused), which is about whether the AI is even
// allowed to reply at all right now. Both show in the thread header.
function conversationStatus(c: ConversationComputed): LvStatus {
  if (c.latestDirection === "inbound" || c.latestDirection === null) return "waiting_on_you";
  return "automated";
}

function channelLabel(channel: string): string {
  return channel === "web_chat" ? "Web chat" : "Text";
}

function Inbox() {
  const search = Route.useSearch();
  const navigate = useNavigate();

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

  const [takeoverPending, setTakeoverPending] = useState(false);
  const [takeoverError, setTakeoverError] = useState("");

  const [composerText, setComposerText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendWarning, setSendWarning] = useState("");

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
    setComposerText("");
    setSendError("");
    setSendWarning("");
    setTakeoverError("");
    loadMessages(id);
    // Keep the URL in sync with manual selection (Slice 16) so back/forward
    // moves between conversations coherently - skipped when this id is
    // already the one in the URL (the deep-link effect below calling this
    // on load, or re-opening the same conversation) to avoid a redundant
    // history entry.
    if (search.conversation !== id) {
      navigate({ to: "/app/inbox", search: { conversation: id } });
    }
  }

  // Deep-link (Slice 16): open the conversation named in the URL, once,
  // when it's real and owned by this business. Never fabricates a
  // conversation - if it's not in the already-loaded page and a direct,
  // ownership-scoped lookup finds nothing (bad id, someone else's
  // conversation, or genuinely doesn't exist), this simply does nothing
  // and the generic Inbox stays exactly as usable as always.
  useEffect(() => {
    const targetId = search.conversation;
    if (!targetId || loading) return;
    if (selectedId === targetId) return;
    const found = conversations.find((c) => c.id === targetId);
    if (found) {
      openConversation(found.id);
      return;
    }
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", targetId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled || !data) return;
      const row = data as ConversationRow;
      setConversations((prev) =>
        prev.some((c) => c.id === row.id)
          ? prev
          : [{ ...row, latestDirection: null, waitingSince: null }, ...prev],
      );
      openConversation(row.id);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.conversation, loading, conversations, selectedId]);

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

  async function authHeader(): Promise<Record<string, string> | null> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  }

  async function setTakeover(nextPaused: boolean) {
    if (!selectedConversation || takeoverPending) return;
    setTakeoverPending(true);
    setTakeoverError("");
    try {
      const headers = await authHeader();
      if (!headers) {
        setTakeoverError("Please sign in again.");
        return;
      }
      const res = await fetch(`/api/inbox/conversations/${selectedConversation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ ai_paused: nextPaused }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTakeoverError(data.error || "Couldn't update this conversation.");
        return;
      }
      setConversations((prev) =>
        prev.map((c) => (c.id === selectedConversation.id ? { ...c, ai_paused: nextPaused } : c)),
      );
    } catch {
      setTakeoverError("Couldn't update this conversation. Check your connection and try again.");
    } finally {
      setTakeoverPending(false);
    }
  }

  const canComposeManually =
    !!selectedConversation &&
    selectedConversation.channel === "sms" &&
    selectedConversation.ai_paused;

  async function sendMessage() {
    const text = composerText.trim();
    if (!text || !selectedConversation || !canComposeManually || sending) return;
    // Resolution Feedback V1 (Slice 17): captured before the send, from the
    // same real latestDirection signal conversationStatus()/waitingCount
    // already use - true only when this reply is the one actually ending a
    // wait, never claimed on an ordinary follow-up message in an
    // already-answered thread.
    const wasWaiting =
      selectedConversation.latestDirection === "inbound" ||
      selectedConversation.latestDirection === null;
    setSending(true);
    setSendError("");
    setSendWarning("");
    try {
      const headers = await authHeader();
      if (!headers) {
        setSendError("Please sign in again.");
        return;
      }
      const res = await fetch("/api/inbox/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ conversation_id: selectedConversation.id, message: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSendError(data.error || "Couldn't send your message. Please try again.");
        return;
      }
      // Clear only on confirmed success, so a failure never loses what was typed.
      setComposerText("");
      // Resolution Feedback V1 (Slice 17): the owner's own successful send is
      // the one moment actor identity genuinely isn't ambiguous - this
      // request only succeeds while the conversation is paused for manual
      // reply (see api/inbox/send.ts), so there's no guessing who just
      // acted. Not shown for an ordinary reply in an already-answered
      // thread, where nothing was actually waiting to be resolved.
      if (wasWaiting) {
        toast.success("Reply sent. This conversation no longer needs a reply.");
      }
      if (data.message) {
        setMessages((prev) =>
          prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message],
        );
      } else {
        // Rare "sent but not saved" case (see api/inbox/send.ts). The text
        // really did go out, so the composer stays cleared rather than
        // preserved - leaving the same text sitting there would just invite
        // an accidental duplicate send - and this warning tells the owner
        // what actually happened instead of silently dropping it.
        setSendWarning(data.warning || "Sent, but this conversation may be missing that message.");
        loadMessages(selectedConversation.id, { silent: true });
      }
      loadConversations(pageIndex, { silent: true });
    } catch {
      setSendError("Couldn't send your message. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  function onComposerKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  }

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
            <div className="shrink-0 border-b border-border px-3 md:px-5 py-2.5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedId(null);
                  navigate({ to: "/app/inbox", search: {} });
                }}
                className="md:hidden flex h-9 w-9 items-center justify-center rounded-sm text-foreground hover:bg-accent shrink-0"
                aria-label="Back to conversations"
              >
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="lv-body text-foreground font-medium truncate">
                  {conversationLabel(selectedConversation)}
                </p>
                <div className="flex items-center gap-x-2 gap-y-1.5 flex-wrap mt-0.5">
                  <StatusDot status={conversationStatus(selectedConversation)} />
                  <span className="lv-meta text-muted-foreground">
                    · {channelLabel(selectedConversation.channel)}
                  </span>
                  <span className="lv-meta text-muted-foreground">·</span>
                  <StatusDot
                    status={selectedConversation.ai_paused ? "human_takeover" : "automation_on"}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-[44px]"
                    disabled={takeoverPending}
                    onClick={() => setTakeover(!selectedConversation.ai_paused)}
                  >
                    {takeoverPending
                      ? "Updating..."
                      : selectedConversation.ai_paused
                        ? "Return to automation"
                        : "Take over"}
                  </Button>
                </div>
                {takeoverError && (
                  <p className="lv-meta text-destructive mt-1" role="alert">
                    {takeoverError}
                  </p>
                )}
              </div>
              {PHONE_LIKE.test(selectedConversation.customer_identifier) && (
                <a
                  href={`tel:${selectedConversation.customer_identifier}`}
                  className="flex h-11 w-11 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground shrink-0"
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

            <div className="shrink-0 border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {!canComposeManually && (
                <p id="composer-help" className="lv-meta text-muted-foreground mb-2">
                  {selectedConversation.channel === "web_chat"
                    ? "Manual reply isn't available for web chat yet - conversations are handled by your AI receptionist."
                    : "Take over this conversation to reply manually."}
                </p>
              )}
              {sendError && (
                <p className="lv-meta text-destructive mb-2" role="alert">
                  {sendError}
                </p>
              )}
              {sendWarning && (
                <p className="lv-meta text-[var(--warning)] mb-2" role="status">
                  {sendWarning}
                </p>
              )}
              <div className="flex items-end gap-2">
                <Textarea
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  onKeyDown={onComposerKeyDown}
                  readOnly={!canComposeManually}
                  disabled={!canComposeManually || sending}
                  maxLength={MAX_MESSAGE_LENGTH}
                  placeholder="Write a reply..."
                  aria-label="Reply message"
                  aria-describedby={!canComposeManually ? "composer-help" : undefined}
                  className="min-h-[44px] max-h-32 resize-none"
                />
                <Button
                  type="button"
                  size="icon"
                  disabled={!canComposeManually || sending || !composerText.trim()}
                  onClick={sendMessage}
                  aria-label={sending ? "Sending" : "Send"}
                  className="h-11 w-11 shrink-0"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Send className="h-4 w-4" aria-hidden="true" />
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
