"use client";

import { useRouter } from "next/navigation";
import { ShieldAlert, LogOut } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { useT } from "@/hooks/use-i18n";
import { Wordmark } from "@/components/shared/wordmark";
import { Button } from "@/components/ui/button";

export default function BannedPage() {
  const router = useRouter();
  const t = useT();

  async function handleLogout() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <Wordmark href="/banned" />
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
        <ShieldAlert className="h-8 w-8" />
      </span>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{t("Hisobingiz bloklangan")}</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          {t(
            "Sizning hisobingiz administratorlar tomonidan vaqtincha bloklandi. Agar bu xatolik deb hisoblasangiz, qo'llab-quvvatlash xizmatiga murojaat qiling."
          )}
        </p>
      </div>
      <Button variant="outline" onClick={handleLogout}>
        <LogOut className="h-4 w-4" /> {t("Hisobdan chiqish")}
      </Button>
    </div>
  );
}
