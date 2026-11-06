"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Wordmark } from "@/components/shared/wordmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/hooks/use-i18n";

export default function ForgotPasswordPage() {
  const t = useT();
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);

  async function onSend() {
    const value = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
      setError(t("To'g'ri email kiriting"));
      return;
    }
    setLoading(true);
    setError(null);
    // better-auth: POST /api/auth/request-password-reset
    try {
      const redirectTo = "/reset-password";
      const res = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: value, redirectTo }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        status?: boolean;
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        const msg = data.error ?? data.message ?? t("Kod yuborishda xatolik");
        setError(msg);
        toast.error(msg);
        return;
      }
      setSent(true);
      toast.success(t("Tiklash havolasi yuborildi"));
      // Lokal rejimda (SMTP sozlanmagan) server terminalda havolani chiqaradi.
      // Foydalanuvchi email inbox (yoki terminal) dan ochadi.
      setTimeout(() => router.refresh(), 500);
    } catch {
      setError(t("Tarmoqda xatolik. Qayta urining."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-lg border bg-card p-8 text-center shadow-sm">
        <div className="mb-6 flex justify-center">
          <Wordmark />
        </div>

        <div className="mb-4 flex justify-center">
          <div className="rounded-full border-2 p-4">
            <Mail className="h-8 w-8" />
          </div>
        </div>

        <h1 className="mb-2 text-base font-semibold">
          {t("Parolni tiklashda muammo?")}
        </h1>

        {sent ? (
          <div className="space-y-3">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
            <p className="text-sm text-muted-foreground">
              {t(
                "Agar {email} ro'yxatdan o'tgan bo'lsa, tiklash havolasi shu manzildagi inboxga yuborildi. Havolani 1 soat ichida oching.",
                { email }
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("SMTP sozlanmagan lokalda havola server terminalida chiqadi (npm run dev oynasi).")}
            </p>
            <Button variant="outline" className="w-full" onClick={() => { setSent(false); setEmail(""); }}>
              {t("Boshqa email kiritish")}
            </Button>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              {t("Ro'yxatdan o'tgan emailingizni kiriting — shu manzildagi inboxga 1 soatlik tiklash havolasi yuboriladi.")}
            </p>
            <Input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              placeholder={t("Elektron pochta")}
              className="mb-2 h-10 bg-muted/50 text-sm"
              autoComplete="email"
              disabled={loading}
            />
            {error && (
              <p className="mb-2 text-start text-xs text-destructive">{error}</p>
            )}
            <Button
              variant="blue"
              className="w-full"
              disabled={loading || !email.includes("@")}
              onClick={onSend}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("Tiklash havolasini yuborish")}
            </Button>
            <p className="mt-3 text-[11px] text-muted-foreground">
              {t("Kod siz kiritgan emailga boradi. Noto'g'ri email bo'lsa ham xabar o'zgarmaydi (xavfsizlik uchun).")}
            </p>
          </>
        )}

        <div className="mt-4">
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#0095f6]"
          >
            <ArrowLeft className="h-4 w-4" /> {t("Kirish sahifasiga qaytish")}
          </Link>
        </div>
      </div>

      <div className="mt-3 rounded-lg border bg-card px-8 py-5 text-center text-sm shadow-sm">
        {t("Hisobingiz yo'qmi?")}{" "}
        <Link href="/register" className="font-semibold text-[#0095f6]">
          {t("Ro'yxatdan o'tish")}
        </Link>
      </div>
    </div>
  );
}
