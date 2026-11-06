import Link from "next/link";

import { getT } from "@/lib/i18n/server";
import { Wordmark } from "@/components/shared/wordmark";

export default async function NotFound() {
  const t = await getT();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <Wordmark />
      <h1 className="text-2xl font-semibold">{t("Sahifa topilmadi")}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {t("Siz izlagan sahifa mavjud emas yoki o'chirilgan bo'lishi mumkin.")}
      </p>
      <Link
        href="/"
        className="rounded-lg bg-[#0095f6] px-6 py-2 text-sm font-semibold text-white hover:bg-[#1877f2]"
      >
        {t("Bosh sahifaga qaytish")}
      </Link>
    </div>
  );
}
