/**
 * Custom server entry — overrides TanStack Start's generated default
 * (`@tanstack/react-start/plugin/default-entry/server.ts`), which is just
 * `createStartHandler(defaultStreamHandler)` with no hook point of its
 * own. Adding this file under the conventional `src/server.ts` name is
 * enough for the framework to pick it up instead of its default (see
 * `resolveEntry` in `@tanstack/start-plugin-core`).
 *
 * `validateEnv()` runs once at module scope here — i.e. once per server
 * boot (a real process boot for a long-lived Node server, or once per
 * cold start on serverless/edge). It logs a loud, descriptive error for
 * any missing/malformed required var so misconfiguration is never
 * silent — but the call is wrapped rather than left to throw. On a
 * serverless platform, a thrown top-level module error 500s *every*
 * request the function handles, including unrelated routes and static
 * assets (confirmed in production: one missing var took down /, /audit,
 * and even /favicon.ico). Letting the app keep serving what it can,
 * loudly logging what's misconfigured, fails safer than a blanket outage.
 */
import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";
import type { Register } from "@tanstack/react-router";
import type { RequestHandler } from "@tanstack/react-start/server";
import { validateEnv } from "@/lib/env.server";

try {
  validateEnv();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
}

const fetch = createStartHandler(defaultStreamHandler);

export type ServerEntry = { fetch: RequestHandler<Register> };

export function createServerEntry(entry: ServerEntry): ServerEntry {
  return {
    async fetch(...args) {
      return await entry.fetch(...args);
    },
  };
}

export default createServerEntry({ fetch });
