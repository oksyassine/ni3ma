"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  Users,
  Shield,
  Settings,
  Building2,
  Wallet,
  Coins,
  Receipt,
  Gift,
  Calculator,
  GraduationCap,
  HeartHandshake,
  BookOpen,
  UserRound,
  CalendarDays,
  Vote,
  ClipboardList,
  CalendarCheck,
  Activity,
  ScrollText,
  HandHeart,
  Users2,
  Upload,
  BarChart3,
  Heart,
  QrCode,
  Target,
  ListChecks,
  CreditCard,
  Building,
  Gavel,
  Landmark,
  UsersRound,
  PackageOpen,
  FileOutput,
  Inbox,
  Network,
  FileSignature,
  Handshake,
  Heart as HeartIcon,
  Boxes,
  Bell,
  HandHeart as HandHeartIcon,
  MessageSquare,
  ShieldCheck,
  LayoutDashboard as LayoutDashboardIcon,
} from "lucide-react";
import type { Role } from "@/lib/rbac";
import { useT } from "@/components/i18n/provider";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

type NavChild = {
  title: string;
  href: string;
  icon: React.ElementType;
  roles?: Role[]; // optional per-child override; if omitted, parent's roles apply
};

type NavItem = {
  title: string;
  href: string;
  roles: Role[];
  children: NavChild[];
};

const navItems: NavItem[] = [
  {
    title: "nav.billing",
    href: "/billing",
    roles: ["ADMIN", "BUREAU", "BUREAU_RW"],
    children: [{ title: "nav.billing", href: "/billing", icon: CreditCard }],
  },
  {
    title: "nav.platform",
    href: "/platform",
    roles: ["ADMIN"],
    children: [{ title: "nav.platform.tenants", href: "/platform", icon: Building }],
  },
  {
    title: "nav.admin",
    href: "/admin",
    roles: ["ADMIN", "BUREAU_RW"],
    children: [
      { title: "nav.overview", href: "/admin", icon: LayoutDashboard },
      { title: "nav.members", href: "/admin/members", icon: Users },
      { title: "nav.membersImport", href: "/admin/members/import", icon: Upload },
      { title: "nav.memberCard", href: "/admin/members", icon: CreditCard },
      { title: "nav.accessControl", href: "/admin/users", icon: Shield },
      { title: "nav.extendedPermissions", href: "/admin/permissions", icon: Shield },
      { title: "nav.academicYears", href: "/admin/academic-years", icon: CalendarDays },
      { title: "nav.familyLinks", href: "/admin/family-links", icon: Users2 },
      { title: "nav.qrBadges", href: "/admin/members/badges", icon: QrCode },
      { title: "nav.auditLog", href: "/admin/audit", icon: ScrollText },
      { title: "nav.associationInfo", href: "/admin/association", icon: Settings },
    ],
  },
  {
    title: "nav.bureau",
    href: "/bureau",
    roles: ["ADMIN", "BUREAU", "BUREAU_RW", "FINANCIAL"],
    children: [
      { title: "nav.overview", href: "/bureau", icon: Building2 },
      { title: "nav.meetings", href: "/bureau/meetings", icon: Gavel, roles: ["ADMIN", "BUREAU", "BUREAU_RW"] },
      { title: "nav.mandates", href: "/bureau/mandates", icon: UsersRound, roles: ["ADMIN", "BUREAU", "BUREAU_RW"] },
      { title: "nav.grants", href: "/bureau/grants", icon: Landmark },
      { title: "nav.assetsInventory", href: "/bureau/assets", icon: Boxes },
      { title: "nav.sponsorships", href: "/bureau/sponsorships", icon: HeartHandshake, roles: ["ADMIN", "BUREAU", "BUREAU_RW"] },
      { title: "nav.distributions", href: "/bureau/distributions", icon: PackageOpen, roles: ["ADMIN", "BUREAU", "BUREAU_RW"] },
      { title: "nav.documents", href: "/bureau/documents", icon: ScrollText, roles: ["ADMIN", "BUREAU", "BUREAU_RW"] },
      { title: "nav.mail", href: "/bureau/mail", icon: Inbox },
      { title: "nav.zakat", href: "/bureau/zakat", icon: Calculator, roles: ["ADMIN", "BUREAU", "BUREAU_RW", "FINANCIAL"] },
      { title: "nav.accounting", href: "/bureau/accounting", icon: BookOpen, roles: ["ADMIN", "BUREAU_RW", "FINANCIAL"] },
      { title: "nav.elections", href: "/bureau/elections", icon: Vote, roles: ["ADMIN", "BUREAU", "BUREAU_RW"] },
      { title: "nav.events", href: "/bureau/events", icon: CalendarDays, roles: ["ADMIN", "BUREAU", "BUREAU_RW"] },
      { title: "nav.branches", href: "/bureau/branches", icon: Network },
      { title: "nav.trainings", href: "/bureau/trainings", icon: GraduationCap, roles: ["ADMIN", "BUREAU", "BUREAU_RW"] },
      { title: "nav.volunteerContracts", href: "/bureau/volunteer-contracts", icon: FileSignature, roles: ["ADMIN", "BUREAU", "BUREAU_RW"] },
      { title: "nav.campaigns", href: "/bureau/campaigns", icon: HeartIcon, roles: ["ADMIN", "BUREAU", "BUREAU_RW"] },
      { title: "nav.beneReceipts", href: "/bureau/bene-receipts", icon: HandHeartIcon, roles: ["ADMIN", "BUREAU", "BUREAU_RW", "SOCIAL"] },
      { title: "nav.invRegister", href: "/bureau/inv-register", icon: Boxes, roles: ["ADMIN", "BUREAU", "BUREAU_RW"] },
      { title: "nav.paperwork", href: "/bureau/paperwork", icon: FileOutput, roles: ["ADMIN", "BUREAU", "BUREAU_RW"] },
      { title: "nav.employees", href: "/bureau/employees", icon: Users, roles: ["ADMIN", "BUREAU_RW", "FINANCIAL"] },
      { title: "nav.partnerships", href: "/bureau/partnerships", icon: Handshake },
      { title: "nav.library", href: "/bureau/library", icon: BookOpen, roles: ["ADMIN", "BUREAU", "BUREAU_RW"] },
      { title: "nav.reminders", href: "/bureau/reminders", icon: Bell, roles: ["ADMIN", "BUREAU", "BUREAU_RW", "FINANCIAL"] },
      { title: "nav.messages", href: "/bureau/messages", icon: MessageSquare, roles: ["ADMIN", "BUREAU", "BUREAU_RW"] },
      { title: "nav.audit", href: "/bureau/audit", icon: ShieldCheck },
      { title: "nav.annualReport", href: "/bureau/annual-report", icon: FileOutput },
    ],
  },
  {
    title: "nav.financial",
    href: "/financial",
    roles: ["ADMIN", "FINANCIAL"],
    children: [
      { title: "nav.overview", href: "/financial", icon: Wallet },
      { title: "nav.weeklyContributions", href: "/financial/contributions", icon: Coins },
      { title: "nav.auto1", href: "/financial/expenses", icon: Receipt },
      { title: "nav.auto2", href: "/financial/donations", icon: Gift },
      { title: "nav.auto3", href: "/financial/reports", icon: BarChart3 },
    ],
  },
  {
    title: "nav.auto4",
    href: "/educational",
    roles: ["ADMIN", "EDUCATIONAL", "BUREAU", "BUREAU_RW", "FINANCIAL"],
    children: [
      { title: "nav.overview", href: "/educational", icon: GraduationCap },
      { title: "nav.auto5", href: "/educational/programs", icon: ClipboardList },
      { title: "nav.auto6", href: "/educational/attendance", icon: CalendarCheck },
    ],
  },
  {
    title: "nav.auto7",
    href: "/social",
    roles: ["ADMIN", "SOCIAL", "BAHT_IJTIMA3I_TEAM", "BUREAU", "BUREAU_RW", "FINANCIAL"],
    children: [
      { title: "nav.overview", href: "/social", icon: HeartHandshake },
      { title: "nav.auto8", href: "/social/projects", icon: Target },
      { title: "nav.auto9", href: "/social/cases", icon: HeartHandshake, roles: ["ADMIN", "BAHT_IJTIMA3I_TEAM"] },
      { title: "nav.auto10", href: "/social/programs", icon: ClipboardList },
      { title: "nav.auto6", href: "/social/attendance", icon: CalendarCheck },
      { title: "nav.auto11", href: "/social/analytics", icon: BarChart3 },
    ],
  },
  {
    title: "nav.auto12",
    href: "/quran",
    roles: ["ADMIN", "QURAN", "BUREAU", "BUREAU_RW", "FINANCIAL"],
    children: [
      { title: "nav.overview", href: "/quran", icon: BookOpen },
      { title: "nav.auto5", href: "/quran/programs", icon: ClipboardList },
      { title: "nav.auto6", href: "/quran/attendance", icon: CalendarCheck },
      { title: "nav.auto13", href: "/quran/progress", icon: Activity },
    ],
  },
  {
    title: "nav.auto14",
    href: "/qada",
    roles: ["ADMIN", "BUREAU", "BUREAU_RW", "FINANCIAL"],
    children: [
      { title: "nav.overview", href: "/qada", icon: GraduationCap },
      { title: "nav.auto5", href: "/qada/programs", icon: ClipboardList },
    ],
  },
  {
    title: "nav.auto15",
    href: "/media",
    roles: ["ADMIN", "BUREAU", "BUREAU_RW", "FINANCIAL"],
    children: [
      { title: "nav.overview", href: "/media", icon: ClipboardList },
      { title: "nav.auto16", href: "/media/tasks", icon: ListChecks },
    ],
  },
  {
    title: "nav.auto17",
    href: "/volunteer",
    roles: ["ADMIN", "BUREAU", "BUREAU_RW", "SECTION_ADMIN"],
    children: [
      { title: "nav.auto17", href: "/volunteer", icon: HandHeart },
    ],
  },
  {
    title: "nav.auto18",
    href: "/member",
    roles: ["ADMIN", "BUREAU", "FINANCIAL", "EDUCATIONAL", "SOCIAL", "QURAN", "MEMBER"],
    children: [
      { title: "nav.auto19", href: "/member", icon: UserRound },
      { title: "nav.auto20", href: "/member/profile", icon: UserRound },
      { title: "nav.auto21", href: "/member/family", icon: Users2 },
      { title: "nav.auto22", href: "/member/volunteer", icon: Heart },
    ],
  },
];

export function AppSidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const { t, rtl } = useT();
  const userRoles = (session?.user?.roles ?? []) as Role[];

  const accessibleItems = navItems.filter((item) =>
    userRoles.some((role) => item.roles.includes(role))
  ).filter((item) => {
    // /platform is the SaaS owner console — only meaningful on the root
    // domain, never inside a tenant subdomain.
    if (item.href === "/platform" && typeof window !== "undefined") {
      const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "";
      return !root || window.location.hostname.endsWith(root);
    }
    return true;
  });

  return (
    <Sidebar side={rtl ? "right" : "left"} collapsible="icon">
      <SidebarHeader className="border-b px-3 py-3">
        <Link href="/" className="flex items-center gap-3 px-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 shadow-sm bg-white">
            <Image src="/logo.jpg" alt={t("sidebar.logoAlt")} width={36} height={36} className="object-cover w-full h-full" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden min-w-0">
            <h2 className="font-bold text-sm leading-tight truncate">{t("sidebar.assocName")}</h2>
            <p className="text-xs text-muted-foreground">{t("sidebar.tagline")}</p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {accessibleItems.map((item) => (
          <SidebarGroup key={item.href}>
            <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden text-xs">
              {t(item.title)}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {item.children.filter((child) => !child.roles || userRoles.some((r) => child.roles!.includes(r))).map((child) => {
                  const Icon = child.icon;
                  return (
                    <SidebarMenuItem key={child.href}>
                      <SidebarMenuButton
                        render={<Link href={child.href} onClick={() => setOpenMobile(false)} />}
                        isActive={pathname === child.href}
                        tooltip={t(child.title)}
                      >
                        <Icon className="shrink-0" size={16} />
                        <span className="group-data-[collapsible=icon]:hidden">
                          {t(child.title)}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t p-3">
        <p className="text-xs text-muted-foreground text-center group-data-[collapsible=icon]:hidden">
          {t("sidebar.assocLocation")}
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
