"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Loader2,
  Camera,
  UserRound,
  Link as LinkIcon,
  Phone,
} from "lucide-react";

import { updateProfile } from "@/actions/user";
import { uploadFile } from "@/lib/upload";
import { useT } from "@/hooks/use-i18n";
import { createEditProfileSchema, type EditProfileValues } from "@/schemas/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type EditableProfile = {
  name: string;
  username: string | null;
  bio: string | null;
  link: string | null;
  image: string | null;
  phone?: string | null;
  gender?: string | null;
  birthday?: string | null;
  location?: string | null;
};

export function EditProfileDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  user: EditableProfile;
}) {
  const router = useRouter();
  const t = useT();
  const [saving, setSaving] = React.useState(false);
  const [image, setImage] = React.useState<string | null>(user.image);
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditProfileValues>({
    resolver: React.useMemo(() => zodResolver(createEditProfileSchema(t)), [t]),
    defaultValues: {
      name: user.name,
      username: user.username ?? "",
      bio: user.bio ?? "",
      link: user.link ?? "",
      phone: user.phone ?? "",
      gender: (user.gender as EditProfileValues["gender"]) ?? "",
      birthday: user.birthday ?? "",
      location: user.location ?? "",
    },
  });

  async function handleImage(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const media = await uploadFile(file);
      setImage(media.url);
      toast.success(t("Rasm yuklandi"));
    } catch (e) {
      void 0;
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(values: EditProfileValues) {
    setSaving(true);
    const res = await updateProfile({
      name: values.name,
      username: values.username,
      bio: values.bio ?? "",
      link: values.link ?? "",
      phone: values.phone ?? "",
      gender: values.gender ?? "",
      birthday: values.birthday ?? "",
      location: values.location ?? "",
      image,
    });
    setSaving(false);

    if (!res.ok) {
      void 0;
      return;
    }
    toast.success(t("Profil saqlandi"));
    onOpenChange(false);
    router.push(`/${res.username}`);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto p-0 thin-scroll">
        <DialogHeader className="sticky top-0 z-10 border-b bg-card/95 p-4 backdrop-blur">
          <DialogTitle className="text-center">{t("Profilni tahrirlash")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-5">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="story-ring rounded-full p-[3px]">
              <span className="block rounded-full bg-background p-[3px]">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={image ?? undefined} alt={user.name} />
                  <AvatarFallback className="text-2xl">
                    {user.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </span>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImage(e.target.files?.[0])}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="soft"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
                {t("Rasm yuklash")}
              </Button>
              {image && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setImage(null)}
                >
                  {t("O'chirish")}
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <UserRound className="h-3.5 w-3.5 text-muted-foreground" />{" "}
                {t("Ism familiya")}
              </Label>
              <Input {...register("name")} placeholder={t("Ism Familiya")} />
              {errors.name && (
                <p className="text-xs text-like">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <span className="text-muted-foreground">@</span> {t("Username")}
              </Label>
              <Input {...register("username")} placeholder="username" />
              {errors.username && (
                <p className="text-xs text-like">{errors.username.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>{t("Bio")}</Label>
              <span className="text-[11px] text-muted-foreground">{t("150 belgi")}</span>
            </div>
            <Textarea
              {...register("bio")}
              placeholder={t("O'zingiz haqingizda qisqacha...")}
              className="min-h-[84px] resize-none"
              maxLength={150}
            />
            {errors.bio && <p className="text-xs text-like">{errors.bio.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" /> {t("Havola")}
              </Label>
              <Input {...register("link")} placeholder="example.com" />
              {errors.link && (
                <p className="text-xs text-like">{errors.link.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" /> {t("Telefon")}
              </Label>
              <Input
                {...register("phone")}
                placeholder="+998 90 123 45 67"
                inputMode="tel"
              />
              {errors.phone && (
                <p className="text-xs text-like">{errors.phone.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("Jins")}</Label>
              <select
                {...register("gender")}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">{t("Ko'rsatilmagan")}</option>
                <option value="male">{t("Erkak")}</option>
                <option value="female">{t("Ayol")}</option>
                <option value="other">{t("Boshqa")}</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Input
                  type="date"
                  {...register("birthday")}
                  className="h-10"
                  max="2025-12-31"
                />
              </Label>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <span className="text-muted-foreground">📍</span> {t("Manzil")}
            </Label>
            <Input {...register("location")} placeholder="Toshkent, O'zbekiston" />
            {errors.location && (
              <p className="text-xs text-like">{errors.location.message}</p>
            )}
          </div>

          <Button type="submit" variant="gradient" className="w-full" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("Saqlash")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
