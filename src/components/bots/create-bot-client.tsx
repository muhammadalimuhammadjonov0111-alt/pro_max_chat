"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bot,
  Camera,
  Globe,
  Loader2,
  Lock,
  Send,
  Sparkles,
  Wand2,
} from "lucide-react";
import Link from "next/link";

import { createBot } from "@/actions/bot";
import { uploadFile } from "@/lib/upload";
import { BOT_CATEGORIES } from "@/lib/bot-categories";
import { useT } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CreateBotClient({ defaultUsername }: { defaultUsername: string }) {
  const t = useT();
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [username, setUsername] = React.useState(`${defaultUsername}_bot`);
  const [category, setCategory] = React.useState("assistant");
  const [description, setDescription] = React.useState("");
  const [prompt, setPrompt] = React.useState("");
  const [isPublic, setIsPublic] = React.useState(true);
  const [image, setImage] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function handleImage(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const media = await uploadFile(file);
      setImage(media.url);
    } catch (e) {
      void 0;
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (name.trim().length < 2) {
      void 0;
      return;
    }
    setSaving(true);
    const res = await createBot({
      name,
      username,
      botDescription: description,
      botPrompt: prompt,
      botCategory: category,
      botPublic: isPublic,
      image,
    });
    setSaving(false);
    if (!res.ok) {
      void 0;
      return;
    }
    toast.success(t("Bot yaratildi! 🎉"));
    router.push(`/messages?u=${res.username}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-4 sm:px-0 sm:pb-10 sm:pt-6">
      <Link
        href="/bots"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t("Botlar")}
      </Link>

      <header className="relative mb-6 overflow-hidden rounded-3xl border bg-gradient-to-br from-violet-600 via-indigo-600 to-fuchsia-600 p-5 text-white shadow-xl">
        <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <Bot className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">
              {t("AI bot yaratish")}
            </h1>
            <p className="text-sm text-white/85">
              {t("O'z yordamchingizni yarating — odamlar u bilan gaplashadi.")}
            </p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identity */}
        <section className="surface p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold">
            <Wand2 className="h-4 w-4 text-primary" /> {t("Asosiy ma'lumot")}
          </h2>

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
            <div className="flex flex-col items-center gap-2">
              <span className="story-ring rounded-full p-[3px]">
                <span className="block rounded-full bg-background p-[3px]">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={image ?? undefined} alt="bot" />
                    <AvatarFallback className="text-xl">
                      {(name || "AI").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </span>
              </span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImage(e.target.files?.[0])}
              />
              <Button
                type="button"
                variant="soft"
                size="sm"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
                Avatar
              </Button>
            </div>

            <div className="grid flex-1 gap-4">
              <div className="space-y-1.5">
                <Label>{t("Bot nomi")}</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("Masalan: Dono yordamchi")}
                  maxLength={50}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Username</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    @
                  </span>
                  <Input
                    value={username}
                    onChange={(e) =>
                      setUsername(
                        e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, "")
                      )
                    }
                    placeholder="bot_username"
                    className="ps-7"
                    maxLength={30}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {t("3-30 belgi · harflar, raqamlar, . va _")}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Category */}
        <section className="surface p-5">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-bold">
            <Sparkles className="h-4 w-4 text-primary" /> {t("Yo'nalish")}
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">
            {t("Bot qanday vazifalarni bajarishini tanlang.")}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {BOT_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border p-3 text-left transition-all",
                  category === c.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary/40"
                    : "border-border hover:bg-accent"
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-lg",
                    c.gradient
                  )}
                >
                  {c.emoji}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {t(c.label)}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {t(c.description)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Behaviour */}
        <section className="surface space-y-4 p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <Sparkles className="h-4 w-4 text-primary" />{" "}
            {t("Xarakter va ko'rsatmalar")}
          </h2>

          <div className="space-y-1.5">
            <Label>{t("Qisqa tavsif")}</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("Masalan: Ingliz va o'zbek tilida tarjima qiladi")}
              maxLength={120}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>{t("Ko'rsatmalar (prompt)")}</Label>
              <span className="text-[11px] text-muted-foreground">
                {prompt.length}/1000
              </span>
            </div>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, 1000))}
              placeholder={t(
                "Bot qanday javob berishi kerak? Masalan: 'Har doim qisqa va aniq javob ber, misollar keltir.'"
              )}
              className="min-h-[110px] resize-none"
            />
          </div>

          {/* Visibility */}
          <div className="flex items-center justify-between rounded-2xl border bg-background/60 p-3">
            <span className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl",
                  isPublic
                    ? "bg-emerald-500/12 text-emerald-600"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                {isPublic ? (
                  <Globe className="h-4 w-4" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
              </span>
              <span>
                <span className="block text-sm font-semibold">
                  {isPublic ? t("Ommaviy bot") : t("Yopiq bot")}
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  {isPublic
                    ? t("Botlar ro'yxatida ko'rinadi va hamma yozishi mumkin")
                    : t("Faqat siz foydalanasiz")}
                </span>
              </span>
            </span>
            <button
              type="button"
              onClick={() => setIsPublic((v) => !v)}
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors",
                isPublic ? "bg-primary" : "bg-secondary"
              )}
              aria-label={t("Ommaviylik")}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  isPublic ? "translate-x-[22px]" : "translate-x-0.5"
                )}
              />
            </button>
          </div>
        </section>

        <div className="flex items-center justify-end gap-2">
          <Button asChild variant="ghost" type="button">
            <Link href="/bots">{t("Bekor qilish")}</Link>
          </Button>
          <Button type="submit" variant="gradient" size="lg" disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {t("Botni yaratish")}
          </Button>
        </div>
      </form>
    </div>
  );
}
