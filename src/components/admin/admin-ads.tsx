"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarDays,
  Check,
  Clock3,
  ExternalLink,
  Layers,
  Loader2,
  Megaphone,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import {
  deleteAd,
  extendAd,
  grantAdSlot,
  reviewAd,
  type AdminAd,
} from "@/actions/ads";
import { useT } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

function statusTone(status: AdminAd["status"]) {
  switch (status) {
    case "APPROVED":
      return "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400";
    case "PENDING":
      return "bg-amber-500/12 text-amber-600 dark:text-amber-400";
    case "REJECTED":
      return "bg-destructive/12 text-destructive";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function statusText(status: AdminAd["status"], t: (key: string) => string) {
  switch (status) {
    case "APPROVED":
      return t("Reklama faol");
    case "PENDING":
      return t("Ko'rib chiqilmoqda");
    case "REJECTED":
      return t("Rad etilgan");
    default:
      return t("Muddati tugagan");
  }
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export function AdminAdsPanel({ ads }: { ads: AdminAd[] }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);

  async function run(
    key: string,
    fn: () => Promise<{ ok: boolean; error?: string }>,
    successMsg: string
  ) {
    setBusy(key);
    try {
      const res = await fn();
      if (!res.ok) void 0;
      else {
        toast.success(successMsg);
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  function reject(ad: AdminAd) {
    const note = window.prompt(t("Rad etish sababi"), "");
    if (note === null) return;
    run(
      `r${ad.id}`,
      () => reviewAd(ad.id, "reject", note),
      t("Reklama rad etildi")
    );
  }

  const pending = ads.filter((a) => a.status === "PENDING").length;
  const active = ads.filter((a) => a.status === "APPROVED").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t("Barcha reklamalar"), value: ads.length },
          { label: t("Ko'rib chiqilmoqda"), value: pending },
          { label: t("Reklama faol"), value: active },
        ].map((item) => (
          <div key={item.label} className="surface p-4">
            <p className="text-2xl font-black tabular-nums">{item.value}</p>
            <p className="truncate text-xs font-medium text-muted-foreground">
              {item.label}
            </p>
          </div>
        ))}
      </div>

      {ads.length === 0 && (
        <div className="surface flex flex-col items-center gap-2 p-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Megaphone className="h-6 w-6" />
          </span>
          <p className="text-sm font-semibold">{t("Reklama arizalari yo'q")}</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            {t("Foydalanuvchilar /ads sahifasi orqali ariza yuborishi mumkin.")}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {ads.map((ad) => {
          const username = ad.user.username ?? ad.user.name;
          const running = ad.status === "APPROVED";

          return (
            <div key={ad.id} className="surface overflow-hidden">
              <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={ad.user.image ?? undefined} alt={username} />
                  <AvatarFallback className="text-[10px]">
                    {username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">@{username}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {ad.user.name}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
                  <Layers className="h-3 w-3" />
                  {t("Joylar: {count}", { count: ad.user.adSlots })}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold",
                    statusTone(ad.status)
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {statusText(ad.status, t)}
                </span>
              </div>

              <div className="space-y-3 p-4">
                <div className="min-w-0 space-y-1">
                  <h3 className="truncate text-sm font-extrabold">{ad.title}</h3>
                  <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {ad.description}
                  </p>
                </div>

                <a
                  href={ad.targetUrl}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="flex items-center gap-1.5 truncate rounded-lg bg-secondary/60 px-2.5 py-1.5 text-[11px] font-medium underline-offset-2 hover:underline"
                >
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  <span className="truncate">{ad.targetUrl}</span>
                </a>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {t("Boshlanish sanasi")}: {formatDate(ad.startsAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock3 className="h-3 w-3" />
                    {t("Tugash sanasi")}: {formatDate(ad.endsAt)}
                  </span>
                </div>

                {ad.adminNote && (
                  <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-2.5 py-1.5 text-[11px] text-destructive">
                    {t("Rad etish sababi")}: {ad.adminNote}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  {ad.status === "PENDING" && (
                    <>
                      <Button
                        size="sm"
                        variant="gradient"
                        disabled={busy === `a${ad.id}`}
                        onClick={() =>
                          run(
                            `a${ad.id}`,
                            () => reviewAd(ad.id, "approve"),
                            t("Reklama tasdiqlandi")
                          )
                        }
                      >
                        {busy === `a${ad.id}` ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        {t("Tasdiqlash")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                        disabled={busy === `r${ad.id}`}
                        onClick={() => reject(ad)}
                      >
                        <X className="h-3.5 w-3.5" />
                        {t("Rad etish")}
                      </Button>
                    </>
                  )}

                  {running && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === `e7${ad.id}`}
                        onClick={() =>
                          run(
                            `e7${ad.id}`,
                            () => extendAd(ad.id, 7),
                            t("Reklama muddati uzaytirildi")
                          )
                        }
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {t("7 kun")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === `e30${ad.id}`}
                        onClick={() =>
                          run(
                            `e30${ad.id}`,
                            () => extendAd(ad.id, 30),
                            t("Reklama muddati uzaytirildi")
                          )
                        }
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {t("30 kun")}
                      </Button>
                    </>
                  )}

                  {ad.status === "EXPIRED" && (
                    <Button
                      size="sm"
                      variant="gradient"
                      disabled={busy === `e30${ad.id}`}
                      onClick={() =>
                        run(
                          `e30${ad.id}`,
                          () => extendAd(ad.id, 30),
                          t("Reklama muddati uzaytirildi")
                        )
                      }
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {t("30 kun qo'shish")}
                    </Button>
                  )}

                  {ad.status === "REJECTED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === `a${ad.id}`}
                      onClick={() =>
                        run(
                          `a${ad.id}`,
                          () => reviewAd(ad.id, "approve"),
                          t("Reklama tasdiqlandi")
                        )
                      }
                    >
                      <Check className="h-3.5 w-3.5" />
                      {t("Tasdiqlash")}
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === `slots${ad.id}`}
                    onClick={() =>
                      run(
                        `slots${ad.id}`,
                        () => grantAdSlot(ad.user.id),
                        t("Reklama joyi qo'shildi")
                      )
                    }
                  >
                    {busy === `slots${ad.id}` ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    {t("Qo'shimcha joy")}
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="ms-auto text-destructive"
                    disabled={busy === `d${ad.id}`}
                    onClick={() => {
                      if (!confirm(t("Reklama o'chirilsinmi?"))) return;
                      run(
                        `d${ad.id}`,
                        () => deleteAd(ad.id),
                        t("O'chirildi")
                      );
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t("O'chirish")}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
