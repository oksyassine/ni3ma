import type { PrismaClient } from "@prisma/client";
import { AsyncLocalStorage } from "node:async_hooks";
import { getClientForRequest } from "./tenants";

// Multi-tenant Prisma facade.
//
// Every module in the app imports `prisma` and uses it exactly like a
// PrismaClient (`prisma.member.findMany(...)`, `prisma.$transaction(...)`,
// `prisma.$queryRaw\`...\``). This proxy keeps that API identical but defers
// resolution of the underlying client until the call is actually awaited, at
// which point the current request's Host header is known (see lib/tenants.ts)
// and the matching tenant database client is used.
//
// Notes:
// - Model calls return a LAZY, PrismaPromise-compatible thenable. Laziness
//   matters for two reasons: a real PrismaClient delegate does no work until
//   it is awaited, and `$transaction([...])` needs to enlist the operations
//   in its batch rather than receive already-running queries. See
//   `lazyPrismaPromise` below.
// - `withClient(client, fn)` forces a specific client for everything `fn`
//   does, via AsyncLocalStorage. `resolveClient()` consults that store first,
//   so the override reaches every `prisma.*` call inside the callback.
// - `$transaction(async (tx) => ...)` passes the REAL transaction client into
//   the callback, so nested `tx.` usage stays correct and atomic. The callback
//   also runs inside the AsyncLocalStorage scope so any nested `prisma.*` call
//   resolves to the same tenant client without re-reading the Host header.
// - Outside request scope (scripts, build, cron) `headers()` is unavailable
//   and getClientForRequest() falls back to the primary DB.

type AnyFn = (...args: never[]) => unknown;

const tenantClientStore = new AsyncLocalStorage<PrismaClient>();

/**
 * The client this call should run against: a client forced by `withClient()`
 * (or by the enclosing `$transaction` callback) wins over the Host lookup.
 * `getStore()` is read synchronously so callers that need the forced client
 * before their first `await` still observe it.
 */
function resolveClient(): PrismaClient | Promise<PrismaClient> {
  return tenantClientStore.getStore() ?? getClientForRequest();
}

/**
 * A lazy stand-in for a Prisma delegate call.
 *
 * Prisma's own delegates return a `PrismaPromise`: a thenable that starts no
 * work until it is consumed, and that carries a `requestTransaction` hook plus
 * a `Symbol.toStringTag` of `"PrismaPromise"`. The batch form of
 * `$transaction([...])` checks that tag on every element and throws
 * "All elements of the array need to be Prisma Client promises" otherwise, so
 * a facade that hands back a plain `Promise` breaks every batch transaction in
 * the app — and, because a plain promise starts eagerly, leaves the earlier
 * statements already applied with no rollback.
 *
 * This shim reproduces both halves of the contract: nothing runs until `then`
 * / `catch` / `finally` / `requestTransaction` is called, and
 * `requestTransaction` forwards to the real PrismaPromise so the operation
 * joins the batch instead of running standalone.
 */
function lazyPrismaPromise<T>(invoke: (client: PrismaClient) => unknown): Promise<T> {
  let pending: Promise<T> | undefined;
  const start = (): Promise<T> =>
    (pending ??= Promise.resolve(resolveClient()).then((client) => invoke(client) as Promise<T>));

  const shim = {
    then: <A, B>(
      onfulfilled?: ((value: T) => A | PromiseLike<A>) | null,
      onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
    ) => start().then(onfulfilled, onrejected),
    catch: <B>(onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null) =>
      start().catch(onrejected),
    finally: (onfinally?: (() => void) | null) => start().finally(onfinally),
    // Called by Prisma for each element of `$transaction([...])`. Returning the
    // real PrismaPromise's own requestTransaction result is what puts the query
    // inside the batch. Deliberately NOT memoized via `start()`: Prisma does not
    // memoize the batch path either, and the batch needs its own request.
    requestTransaction: (info: unknown) =>
      Promise.resolve(resolveClient()).then((client) => {
        const p = invoke(client) as { requestTransaction?: (i: unknown) => unknown };
        return typeof p?.requestTransaction === "function" ? p.requestTransaction(info) : p;
      }),
    [Symbol.toStringTag]: "PrismaPromise",
  };
  return shim as unknown as Promise<T>;
}

const modelDelegates = new Map<string, AnyFn>();

function modelDelegate(model: string): AnyFn {
  let delegate = modelDelegates.get(model);
  if (!delegate) {
    delegate = new Proxy(function () {} as unknown as AnyFn, {
      get(_target, prop) {
        return (...args: unknown[]) =>
          lazyPrismaPromise((client) => {
            const target = (client as unknown as Record<string, Record<string | symbol, AnyFn>>)[model];
            const fn = target?.[prop];
            if (typeof fn !== "function") {
              throw new Error(`prisma.${model}.${String(prop)} is not a function`);
            }
            return fn.apply(target, args as never[]);
          });
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
      return async (...args: unknown[]) => {
        const client = await resolveClient();
        if (prop === "$transaction" && typeof args[0] === "function") {
          const first = args[0] as (tx: unknown) => Promise<unknown>;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (client as any).$transaction(
            (tx: unknown) => tenantClientStore.run(client, () => first(tx)),
            args[1] as never,
          );
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fn = (client as any)[prop];
        if (typeof fn !== "function") return undefined;
        // Pin the client for the duration of the call so the lazy elements of a
        // `$transaction([...])` batch resolve to this same client rather than
        // re-reading the Host header.
        return tenantClientStore.run(client, () => fn.apply(client, args));
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

/** The client forced by an enclosing `withClient()` / `$transaction()`, if any. */
export function currentTenantClient(): PrismaClient | undefined {
  return tenantClientStore.getStore();
}
