import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Phone, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatusDot, type LvStatus } from "@/components/StatusDot";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/timeFormat";

export const Route = createFileRoute("/_authenticated/app/calendar")({
  component: CalendarPage,
});

type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";

interface Appointment {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  service_type: string;
  scheduled_at: string;
  status: AppointmentStatus;
  estimated_value: number | null;
  notes: string | null;
  source: string;
}

// Real appointment statuses compressed onto the approved, closed StatusDot
// vocabulary (same technique app.leads.tsx uses for lead statuses) so
// Calendar reads as the same product as Overview/Inbox/Leads rather than
// inventing its own color language. Cancelled and no-show stay visually
// distinct (destructive vs muted) since a contractor needs to tell "customer
// cancelled" apart from "customer didn't show" at a glance.
const STATUS_TO_DOT: Record<AppointmentStatus, LvStatus> = {
  pending: "new",
  confirmed: "booked",
  completed: "done",
  cancelled: "failed",
  no_show: "stale",
};

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

const STATUS_OPTIONS: AppointmentStatus[] = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
];

// Real values of appointments.source (see CreateAppointmentSchema in
// src/routes/api/appointments.ts) - shown in the detail sheet only, since
// it's rarely useful at a glance in the row list.
const SOURCE_LABELS: Record<string, string> = {
  manual: "Added manually",
  inbound_sms: "Missed-call text-back",
  lead_blast: "Outreach",
  consumer_marketplace: "Marketplace request",
  web_chat: "Web chat",
};

const PAGE_SIZE = 20;

function formatMoney(dollars: number | null): string {
  if (dollars === null) return "—";
  return `$${dollars.toLocaleString()}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dateInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseDateInputValue(v: string): Date | null {
  const parts = v.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d);
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDayHeading(d: Date): string {
  const today = startOfDay(new Date());
  const target = startOfDay(d);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
  const withYear = d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    ...(d.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}),
  });
  if (diffDays === 0) return `Today, ${withYear}`;
  if (diffDays === -1) return `Yesterday, ${withYear}`;
  if (diffDays === 1) return `Tomorrow, ${withYear}`;
  return withYear;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

async function authHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }
    : { "Content-Type": "application/json" };
}

function SkeletonRows() {
  return (
    <div className="rounded-md border border-border overflow-hidden divide-y divide-border">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="h-4 w-14 shrink-0" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-4 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}

const EMPTY_FORM = {
  customer_name: "",
  customer_phone: "",
  customer_email: "",
  service_type: "",
  scheduled_at: "",
  estimated_value: "",
  notes: "",
};

const EDIT_FORM_DEFAULTS = { scheduled_at: "", estimated_value: "", notes: "" };

function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [listError, setListError] = useState("");
  const [everCount, setEverCount] = useState<number | null>(null);

  const [monthCount, setMonthCount] = useState<number | null>(null);
  const [monthTotal, setMonthTotal] = useState(0);

  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [editForm, setEditForm] = useState(EDIT_FORM_DEFAULTS);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");

  const isToday = isSameDay(selectedDate, new Date());

  useEffect(() => {
    setPageIndex(0);
    loadAppointments(selectedDate, 0);
  }, [selectedDate]);

  useEffect(() => {
    loadEverCount();
    loadMonthStats();
  }, []);

  useEffect(() => {
    if (!selectedAppt) return;
    setEditForm({
      scheduled_at: toLocalInputValue(selectedAppt.scheduled_at),
      estimated_value:
        selectedAppt.estimated_value != null ? String(selectedAppt.estimated_value) : "",
      notes: selectedAppt.notes || "",
    });
    setEditError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAppt?.id]);

  async function loadEverCount() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { count } = await supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    setEverCount(count ?? 0);
  }

  /** This calendar month's totals, independent of whichever day is
   * currently selected - a quick "how's the month going" glance, not the
   * page's primary purpose. */
  async function loadMonthStats() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    const { data, error } = await supabase
      .from("appointments")
      .select("estimated_value")
      .eq("user_id", user.id)
      .gte("scheduled_at", monthStart)
      .lt("scheduled_at", monthEnd);
    if (error) {
      console.error("[calendar] failed to load month stats", error);
      return;
    }
    const rows = data ?? [];
    setMonthCount(rows.length);
    setMonthTotal(rows.reduce((sum, r) => sum + (r.estimated_value || 0), 0));
  }

  async function loadAppointments(date: Date, page: number) {
    if (page === 0) setLoading(true);
    else setLoadingMore(true);
    setListError("");
    try {
      const headers = await authHeader();
      const start = startOfDay(date).toISOString();
      const end = addDays(startOfDay(date), 1).toISOString();
      const res = await fetch(
        `/api/appointments?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&page=${page}`,
        { headers },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load appointments");
      const rows: Appointment[] = data.appointments ?? [];
      setAppointments((prev) => (page === 0 ? rows : [...prev, ...rows]));
      setHasMore(!!data.hasMore);
    } catch (err) {
      setListError(errorMessage(err, "Appointments could not be loaded."));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  function refreshAfterMutation() {
    loadAppointments(selectedDate, 0);
    loadEverCount();
    loadMonthStats();
  }

  async function updateStatus(appt: Appointment, status: AppointmentStatus) {
    setSelectedAppt({ ...appt, status });
    setAppointments((prev) => prev.map((a) => (a.id === appt.id ? { ...a, status } : a)));
    try {
      const headers = await authHeader();
      const res = await fetch(`/api/appointments/${appt.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");
      loadMonthStats();
    } catch (err) {
      setEditError(errorMessage(err, "Couldn't update status. Please try again."));
      loadAppointments(selectedDate, 0);
    }
  }

  async function handleSaveEdit() {
    if (!selectedAppt) return;
    setEditError("");

    const scheduledChanged = editForm.scheduled_at !== toLocalInputValue(selectedAppt.scheduled_at);
    if (scheduledChanged) {
      const asIso = new Date(editForm.scheduled_at);
      if (Number.isNaN(asIso.getTime())) {
        setEditError("Enter a valid date and time.");
        return;
      }
      if (asIso.getTime() <= Date.now()) {
        setEditError("Rescheduled time must be in the future.");
        return;
      }
    }

    setSavingEdit(true);
    try {
      const headers = await authHeader();
      const res = await fetch(`/api/appointments/${selectedAppt.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          ...(scheduledChanged
            ? { scheduled_at: new Date(editForm.scheduled_at).toISOString() }
            : {}),
          notes: editForm.notes.trim() || null,
          estimated_value: editForm.estimated_value ? Number(editForm.estimated_value) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save changes");
      setSelectedAppt(null);
      refreshAfterMutation();
    } catch (err) {
      setEditError(errorMessage(err, "Something went wrong. Please try again."));
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete() {
    if (!selectedAppt) return;
    setConfirmingDelete(false);
    setSavingEdit(true);
    try {
      const headers = await authHeader();
      const res = await fetch(`/api/appointments/${selectedAppt.id}`, {
        method: "DELETE",
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete appointment");
      setSelectedAppt(null);
      refreshAfterMutation();
    } catch (err) {
      setEditError(errorMessage(err, "Something went wrong. Please try again."));
    } finally {
      setSavingEdit(false);
    }
  }

  function openAdd() {
    setAddForm(EMPTY_FORM);
    setAddError("");
    setAddOpen(true);
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setAddError("");
    if (!addForm.customer_name.trim()) return setAddError("Customer name is required.");
    if (!addForm.service_type.trim()) return setAddError("Service type is required.");
    if (!addForm.scheduled_at) return setAddError("Date and time are required.");
    const scheduledIso = new Date(addForm.scheduled_at);
    if (Number.isNaN(scheduledIso.getTime())) return setAddError("Enter a valid date and time.");
    if (scheduledIso.getTime() <= Date.now())
      return setAddError("Scheduled time must be in the future.");

    setAddSaving(true);
    try {
      const headers = await authHeader();
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers,
        body: JSON.stringify({
          customer_name: addForm.customer_name.trim(),
          customer_phone: addForm.customer_phone.trim() || undefined,
          customer_email: addForm.customer_email.trim() || undefined,
          service_type: addForm.service_type.trim(),
          scheduled_at: scheduledIso.toISOString(),
          estimated_value: addForm.estimated_value ? Number(addForm.estimated_value) : null,
          notes: addForm.notes.trim() || undefined,
          source: "manual",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create appointment");
      setAddOpen(false);
      setSelectedDate(startOfDay(scheduledIso));
      refreshAfterMutation();
    } catch (err) {
      setAddError(errorMessage(err, "Something went wrong. Please try again."));
    } finally {
      setAddSaving(false);
    }
  }

  const { upcoming, earlier } = useMemo(() => {
    if (!isToday) return { upcoming: appointments, earlier: [] as Appointment[] };
    const now = Date.now();
    const up: Appointment[] = [];
    const rest: Appointment[] = [];
    for (const a of appointments) {
      const isPending = a.status === "pending" || a.status === "confirmed";
      if (isPending && new Date(a.scheduled_at).getTime() >= now) up.push(a);
      else rest.push(a);
    }
    const byTime = (a: Appointment, b: Appointment) =>
      new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
    return { upcoming: up.sort(byTime), earlier: rest.sort(byTime) };
  }, [appointments, isToday]);

  const dayCount = appointments.length;
  const dayTotal = appointments.reduce((sum, a) => sum + (a.estimated_value || 0), 0);

  const isFirstRun = everCount === 0;
  const isDayEmpty = !loading && !listError && appointments.length === 0;

  return (
    <div className="lv-light min-h-full bg-background">
      <div className="max-w-[1080px] mx-auto px-4 md:px-8 py-6 md:py-8">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="lv-page-title text-foreground">Calendar</h1>
            {!loading && !listError && !isDayEmpty && (
              <p className="lv-body text-muted-foreground mt-1">
                <span className="lv-numbers">
                  {dayCount}
                  {hasMore ? "+" : ""}
                </span>{" "}
                {dayCount === 1 ? "appointment" : "appointments"}
                {dayTotal > 0 && (
                  <>
                    {" · "}
                    <span className="lv-numbers">{formatMoney(dayTotal)}</span> estimated
                  </>
                )}
              </p>
            )}
          </div>
          <Button size="sm" onClick={openAdd} className="gap-1.5 min-h-[44px] md:min-h-[38px]">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add appointment
          </Button>
        </div>

        {/* Day navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 shrink-0"
              onClick={() => setSelectedDate((d) => addDays(d, -1))}
              aria-label="Previous day"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 shrink-0"
              onClick={() => setSelectedDate((d) => addDays(d, 1))}
              aria-label="Next day"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <h2 className="lv-section text-foreground ml-1" aria-live="polite">
              {formatDayHeading(selectedDate)}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {!isToday && (
              <Button
                variant="outline"
                size="sm"
                className="min-h-[44px] md:min-h-[36px]"
                onClick={() => setSelectedDate(startOfDay(new Date()))}
              >
                Today
              </Button>
            )}
            <Input
              type="date"
              aria-label="Jump to date"
              value={dateInputValue(selectedDate)}
              onChange={(e) => {
                const parsed = parseDateInputValue(e.target.value);
                if (parsed) setSelectedDate(parsed);
              }}
              className="h-11 md:h-9 w-[170px]"
            />
          </div>
        </div>

        {monthCount !== null && monthCount > 0 && (
          <p className="lv-meta text-muted-foreground mb-4">
            This month: <span className="lv-numbers">{monthCount}</span>{" "}
            {monthCount === 1 ? "appointment" : "appointments"}
            {monthTotal > 0 && (
              <>
                {" · "}
                <span className="lv-numbers">{formatMoney(monthTotal)}</span> estimated
              </>
            )}
          </p>
        )}
        {(monthCount === null || monthCount === 0) && <div className="mb-4" />}

        {listError && (
          <div className="mb-6 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3">
            <p className="lv-label text-destructive">Appointments could not be loaded</p>
            <p className="lv-body text-foreground mt-0.5">{listError}</p>
            <p className="lv-meta text-muted-foreground mt-1">
              The rest of Calendar still works - try again, or come back in a moment.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => loadAppointments(selectedDate, 0)}
            >
              Retry
            </Button>
          </div>
        )}

        {loading ? (
          <SkeletonRows />
        ) : listError ? null : isFirstRun ? (
          <div className="rounded-md border border-border py-16 px-6 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-sm bg-accent text-primary">
              <CalendarIcon className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="lv-body text-foreground font-medium">No appointments yet</p>
            <p className="lv-meta text-muted-foreground mt-1 max-w-sm mx-auto">
              Add one manually, or they'll appear here automatically once a missed-call text-back
              confirms a booking.
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button size="sm" onClick={openAdd} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add your first appointment
              </Button>
            </div>
          </div>
        ) : isDayEmpty ? (
          <div className="rounded-md border border-border py-12 px-6 text-center">
            <p className="lv-body text-foreground font-medium">
              {isToday ? "You're caught up" : "No appointments on this day"}
            </p>
            <p className="lv-meta text-muted-foreground mt-1">
              {isToday
                ? "Nothing scheduled for the rest of today."
                : "Nothing scheduled for this date."}
            </p>
          </div>
        ) : (
          <>
            {isToday && upcoming.length === 0 && earlier.length > 0 && (
              <div className="rounded-md border border-border py-6 px-6 text-center mb-6">
                <p className="lv-body text-foreground font-medium">You're caught up</p>
                <p className="lv-meta text-muted-foreground mt-1">
                  Nothing scheduled for the rest of today.
                </p>
              </div>
            )}

            {upcoming.length > 0 && (
              <section aria-labelledby="calendar-schedule-heading" className="mb-6">
                <h3 id="calendar-schedule-heading" className="lv-label text-muted-foreground mb-2">
                  {isToday ? "Today's schedule" : "Schedule"}
                </h3>
                <ul className="rounded-md border border-border bg-card divide-y divide-border overflow-hidden">
                  {upcoming.map((a, i) => (
                    <AppointmentRow
                      key={a.id}
                      appt={a}
                      isNext={isToday && i === 0}
                      onClick={() => setSelectedAppt(a)}
                    />
                  ))}
                </ul>
              </section>
            )}

            {isToday && earlier.length > 0 && (
              <section aria-labelledby="calendar-earlier-heading">
                <h3 id="calendar-earlier-heading" className="lv-label text-muted-foreground mb-2">
                  Earlier today
                </h3>
                <ul className="rounded-md border border-border bg-card divide-y divide-border overflow-hidden">
                  {earlier.map((a) => (
                    <AppointmentRow key={a.id} appt={a} dimmed onClick={() => setSelectedAppt(a)} />
                  ))}
                </ul>
              </section>
            )}

            {hasMore && (
              <div className="flex justify-center mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loadingMore}
                  onClick={() => {
                    const next = pageIndex + 1;
                    setPageIndex(next);
                    loadAppointments(selectedDate, next);
                  }}
                >
                  {loadingMore ? "Loading..." : "Load more"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add appointment dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="lv-light sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="lv-section">Add appointment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-3">
            <div>
              <label htmlFor="appt-customer-name" className="lv-label text-foreground block mb-1">
                Customer name
              </label>
              <Input
                id="appt-customer-name"
                value={addForm.customer_name}
                onChange={(e) => setAddForm((f) => ({ ...f, customer_name: e.target.value }))}
                placeholder="e.g. John Smith"
                required
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="appt-phone" className="lv-label text-foreground block mb-1">
                  Phone
                </label>
                <Input
                  id="appt-phone"
                  value={addForm.customer_phone}
                  onChange={(e) => setAddForm((f) => ({ ...f, customer_phone: e.target.value }))}
                  placeholder="e.g. 404-555-0100"
                />
              </div>
              <div>
                <label htmlFor="appt-email" className="lv-label text-foreground block mb-1">
                  Email
                </label>
                <Input
                  id="appt-email"
                  type="email"
                  value={addForm.customer_email}
                  onChange={(e) => setAddForm((f) => ({ ...f, customer_email: e.target.value }))}
                  placeholder="e.g. john@example.com"
                />
              </div>
            </div>
            <div>
              <label htmlFor="appt-service" className="lv-label text-foreground block mb-1">
                Service type
              </label>
              <Input
                id="appt-service"
                value={addForm.service_type}
                onChange={(e) => setAddForm((f) => ({ ...f, service_type: e.target.value }))}
                placeholder="e.g. HVAC repair"
                required
              />
            </div>
            <div>
              <label htmlFor="appt-scheduled" className="lv-label text-foreground block mb-1">
                Date and time
              </label>
              <Input
                id="appt-scheduled"
                type="datetime-local"
                value={addForm.scheduled_at}
                onChange={(e) => setAddForm((f) => ({ ...f, scheduled_at: e.target.value }))}
                required
              />
            </div>
            <div>
              <label htmlFor="appt-value" className="lv-label text-foreground block mb-1">
                Estimated value ($)
              </label>
              <Input
                id="appt-value"
                type="number"
                min={0}
                step={1}
                value={addForm.estimated_value}
                onChange={(e) => setAddForm((f) => ({ ...f, estimated_value: e.target.value }))}
                placeholder="e.g. 450"
              />
            </div>
            <div>
              <label htmlFor="appt-notes" className="lv-label text-foreground block mb-1">
                Notes
              </label>
              <Textarea
                id="appt-notes"
                value={addForm.notes}
                onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
                placeholder="Optional notes"
              />
            </div>
            {addError && <p className="lv-meta text-destructive">{addError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addSaving}>
                {addSaving ? "Adding..." : "Add appointment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Appointment detail sheet */}
      <Sheet
        open={!!selectedAppt}
        onOpenChange={(v) => {
          if (!v) setSelectedAppt(null);
        }}
      >
        <SheetContent side="right" className="lv-light w-full sm:max-w-xl overflow-y-auto">
          {selectedAppt && (
            <>
              <SheetHeader className="pr-8 text-left">
                <SheetTitle className="lv-section text-foreground truncate">
                  {selectedAppt.customer_name}
                </SheetTitle>
                <p className="lv-meta text-muted-foreground mt-0.5">
                  {selectedAppt.service_type}
                  {selectedAppt.customer_phone ? ` · ${selectedAppt.customer_phone}` : ""}
                </p>
              </SheetHeader>

              <div className="mt-4 space-y-5">
                <div>
                  <label htmlFor="appt-status" className="lv-label text-foreground block mb-1.5">
                    Status
                  </label>
                  <Select
                    value={selectedAppt.status}
                    onValueChange={(v) => updateStatus(selectedAppt, v as AppointmentStatus)}
                  >
                    <SelectTrigger id="appt-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 lv-body text-foreground">
                  {selectedAppt.customer_phone && (
                    <div className="flex items-center justify-between gap-2">
                      <span>
                        <span className="text-muted-foreground">Phone: </span>
                        {selectedAppt.customer_phone}
                      </span>
                      <Button variant="outline" size="sm" className="gap-1.5 shrink-0" asChild>
                        <a href={`tel:${selectedAppt.customer_phone}`}>
                          <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                          Call
                        </a>
                      </Button>
                    </div>
                  )}
                  {selectedAppt.customer_email && (
                    <div>
                      <span className="text-muted-foreground">Email: </span>
                      {selectedAppt.customer_email}
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Booked via: </span>
                    {SOURCE_LABELS[selectedAppt.source] ?? selectedAppt.source}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="appt-edit-scheduled"
                    className="lv-label text-foreground block mb-1.5"
                  >
                    Date and time
                  </label>
                  <Input
                    id="appt-edit-scheduled"
                    type="datetime-local"
                    value={editForm.scheduled_at}
                    onChange={(e) => setEditForm((f) => ({ ...f, scheduled_at: e.target.value }))}
                  />
                </div>
                <div>
                  <label
                    htmlFor="appt-edit-value"
                    className="lv-label text-foreground block mb-1.5"
                  >
                    Estimated value ($)
                  </label>
                  <Input
                    id="appt-edit-value"
                    type="number"
                    min={0}
                    step={1}
                    value={editForm.estimated_value}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, estimated_value: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label
                    htmlFor="appt-edit-notes"
                    className="lv-label text-foreground block mb-1.5"
                  >
                    Notes
                  </label>
                  <Textarea
                    id="appt-edit-notes"
                    value={editForm.notes}
                    onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={4}
                  />
                </div>

                {editError && <p className="lv-meta text-destructive">{editError}</p>}

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    className="flex-1 min-h-[44px]"
                    onClick={handleSaveEdit}
                    disabled={savingEdit}
                  >
                    {savingEdit ? "Saving..." : "Save changes"}
                  </Button>
                  <Button
                    variant="outline"
                    className="min-h-[44px] text-destructive hover:text-destructive"
                    onClick={() => setConfirmingDelete(true)}
                    disabled={savingEdit}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <AlertDialogContent className="lv-light">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this appointment?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AppointmentRow({
  appt,
  isNext,
  dimmed,
  onClick,
}: {
  appt: Appointment;
  isNext?: boolean;
  dimmed?: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "w-full min-h-[44px] flex items-center gap-3 px-4 py-3 text-left hover:bg-accent transition-colors duration-150 ease-out",
          dimmed && "opacity-70",
        )}
      >
        <span className="lv-numbers text-foreground w-[68px] shrink-0">
          {formatTime(appt.scheduled_at)}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="lv-body text-foreground font-medium truncate"
              title={appt.customer_name}
            >
              {appt.customer_name}
            </span>
            {isNext && (
              <span className="lv-meta rounded-sm bg-accent text-primary px-1.5 py-0.5 shrink-0">
                Next
              </span>
            )}
          </div>
          <div className="lv-meta text-muted-foreground truncate mt-0.5" title={appt.service_type}>
            {appt.service_type}
            {appt.customer_phone ? ` · ${appt.customer_phone}` : ""}
          </div>
        </div>
        <StatusDot status={STATUS_TO_DOT[appt.status]} className="shrink-0" />
        <span className="lv-numbers text-foreground shrink-0 hidden sm:inline w-16 text-right">
          {formatMoney(appt.estimated_value)}
        </span>
      </button>
    </li>
  );
}
