"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Film,
  Image as ImageIcon,
  Loader2,
  Lock,
  Megaphone,
  Music2,
  Pencil,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
  XCircle,
} from "lucide-react";

import { submitAd } from "@/actions/ads";
import { useT } from "@/hooks/use-i18n";
import {
  AD_CONTACT_PHONE,
  AD_CONTACT_TEL,
  AD_CONTACT_TELEGRAM,
  AD_MIN_FOLLOWERS,
  type AdEligibility,
  type AdStatus,
  type MyAd,
} from "@/lib/ads";
import { createAdSchema, type AdFormValues } from "@/schemas/ads";
import { uploadFile } from "@/lib/upload";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const EMPTY_FORM: AdFormValues = {
  title: "",
  description: "",
  targetUrl: "",
  buttonLabel: "",
  imageUrl: "",
  videoUrl: "",
  audioUrl: "",
  audioTitle: "",
  contactType: "NONE",
  contactValue: "",
};

function statusMeta(status: AdStatus) {
  switch (status) {
    case "APPROVED":
      return {
        icon: CheckCircle2,
        className: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
      };
    case "PENDING":
      return {
        icon: Clock3,
        className: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
      };
    case "REJECTED":
      return {
        icon: XCircle,
        className: "bg-destructive/12 text-destructive",
      };
    default:
      return {
        icon: CalendarClock,
        className: "bg-muted text-muted-foreground",
      };
  }
}

function statusLabel(status: AdStatus, t: (key: string) => string) {
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
  // Deterministic on both server and client (avoids hydration mismatches).
  return value ? new Date(value).toISOString().slice(0, 10) : "—";
}

function MediaThumb({ ad }: { ad: MyAd }) {
  if (ad.videoUrl) {
    return (
      <video
        src={ad.videoUrl}
        muted
        playsInline
        preload="metadata"
        className="h-full w-full object-cover"
      />
    );
  }
  if (ad.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={ad.imageUrl}
        alt={ad.title}
        className="h-full w-full object-cover"
      />
    );
  }
  return null;
}

function MyAdCard({
  ad,
  onResubmit,
  canResubmit,
}: {
  ad: MyAd;
  onResubmit: (ad: MyAd) => void;
  canResubmit: boolean;
}) {
  const t = useT();
  const meta = statusMeta(ad.status);
  const hasMedia = Boolean(ad.imageUrl || ad.videoUrl);

  return (
    <article className="overflow-hidden rounded-2xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
            meta.className
          )}
        >
          <meta.icon className="h-3.5 w-3.5" />
          {statusLabel(ad.status, t)}
        </span>
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-muted-foreground">
          {ad.status === "APPROVED" && (
            <span>{t("{count} kun qoldi", { count: ad.daysLeft })}</span>
          )}
          {ad.contactType && (
            <span className="inline-flex items-center gap-1">
              {ad.contactType === "PHONE" ? (
                <Phone className="h-3 w-3" />
              ) : (
                <Send className="h-3 w-3" />
              )}
              {ad.contactType === "PHONE" ? t("Telefon") : t("Telegram")}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        <div className="flex gap-3">
          {hasMedia && (
            <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-neutral-950 sm:h-28 sm:w-24">
              <MediaThumb ad={ad} />
              <span className="absolute bottom-1 start-1 inline-flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
                {ad.videoUrl ? (
                  <Film className="h-2.5 w-2.5" />
                ) : (
                  <ImageIcon className="h-2.5 w-2.5" />
                )}
                {ad.videoUrl ? t("Video") : t("Rasm")}
              </span>
              {ad.audioUrl && (
                <span className="absolute bottom-1 end-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm">
                  <Music2 className="h-2.5 w-2.5" />
                </span>
              )}
            </div>
          )}

          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="text-base font-extrabold leading-snug tracking-tight">
              {ad.title}
            </h3>
            <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
              {ad.description}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <a
            href={ad.targetUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-lg bg-secondary/70 px-2.5 py-1.5 font-medium transition-colors hover:bg-secondary"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{ad.targetUrl}</span>
          </a>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-secondary/70 px-2.5 py-1.5 font-medium text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5 shrink-0" />
            {ad.startsAt
              ? `${formatDate(ad.startsAt)} — ${formatDate(ad.endsAt)}`
              : `${t("Tugash sanasi")}: ${formatDate(ad.endsAt)}`}
          </span>
        </div>

        {ad.adminNote && (
          <div
            className={cn(
              "rounded-xl border px-3 py-2.5 text-xs",
              ad.status === "REJECTED"
                ? "border-destructive/20 bg-destructive/5 text-destructive"
                : "border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-300"
            )}
          >
            <span className="font-semibold">
              {ad.status === "REJECTED"
                ? t("Rad etish sababi")
                : t("Admin izohi")}
              :{" "}
            </span>
            {ad.adminNote}
          </div>
        )}

        {ad.status === "PENDING" && (
          <p className="rounded-xl bg-amber-500/10 px-3 py-2.5 text-xs font-medium text-amber-700 dark:text-amber-300">
            {t("Arizangiz ko'rib chiqilmoqda. Admin tasdiqlashini kuting.")}
          </p>
        )}

        {(ad.status === "APPROVED" || ad.status === "EXPIRED") && (
          <div className="flex flex-col gap-2 rounded-xl border bg-secondary/40 p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {t("Muddatni uzaytirish uchun @Admin ga murojaat qiling.")}
            </p>
            <a
              href={`tel:${AD_CONTACT_TEL}`}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border bg-background px-3 text-xs font-semibold transition-colors hover:bg-accent"
            >
              <Phone className="h-3.5 w-3.5 text-emerald-500" />
              <span dir="ltr" className="whitespace-nowrap tabular-nums">
                {AD_CONTACT_PHONE}
              </span>
            </a>
          </div>
        )}

        {ad.status === "REJECTED" && (
          <div className="flex flex-col gap-2 rounded-xl border bg-secondary/40 p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {t("Ma'lumotlarni tuzatib, arizani qayta yuborishingiz mumkin.")}
            </p>
            {canResubmit ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 shrink-0 gap-1.5"
                onClick={() => onResubmit(ad)}
              >
                <Pencil className="h-3.5 w-3.5" />
                {t("Qayta yuborish")}
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </article>
  );
}

function Requirement({
  ok,
  label,
  hint,
  progress,
}: {
  ok: boolean;
  label: string;
  hint?: string;
  progress?: number;
}) {
  return (
    <div className="rounded-xl border bg-secondary/30 p-3">
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
            ok
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "bg-muted text-muted-foreground"
          )}
        >
          {ok ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{label}</p>
          {hint && (
            <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
          )}
          {typeof progress === "number" && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
              <div
                className={cn(
                  "h-full rounded-full transition-[width]",
                  ok ? "bg-emerald-500" : "brand-gradient"
                )}
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdRequirements({ eligibility }: { eligibility: AdEligibility }) {
  const t = useT();
  const followersOk = eligibility.followerCount >= AD_MIN_FOLLOWERS;
  const slotsOk = eligibility.usedSlots < eligibility.slots;
  const reasonText =
    eligibility.reason === "UNVERIFIED"
      ? t("Hisobingizni tasdiqlash uchun admin bilan bog'laning.")
      : eligibility.reason === "FOLLOWERS"
        ? t(
            "Obunachilar soni yetarli emas. 1000 taga yetgach qayta urinib ko'ring."
          )
        : t("Qo'shimcha reklama joyi olish uchun admin bilan bog'laning.");

  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-violet-900 to-fuchsia-800 p-5 text-white sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-fuchsia-400/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-14 -left-8 h-40 w-40 rounded-full bg-violet-300/20 blur-3xl" />
        <div className="relative space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ring-1 ring-inset ring-white/20 backdrop-blur">
            <Lock className="h-3.5 w-3.5" />
            {t("Reklama joylash imkoniyati")}
          </span>
          <h2 className="text-balance text-lg font-black leading-snug">
            {t(
              "Reklama faqat tasdiqlangan va kamida 1000 obunachiga ega hisoblar uchun."
            )}
          </h2>
          <p className="text-xs leading-relaxed text-white/80">{reasonText}</p>
        </div>
      </div>

      <div className="space-y-2 p-4">
        <Requirement
          ok={eligibility.isVerified}
          label={t("Tasdiqlangan belgi")}
          hint={
            eligibility.isVerified
              ? t("Hisobingiz tasdiqlangan.")
              : t("Hisobingizni tasdiqlash uchun admin bilan bog'laning.")
          }
        />
        <Requirement
          ok={followersOk}
          label={t("Kamida 1000 obunachi")}
          hint={t("Sizda {count} obunachi bor", {
            count: eligibility.followerCount,
          })}
          progress={(eligibility.followerCount / AD_MIN_FOLLOWERS) * 100}
        />
        <Requirement
          ok={slotsOk}
          label={t("Reklama joylari: {used}/{total}", {
            used: eligibility.usedSlots,
            total: eligibility.slots,
          })}
          hint={
            slotsOk
              ? t("Bitta reklama joyi bepul beriladi.")
              : t(
                  "Reklama joyingiz band. Qo'shimcha joy uchun admin bilan bog'laning."
                )
          }
        />

        <div className="grid gap-2 pt-1 sm:grid-cols-2">
          <a
            href={`tel:${AD_CONTACT_TEL}`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border bg-background text-sm font-semibold transition-colors hover:bg-accent"
          >
            <Phone className="h-4 w-4 text-emerald-500" />
            <span dir="ltr" className="tabular-nums">
              {AD_CONTACT_PHONE}
            </span>
          </a>
          <a
            href={AD_CONTACT_TELEGRAM}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border bg-background text-sm font-semibold transition-colors hover:bg-accent"
          >
            <Send className="h-4 w-4 text-sky-500" />
            {t("Telegram")}
          </a>
        </div>
      </div>
    </div>
  );
}

export function AdsClient({
  ads,
  eligibility,
}: {
  ads: MyAd[];
  eligibility: AdEligibility;
}) {
  const t = useT();
  const router = useRouter();
  const formRef = React.useRef<HTMLElement>(null);

  const [saving, setSaving] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState<
    "image" | "video" | "audio" | null
  >(null);

  const schema = React.useMemo(() => createAdSchema(t), [t]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AdFormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_FORM,
  });

  const imageUrl = watch("imageUrl");
  const videoUrl = watch("videoUrl");
  const audioUrl = watch("audioUrl");
  const audioTitle = watch("audioTitle");
  const contactType = watch("contactType");

  const hasPending = ads.some((ad) => ad.status === "PENDING");
  const canSubmitNew = eligibility.eligible && !hasPending;
  const showForm = canSubmitNew;

  async function onMediaFile(file: File | undefined) {
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    setUploading(isVideo ? "video" : "image");
    try {
      const media = await uploadFile(file);
      if (media.type === "video") {
        setValue("videoUrl", media.url, { shouldValidate: true });
        setValue("imageUrl", "");
        setValue("audioUrl", "");
        setValue("audioTitle", "");
      } else {
        setValue("imageUrl", media.url, { shouldValidate: true });
        setValue("videoUrl", "");
      }
      toast.success(t("Fayl yuklandi"));
    } catch (error) {
      void 0;
    } finally {
      setUploading(null);
    }
  }

  async function onAudioFile(file: File | undefined) {
    if (!file) return;
    setUploading("audio");
    try {
      const media = await uploadFile(file);
      setValue("audioUrl", media.url, { shouldValidate: true });
      setValue("audioTitle", audioTitle?.trim() || file.name.replace(/\.[^.]+$/, ""));
      toast.success(t("Musiqa qo'shildi"));
    } catch (error) {
      void 0;
    } finally {
      setUploading(null);
    }
  }

  async function onSubmit(values: AdFormValues) {
    setSaving(true);
    const res = await submitAd(values, editingId ?? undefined);
    setSaving(false);
    if (!res.ok) {
      void 0;
      return;
    }
    toast.success(t("Arizangiz yuborildi. Admin tasdiqlashini kuting."));
    setEditingId(null);
    reset(EMPTY_FORM);
    router.refresh();
  }

  function resubmit(ad: MyAd) {
    setEditingId(ad.id);
    reset({
      title: ad.title,
      description: ad.description,
      targetUrl: ad.targetUrl,
      buttonLabel: ad.buttonLabel,
      imageUrl: ad.imageUrl ?? "",
      videoUrl: ad.videoUrl ?? "",
      audioUrl: ad.audioUrl ?? "",
      audioTitle: ad.audioTitle ?? "",
      contactType: ad.contactType ?? "NONE",
      contactValue: ad.contactValue ?? "",
    });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="mx-auto w-full max-w-[760px] px-4 py-6 lg:py-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-violet-600 via-fuchsia-500 to-amber-400 p-6 text-white shadow-[0_30px_80px_-40px_rgba(124,58,237,0.8)] sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-black/20 blur-3xl" />

        <div className="relative space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ring-1 ring-inset ring-white/25 backdrop-blur-md">
            <Megaphone className="h-3.5 w-3.5" />
            {t("Reklama")}
          </span>
          <h1 className="text-balance text-2xl font-black leading-tight tracking-tight sm:text-3xl">
            {t("Reklama joylash")}
          </h1>
          <p className="max-w-lg text-sm font-medium leading-relaxed text-white/85">
            {t(
              "Reklamangizni 30 kun davomida barcha foydalanuvchilarga ko'rsating."
            )}
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            {[t("30 kun"), t("Rasm, video yoki musiqa"), t("Admin tasdiqlaydi")].map(
              (chip) => (
                <span
                  key={chip}
                  className="rounded-full bg-black/20 px-3 py-1.5 text-xs font-semibold backdrop-blur-md"
                >
                  {chip}
                </span>
              )
            )}
          </div>
        </div>
      </section>

      {/* My ads */}
      {ads.length > 0 && (
        <section className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <h2 className="flex items-center gap-2 text-sm font-extrabold">
              <Megaphone className="h-4 w-4 text-primary" />
              {t("Mening reklamalarim")}
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-bold text-primary">
                {ads.length}
              </span>
            </h2>
            <span className="text-[11px] text-muted-foreground">
              {t("Qo'shimcha reklama uchun admin bilan bog'laning.")}
            </span>
          </div>

          <div className="grid gap-3">
            {ads.map((ad) => (
              <MyAdCard
                key={ad.id}
                ad={ad}
                onResubmit={resubmit}
                canResubmit={canSubmitNew}
              />
            ))}
          </div>
        </section>
      )}

      {/* Request form / eligibility gate */}
      {eligibility.eligible ? (
        <section
          ref={formRef}
          className="mt-4 scroll-mt-24 rounded-2xl border bg-card p-4 sm:p-6"
        >
          <div className="mb-4 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold tracking-tight">
                {editingId
                  ? t("Qayta yuborish")
                  : ads.length > 0
                    ? t("Yangi reklama qo'shish")
                    : t("Reklama uchun ariza")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t("Reklama 30 kun davomida ko'rsatiladi")}
              </p>
            </div>
            {!eligibility.isAdmin && (
              <span className="ms-auto shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
                {t("Reklama joylari: {used}/{total}", {
                  used: eligibility.usedSlots + (hasPending ? 1 : 0),
                  total: eligibility.slots,
                })}
              </span>
            )}
          </div>

        {showForm ? (
          <>
            {editingId && (
              <div className="mb-4 flex items-center justify-between gap-2 rounded-xl bg-amber-500/10 px-3 py-2.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                <span>{t("Rad etilgan arizani tahrirlash")}</span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    reset(EMPTY_FORM);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold hover:bg-amber-500/15"
                >
                  <X className="h-3.5 w-3.5" />
                  {t("Bekor qilish")}
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ad-title">{t("Reklama nomi")}</Label>
                <Input
                  id="ad-title"
                  placeholder={t("Masalan: Yangi kolleksiya")}
                  {...register("title")}
                />
                {errors.title && (
                  <p className="text-xs text-destructive">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ad-description">{t("Qisqa tavsif")}</Label>
                <Textarea
                  id="ad-description"
                  rows={3}
                  placeholder={t("Reklama haqida qisqacha ma'lumot")}
                  {...register("description")}
                />
                {errors.description && (
                  <p className="text-xs text-destructive">
                    {errors.description.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ad-url">{t("Havola (URL)")}</Label>
                <Input
                  id="ad-url"
                  inputMode="url"
                  placeholder="https://example.com"
                  dir="ltr"
                  {...register("targetUrl")}
                />
                {errors.targetUrl && (
                  <p className="text-xs text-destructive">
                    {errors.targetUrl.message}
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ad-button">{t("Tugma matni")}</Label>
                  <Input
                    id="ad-button"
                    placeholder={t("Batafsil")}
                    {...register("buttonLabel")}
                  />
                  {errors.buttonLabel && (
                    <p className="text-xs text-destructive">
                      {errors.buttonLabel.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ad-contact-type">{t("Kontakt turi")}</Label>
                  <select
                    id="ad-contact-type"
                    {...register("contactType")}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="NONE">{t("Ko'rsatmaslik")}</option>
                    <option value="TELEGRAM">{t("Telegram")}</option>
                    <option value="PHONE">{t("Telefon")}</option>
                  </select>
                </div>
              </div>

              {contactType !== "NONE" && (
                <div className="space-y-1.5">
                  <Label htmlFor="ad-contact">
                    {contactType === "PHONE"
                      ? t("Telefon raqami")
                      : t("Telegram havolasi yoki username")}
                  </Label>
                  <Input
                    id="ad-contact"
                    dir="ltr"
                    inputMode={contactType === "PHONE" ? "tel" : "text"}
                    placeholder={
                      contactType === "PHONE"
                        ? "+998 90 123 45 67"
                        : "@username yoki t.me/username"
                    }
                    {...register("contactValue")}
                  />
                  {errors.contactValue && (
                    <p className="text-xs text-destructive">
                      {errors.contactValue.message}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>{t("Rasm yoki video")}</Label>
                {imageUrl || videoUrl ? (
                  <div className="relative overflow-hidden rounded-xl border bg-black">
                    {videoUrl ? (
                      <video
                        src={videoUrl}
                        controls
                        playsInline
                        className="max-h-72 w-full object-contain"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageUrl}
                        alt=""
                        className="max-h-72 w-full object-contain"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setValue("imageUrl", "");
                        setValue("videoUrl", "");
                        setValue("audioUrl", "");
                        setValue("audioTitle", "");
                      }}
                      className="absolute end-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-inset ring-white/20 transition-colors hover:bg-black/80"
                      aria-label={t("O'chirish")}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/30 text-center transition-colors hover:border-primary/50 hover:bg-secondary/50">
                    {uploading === "image" || uploading === "video" ? (
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    ) : (
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    )}
                    <span className="text-xs font-semibold">
                      {uploading === "image" || uploading === "video"
                        ? t("Yuklanmoqda...")
                        : t("Rasm yoki video tanlang")}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      JPG, PNG, WEBP, MP4, WEBM · {t("50 MB gacha")}
                    </span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      className="sr-only"
                      disabled={uploading !== null}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        void onMediaFile(file);
                      }}
                    />
                  </label>
                )}
                {errors.imageUrl && (
                  <p className="text-xs text-destructive">
                    {errors.imageUrl.message}
                  </p>
                )}
              </div>

              {imageUrl && !videoUrl && (
                <div className="space-y-2">
                  <Label>{t("Musiqa")}</Label>
                  {audioUrl ? (
                    <div className="flex items-center gap-2 rounded-xl border bg-secondary/40 p-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Music2 className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                        {audioTitle || fileFallbackName(audioUrl)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setValue("audioUrl", "");
                          setValue("audioTitle", "");
                        }}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        aria-label={t("O'chirish")}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/30 text-xs font-semibold transition-colors hover:border-primary/50 hover:bg-secondary/50">
                      {uploading === "audio" ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        <Music2 className="h-4 w-4 text-muted-foreground" />
                      )}
                      {uploading === "audio"
                        ? t("Yuklanmoqda...")
                        : t("Musiqa yuklash")}
                      <input
                        type="file"
                        accept="audio/*"
                        className="sr-only"
                        disabled={uploading !== null}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          void onAudioFile(file);
                        }}
                      />
                    </label>
                  )}
                  {errors.audioUrl && (
                    <p className="text-xs text-destructive">
                      {errors.audioUrl.message}
                    </p>
                  )}
                </div>
              )}

              <Button type="submit" disabled={saving} className="h-11 w-full">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Megaphone className="h-4 w-4" />
                )}
                {editingId ? t("Qayta yuborish") : t("Ariza yuborish")}
              </Button>
            </form>
          </>
        ) : (
          <p className="rounded-xl bg-amber-500/10 px-3 py-3 text-xs font-medium text-amber-700 dark:text-amber-300">
            {t(
              "Sizda ko'rib chiqilayotgan ariza bor. Yangi ariza yuborish uchun uning yakunlanishini kuting."
            )}
          </p>
        )}
        </section>
      ) : (
        <section className="mt-4">
          <AdRequirements eligibility={eligibility} />
        </section>
      )}

      {/* Rules + contact */}
      <section className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border bg-card p-4">
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <ShieldCheck className="h-4 w-4 text-amber-500" />
            {t("Reklama qoidalari")}
          </h3>
          <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
            <li>{t("Bitta reklama joyi bepul beriladi.")}</li>
            <li>
              {t("Har bir qo'shimcha reklama admin ruxsati bilan joylashtiriladi.")}
            </li>
            <li>{t("Har bir reklama 30 kun davomida ko'rsatiladi.")}</li>
            <li>
              {t("Reklama faqat admin tasdiqlagandan keyin joylashtiriladi.")}
            </li>
            <li>{t("Muddatni uzaytirish uchun biz bilan bog'laning.")}</li>
          </ul>
        </div>

        <div className="rounded-2xl border bg-card p-4">
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <Phone className="h-4 w-4 text-emerald-500" />
            {t("Bog'lanish")}
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {t("Reklama bo'yicha savollaringiz bo'lsa, qo'ng'iroq qiling.")}
          </p>
          <a
            href={`tel:${AD_CONTACT_TEL}`}
            className="mt-3 flex h-10 items-center justify-center gap-2 rounded-xl border bg-background text-sm font-semibold transition-colors hover:bg-accent"
          >
            <Phone className="h-4 w-4 text-emerald-500" />
            <span dir="ltr" className="tabular-nums">
              {AD_CONTACT_PHONE}
            </span>
          </a>
          <a
            href={AD_CONTACT_TELEGRAM}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex h-10 items-center justify-center gap-2 rounded-xl border bg-background text-sm font-semibold transition-colors hover:bg-accent"
          >
            <Send className="h-4 w-4 text-sky-500" />
            {t("Telegram")}
          </a>
        </div>
      </section>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
        <ArrowUpRight className="h-3 w-3" />
        {t("Reklama 30 kun davomida ko'rsatiladi")}
      </p>
    </div>
  );
}

function fileFallbackName(url: string) {
  const name = url.split("/").pop() ?? "audio";
  return name.replace(/\.[^.]+$/, "");
}
