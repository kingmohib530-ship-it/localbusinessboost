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
 * cold start on serverless/edge). In production, a missing or malformed
 * required env var throws immediately and stops the server from ever
 * accepting a request, instead of failing confusingly deep inside a
 * request handler later. Outside production it only warns, so local dev
 * isn't blocked on having every key configured.
 */
import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";
import type { Register } from "@tanstack/react-router";
import type { RequestHandler } from "@tanstack/react-start/server";
import { validateEnv } from "@/lib/env.server";

validateEnv();

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
