import { redirect } from "next/navigation";

import { getT } from "@/lib/i18n/server";
import { getSession } from "@/lib/session";
import { RegisterForm } from "@/components/auth/register-form";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Ro'yxatdan o'tish") };
}

export default async function RegisterPage() {
  const session = await getSession();
  if (session?.user) {
    if ((session.user as { isBanned?: boolean }).isBanned) redirect("/banned");
    redirect("/");
  }
  return <RegisterForm />;
}
