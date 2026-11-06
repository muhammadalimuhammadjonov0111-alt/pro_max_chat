"use client";

import { BadgeCheck, Bot, Crown, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/use-i18n";

/** AI bot marker. */
export function BotBadge({ className }: { className?: string }) {
  const t = useT();
  return (
    <span
      aria-label={t("AI bot")}
      title={t("AI bot")}
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm",
        className
      )}
    >
      <Bot className="h-3 w-3" strokeWidth={2.6} />
      AI
    </span>
  );
}

/** Blue verified checkmark (Instagram-style). */
export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <BadgeCheck
      aria-label="Tasdiqlangan"
      className={cn("inline-block h-4 w-4 shrink-0 text-[#0095f6]", className)}
    />
  );
}

/** Admin shield. */
export function AdminBadge({ className }: { className?: string }) {
  return (
    <ShieldCheck
      aria-label="Admin"
      className={cn("inline-block h-4 w-4 shrink-0 text-amber-500", className)}
    />
  );
}

/** Premium pill. */
export function PremiumBadge({ className }: { className?: string }) {
  const t = useT();
  return (
    <span
      aria-label={t("Premium a'zo")}
      title={t("Premium a'zo")}
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm",
        className
      )}
    >
      <Crown className="h-3 w-3" strokeWidth={2.6} />
      Pro
    </span>
  );
}

/** Subtle soft pill used for admin sub-headings and metadata. */
export function SoftPill({
  children,
  className,
  icon: Icon,
}: {
  children: React.ReactNode;
  className?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border/70 bg-secondary/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground",
        className
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </span>
  );
}

/** Sparkling "new" indicator. */
export function NewBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm",
        className
      )}
    >
      <Sparkles className="h-3 w-3" />
      New
    </span>
  );
}

/** Small colored role marker. */
export function CrownBadge({ className }: { className?: string }) {
  return (
    <Crown
      aria-label="Premium"
      className={cn("inline-block h-4 w-4 shrink-0 text-amber-500", className)}
    />
  );
}
