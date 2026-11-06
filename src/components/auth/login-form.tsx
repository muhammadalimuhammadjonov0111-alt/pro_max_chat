"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { createLoginSchema, type LoginValues } from "@/schemas/auth";
import { useT } from "@/hooks/use-i18n";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { Wordmark } from "@/components/shared/wordmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const t = useT();
  const [loading, setLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: React.useMemo(() => zodResolver(createLoginSchema(t)), [t]),
    defaultValues: { identifier: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setLoading(true);
    const identifier = values.identifier.trim();
    const isEmail = identifier.includes("@");

    const { error } = isEmail
      ? await authClient.signIn.email({
          email: identifier,
          password: values.password,
        })
      : await authClient.signIn.username({
          username: identifier,
          password: values.password,
        });

    setLoading(false);

    if (error) {
      const msg =
        error.status === 401 || error.status === 403
          ? t("Parol yoki email/username noto'g'ri")
          : (error.message ?? t("Kirishda xatolik yuz berdi"));
      toast.error(msg);
      return;
    }

    toast.success(t("Xush kelibsiz!"));
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
        <div className="px-8 py-8">
          <div className="mb-2 flex justify-center">
            <Wordmark />
          </div>
          <p className="mb-7 text-center text-sm text-muted-foreground">
            {t("Do'stlaringiz bilan lahzalarini ulashing")}
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-2.5">
            <div className="space-y-1">
              <Input
                {...register("identifier")}
                placeholder={t("Email yoki foydalanuvchi nomi")}
                className="h-11 bg-muted/50 text-sm focus-visible:bg-background"
                autoComplete="username"
              />
              {errors.identifier && (
                <p className="px-1 text-xs text-like">
                  {errors.identifier.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <div className="relative">
                <Input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder={t("Parol")}
                  className="h-11 bg-muted/50 pe-10 text-sm focus-visible:bg-background"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Toggle password"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="px-1 text-xs text-like">
                  {errors.password.message}
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
              {t("Kirish")}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm">
            <Link
              href="/forgot-password"
              className="font-medium text-muted-foreground hover:text-foreground"
            >
              {t("Parolingizni unutdingizmi?")}
            </Link>
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border bg-card px-8 py-5 text-center text-sm shadow-sm">
        {t("Hisobingiz yo'qmi?")}{" "}
        <Link href="/register" className="font-semibold text-[#0095f6]">
          {t("Ro'yxatdan o'tish")}
        </Link>
      </div>
    </div>
  );
}
