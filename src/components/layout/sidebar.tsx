"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  Home,
  Search,
  Compass,
  Clapperboard,
  Bot,
  Send,
  Heart,
  Megaphone,
  Settings,
  SunMoon,
  LogOut,
  Camera,
  Crown,
  ShieldCheck,
  Plus,
  UserRound,
} from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { useMounted } from "@/hooks/use-mounted";
import { useT } from "@/hooks/use-i18n";
import { Wordmark } from "@/components/shared/wordmark";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { useCreateDialog } from "@/components/create/create-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  VerifiedBadge,
  AdminBadge,
  PremiumBadge,
} from "@/components/shared/badges";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  badge?: number;
  gradient?: boolean;
};

export function Sidebar({
  user,
  unreadNotifications = 0,
  unreadMessages = 0,
}: {
  user: {
    id: string;
    username: string | null;
    name: string;
    image: string | null;
    isVerified: boolean;
    isPremium: boolean;
    isAdmin: boolean;
  };
  unreadNotifications?: number;
  unreadMessages?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const t = useT();
  const { open: openCreate } = useCreateDialog();

  const username = user.username ?? user.name;

  const items: NavItem[] = [
    { href: "/", label: t("Bosh sahifa"), icon: Home },
    { href: "/search", label: t("Qidirish"), icon: Search },
    { href: "/explore", label: t("Explore"), icon: Compass },
    { href: "/reels", label: t("Reels"), icon: Clapperboard },
    { href: "/bots", label: t("AI botlar"), icon: Bot },
    { href: "/messages", label: t("Xabarlar"), icon: Send, badge: unreadMessages },
    {
      href: "/notifications",
      label: t("Bildirishnomalar"),
      icon: Heart,
      badge: unreadNotifications,
    },
    { href: "/premium", label: t("Premium"), icon: Crown, gradient: true },
    { href: "/ads", label: t("Reklama"), icon: Megaphone },
  ];

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    if (href === `/${username}`) return pathname === `/${username}`;
    return pathname.startsWith(href);
  }

  async function handleLogout() {
    try {
      await authClient.signOut();
    } catch {
      /* ignore */
    }
    toast.success(t("Hisobdan chiqdingiz"));
    router.push("/login");
    router.refresh();
  }

  const rowClass = (active: boolean) =>
    cn(
      "group relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors duration-200",
      active
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-accent hover:text-foreground"
    );

  return (
    <nav className="fixed inset-y-0 start-0 z-40 hidden w-[236px] flex-col border-e border-border/60 bg-background/80 px-3 pb-4 pt-4 backdrop-blur-xl lg:flex">
      <div className="aurora pointer-events-none absolute inset-0 -z-10 opacity-40" />

      {/* Brand */}
      <div className="mb-6 flex h-12 items-center px-2">
        <Link href="/" className="flex items-center gap-3">
          <span className="brand-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg shadow-violet-500/30">
            <Camera className="h-5 w-5" strokeWidth={2.4} />
          </span>
          <Wordmark link={false} className="text-[26px]" />
        </Link>
      </div>

      {/* Main navigation */}
      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden pe-0.5">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={rowClass(active)}
            >
              {active && (
                <span className="brand-gradient absolute inset-y-2 -start-3 w-1 rounded-full" />
              )}
              <item.icon
                strokeWidth={active ? 2.6 : 2}
                className={cn(
                  "h-[21px] w-[21px] shrink-0",
                  item.gradient && "text-amber-500"
                )}
              />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {!!item.badge && item.badge > 0 && (
                <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-like px-1.5 text-[10px] font-bold text-white">
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              )}
            </Link>
          );
        })}

        {/* Create */}
        <button
          onClick={openCreate}
          className="brand-gradient animated-gradient mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-[0_12px_28px_-10px_rgba(124,58,237,0.85)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="h-[18px] w-[18px]" strokeWidth={2.8} />
          <span className="truncate">{t("Yaratish")}</span>
        </button>
      </div>

      {/* Bottom utilities */}
      <div className="mt-3 space-y-0.5 border-t border-border/60 pt-3">
        <Link
          href="/settings"
          className={rowClass(isActive("/settings"))}
        >
          {isActive("/settings") && (
            <span className="brand-gradient absolute inset-y-2 -start-3 w-1 rounded-full" />
          )}
          <Settings className="h-[21px] w-[21px] shrink-0" strokeWidth={2} />
          <span className="min-w-0 flex-1 truncate">{t("Sozlamalar")}</span>
        </Link>

        <div className="px-1 py-1">
          <LanguageSwitcher
            align="start"
            side="right"
            className="w-full justify-start"
          />
        </div>

        {/* Profile menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-12 w-full items-center gap-3 rounded-xl px-2 text-start transition-colors hover:bg-accent">
              {user.isPremium ? (
                <span className="story-ring shrink-0 rounded-full p-[2px]">
                  <span className="block rounded-full bg-background p-[2px]">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.image ?? undefined} alt={username} />
                      <AvatarFallback className="text-[10px]">
                        {username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </span>
                </span>
              ) : (
                <Avatar className="h-8 w-8 shrink-0 ring-1 ring-border">
                  <AvatarImage src={user.image ?? undefined} alt={username} />
                  <AvatarFallback className="text-[10px]">
                    {username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 text-sm font-semibold">
                  <span className="truncate">{user.username ?? user.name}</span>
                  {user.isVerified && <VerifiedBadge className="shrink-0" />}
                  {user.isAdmin && <AdminBadge className="shrink-0" />}
                </span>
                <span className="block truncate text-xs font-normal text-muted-foreground">
                  {user.name}
                </span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-60 p-1.5">
            {user.isPremium ? (
              <DropdownMenuItem onClick={() => router.push("/premium")}>
                <Crown className="text-amber-500" /> {t("Premium faol")}
                <PremiumBadge className="ms-auto" />
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => router.push("/premium")}>
                <Crown className="text-amber-500" /> {t("Premium olish")}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => router.push(`/${username}`)}>
              <UserRound /> {t("Mening profilim")}
            </DropdownMenuItem>
            {user.isAdmin && (
              <DropdownMenuItem onClick={() => router.push("/admin-panel")}>
                <ShieldCheck className="text-amber-500" /> {t("Admin panel")}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => setTheme(mounted && theme === "dark" ? "light" : "dark")}
            >
              <SunMoon />{" "}
              {mounted && theme === "dark" ? t("Yorug' rejim") : t("Tungi rejim")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-like focus:text-like"
            >
              <LogOut /> {t("Hisobdan chiqish")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
