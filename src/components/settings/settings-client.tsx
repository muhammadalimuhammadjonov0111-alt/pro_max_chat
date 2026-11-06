"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Moon,
  Sun,
  Monitor,
  LogOut,
  Lock,
  User as UserIcon,
  Crown,
  ShieldCheck,
  Sparkles,
  BadgeCheck,
  Mail,
  KeyRound,
  Trash2,
  Download,
  Phone,
  MapPin,
  Cake,
  AlertTriangle,
  UserRound,
  Loader2,
  Eye,
  EyeOff,
  AtSign,
  Palette,
  Globe,
  Megaphone,
} from "lucide-react";

import { authClient } from "@/lib/auth-client";
import {
  togglePrivateAccount,
  changePassword,
  changeEmail,
  deleteMyAccount,
  exportMyData,
} from "@/actions/user";
import {
  createChangePasswordSchema,
  createChangeEmailSchema,
  type ChangePasswordValues,
  type ChangeEmailValues,
} from "@/schemas/auth";
import { useMounted } from "@/hooks/use-mounted";
import { useT } from "@/hooks/use-i18n";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  EditProfileDialog,
  type EditableProfile,
} from "@/components/profile/edit-profile-dialog";
import {
  VerifiedBadge,
  AdminBadge,
  PremiumBadge,
} from "@/components/shared/badges";
import { cn, formatDate } from "@/lib/utils";

type SettingsUser = EditableProfile & {
  email: string;
  isPrivate: boolean;
  isVerified: boolean;
  isPremium: boolean;
  premiumUntil: string | null;
  isAdmin: boolean;
  createdAt: string;
};

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
  tone = "brand",
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  children: React.ReactNode;
  tone?: "brand" | "danger" | "blue";
}) {
  return (
    <section className="surface animate-fade-in-up p-5">
      <div className="mb-4 flex items-start gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            tone === "danger" && "bg-destructive/12 text-destructive",
            tone === "blue" && "bg-[#0095f6]/12 text-[#0095f6]",
            tone === "brand" && "bg-primary/12 text-primary"
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-sm font-bold">{title}</h2>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-background/60 px-3 py-2.5">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="ms-auto truncate text-sm font-medium">{value}</span>
    </div>
  );
}

export function SettingsClient({ user }: { user: SettingsUser }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const t = useT();

  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [confirmName, setConfirmName] = React.useState("");
  const [privacySaving, setPrivacySaving] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  async function togglePrivate(value: boolean) {
    setPrivacySaving(true);
    try {
      const res = await togglePrivateAccount(value);
      if (res.ok) {
        toast.success(value ? t("Hisob yopiq qilindi") : t("Hisob ochiq qilindi"));
        router.refresh();
      } else {
        void 0;
      }
    } finally {
      setPrivacySaving(false);
    }
  }

  async function handleDelete() {
    if (confirmName.trim().toLowerCase() !== (user.username ?? "").toLowerCase()) {
      void 0;
      return;
    }
    setDeleting(true);
    const res = await deleteMyAccount(confirmName);
    if (!res.ok) {
      setDeleting(false);
      void 0;
      return;
    }
    try {
      await authClient.signOut();
    } catch {
      /* session may already be gone */
    }
    toast.success(t("Hisob o'chirildi"));
    router.push("/login");
    router.refresh();
  }

  async function handleExport() {
    setExporting(true);
    try {
      const data = await exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gidgogram-${user.username ?? "data"}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(t("Ma'lumotlar yuklab olindi"));
    } catch {
      void 0;
    } finally {
      setExporting(false);
    }
  }

  const themes = [
    { value: "light", label: t("Kunduzgi"), icon: Sun },
    { value: "dark", label: t("Tungi"), icon: Moon },
    { value: "system", label: t("Tizim"), icon: Monitor },
  ];

  return (
    <div className="mx-auto max-w-[760px] px-4 py-6 lg:max-w-[860px] lg:py-10">
      <h1 className="mb-5 text-2xl font-extrabold tracking-tight lg:text-3xl">
        {t("Sozlamalar")}
      </h1>

      {/* Profile hero */}
      <div className="aurora relative mb-6 overflow-hidden rounded-2xl border bg-card card-shadow">
        <div className="relative z-10 flex flex-col items-center gap-4 p-5 sm:flex-row sm:items-start">
          <button
            onClick={() => setEditOpen(true)}
            className="story-ring group shrink-0 rounded-full p-[3px]"
            aria-label={t("Profilni tahrirlash")}
          >
            <span className="block rounded-full bg-background p-[3px]">
              <span className="relative block">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user.image ?? undefined} alt={user.name} />
                  <AvatarFallback className="text-2xl">
                    {user.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                  <Sparkles className="h-5 w-5 text-white" />
                </span>
              </span>
            </span>
          </button>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="flex items-center justify-center gap-1.5 text-lg font-bold sm:justify-start">
              {user.username ?? user.name}
              {user.isVerified && <VerifiedBadge />}
              {user.isAdmin && <AdminBadge />}
              {user.isPremium && <PremiumBadge />}
            </p>
            <p className="truncate text-sm text-muted-foreground">{user.name}</p>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("{date} dan beri", { date: formatDate(user.createdAt) })}
            </p>
          </div>
          <Button
            variant="gradient"
            size="sm"
            className="shrink-0"
            onClick={() => setEditOpen(true)}
          >
            <UserRound className="h-4 w-4" />
            {t("Tahrirlash")}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="account">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-2xl bg-muted/70 p-1 sm:grid-cols-4">
          <TabsTrigger value="account" className="h-10 min-w-0 justify-start rounded-xl px-3 sm:justify-center">
            <UserIcon className="me-1.5 h-4 w-4 shrink-0" /> <span className="truncate">{t("Hisob")}</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="h-10 min-w-0 justify-start rounded-xl px-3 sm:justify-center">
            <ShieldCheck className="me-1.5 h-4 w-4 shrink-0" /> <span className="truncate">{t("Xavfsizlik")}</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="h-10 min-w-0 justify-start rounded-xl px-3 sm:justify-center">
            <Palette className="me-1.5 h-4 w-4 shrink-0" /> <span className="truncate">{t("Ko'rinish")}</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="h-10 min-w-0 justify-start rounded-xl px-3 sm:justify-center">
            <Download className="me-1.5 h-4 w-4 shrink-0" /> <span className="truncate">{t("Ma'lumot")}</span>
          </TabsTrigger>
        </TabsList>

        {/* ---------------------------------------------------------- */}
        <TabsContent value="account" className="mt-5 space-y-5">
          <SectionCard
            icon={UserRound}
            title={t("Hisob ma'lumotlari")}
            description={t("Profil ma'lumotlaringiz")}
          >
            <div className="space-y-2">
              <InfoRow icon={UserRound} label={t("Ism")} value={user.name} />
              <InfoRow
                icon={AtSign}
                label={t("Username")}
                value={user.username ?? "—"}
              />
              <InfoRow icon={Mail} label={t("Email")} value={user.email} />
              <InfoRow
                icon={Phone}
                label={t("Telefon")}
                value={user.phone || "—"}
              />
              <InfoRow
                icon={UserIcon}
                label={t("Jinsi")}
                value={
                  user.gender === "male"
                    ? t("Erkak")
                    : user.gender === "female"
                      ? t("Ayol")
                      : user.gender === "other"
                        ? t("Boshqa")
                        : "—"
                }
              />
              <InfoRow
                icon={Cake}
                label={t("Tug'ilgan kun")}
                value={user.birthday ? formatDate(user.birthday) : "—"}
              />
              <InfoRow
                icon={MapPin}
                label={t("Manzil")}
                value={user.location || "—"}
              />
            </div>
          </SectionCard>

          <section className="surface animate-fade-in-up p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <Lock className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-bold">{t("Yopiq hisob")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("Faqat tasdiqlangan kuzatuvchilar postlaringizni ko'radi")}
                  </p>
                </div>
              </div>
              <Switch
                checked={user.isPrivate}
                onCheckedChange={togglePrivate}
                disabled={privacySaving}
              />
            </div>
            {user.isVerified && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-secondary p-3 text-xs text-muted-foreground">
                <BadgeCheck className="h-4 w-4 text-[#0095f6]" />
                {t("Hisobingiz tasdiqlangan (verified).")}
              </div>
            )}
          </section>

          <section className="surface animate-fade-in-up overflow-hidden p-0">
            <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/30">
                  <Crown className="h-5 w-5" />
                </span>
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    {t("Gidgogram Premium")} {user.isPremium && <PremiumBadge />}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user.isPremium
                      ? user.premiumUntil
                        ? t("Amal qiladi: {date}", {
                            date: formatDate(user.premiumUntil),
                          })
                        : t("Faol")
                      : t("Tasdiqlangan belgi va qo'shimcha imkoniyatlar")}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant={user.isPremium ? "outline" : "gradient"}
                asChild
              >
                <Link href="/premium">
                  {user.isPremium ? t("Boshqarish") : t("O'tish")}
                </Link>
              </Button>
            </div>
          </section>

          <Link
            href="/ads"
            className="surface flex items-center justify-between p-4 transition-colors hover:bg-accent/40"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-500/30">
                <Megaphone className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{t("Reklama")}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {t("30 kun davomida reklamangizni ko'rsating")}
                </p>
              </div>
            </div>
            <span className="shrink-0 text-sm font-semibold text-primary">
              {t("Kirish →")}
            </span>
          </Link>

          {user.isAdmin && (
            <Link
              href="/admin-panel"
              className="surface flex items-center justify-between p-4 transition-colors hover:bg-accent/40"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{t("Admin panel")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("Foydalanuvchilar va kontentni boshqarish")}
                  </p>
                </div>
              </div>
              <span className="text-sm font-semibold text-primary">
                {t("Kirish →")}
              </span>
            </Link>
          )}
        </TabsContent>

        {/* ---------------------------------------------------------- */}
        <TabsContent value="security" className="mt-5 space-y-5">
          <SectionCard
            icon={KeyRound}
            title={t("Parolni o'zgartirish")}
            description={t("Hisobingiz xavfsizligini ta'minlang")}
          >
            <PasswordForm />
          </SectionCard>

          <SectionCard
            icon={Mail}
            title={t("Email manzilni almashtirish")}
            description={t("Joriy email: {email}", { email: user.email })}
            tone="blue"
          >
            <EmailForm />
          </SectionCard>

          <SectionCard
            icon={LogOut}
            title={t("Seanslar")}
            description={t("Boshqa qurilmalardagi seanslarni yopish")}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await authClient.revokeSessions();
                  toast.success(t("Boshqa qurilmalar chiqarildi"));
                } catch {
                  void 0;
                }
              }}
            >
              <LogOut className="h-4 w-4" /> {t("Barcha seanslarni yopish")}
            </Button>
          </SectionCard>
        </TabsContent>

        {/* ---------------------------------------------------------- */}
        <TabsContent value="appearance" className="mt-5 space-y-5">
          <SectionCard
            icon={Globe}
            title={t("Til")}
            description={t("Tilni tanlang")}
          >
            <LanguageSwitcher align="start" />
          </SectionCard>

          <SectionCard
            icon={Palette}
            title={t("Mavzu")}
            description={t("Sayt qanday ko'rinishda bo'lsin?")}
          >
            <div className="grid grid-cols-3 gap-3">
              {themes.map((tItem) => {
                const active = mounted && theme === tItem.value;
                return (
                  <button
                    key={tItem.value}
                    onClick={() => setTheme(tItem.value)}
                    className={cn(
                      "group relative flex flex-col items-center gap-2 overflow-hidden rounded-2xl border-2 p-4 text-sm font-medium transition-all",
                      active
                        ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                        : "border-border hover:-translate-y-0.5 hover:bg-accent"
                    )}
                  >
                    {active && (
                      <span className="absolute end-2 top-2 h-2 w-2 rounded-full bg-primary" />
                    )}
                    <span
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-105",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <tItem.icon className="h-5 w-5" />
                    </span>
                    {tItem.label}
                  </button>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard
            icon={Lock}
            title={t("Maxfiylik")}
            description={t("Kim sizni kuzatishi mumkin")}
          >
            <div className="flex items-center justify-between rounded-xl border bg-background/60 p-3">
              <div className="pe-3">
                <p className="text-sm font-medium">{t("Yopiq hisob")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("Yangi kuzatuvchilar tasdiqlashingizni kutadi")}
                </p>
              </div>
              <Switch
                checked={user.isPrivate}
                onCheckedChange={togglePrivate}
                disabled={privacySaving}
              />
            </div>
            {user.isVerified && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-secondary p-3 text-xs text-muted-foreground">
                <BadgeCheck className="h-4 w-4 text-[#0095f6]" />
                {t("Hisobingiz tasdiqlangan (verified).")}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* ---------------------------------------------------------- */}
        <TabsContent value="data" className="mt-5 space-y-5">
          <SectionCard
            icon={Download}
            title={t("Ma'lumotlarni yuklab olish")}
            description={t("Profilingiz, postlar, izohlar va boshqalar (JSON)")}
          >
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={exporting}
              className="w-full sm:w-auto"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {t("Arxivni yuklab olish")}
            </Button>
          </SectionCard>

          <SectionCard
            icon={Trash2}
            title={t("Xavfli hudud")}
            description={t("Bu amallar qaytarilmas — ehtiyot bo'ling")}
            tone="danger"
          >
            <div className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                <div>
                  <p className="text-sm font-semibold text-destructive">
                    {t("Hisobni o'chirish")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      "Postlar, izohlar va barcha ma'lumotlar butunlay o'chiriladi"
                    )}
                  </p>
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="shrink-0"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" /> {t("O'chirish")}
              </Button>
            </div>

            <div className="mt-4">
              <Button
                variant="outline"
                className="w-full text-like hover:text-like"
                onClick={async () => {
                  try {
                    await authClient.signOut();
                  } catch {
                    /* ignore */
                  }
                  router.push("/login");
                  router.refresh();
                }}
              >
                <LogOut className="h-4 w-4" /> {t("Hisobdan chiqish")}
              </Button>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>

      <EditProfileDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        user={user}
      />

      {/* Delete confirm */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="border-b p-4">
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" /> {t("Hisobni o'chirish")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "Bu amal qaytarilmaydi. Tasdiqlash uchun username ingizni kiriting:"
              )}
              <b className="ms-1 text-foreground">@{user.username}</b>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 p-4 pt-0">
            <Input
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={user.username ?? ""}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDeleteOpen(false)}
              >
                {t("Bekor qilish")}
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={deleting}
                onClick={handleDelete}
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("O'chirish")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function PasswordForm() {
  const t = useT();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: React.useMemo(
      () => zodResolver(createChangePasswordSchema(t)),
      [t]
    ),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  const [show, setShow] = React.useState(false);

  async function onSubmit(values: ChangePasswordValues) {
    const res = await changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });
    if (!res.ok) {
      void 0;
      return;
    }
    toast.success(t("Parol yangilandi"));
    reset();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5">
          <KeyRound className="h-3.5 w-3.5 text-muted-foreground" /> {t("Joriy parol")}
        </Label>
        <Input
          type={show ? "text" : "password"}
          {...register("currentPassword")}
          placeholder="••••••••"
          autoComplete="current-password"
        />
        {errors.currentPassword && (
          <p className="text-xs text-like">{errors.currentPassword.message}</p>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t("Yangi parol")}</Label>
          <Input
            type={show ? "text" : "password"}
            {...register("newPassword")}
            placeholder={t("Kamida 6 belgi")}
            autoComplete="new-password"
          />
          {errors.newPassword && (
            <p className="text-xs text-like">{errors.newPassword.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>{t("Tasdiqlash")}</Label>
          <Input
            type={show ? "text" : "password"}
            {...register("confirmPassword")}
            placeholder={t("Yana kiriting")}
            autoComplete="new-password"
          />
          {errors.confirmPassword && (
            <p className="text-xs text-like">{errors.confirmPassword.message}</p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {show ? t("Yashirish") : t("Ko'rsatish")}
        </button>
        <Button type="submit" variant="gradient" size="sm" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("Parolni yangilash")}
        </Button>
      </div>
    </form>
  );
}

function EmailForm() {
  const router = useRouter();
  const t = useT();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangeEmailValues>({
    resolver: React.useMemo(() => zodResolver(createChangeEmailSchema(t)), [t]),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ChangeEmailValues) {
    const res = await changeEmail(values.email);
    if (!res.ok) {
      void 0;
      return;
    }
    toast.success(t("Email almashtirildi"));
    reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5">
          <Mail className="h-3.5 w-3.5 text-muted-foreground" /> {t("Yangi email")}
        </Label>
        <Input
          type="email"
          {...register("email")}
          placeholder="you@example.com"
          autoComplete="email"
        />
        {errors.email && <p className="text-xs text-like">{errors.email.message}</p>}
      </div>
      <Button type="submit" variant="blue" size="sm" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {t("Almashtirish")}
      </Button>
    </form>
  );
}
