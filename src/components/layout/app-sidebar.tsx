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
  GraduationCap,
  HeartHandshake,
  BookOpen,
  UserRound,
  CalendarDays,
  ClipboardList,
  CalendarCheck,
  Activity,
  ScrollText,
  FileSpreadsheet,
  HandHeart,
  Users2,
  Upload,
  BarChart3,
  Heart,
  QrCode,
  Target,
  ListChecks,
} from "lucide-react";
import type { Role } from "@/lib/rbac";
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
    title: "لوحة الإدارة",
    href: "/admin",
    roles: ["ADMIN", "BUREAU_RW"],
    children: [
      { title: "نظرة عامة", href: "/admin", icon: LayoutDashboard },
      { title: "المنخرطين", href: "/admin/members", icon: Users },
      { title: "استيراد المنخرطين", href: "/admin/members/import", icon: Upload },
      { title: "إدارة الوصول", href: "/admin/users", icon: Shield },
      { title: "الصلاحيات الموسعة", href: "/admin/permissions", icon: Shield },
      { title: "السنوات الدراسية", href: "/admin/academic-years", icon: CalendarDays },
      { title: "الروابط العائلية", href: "/admin/family-links", icon: Users2 },
      { title: "شارات QR", href: "/admin/members/badges", icon: QrCode },
      { title: "سجل المراجعة", href: "/admin/audit", icon: ScrollText },
      { title: "معلومات الجمعية", href: "/admin/association", icon: Settings },
    ],
  },
  {
    title: "المكتب المسير",
    href: "/bureau",
    roles: ["ADMIN", "BUREAU", "FINANCIAL"],
    children: [
      { title: "نظرة عامة", href: "/bureau", icon: Building2 },
    ],
  },
  {
    title: "المالية",
    href: "/financial",
    roles: ["ADMIN", "FINANCIAL"],
    children: [
      { title: "نظرة عامة", href: "/financial", icon: Wallet },
      { title: "المساهمات الأسبوعية", href: "/financial/contributions", icon: Coins },
      { title: "المصاريف", href: "/financial/expenses", icon: Receipt },
      { title: "التبرعات", href: "/financial/donations", icon: Gift },
      { title: "تقارير وإحصائيات", href: "/financial/reports", icon: BarChart3 },
    ],
  },
  {
    title: "القسم التربوي",
    href: "/educational",
    roles: ["ADMIN", "EDUCATIONAL", "BUREAU", "BUREAU_RW", "FINANCIAL"],
    children: [
      { title: "نظرة عامة", href: "/educational", icon: GraduationCap },
      { title: "البرامج والأنشطة", href: "/educational/programs", icon: ClipboardList },
      { title: "الحضور", href: "/educational/attendance", icon: CalendarCheck },
    ],
  },
  {
    title: "القسم الاجتماعي",
    href: "/social",
    roles: ["ADMIN", "SOCIAL", "BAHT_IJTIMA3I_TEAM", "BUREAU", "BUREAU_RW", "FINANCIAL"],
    children: [
      { title: "نظرة عامة", href: "/social", icon: HeartHandshake },
      { title: "المشاريع والأنشطة", href: "/social/projects", icon: Target },
      { title: "الحالات الاجتماعية", href: "/social/cases", icon: HeartHandshake, roles: ["ADMIN", "BAHT_IJTIMA3I_TEAM"] },
      { title: "البرامج", href: "/social/programs", icon: ClipboardList },
      { title: "الحضور", href: "/social/attendance", icon: CalendarCheck },
      { title: "تحليلات", href: "/social/analytics", icon: BarChart3 },
    ],
  },
  {
    title: "قسم القرآن الكريم",
    href: "/quran",
    roles: ["ADMIN", "QURAN", "BUREAU", "BUREAU_RW", "FINANCIAL"],
    children: [
      { title: "نظرة عامة", href: "/quran", icon: BookOpen },
      { title: "البرامج والأنشطة", href: "/quran/programs", icon: ClipboardList },
      { title: "الحضور", href: "/quran/attendance", icon: CalendarCheck },
      { title: "تتبع الحفظ والتجويد", href: "/quran/progress", icon: Activity },
    ],
  },
  {
    title: "مركز تأهيل القادة",
    href: "/qada",
    roles: ["ADMIN", "BUREAU", "BUREAU_RW", "FINANCIAL"],
    children: [
      { title: "نظرة عامة", href: "/qada", icon: GraduationCap },
      { title: "البرامج والأنشطة", href: "/qada/programs", icon: ClipboardList },
    ],
  },
  {
    title: "القسم الإعلامي",
    href: "/media",
    roles: ["ADMIN", "BUREAU", "BUREAU_RW", "FINANCIAL"],
    children: [
      { title: "نظرة عامة", href: "/media", icon: ClipboardList },
      { title: "📋 لوحة المهام", href: "/media/tasks", icon: ListChecks },
    ],
  },
  {
    title: "ساعات التطوع",
    href: "/volunteer",
    roles: ["ADMIN", "BUREAU", "BUREAU_RW", "SECTION_ADMIN"],
    children: [
      { title: "ساعات التطوع", href: "/volunteer", icon: HandHeart },
    ],
  },
  {
    title: "فضاء المنخرط",
    href: "/member",
    roles: ["ADMIN", "BUREAU", "FINANCIAL", "EDUCATIONAL", "SOCIAL", "QURAN", "MEMBER"],
    children: [
      { title: "الملف الشخصي", href: "/member", icon: UserRound },
      { title: "تعديل بياناتي", href: "/member/profile", icon: UserRound },
      { title: "أبنائي", href: "/member/family", icon: Users2 },
      { title: "تطوعي", href: "/member/volunteer", icon: Heart },
    ],
  },
];

export function AppSidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const userRoles = (session?.user?.roles ?? []) as Role[];

  const accessibleItems = navItems.filter((item) =>
    userRoles.some((role) => item.roles.includes(role))
  );

  return (
    <Sidebar side="right" collapsible="icon">
      <SidebarHeader className="border-b px-3 py-3">
        <Link href="/" className="flex items-center gap-3 px-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 shadow-sm bg-white">
            <Image src="/logo.jpg" alt="شعار الجمعية" width={36} height={36} className="object-cover w-full h-full" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden min-w-0">
            <h2 className="font-bold text-sm leading-tight truncate">جمعية النعمة</h2>
            <p className="text-xs text-muted-foreground">نظام التسيير</p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {accessibleItems.map((item) => (
          <SidebarGroup key={item.href}>
            <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden text-xs">
              {item.title}
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
                        tooltip={child.title}
                      >
                        <Icon className="shrink-0" size={16} />
                        <span className="group-data-[collapsible=icon]:hidden">
                          {child.title}
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
          جمعية النعمة · مكناس
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
