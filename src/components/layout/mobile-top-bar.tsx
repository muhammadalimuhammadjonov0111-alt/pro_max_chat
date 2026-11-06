"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Search } from "lucide-react";

import { useT } from "@/hooks/use-i18n";
import { Wordmark } from "@/components/shared/wordmark";

/**
 * Mobile-only top bar. Search lives on the left and activity (likes/follows)
 * on the right, which keeps the bottom bar from getting crowded.
 */
export function MobileTopBar({
  unreadNotifications = 0,
}: {
  unreadNotifications?: number;
}) {
  const pathname = usePathname();
  const t = useT();

  // Full-screen experiences keep their own chrome.
  if (pathname.startsWith("/reels") || pathname.startsWith("/messages")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/60 bg-background/80 px-2 backdrop-blur-xl lg:hidden">
      <Link
        href="/search"
        aria-label={t("Qidirish")}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95"
      >
        <Search className="h-[22px] w-[22px]" />
      </Link>

      <Wordmark className="text-[26px]" />

      <Link
        href="/notifications"
        aria-label={t("Bildirishnomalar")}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95"
      >
        <Heart className="h-[22px] w-[22px]" />
        {unreadNotifications > 0 && (
          <span className="absolute end-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-like px-1 text-[10px] font-bold text-white ring-2 ring-background">
            {unreadNotifications > 9 ? "9+" : unreadNotifications}
          </span>
        )}
      </Link>
    </header>
  );
}
