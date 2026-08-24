"use client";

import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { roleLabel } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import type { Role } from "@/lib/rbac";
import { useT } from "@/components/i18n/provider";
import { LocaleSwitcher } from "@/components/i18n/locale-switcher";

export function TopBar() {
  const { data: session } = useSession();
  const { resolvedTheme, setTheme } = useTheme();
  const { locale, t } = useT();
  const user = session?.user;
  const initials = user?.fullName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2) ?? "؟";

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="flex h-14 items-center gap-3 px-4">
        <SidebarTrigger />
        <div className="flex-1" />

        {/* Language switcher */}
        <LocaleSwitcher locale={locale} />

        {/* Dark mode toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          title={resolvedTheme === "dark" ? t("topbar.lightMode") : t("topbar.darkMode")}
        >
          {resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button variant="ghost" className="gap-2 px-2">
              <span className="hidden sm:inline text-sm font-medium">{user?.fullName}</span>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <div className="px-2 py-2">
              <p className="text-sm font-semibold">{user?.fullName}</p>
              <p className="text-xs text-muted-foreground">@{user?.username}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {(user?.roles as Role[])?.map((role) => (
                  <Badge key={role} variant="secondary" className="text-xs">
                    {roleLabel(role, locale as "ar" | "fr")}
                  </Badge>
                ))}
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
              {t("topbar.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
