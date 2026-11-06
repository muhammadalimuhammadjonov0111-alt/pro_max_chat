"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { createRegisterSchema, type RegisterValues } from "@/schemas/auth";
import { useT } from "@/hooks/use-i18n";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { Wordmark } from "@/components/shared/wordmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RegisterForm() {
  const router = useRouter();
  const t = useT();
  const [loading, setLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: React.useMemo(() => zodResolver(createRegisterSchema(t)), [t]),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: RegisterValues) {
    setLoading(true);
    const { error } = await authClient.signUp.email({
      name: values.name,
      email: values.email,
      username: values.username,
      password: values.password,
    });
    setLoading(false);

    if (error) {
      const msg =
        error.status === 422
          ? t("Bu email yoki username band")
          : (error.message ?? t("Ro'yxatdan o'tishda xatolik"));
      toast.error(msg);
      return;
    }

    toast.success(t("Hisob yaratildi!"));
    router.push("/");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-4 flex justify-center">
        <LanguageSwitcher />
      </div>
      <div className="overflow-hidden rounded-2xl border bg-card shadow-lg card-shadow">
        <div className="brand-gradient animate-gradient h-1.5 w-full" />
        <div className="px-8 py-8 text-center">
          <div className="mb-2 flex justify-center">
            <Wordmark />
          </div>
          <p className="mb-7 text-sm text-muted-foreground">
            {t("Do'stlaringiz bilan ulashing")}
          </p>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-2.5 text-start"
          >
            <div className="space-y-1">
              <Input
                {...register("name")}
                placeholder={t("Ism familiya")}
                className="h-11 bg-muted/50 text-sm focus-visible:bg-background"
              />
              {errors.name && (
                <p className="px-1 text-xs text-like">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Input
                {...register("email")}
                type="email"
                placeholder={t("Elektron pochta")}
                className="h-11 bg-muted/50 text-sm focus-visible:bg-background"
              />
              {errors.email && (
                <p className="px-1 text-xs text-like">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Input
                {...register("username")}
                placeholder={t("Foydalanuvchi nomi")}
                className="h-11 bg-muted/50 text-sm focus-visible:bg-background"
              />
              {errors.username && (
                <p className="px-1 text-xs text-like">
                  {errors.username.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Input
                {...register("password")}
                type="password"
                placeholder={t("Parol")}
                className="h-11 bg-muted/50 text-sm focus-visible:bg-background"
              />
              {errors.password && (
                <p className="px-1 text-xs text-like">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Input
                {...register("confirmPassword")}
                type="password"
                placeholder={t("Parolni tasdiqlang")}
                className="h-11 bg-muted/50 text-sm focus-visible:bg-background"
              />
              {errors.confirmPassword && (
                <p className="px-1 text-xs text-like">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="blue"
              className="mt-2 h-11 w-full text-sm"
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("Ro'yxatdan o'tish")}
            </Button>
          </form>

          <p className="mt-5 text-[11px] leading-snug text-muted-foreground">
            {t(
              "Ro'yxatdan o'tish orqali siz bizning {terms} va {privacy}ga rozilik bildirasiz.",
              { terms: t("Shartlar"), privacy: t("Maxfiylik siyosatimiz") }
            )}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border bg-card px-8 py-5 text-center text-sm shadow-sm">
        {t("Hisobingiz bormi?")}{" "}
        <Link href="/login" className="font-semibold text-[#0095f6]">
          {t("Kirish")}
        </Link>
      </div>
    </div>
  );
}
