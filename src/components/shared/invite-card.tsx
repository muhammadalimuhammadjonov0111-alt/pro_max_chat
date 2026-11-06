"use client";

import * as React from "react";
import { Check, Copy, Gift } from "lucide-react";
import { toast } from "sonner";

import { useT } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

export function InviteCard({ className }: { className?: string }) {
  const t = useT();
  const [copied, setCopied] = React.useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      toast.success(t("Nusxalandi"));
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      void 0;
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 overflow-hidden rounded-2xl border bg-gradient-to-r from-violet-500/12 via-fuchsia-500/10 to-amber-400/15 p-3.5 sm:flex-row sm:items-center",
        className
      )}
    >
      <span className="brand-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-lg shadow-violet-500/25">
        <Gift className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold">{t("Do'stlaringizni taklif qiling")}</p>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {t("Gidgogram havolasini do'stlaringizga yuboring.")}
        </p>
      </div>
      <button
        type="button"
        onClick={copyLink}
        className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border bg-background px-3 text-xs font-semibold transition-colors hover:bg-accent"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-500" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
        {copied ? t("Nusxalandi") : t("Nusxalash")}
      </button>
    </div>
  );
}
