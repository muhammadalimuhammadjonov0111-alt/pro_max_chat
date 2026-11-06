"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Clapperboard, Plus, Bot } from "lucide-react";

import { useCreateDialog } from "@/components/create/create-provider";
import { useT } from "@/hooks/use-i18n";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function MobileBottomBar({
  user,
}: {
  user: {
    username: string | null;
    name: string;
    image: string | null;
    isVerified?: boolean;
    isPremium?: boolean;
    isAdmin?: boolean;
  };
}) {
  const pathname = usePathname();
  const { open } = useCreateDialog();
  const t = useT();
  const username = user.username ?? user.name;

  const itemClass = (active: boolean) =>
    cn(
      "relative flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-200 active:scale-90",
      active
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:text-foreground"
    );

  const iconClass = (active: boolean) =>
    cn("h-[21px] w-[21px] transition-transform", active && "scale-105 stroke-[2.5px]");

  const botActive =
    pathname.startsWith("/bots") || pathname.startsWith("/create-bot");

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.7rem,env(safe-area-inset-bottom))] lg:hidden">
      <nav className="flex w-full max-w-md items-center justify-around gap-0.5 rounded-[1.75rem] border border-border/70 bg-background/80 p-1.5 shadow-[0_20px_50px_-22px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
        <Link
          href="/"
          aria-label={t("Bosh sahifa")}
          className={itemClass(pathname === "/")}
        >
          <Home className={iconClass(pathname === "/")} />
        </Link>

        <Link
          href="/reels"
          aria-label={t("Reels")}
          className={itemClass(pathname.startsWith("/reels"))}
        >
          <Clapperboard className={iconClass(pathname.startsWith("/reels"))} />
        </Link>

        <button
          onClick={open}
          aria-label={t("Yaratish")}
          className="flex h-11 w-11 items-center justify-center transition-transform active:scale-90"
        >
          <span className="brand-gradient animated-gradient flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-[0_12px_28px_-8px_rgba(124,58,237,0.9)]">
            <Plus className="h-5 w-5" strokeWidth={3} />
          </span>
        </button>

        <Link
          href="/bots"
          aria-label={t("AI botlar")}
          className={itemClass(botActive)}
        >
          <Bot className={iconClass(botActive)} />
        </Link>

        <Link
          href={`/${username}`}
          aria-label={t("Profil")}
          className={cn(
            "relative flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-200 active:scale-90",
            pathname === `/${username}` ? "bg-primary/10" : ""
          )}
        >
          {user.isPremium ? (
            <span className="story-ring rounded-full p-[2px]">
              <span className="block rounded-full bg-background p-[2px]">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user.image ?? undefined} alt={username} />
                  <AvatarFallback className="text-[9px]">
                    {username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </span>
            </span>
          ) : (
            <span
              className={cn(
                "rounded-full p-[2px] transition-all",
                pathname === `/${username}` ? "ring-2 ring-primary" : ""
              )}
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={user.image ?? undefined} alt={username} />
                <AvatarFallback className="text-[10px]">
                  {username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </span>
          )}
        </Link>
      </nav>
    </div>
  );
}
