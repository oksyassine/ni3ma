import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare, hashSync } from "bcryptjs";
import { prisma } from "./prisma";
import { rateLimit } from "./rate-limit";
import type { Role } from "./rbac";

// Dummy bcrypt hash to keep "user not found" timing similar to "wrong password".
// Defends against timing-based username enumeration. Generated synchronously
// at module load so the salt is a valid bcryptjs format — a hand-written
// string of zeros is rejected by bcryptjs and would throw inside compare(),
// defeating the timing protection.
const DUMMY_HASH = hashSync("dummy-never-used", 12);

// Best-effort client IP from a NextRequest-like headers bag. Trusts the first
// hop of x-forwarded-for; deployments behind Cloudflare should also set the
// CF-Connecting-IP header at the edge to harden this.
function clientIpFromHeaders(headers?: { get(name: string): string | null }): string | null {
  if (!headers) return null;
  return (
    headers.get("cf-connecting-ip")
    ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? headers.get("x-real-ip")
    ?? null
  );
}

// Permission tables grant section/bureau access independently of the legacy
// Role enum. The proxy + sidebar still gate on Role, so we synthesize the
// matching Role values into the session so granted READ access actually shows
// up in the UI. Authoritative writes still go through hasSectionRW etc.
type Lvl = "READ" | "RW" | "ADMIN";
type BLvl = "READ" | "RW";
export type SectionLevels = Partial<Record<import("@prisma/client").Section, Lvl>>;

type SynthOut = { roles: Role[]; sectionLevels: SectionLevels; bureauLevel?: BLvl };

async function synthesizeRoles(opts: { userId?: string; memberId?: string; baseRoles: Role[] }): Promise<SynthOut> {
  const synthetic = new Set<Role>(opts.baseRoles);
  const sectionLevels: SectionLevels = {};
  let bureauLevel: BLvl | undefined;
  const where = opts.userId
    ? { userId: opts.userId }
    : opts.memberId
    ? { memberId: opts.memberId }
    : null;
  if (!where) return { roles: Array.from(synthetic), sectionLevels, bureauLevel };

  const [secRows, bureauRow] = await Promise.all([
    prisma.sectionPermission.findMany({ where, select: { section: true, level: true } }),
    prisma.bureauPermission.findFirst({ where, select: { level: true } }),
  ]);
  for (const s of secRows) {
    if (s.section === "EDUCATIONAL") synthetic.add("EDUCATIONAL");
    if (s.section === "SOCIAL")      synthetic.add("SOCIAL");
    if (s.section === "QURAN")       synthetic.add("QURAN");
    if (s.level === "ADMIN")         synthetic.add("SECTION_ADMIN");
    sectionLevels[s.section] = s.level as Lvl;
  }
  if (bureauRow) {
    synthetic.add("BUREAU");
    if (bureauRow.level === "RW") synthetic.add("BUREAU_RW");
    bureauLevel = bureauRow.level as BLvl;
  }
  // FINANCIAL is part of the maktab → implicit READ-only across the org. We
  // *don't* synthesize section roles (EDUCATIONAL/SOCIAL/QURAN) for them
  // because that would pollute the displayed role badges. Instead the proxy +
  // sidebar give FINANCIAL access to those dashboards by name. The bureauLevel
  // grant is what makes hasSectionRead/hasBureauRead return true everywhere.
  if (synthetic.has("FINANCIAL")) {
    if (!bureauLevel) bureauLevel = "READ";
  }
  return { roles: Array.from(synthetic), sectionLevels, bureauLevel };
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      fullName: string;
      roles: Role[];
      sectionLevels?: SectionLevels;
      bureauLevel?: BLvl;
      subjectKind?: "user" | "member";
    };
  }
  interface User {
    id: string;
    username: string;
    fullName: string;
    roles: Role[];
    subjectKind?: "user" | "member";
    sectionLevels?: SectionLevels;
    bureauLevel?: BLvl;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    username: string;
    fullName: string;
    roles: Role[];
    subjectKind?: "user" | "member";
    rolesCheckedAt?: number;
    sectionLevels?: SectionLevels;
    bureauLevel?: BLvl;
  }
}

// Re-fetch base roles from the source-of-truth tables, then synthesize.
// Used by the periodic token refresh so newly-granted permissions take effect
// without forcing a logout.
async function freshRolesFor(token: { id: string; subjectKind?: "user" | "member" }): Promise<SynthOut | null> {
  if (token.subjectKind === "user") {
    const u = await prisma.user.findUnique({ where: { id: token.id }, select: { isActive: true, roles: { select: { role: true } } } });
    if (!u || !u.isActive) return null;
    const baseRoles = u.roles.map((r) => r.role) as Role[];
    return synthesizeRoles({ userId: token.id, baseRoles });
  }
  if (token.subjectKind === "member") {
    const m = await prisma.member.findUnique({ where: { id: token.id }, select: { isActive: true, userIsActive: true, userRoles: { select: { role: true } } } });
    if (!m || !m.isActive || !m.userIsActive) return null;
    const baseRoles = m.userRoles.map((r) => r.role) as Role[];
    return synthesizeRoles({ memberId: token.id, baseRoles });
  }
  return null;
}

// 10 seconds — short enough that revoking ADMIN/BUREAU_RW takes effect
// promptly, long enough to avoid hammering the source-of-truth tables on
// every request.
const ROLE_REFRESH_INTERVAL_MS = 10_000;

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "اسم المستخدم", type: "text" },
        password: { label: "كلمة المرور", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.username || !credentials?.password) return null;

        const username = String(credentials.username).toLowerCase();
        const ip = clientIpFromHeaders(request?.headers);
        const userRl = rateLimit(`login:user:${username}`, 5, 5 * 60 * 1000);
        const ipRl = ip ? rateLimit(`login:ip:${ip}`, 20, 5 * 60 * 1000) : { allowed: true, remaining: 0, resetInMs: 0 };
        if (!userRl.allowed || !ipRl.allowed) {
          // Burn cycles equivalent to a bcrypt compare so timing stays similar
          await compare(String(credentials.password), DUMMY_HASH);
          return null;
        }

        // Parallel lookup — keeps the User-vs-Member timing identical so an
        // attacker can't enumerate which table holds a given username.
        const [user, member] = await Promise.all([
          prisma.user.findUnique({
            where: { username },
            include: { roles: true },
          }),
          prisma.member.findUnique({
            where: { username },
            include: { userRoles: true },
          }),
        ]);
        const password = String(credentials.password);

        if (user && user.isActive) {
          const isValid = await compare(password, user.passwordHash);
          if (isValid) {
            const baseRoles = user.roles.map((r) => r.role) as Role[];
            const synth = await synthesizeRoles({ userId: user.id, baseRoles });
            return {
              id: user.id,
              username: user.username,
              fullName: user.fullName,
              roles: synth.roles,
              sectionLevels: synth.sectionLevels,
              bureauLevel: synth.bureauLevel,
              subjectKind: "user",
            };
          }
          // User exists but password wrong: still burn a bcrypt cycle on the
          // dummy hash so timing matches "user doesn't exist" exactly.
          await compare(password, DUMMY_HASH);
          return null;
        }

        if (
          member &&
          member.userIsActive &&
          member.passwordHash &&
          member.username
        ) {
          const isValid = await compare(password, member.passwordHash);
          if (isValid) {
            const baseRoles = member.userRoles.map((r) => r.role) as Role[];
            const synth = await synthesizeRoles({ memberId: member.id, baseRoles });
            return {
              id: member.id,
              username: member.username,
              fullName: member.fullName,
              roles: synth.roles,
              sectionLevels: synth.sectionLevels,
              bureauLevel: synth.bureauLevel,
              subjectKind: "member",
            };
          }
          await compare(password, DUMMY_HASH);
          return null;
        }

        // Neither user matched (or both exist but inactive/wrong-pw):
        // burn one more bcrypt cycle so the timing for "no row" matches
        // "user exists, wrong password" or "member exists, wrong password".
        await compare(password, DUMMY_HASH);
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.fullName = user.fullName;
        token.roles = user.roles;
        token.sectionLevels = user.sectionLevels;
        token.bureauLevel = user.bureauLevel;
        token.subjectKind = user.subjectKind;
        token.rolesCheckedAt = Date.now();
        return token;
      }
      const now = Date.now();
      if (!token.rolesCheckedAt || now - token.rolesCheckedAt > ROLE_REFRESH_INTERVAL_MS) {
        const fresh = await freshRolesFor(token);
        if (fresh) {
          token.roles = fresh.roles;
          token.sectionLevels = fresh.sectionLevels;
          token.bureauLevel = fresh.bureauLevel;
        }
        token.rolesCheckedAt = now;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.id,
        username: token.username,
        fullName: token.fullName,
        roles: token.roles,
        sectionLevels: token.sectionLevels,
        bureauLevel: token.bureauLevel,
        subjectKind: token.subjectKind,
      };
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
