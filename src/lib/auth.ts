import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "./prisma";
import { rateLimit } from "./rate-limit";
import type { Role } from "./rbac";

// Dummy bcrypt hash to keep "user not found" timing similar to "wrong password".
// Defends against timing-based username enumeration.
const DUMMY_HASH = "$2b$12$0000000000000000000000.00000000000000000000000000000000";

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

const ROLE_REFRESH_INTERVAL_MS = 60_000; // re-query at most once per minute

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "اسم المستخدم", type: "text" },
        password: { label: "كلمة المرور", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        // Throttle by username: 5 failed attempts per 5 minutes. Successful
        // logins also consume budget — could be smarter, but this is enough
        // to defeat brute force without locking honest users out.
        const username = String(credentials.username).toLowerCase();
        const rl = rateLimit(`login:${username}`, 5, 5 * 60 * 1000);
        if (!rl.allowed) {
          // Burn cycles equivalent to a bcrypt compare so timing stays similar
          await compare(String(credentials.password), DUMMY_HASH);
          return null;
        }

        // 1. Check system User table (admin accounts not tied to a member)
        const user = await prisma.user.findUnique({
          where: { username: credentials.username as string },
          include: { roles: true },
        });

        if (user && user.isActive) {
          const isValid = await compare(
            credentials.password as string,
            user.passwordHash
          );
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
        }

        // 2. Check Member table (adult members with login access)
        const member = await prisma.member.findUnique({
          where: { username: credentials.username as string },
          include: { userRoles: true },
        });

        if (
          !member ||
          !member.userIsActive ||
          !member.passwordHash ||
          !member.username
        ) {
          // Constant-time-ish: still do a bcrypt compare so attackers can't
          // distinguish "user not found" from "wrong password" via response time.
          await compare(credentials.password as string, DUMMY_HASH);
          return null;
        }

        const isValid = await compare(
          credentials.password as string,
          member.passwordHash
        );
        if (!isValid) return null;

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
