## LUNAVX — AI Workforce Orchestration Platform

A full-stack multi-agent SaaS built on the existing TanStack Start + Lovable Cloud (Supabase) + Lovable AI Gateway stack. Replaces the current Zyvora landing with the LUNAVX brand and adds a complete authenticated product surface.

### Scope (MVP build, single pass)

**1. Brand + Landing (public)**
- Rebrand to LUNAVX (dark, Stripe/Linear-grade). New hero, 6-agent showcase, orchestrator diagram, workflow preview, pricing, footer.
- CTAs: Get Started → `/auth`, Login → `/auth`.

**2. Auth**
- Email + password via Lovable Cloud Auth (no email confirmation for MVP speed — flagged for production).
- Google OAuth via Lovable broker.
- `/auth` route with sign-in / sign-up tabs. `profiles` table already exists.

**3. Database (new migration)**
- `tasks` — user request, status (queued/running/completed/failed), input, final_output (jsonb), assigned_agents (text[]), stage.
- `agent_runs` — per-agent execution log: task_id, agent_name, input, output, status, started_at, completed_at, duration_ms.
- `workflows` — saved multi-step recipes (name, steps jsonb).
- `execution_logs` — append-only event stream (task_id, agent, level, message, metadata).
- RLS: owner-scoped via `user_id`; explicit GRANTs; service_role bypass.

**4. Orchestrator (server-side)**
- `orchestrate.functions.ts` server function. Takes user prompt → calls Lovable AI Gateway (Gemini 2.5 Flash) as the **Orbis** planner → returns ordered agent plan → executes each agent (Atlas/Nexus/Pulse/Forge/Shield) via dedicated prompts → Shield validates → writes `agent_runs` + `execution_logs` + final `tasks.final_output`.
- Streams progress via polling (client re-queries every 1.5s while task is `running`). Realtime can be a v2.

**5. Six Agents (prompt-defined)**
Each agent = a server-side prompt template + structured JSON output schema, invoked through the orchestrator. No agent runs standalone — UI "Run Agent" still routes through orchestrator with a single-agent plan.

**6. Dashboard (authenticated)**
Sidebar layout under `/_authenticated/app/*`:
- **Overview** — task count, agent run stats, recent activity feed, success rate sparkline.
- **Agents Hub** — 6 agent cards (name, status pulled from latest run, last task, Run button → opens prompt modal → routes to orchestrator).
- **Chat / Assistant** — main chat interface; messages persist as `tasks`; live status pill (Planning → Atlas → Pulse → Done); expandable agent output cards.
- **Control Center** — admin chat: inspect any task, replay, view raw agent prompts/outputs, edit system prompts (stored in-memory for MVP, persisted to a `system_prompts` table).
- **Workflows** — Kanban board (Incoming / Assigned / Processing / Completed / Reviewed) reading `tasks.stage`.
- **Execution Logs** — virtualized table of `execution_logs` with filters (agent, level, date).
- **Settings** — profile, plan, sign out.

**7. Plan gating (light)**
- Reuse `try_consume_generation` for free-plan task limits (20/day during beta — already in place). Upgrade UI remains non-blocking.

### Technical layout

```text
src/routes/
  index.tsx                    # rebrand to LUNAVX landing
  auth.tsx                     # sign-in/up
  _authenticated/
    route.tsx                  # (managed gate)
    app.tsx                    # sidebar shell w/ <Outlet/>
    app.index.tsx              # Overview
    app.agents.tsx             # Agents Hub
    app.chat.tsx               # Business Assistant
    app.control.tsx            # Admin chat
    app.workflows.tsx          # Kanban
    app.logs.tsx               # Execution logs
    app.settings.tsx
src/lib/
  orchestrator.functions.ts    # createServerFn — plan + execute
  agents.server.ts             # 6 agent prompt templates + JSON schemas
  tasks.functions.ts           # CRUD: list, get, create
  logs.functions.ts            # list logs/runs for a task
src/components/lunavx/
  Sidebar.tsx, AgentCard.tsx, ChatPanel.tsx, TaskCard.tsx,
  KanbanBoard.tsx, LogTable.tsx, StatusPill.tsx
supabase/migrations/<ts>_lunavx_core.sql
```

### Agent definitions (system prompts, condensed)

| Agent | Role | Output shape |
|---|---|---|
| Orbis | Planner — decomposes intent into ordered agent calls | `{ steps: [{agent, instruction}] }` |
| Atlas | Lead intelligence (simulated — generates plausible structured leads from AI) | `{ leads: [{name,email,phone,website,location,industry}] }` |
| Nexus | Market/competitor research | `{ competitors, opportunities, insights }` |
| Pulse | Copywriter (emails, ads, scripts) | `{ subject, body, variants[] }` |
| Forge | Workflow designer | `{ triggers, steps, integrations }` |
| Shield | QC — validates prior outputs, flags issues | `{ ok: bool, issues[], improved_output }` |

**Important caveat:** Atlas does NOT scrape real businesses. It generates AI-synthesized structured leads. Real scraping requires a data provider (Apollo, Apify, etc.) — flagged as a later integration with `add_secret`.

### Design system
- Keep existing OKLCH dark theme (LUNAVX uses cyan/violet — already configured).
- Update brand strings, logo wordmark, meta tags.
- Sidebar uses shadcn `Sidebar` (collapsible icon mode).

### Out of scope (MVP)
- Real lead-data API integration (stub via AI).
- Email sending (Pulse drafts only).
- Visual workflow builder (Forge outputs JSON; Kanban shows tasks, not nodes).
- Realtime subscriptions (polling instead).
- Stripe re-enable (currently in beta-free mode per prior request).

### Confirmations needed
- Use **Lovable AI Gateway** (free, no key) with **Gemini 2.5 Flash** as default model for all agents? ✅ recommended.
- OK with Atlas generating **synthetic** leads in MVP (real scraping = later integration)?
- OK keeping current beta unlimited-generation mode (no hard paywall)?

Approve and I'll execute the full build in one pass: migration → orchestrator + agents → auth route → dashboard shell + all 6 sub-pages → landing rebrand.
