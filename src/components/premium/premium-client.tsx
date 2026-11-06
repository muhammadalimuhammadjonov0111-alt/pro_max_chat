"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BadgeCheck,
  Sparkles,
  Zap,
  Eye,
  BarChart3,
  Shield,
  Crown,
  CreditCard,
  Check,
  Loader2,
  Rocket,
  ExternalLink,
  Copy,
  Clock,
  BadgeCheck as CheckBadge,
  XCircle,
  Wallet,
  PhoneCall,
  ImagePlus,
} from "lucide-react";

import { createPayment, cancelPremium, attachPaymentReceipt } from "@/actions/premium";
import { uploadFile } from "@/lib/upload";
import { PREMIUM_PRICES, formatSom, type Plan } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { useT } from "@/hooks/use-i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { PaymentMethod } from "@/lib/payment-links";

const FEATURES = [
  { icon: BadgeCheck, title: "Tasdiqlangan belgi", desc: "Ismingiz yonida ko'k galichka" },
  { icon: Zap, title: "Tezkor yuklash", desc: "Reels va postlar tezroq ochiladi" },
  { icon: BarChart3, title: "Chuqur statistika", desc: "Ko'rishlar, qamrov va o'sish" },
  { icon: Eye, title: "Ko'rish statistikasi", desc: "Har bir postni kim ko'rgani" },
  { icon: Shield, title: "Reklamasiz", desc: "Hech qanday reklama ko'rsatilmaydi" },
  { icon: Rocket, title: "Ustuvor qo'llab-quvvatlash", desc: "24/7 tezkor javob" },
];

const COMPARISON: [string, boolean, boolean][] = [
  ["Tasdiqlangan belgi", false, true],
  ["Statistika", false, true],
  ["Reklamasiz", false, true],
  ["Ustuvor yordam", false, true],
  ["Post / Reels / Story", true, true],
  ["Xabar va kuzatish", true, true],
];

export type PaymentListItem = {
  id: string;
  plan: string;
  amount: number;
  method: string;
  status: string;
  comment: string | null;
  createdAt: string;
  receiptUrl?: string | null;
  receiptTelegramSentAt?: string | null;
};

function copyText(text: string, msg = "Nusxalandi") {
  void navigator.clipboard
    ?.writeText(text)
    .then(() => toast.success(msg))
    .catch(() => toast.error("Nusxalab bo'lmadi"));
}

function ReceiptUploadRow({
  paymentId,
  file,
  previewFor,
  uploading,
  onSelect,
  onSubmit,
}: {
  paymentId: string;
  file: File | null;
  previewFor: string | null;
  uploading: boolean;
  onSelect: (f: File | null) => void;
  onSubmit: () => void;
}) {
  const t = useT();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const showSelected = previewFor === paymentId && file;
  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus className="h-4 w-4" />
          {showSelected ? file!.name : t("Chek tanlash")}
        </Button>
        {showSelected && (
          <Button size="sm" disabled={uploading} onClick={onSubmit}>
            {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("Chekni yuborish")}
          </Button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          onSelect(f);
          e.target.value = "";
        }}
      />
      {showSelected && file?.type.startsWith("image/") && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={URL.createObjectURL(file)}
          alt={t("Chek")}
          className="mt-1 max-h-40 rounded-lg border object-cover"
        />
      )}
      <p className="text-[11px] text-muted-foreground">
        {t("JPG / PNG / PDF, 10 MB gacha. Click/Payme ilovasidagi to'lov ekrani skrinshoti bo'lsa yaxshi.")}
      </p>
    </div>
  );
}

export function PremiumClient({
  isActive,
  premiumUntil,
  payments = [],
  paymentsConfigured = false,
  cardMasked = "",
}: {
  isActive: boolean;
  premiumUntil: string | null;
  payments?: PaymentListItem[];
  paymentsConfigured?: boolean;
  cardMasked?: string;
}) {
  const router = useRouter();
  const t = useT();
  const [plan, setPlan] = React.useState<Plan>("yearly");
  const [checkoutOpen, setCheckoutOpen] = React.useState(false);
  const [paying, setPaying] = React.useState<PaymentMethod | null>(null);
  const [cancelling, setCancelling] = React.useState(false);
  const [method, setMethod] = React.useState<PaymentMethod>("click");
  const [result, setResult] = React.useState<{
    paymentId: string;
    providerUrl: string;
    comment: string;
    cardNumber: string;
    amount: number;
    method: PaymentMethod;
  } | null>(null);
  // Chek yuklash holati: qaysi paymentId uchun fayl tanlangan
  const [receiptFile, setReceiptFile] = React.useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = React.useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = React.useState<string | null>(null);

  const price = PREMIUM_PRICES[plan];
  const saving = PREMIUM_PRICES.monthly.amount * 12 - PREMIUM_PRICES.yearly.amount;

  async function handleCreatePayment() {
    setPaying(method);
    try {
      const res = await createPayment(plan, method);
      if (!res.ok || !res.providerUrl || !res.comment || !res.cardNumber || res.amount === undefined) {
        toast.error((!res.ok && res.error) ?? t("Xatolik yuz berdi"));
        setCheckoutOpen(false);
        return;
      }
      setResult({
        paymentId: res.paymentId,
        providerUrl: res.providerUrl,
        comment: res.comment,
        cardNumber: res.cardNumber,
        amount: res.amount,
        method,
      });
    } finally {
      setPaying(null);
    }
  }

  // Chekni oldin /api/upload orqali yuklab, keyin attachPaymentReceipt bilan Telegramga yuboramiz.
  async function handleUploadReceipt(paymentId: string, file: File | null) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t("Chek fayli 10 MB dan katta bo'lmasligi kerak"));
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
    if (!allowed.includes(file.type)) {
      toast.error(t("Faqat rasm (JPG/PNG) yoki PDF chek yuklang"));
      return;
    }
    setUploadingReceipt(paymentId);
    try {
      const uploaded = await uploadFile(file);
      const res = await attachPaymentReceipt(paymentId, uploaded.url);
      if (!res.ok) {
        toast.error((!res.ok && res.error) ?? t("Xatolik yuz berdi"));
        return;
      }
      toast.success(res.message ?? t("Chek yuborildi"));
      setReceiptFile(null);
      setReceiptPreview(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("Faylni yuklab bo'lmadi"));
    } finally {
      setUploadingReceipt(null);
    }
  }

  function handleReceiptSelect(paymentId: string, file: File | null) {
    if (!file) return;
    setReceiptFile(file);
    setReceiptPreview(paymentId);
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      await cancelPremium();
      toast.success(t("Obuna bekor qilindi"));
      router.refresh();
    } finally {
      setCancelling(false);
    }
  }

  const pending = payments.filter((p) => p.status === "pending");

  return (
    <div className="pb-24 sm:pb-12">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0b0b12] px-6 py-14 text-white sm:rounded-2xl sm:py-16">
        <div className="brand-gradient animate-gradient absolute inset-0 opacity-30 blur-2xl" />
        <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(124,58,237,0.45),transparent)]" />
        <div className="relative mx-auto max-w-2xl space-y-4 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> {t("Gidgogram Premium")}
          </span>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            {t("Hisobingizni keyingi darajaga olib chiqing")}
          </h1>
          <p className="mx-auto max-w-lg text-sm text-white/70 sm:text-base">
            {t(
              "Tasdiqlangan belgi, statistika, reklamasiz tajriba va boshqa ko'plab imkoniyatlar. Faqat 20 000 so'm/oy."
            )}
          </p>
        </div>
      </section>

      {/* Current status */}
      {isActive && (
        <div className="mt-6 flex flex-col items-start gap-3 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white">
              <Crown className="h-6 w-6" />
            </span>
            <div>
              <p className="font-semibold">{t("Premium faol")}</p>
              <p className="text-sm text-muted-foreground">
                {premiumUntil
                  ? t("Amal qiladi: {date}", { date: formatDate(premiumUntil) })
                  : t("Faol obuna")}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={cancelling}
          >
            {cancelling && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("Obunani bekor qilish")}
          </Button>
        </div>
      )}

      {/* Pending payment hint */}
      {pending.length > 0 && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
          <div className="text-sm">
            <p className="font-semibold">{t("To'lov so'rovingiz tekshirilmoqda")}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("Pul o'tkazgach admin tasdiqlaydi va Premium avtomatik yoqiladi. Holatni pastda kuzating.")}
            </p>
          </div>
        </div>
      )}

      {/* Billing toggle */}
      <div className="mt-8 flex justify-center">
        <div className="inline-flex rounded-full border bg-secondary p-1">
          {(["monthly", "yearly"] as Plan[]).map((p) => (
            <button
              key={p}
              onClick={() => setPlan(p)}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-semibold transition-all",
                plan === p
                  ? "bg-background text-foreground shadow"
                  : "text-muted-foreground"
              )}
            >
              {t(PREMIUM_PRICES[p].label)}
              {p === "yearly" && (
                <span className="ms-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  {t("2 oy bepul")}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Pricing card */}
      <div className="mx-auto mt-6 max-w-md">
        <div className="premium-glow relative overflow-hidden rounded-3xl border bg-card p-6">
          <div className="brand-gradient animate-gradient absolute inset-x-0 top-0 h-1.5" />
          <p className="text-sm font-semibold text-muted-foreground">
            {t("{label} tarif", { label: t(price.label) })}
          </p>
          <div className="mt-2 flex items-end gap-1">
            <span className="text-4xl font-extrabold tracking-tight">
              {formatSom(price.amount)}
            </span>
            <span className="pb-1 text-sm text-muted-foreground">
              /{plan === "monthly" ? t("oy") : t("yil")}
            </span>
          </div>
          {plan === "yearly" && (
            <p className="mt-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              {t("Yiliga {amount} tejaysiz", { amount: formatSom(saving) })}
            </p>
          )}

          <ul className="mt-5 space-y-3">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <f.icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{t(f.title)}</p>
                  <p className="text-xs text-muted-foreground">{t(f.desc)}</p>
                </div>
              </li>
            ))}
          </ul>

          <Button
            variant="blue"
            size="lg"
            className="mt-6 w-full"
            disabled={!paymentsConfigured}
            onClick={() => {
              setResult(null);
              setCheckoutOpen(true);
            }}
          >
            <Crown className="h-4 w-4" />
            {isActive ? t("Obunani uzaytirish") : t("Premiumga o'tish")}
          </Button>
          {!paymentsConfigured && (
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              {t("To'lov tizimi hali sozlanmagan. Iltimos admin bilan bog'laning.")}
            </p>
          )}
          {paymentsConfigured && (
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              {t("Click yoki Payme orqali {card} ga pul o'tkazasiz. Admin tasdiqlagach Premium yoqiladi.", { card: cardMasked })}
            </p>
          )}
        </div>
      </div>

      {/* Comparison */}
      <div className="mt-10 overflow-hidden rounded-2xl border">
        <div className="grid grid-cols-3 border-b bg-secondary/50 px-4 py-3 text-sm font-semibold">
          <span>{t("Imkoniyat")}</span>
          <span className="text-center">{t("Bepul")}</span>
          <span className="text-center brand-text">{t("Premium")}</span>
        </div>
        {COMPARISON.map(([label, free, prem]) => (
          <div
            key={label}
            className="grid grid-cols-3 items-center border-b px-4 py-3 text-sm last:border-0"
          >
            <span>{t(label)}</span>
            <span className="flex justify-center">
              {free ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </span>
            <span className="flex justify-center">
              {prem ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </span>
          </div>
        ))}
      </div>

      {/* My payments */}
      {payments.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
            <Wallet className="h-5 w-5" /> {t("To'lovlarim")}
          </h2>
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="rounded-2xl border bg-card p-3 text-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary">
                    <CreditCard className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {formatSom(p.amount)} · {t(p.plan === "yearly" ? "Yillik" : "Oylik")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("Usul")}: {p.method === "click" ? "Click" : "Payme"}
                      {p.comment && <> · {t("Izoh")}: <code>{p.comment}</code></>}
                      {" · "}{formatDate(p.createdAt)}
                    </p>
                    {p.receiptUrl && (
                      <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                        {t("Chek yuklangan")}{p.receiptTelegramSentAt ? ` · ${t("Telegramga yuborilgan")}` : ""}
                        {" · "}
                        <a href={p.receiptUrl} target="_blank" rel="noopener" className="underline">
                          {t("Chekni ko'rish")}
                        </a>
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={
                      p.status === "paid"
                        ? "default"
                        : p.status === "rejected"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {p.status === "paid" && <CheckBadge className="me-1 h-3 w-3" />}
                    {p.status === "pending" && <Clock className="me-1 h-3 w-3" />}
                    {p.status === "rejected" && <XCircle className="me-1 h-3 w-3" />}
                    {t(p.status === "paid" ? "Tasdiqlangan" : p.status === "rejected" ? "Rad etilgan" : "Kutilmoqda")}
                  </Badge>
                </div>
                {p.status === "pending" && (
                  <div className="mt-3 rounded-xl border bg-secondary/40 p-3">
                    {p.receiptUrl ? (
                      <p className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckBadge className="h-4 w-4 text-emerald-500" />
                        {t("Chekingiz tekshiruvda. Admin tasdiqlagach Premium yoqiladi.")}
                      </p>
                    ) : (
                      <>
                        <p className="text-xs font-semibold">{t("Pulni o'tkazdingizmi? Chekni yuklang")}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {t("Skren-shot / chek rasmini yuklasangiz, u admin Telegram botiga avtomatik tushadi.")}
                        </p>
                        <ReceiptUploadRow
                          paymentId={p.id}
                          file={receiptFile}
                          previewFor={receiptPreview}
                          uploading={uploadingReceipt === p.id}
                          onSelect={(f) => handleReceiptSelect(p.id, f)}
                          onSubmit={() => handleUploadReceipt(p.id, receiptFile)}
                        />
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Checkout */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader className="text-start">
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" /> {t("To'lov")}
            </DialogTitle>
            <DialogDescription>
              {t("{label} tarif", { label: t(price.label) })} —{" "}
              {formatSom(price.amount)}
            </DialogDescription>
          </DialogHeader>

          {!result ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold">{t("To'lov usulini tanlang:")}</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["click", "payme"] as PaymentMethod[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      className={cn(
                        "rounded-xl border-2 px-3 py-3 text-sm font-bold transition-all",
                        method === m
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-accent"
                      )}
                    >
                      {m === "click" ? "Click" : "Payme"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border bg-secondary/60 p-3 text-sm">
                <p className="font-semibold">{t("Qanday to'laysiz?")}</p>
                <ol className="mt-1 list-decimal space-y-1 ps-5 text-xs text-muted-foreground">
                  <li>{t("{method} ilovasini oching.", { method: method === "click" ? "Click" : "Payme" })}</li>
                  <li>{t("Kartadan kartaga o'tkazma bo'limini oching.")}</li>
                  <li>{t("Karta: {card}, Summa: {amount}", { card: cardMasked, amount: formatSom(price.amount) })}</li>
                  <li>{t("Izohga berilgan kodni kiriting (masalan GID-XXXXXX).")}</li>
                  <li>{t("Chek/skrinshotni yuklang — u Telegramga yuboriladi.")}</li>
                  <li>{t("Admin tasdiqlagach Premium avtomatik yoqiladi (odatda 1 soat ichida).")}</li>
                </ol>
              </div>

              <Button
                variant="blue"
                size="lg"
                className="w-full"
                disabled={paying !== null}
                onClick={handleCreatePayment}
              >
                {paying && <Loader2 className="h-4 w-4 animate-spin" />}
                <ExternalLink className="h-4 w-4" />
                {t("{method} orqali to'lash", { method: method === "click" ? "Click" : "Payme" })}
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                {t("Pul to'g'ridan-to'g'ri admin kartasiga tushadi.")}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
                <p className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-400">
                  <CheckBadge className="h-4 w-4" /> {t("So'rov yaratildi")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("Ilovani ochib, quyidagi karta, summa va izohni kiritib pul o'tkazing. Keyin chekni yuklang.")}
                </p>
              </div>

              <a
                href={result.providerUrl}
                target="_blank"
                rel="noopener"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
              >
                <ExternalLink className="h-4 w-4" />
                {t("{method} da ochish", { method: result.method === "click" ? "Click" : "Payme" })}
              </a>

              <div className="space-y-2 rounded-xl border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{t("Karta")}</span>
                  <span className="flex items-center gap-1.5 font-mono text-xs font-semibold">
                    <code className="truncate">{result.cardNumber}</code>
                    <button
                      type="button"
                      onClick={() => copyText(result.cardNumber)}
                      aria-label="copy"
                      className="rounded p-1 hover:bg-accent"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{t("Summa")}</span>
                  <span className="font-semibold">{formatSom(result.amount)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{t("Izoh")}</span>
                  <span className="flex items-center gap-1.5 font-mono text-xs font-semibold">
                    <code>{result.comment}</code>
                    <button
                      type="button"
                      onClick={() => copyText(result.comment)}
                      aria-label="copy"
                      className="rounded p-1 hover:bg-accent"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-xl bg-blue-500/10 p-3 text-xs text-blue-700 dark:text-blue-300">
                <PhoneCall className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {t("Pulni o'tkazganingizdan keyin admin tasdiqlaydi va Premium yoqiladi. Holatni \"To'lovlarim\" bo'limida kuzating.")}
                </span>
              </div>

              <div className="rounded-xl border bg-secondary/40 p-3">
                <p className="text-xs font-semibold">{t("Pulni o'tkazdingizmi? Chekni yuklang")}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("Chek admin Telegram botiga avtomatik yuboriladi.")}
                </p>
                <ReceiptUploadRow
                  paymentId={result.paymentId}
                  file={receiptFile}
                  previewFor={receiptPreview}
                  uploading={uploadingReceipt === result.paymentId}
                  onSelect={(f) => handleReceiptSelect(result.paymentId, f)}
                  onSubmit={() => handleUploadReceipt(result.paymentId, receiptFile)}
                />
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setCheckoutOpen(false);
                  router.refresh();
                }}
              >
                {t("Yopish")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
