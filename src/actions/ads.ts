"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import {
  createAdSchema,
  normalizePhone,
  normalizeTelegram,
  type AdFormValues,
} from "@/schemas/ads";
import { AD_DURATION_DAYS, displayStatus, getAdEligibility, type AdStatus } from "@/lib/ads";

const DAY = 24 * 60 * 60 * 1000;

function normalizeUrl(value: string) {
  const url = value.trim();
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function revalidateAdSurfaces(username?: string | null) {
  revalidatePath("/");
  revalidatePath("/reels");
  revalidatePath("/ads");
  revalidatePath("/admin-panel");
  revalidatePath("/settings");
  if (username) revalidatePath(`/${username}`);
}

/**
 * Creates a new ad request, or re-submits a rejected one when `adId` is passed.
 * Users can have several ads, but only one request may be pending at a time.
 * An ad goes live only after an admin approves it.
 */
export async function submitAd(input: AdFormValues, adId?: string) {
  const user = await requireUser();
  const t = await getT();

  const parsed = createAdSchema(t).safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? t("Barcha maydonlarni to'ldiring"),
    };
  }

  const data = parsed.data;

  const eligibility = await getAdEligibility(user.id);
  if (!eligibility.eligible) {
    return {
      ok: false as const,
      error:
        eligibility.reason === "UNVERIFIED"
          ? t("Hisobingizni tasdiqlash uchun admin bilan bog'laning.")
          : eligibility.reason === "FOLLOWERS"
            ? t(
                "Obunachilar soni yetarli emas. 1000 taga yetgach qayta urinib ko'ring."
              )
            : t(
                "Reklama joyingiz band. Qo'shimcha joy uchun admin bilan bog'laning."
              ),
    };
  }

  const payload = {
    title: data.title,
    description: data.description,
    targetUrl: normalizeUrl(data.targetUrl),
    buttonLabel: (data.buttonLabel ?? "").trim(),
    imageUrl: (data.imageUrl ?? "").trim() || null,
    videoUrl: (data.videoUrl ?? "").trim() || null,
    audioUrl: (data.audioUrl ?? "").trim() || null,
    audioTitle: (data.audioTitle ?? "").trim() || null,
    contactType: data.contactType === "NONE" ? null : data.contactType,
    contactValue:
      data.contactType === "PHONE"
        ? normalizePhone(data.contactValue ?? "")
        : data.contactType === "TELEGRAM"
          ? normalizeTelegram(data.contactValue ?? "")
          : null,
    status: "PENDING",
    startsAt: null,
    endsAt: null,
    adminNote: null,
  };

  if (adId) {
    const existing = await prisma.ad.findFirst({
      where: { id: adId, userId: user.id },
    });
    if (!existing) {
      return { ok: false as const, error: t("Reklama topilmadi") };
    }
    if (existing.status !== "REJECTED") {
      return {
        ok: false as const,
        error: t("Faqat rad etilgan arizani qayta yuborish mumkin"),
      };
    }
    const otherPending = await prisma.ad.findFirst({
      where: { userId: user.id, status: "PENDING", id: { not: adId } },
      select: { id: true },
    });
    if (otherPending) {
      return {
        ok: false as const,
        error: t("Sizda ko'rib chiqilayotgan ariza bor."),
      };
    }
    await prisma.ad.update({ where: { id: adId }, data: payload });
  } else {
    const pending = await prisma.ad.findFirst({
      where: { userId: user.id, status: "PENDING" },
      select: { id: true },
    });
    if (pending) {
      return {
        ok: false as const,
        error: t("Sizda ko'rib chiqilayotgan ariza bor."),
      };
    }
    await prisma.ad.create({ data: { userId: user.id, ...payload } });
  }

  revalidateAdSurfaces(user.username);
  return { ok: true as const };
}

/** Admin: approve (start 30 days) or reject an ad request. */
export async function reviewAd(
  adId: string,
  decision: "approve" | "reject",
  note?: string
) {
  await requireAdmin();
  const t = await getT();

  const ad = await prisma.ad.findUnique({ where: { id: adId } });
  if (!ad) return { ok: false as const, error: t("Reklama topilmadi") };

  if (decision === "approve") {
    const now = new Date();
    await prisma.ad.update({
      where: { id: adId },
      data: {
        status: "APPROVED",
        startsAt: now,
        endsAt: new Date(now.getTime() + AD_DURATION_DAYS * DAY),
        adminNote: note?.trim() || null,
      },
    });
  } else {
    await prisma.ad.update({
      where: { id: adId },
      data: {
        status: "REJECTED",
        adminNote: note?.trim() || null,
      },
    });
  }

  revalidateAdSurfaces();
  return { ok: true as const, decision };
}

/** Admin: add more days to a running (or expired) ad. */
export async function extendAd(adId: string, days: number) {
  await requireAdmin();
  const t = await getT();

  if (!Number.isInteger(days) || days < 1 || days > 365) {
    return { ok: false as const, error: t("Kun soni noto'g'ri") };
  }

  const ad = await prisma.ad.findUnique({ where: { id: adId } });
  if (!ad) return { ok: false as const, error: t("Reklama topilmadi") };

  const now = new Date();
  const running = !!ad.endsAt && ad.endsAt.getTime() > now.getTime();
  const base = running && ad.endsAt ? ad.endsAt : now;

  await prisma.ad.update({
    where: { id: adId },
    data: {
      status: "APPROVED",
      startsAt: running ? ad.startsAt ?? now : now,
      endsAt: new Date(base.getTime() + days * DAY),
    },
  });

  revalidateAdSurfaces();
  return {
    ok: true as const,
    endsAt: new Date(base.getTime() + days * DAY).toISOString(),
  };
}

/** Admin: grant (or take away) extra ad placements for a user. */
export async function grantAdSlot(userId: string, delta = 1) {
  await requireAdmin();
  const t = await getT();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { adSlots: true },
  });
  if (!user) return { ok: false as const, error: t("Foydalanuvchi topilmadi") };

  const slots = Math.min(50, Math.max(1, user.adSlots + delta));
  await prisma.user.update({ where: { id: userId }, data: { adSlots: slots } });

  revalidateAdSurfaces();
  return { ok: true as const, slots };
}

/** Admin: delete an ad entirely. */
export async function deleteAd(adId: string) {
  await requireAdmin();
  const t = await getT();

  const ad = await prisma.ad.findUnique({ where: { id: adId } });
  if (!ad) return { ok: false as const, error: t("Reklama topilmadi") };

  await prisma.ad.delete({ where: { id: adId } });
  revalidateAdSurfaces();
  return { ok: true as const };
}

export type AdminAd = {
  id: string;
  title: string;
  description: string;
  targetUrl: string;
  buttonLabel: string;
  imageUrl: string | null;
  videoUrl: string | null;
  audioUrl: string | null;
  contactType: string | null;
  contactValue: string | null;
  status: AdStatus;
  startsAt: string | null;
  endsAt: string | null;
  adminNote: string | null;
  createdAt: string;
  user: {
    id: string;
    username: string | null;
    name: string;
    image: string | null;
    isVerified: boolean;
    adSlots: number;
  };
};

/** Admin: every ad request, newest first. */
export async function adminListAds(): Promise<AdminAd[]> {
  await requireAdmin();

  const ads = await prisma.ad.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
          isVerified: true,
          adSlots: true,
        },
      },
    },
  });

  return ads.map((ad) => ({
    id: ad.id,
    title: ad.title,
    description: ad.description,
    targetUrl: ad.targetUrl,
    buttonLabel: ad.buttonLabel,
    imageUrl: ad.imageUrl,
    videoUrl: ad.videoUrl,
    audioUrl: ad.audioUrl,
    contactType: ad.contactType,
    contactValue: ad.contactValue,
    status: displayStatus(ad.status, ad.endsAt),
    startsAt: ad.startsAt ? ad.startsAt.toISOString() : null,
    endsAt: ad.endsAt ? ad.endsAt.toISOString() : null,
    adminNote: ad.adminNote,
    createdAt: ad.createdAt.toISOString(),
    user: ad.user,
  }));
}
