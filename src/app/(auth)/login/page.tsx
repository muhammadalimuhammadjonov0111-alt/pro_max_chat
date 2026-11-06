import { redirect } from "next/navigation";

import { getT } from "@/lib/i18n/server";
import { getSession } from "@/lib/session";
import { LoginForm } from "@/components/auth/login-form";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Kirish") };
}

export default async function LoginPage() {
  const session = await getSession();
  if (session?.user) {
    if ((session.user as { isBanned?: boolean }).isBanned) redirect("/banned");
    redirect("/");
  }
  return <LoginForm />;
}
