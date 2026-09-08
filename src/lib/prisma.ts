import type { PrismaClient } from "@prisma/client";
import { AsyncLocalStorage } from "node:async_hooks";
import { getClientForRequest } from "./tenants";

// Multi-tenant Prisma facade.
//
// Every module in the app imports `prisma` and uses it exactly like a
// PrismaClient (`prisma.member.findMany(...)`, `prisma.$transaction(...)`,
// `prisma.$queryRaw\`...\``). This proxy keeps that API identical but defers
// resolution of the underlying client until the first awaited call, at which
// point the current request's Host header is known (see lib/tenants.ts) and
// the matching tenant database client is used.
//
// Notes:
// - The resolved client is memoized per request via AsyncLocalStorage so
//   the Host header is read at most once per request and the same client
//   is reused across every awaited call, including the nested callbacks
//   inside `$transaction(async (tx) => ...)`.
// - `$transaction(async (tx) => ...)` passes the REAL transaction client
//   into the callback, so nested `tx.` usage stays correct and atomic.
// - Outside request scope (scripts, build, cron) AsyncLocalStorage returns
//   undefined and we fall back to the primary DB via getClientForRequest.
// - If a route explicitly changes the resolved client (e.g. the platform
//   admin tenant PATCH), `withClient(client, fn)` runs the callback with
//   a forced client.

type AnyFn = (...args: never[]) => unknown;

const tenantClientStore = new AsyncLocalStorage<PrismaClient>();

const modelDelegates = new Map<string, AnyFn>();

function modelDelegate(model: string): AnyFn {
  let delegate = modelDelegates.get(model);
  if (!delegate) {
    delegate = new Proxy(function () {} as unknown as AnyFn, {
      get(_target, prop) {
        return async (...args: unknown[]) => {
          const client = await getClientForRequest();
          const target = (client as unknown as Record<string, Record<string | symbol, AnyFn>>)[model];
          const fn = target?.[prop];
          if (typeof fn !== "function") {
            throw new Error(`prisma.${model}.${String(prop)} is not a function`);
          }
          return fn.apply(target, args as never[]);
        };
      },
    });
    modelDelegates.set(model, delegate);
  }
  return delegate;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    if (typeof prop !== "string") return undefined;
    if (prop.startsWith("$")) {
      // $transaction / $queryRaw / $executeRaw / $disconnect / $connect ...
      // $transaction(async tx => …) wraps the callback in the same AsyncLocalStorage
      // scope so any nested `tx.X` invocation reaches the right tenant client.
      return async (...args: unknown[]) => {
        if (prop === "$transaction" && typeof args[0] === "function") {
          const first = args[0] as (tx: unknown) => Promise<unknown>;
          const client = await getClientForRequest();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (client as any).$transaction(async (tx: unknown) => {
            return tenantClientStore.run(client, async () => first(tx));
          }, args[1] as never);
        }
        const client = await getClientForRequest();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fn = (client as any)[prop];
        return typeof fn === "function" ? fn.apply(client, args) : Promise.resolve(undefined);
      };
    }
    return modelDelegate(prop);
  },
});

/**
 * Run `fn` with a forced Prisma client, bypassing the request-host lookup.
 * Used by platform-admin routes that need to touch a specific tenant DB.
 */
export async function withClient<T>(client: PrismaClient, fn: () => Promise<T>): Promise<T> {
  return tenantClientStore.run(client, fn);
}

/** Internal — used by `getClientForRequest()` consumers that want the cached client. */
export function currentTenantClient(): PrismaClient | undefined {
  return tenantClientStore.getStore();
}
