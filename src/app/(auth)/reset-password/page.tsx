"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, KeyRound, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Wordmark } from "@/components/shared/wordmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/hooks/use-i18n";

function ResetForm() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const urlError = params.get("error");

  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    if (urlError === "INVALID_TOKEN") {
      setError(t("Havola noto'g'ri yoki muddati tugagan. Yangi havola so'rang."));
    }
    if (!token) {
      // callback tokensiz kelsa — emaildagi /reset-password/<token> dan yo'naltiriladi.
      // Ba'zan ?error=INVALID_TOKEN bilan keladi.
      const qp = new URLSearchParams(window.location.search);
      const cbToken = qp.get("token");
      if (!cbToken && !urlError) {
        setError(t("Tiklash kodi topilmadi. Emailingizdagi havolani oching."));
      }
    }
  }, [token, urlError, t]);

  async function onReset() {
    if (!token) {
      setError(t("Tiklash kodi topilmadi"));
      return;
    }
    if (password.length < 6) {
      setError(t("Kamida 6 ta belgi"));
      return;
    }
    if (password !== confirm) {
      setError(t("Parollar mos kelmadi"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ newPassword: password, token }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        status?: boolean;
        message?: string;
        error?: string;
      };
      if (!res.ok || !data.status) {
        const msg = data.error ?? data.message ?? t("Kod noto'g'ri yoki muddati tugagan");
        setError(msg);
        toast.error(msg);
        return;
      }
      setDone(true);
      toast.success(t("Parol yangilandi"));
      setTimeout(() => router.push("/login"), 1200);
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
            {done ? <CheckCircle2 className="h-8 w-8 text-emerald-500" /> : <KeyRound className="h-8 w-8" />}
          </div>
        </div>
        <h1 className="mb-2 text-base font-semibold">
          {done ? t("Parol yangilandi!") : t("Yangi parol qo'ying")}
        </h1>

        {done ? (
          <p className="text-sm text-muted-foreground">{t("Endi yangi parol bilan kirishingiz mumkin.")}</p>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              {t("Kamida 6 ta belgilik yangi parol kiriting.")}
            </p>
            <div className="space-y-2 text-start">
              <Input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                placeholder={t("Yangi parol")}
                className="h-10 bg-muted/50 text-sm"
                autoComplete="new-password"
                disabled={loading}
              />
              <Input
                type="password"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setError(null); }}
                placeholder={t("Parolni tasdiqlang")}
                className="h-10 bg-muted/50 text-sm"
                autoComplete="new-password"
                disabled={loading}
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button variant="blue" className="w-full" disabled={loading} onClick={onReset}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("Parolni yangilash")}
              </Button>
            </div>
          </>
        )}

        <div className="mt-4">
          <Link href="/login" className="text-sm font-semibold text-[#0095f6]">
            {t("Kirish sahifasiga qaytish")}
          </Link>{" "}
          ·{" "}
          <Link href="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground">
            {t("Parolingizni unutdingizmi?")}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={null}>
      <ResetForm />
    </React.Suspense>
  );
}
