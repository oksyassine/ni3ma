import type { PrismaClient } from "@prisma/client";
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
// - `$transaction(async (tx) => ...)` forwards the REAL transaction client
//   into the callback, so nested `tx.` usage stays correct and atomic.
// - Model delegates cache their proxies; only the client lookup is per-call.
// - Outside request scope (scripts, build) this falls back to the primary DB
//   via getClientForRequest.

type AnyFn = (...args: never[]) => unknown;

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
      return async (...args: unknown[]) => {
        const client = await getClientForRequest();
        const fn = (client as unknown as Record<string, AnyFn>)[prop];
        return fn.apply(client, args as never[]);
      };
    }
    return modelDelegate(prop);
  },
});
