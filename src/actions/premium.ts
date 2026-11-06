"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import { PREMIUM_PRICES, type Plan } from "@/lib/types";
import {
  buildPaymentLink,
  generatePaymentComment,
  getPaymentConfig,
  isPaymentsConfigured,
  type PaymentMethod,
} from "@/lib/payment-links";
import { sendPaymentNotification, sendPaymentReceiptTelegram, sendTelegramText, telegramConfigured, testTelegramConnection } from "@/lib/telegram";
import { decidePayment } from "@/lib/payment-core";

const DAY = 24 * 60 * 60 * 1000;

/** Haqiqiy kuzatuv ma'lumotlari: IP + qurilma (Telegramga avtomatik formatda). */
async function getClientMeta(): Promise<{ ip: string | null; userAgent: string | null }> {
  try {
    const h = await headers();
    const xff = h.get("x-forwarded-for");
    const xreal = h.get("x-real-ip");
    const ip = (xff?.split(",").map((s) => s.trim()).filter(Boolean)[0] ?? xreal?.trim() ?? null);
    return { ip: ip || null, userAgent: h.get("user-agent") ?? null };
  } catch {
    return { ip: null, userAgent: null };
  }
}

/**
 * Yangi to'lov so'rovini yaratadi (shaxsiy kartaga tayyor havola bilan).
 *
 * Merchant emas: foydalanuvchi Click/Payme ilovasidan o'z kartasidan
 * admin kartasiga pul o'tkazadi, keyin admin Admin panelda tasdiqlaydi.
 * Premium faqat admin tasdiqlagach faollashadi.
 */
export async function createPayment(plan: Plan, method: PaymentMethod) {
  const user = await requireUser();
  const t = await getT();
  const price = PREMIUM_PRICES[plan];
  if (!price) return { ok: false, error: t("Noto'g'ri tarif tanlandi") };

  const cfg = getPaymentConfig();
  if (!isPaymentsConfigured()) {
    return {
      ok: false,
      error: t("To'lov tizimi hali sozlanmagan. Iltimos admin bilan bog'laning."),
    };
  }
  if (method !== "click" && method !== "payme") {
    return { ok: false, error: t("Noto'g'ri to'lov usuli") };
  }

  // 1) Avval Payment yozuvini yaratamiz, keyin id dan izoh kodini olamiz.
  const payment = await prisma.payment.create({
    data: {
      userId: user.id,
      plan,
      amount: price.amount,
      method,
      cardNumber: cfg.cardNumber,
      status: "pending",
    },
  });

  const comment = generatePaymentComment(payment.id);
  const providerUrl = buildPaymentLink(method, {
    cardNumber: cfg.cardNumber,
    amount: price.amount,
    comment,
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: { comment, providerUrl },
  });

  // 2) Adminga Telegram orqali xabar yuborish (token sozlanmagan bo'lsa skip).
  // Haqiqiy ma'lumotlar: foydalanuvchi emaili, oldingi to'lovlar, karta, kutilayotganlar.
  if (telegramConfigured()) {
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
      "http://localhost:3000";
    try {
      const [prevAgg, prevCount, pendingCount, meta] = await Promise.all([
        prisma.payment.aggregate({
          _sum: { amount: true },
          where: { userId: user.id, status: "paid" },
        }),
        prisma.payment.count({
          where: { userId: user.id, status: "paid" },
        }),
        prisma.payment.count({ where: { status: "pending" } }),
        getClientMeta(),
      ]);
      const sent = await sendPaymentNotification({
        paymentId: payment.id,
        username: user.username,
        userName: user.name,
        userId: user.id,
        email: user.email,
        userCreatedAt: user.createdAt ? user.createdAt.toISOString() : null,
        isPremium: user.isPremium,
        prevPaidCount: prevCount,
        prevPaidTotal: prevAgg._sum.amount ?? 0,
        planLabel: price.label,
        amount: price.amount,
        method,
        comment,
        appUrl,
        cardNumber: cfg.cardNumber,
        cardHolder: cfg.cardHolder || null,
        providerUrl,
        createdAt: payment.createdAt ? payment.createdAt.toISOString() : new Date().toISOString(),
        pendingCount,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
      if (sent) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { telegramSentAt: new Date() },
        });
      }
    } catch {
      /* xabar yuborilmadi — buyurtma baribir saqlanadi */
    }
  }

  revalidatePath("/premium");
  return {
    ok: true,
    paymentId: payment.id,
    providerUrl,
    comment,
    cardNumber: cfg.cardNumber,
    amount: price.amount,
    plan,
    method,
  };
}

/** Foydalanuvchi o'z to'lov tarixini ko'radi. */
export async function getMyPayments() {
  const user = await requireUser();
  return prisma.payment.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
}

/**
 * Foydalanuvchi to'lov chekini (rasm/skrinshot) yuklagach shu funksiyani chaqiradi.
 * receiptUrl — /api/upload dan olingan "/uploads/..." havola.
 * Chek adminga Telegram orqali rasm (sendPhoto) sifatida yuboriladi.
 */
export async function attachPaymentReceipt(paymentId: string, receiptUrl: string) {
  const user = await requireUser();
  const t = await getT();

  if (!receiptUrl || !receiptUrl.startsWith("/uploads/")) {
    return { ok: false, error: t("Chek fayli noto'g'ri") };
  }
  const name = receiptUrl.replace(/^\/uploads\//, "").split(/[?#]/)[0];
  if (!/^[A-Za-z0-9._-]+$/.test(name) || name.includes("..")) {
    return { ok: false, error: t("Chek fayli noto'g'ri") };
  }
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (!["jpg", "jpeg", "png", "webp", "gif", "pdf"].includes(ext)) {
    return { ok: false, error: t("Faqat rasm (JPG/PNG) yoki PDF chek yuklang") };
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { user: { select: { id: true, username: true, name: true, email: true } } },
  });
  if (!payment) return { ok: false, error: t("To'lov topilmadi") };
  if (payment.userId !== user.id) {
    return { ok: false, error: t("Bu to'lov sizniki emas") };
  }
  if (payment.status !== "pending") {
    return { ok: false, error: t("Bu so'rov allaqachon ko'rib chiqilgan") };
  }

  await prisma.payment.update({
    where: { id: paymentId },
    data: { receiptUrl },
  });

  // Chekni Telegramga yuborish (fire-and-forget, buyurtma baribir saqlanadi).
  // Haqiqiy ma'lumotlar: email, oldingi to'lovlar, karta, kutilayotganlar, IP/device.
  let telegramOk = false;
  if (telegramConfigured()) {
    const price = PREMIUM_PRICES[payment.plan as Plan];
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
      "http://localhost:3000";
    const [prevAgg, prevCount, pendingCount, fullUser, meta] = await Promise.all([
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { userId: payment.userId, status: "paid" },
      }),
      prisma.payment.count({
        where: { userId: payment.userId, status: "paid" },
      }),
      prisma.payment.count({ where: { status: "pending" } }),
      prisma.user.findUnique({
        where: { id: payment.userId },
        select: { email: true, createdAt: true, isPremium: true },
      }),
      getClientMeta(),
    ]);
    telegramOk = await sendPaymentReceiptTelegram({
      paymentId: payment.id,
      username: payment.user.username,
      userName: payment.user.name,
      userId: payment.userId,
      email: fullUser?.email ?? payment.user.email ?? null,
      userCreatedAt: fullUser?.createdAt ? fullUser.createdAt.toISOString() : null,
      isPremium: fullUser?.isPremium ?? false,
      prevPaidCount: prevCount,
      prevPaidTotal: prevAgg._sum.amount ?? 0,
      planLabel: price?.label ?? payment.plan,
      amount: payment.amount,
      method: payment.method,
      comment: payment.comment ?? "",
      appUrl,
      cardNumber: payment.cardNumber ?? null,
      cardHolder: null,
      providerUrl: payment.providerUrl ?? null,
      createdAt: payment.createdAt ? payment.createdAt.toISOString() : null,
      pendingCount,
      ip: meta.ip,
      userAgent: meta.userAgent,
      receiptUrl,
      receiptFileName: name,
    });
    if (telegramOk) {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { receiptTelegramSentAt: new Date() },
      });
    }
  }

  revalidatePath("/premium");
  revalidatePath("/admin-panel");
  return {
    ok: true,
    telegramSent: telegramOk,
    message: telegramOk
      ? t("Chekingiz admunga Telegram orqali yuborildi")
      : t("Chek saqlandi. Admin panelda ko'rinadi."),
  };
}

/** Admin: Telegram ulanishini tekshirish (test xabar yuboradi). */
export async function testTelegram() {
  await requireAdmin();
  const res = await testTelegramConnection();
  return res;
}

/**
 * Admin: to'lov xabarini Telegramga qayta yuborish.
 * Avto yuborish muvaffaqiyatsiz bo'lsa shu tugma bilan qayta urinish mumkin.
 */
export async function resendPaymentToTelegram(paymentId: string) {
  await requireAdmin();
  const t = await getT();
  if (!telegramConfigured()) {
    return { ok: false, error: t("Telegram hali sozlanmagan") };
  }
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { user: { select: { id: true, username: true, name: true, email: true, createdAt: true, isPremium: true } } },
  });
  if (!payment) return { ok: false, error: t("To'lov topilmadi") };

  const price = PREMIUM_PRICES[payment.plan as Plan];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  const [prevAgg, prevCount, pendingCount] = await Promise.all([
    prisma.payment.aggregate({ _sum: { amount: true }, where: { userId: payment.userId, status: "paid" } }),
    prisma.payment.count({ where: { userId: payment.userId, status: "paid" } }),
    prisma.payment.count({ where: { status: "pending" } }),
  ]);

  const base = {
    paymentId: payment.id,
    username: payment.user.username,
    userName: payment.user.name,
    userId: payment.userId,
    email: payment.user.email,
    userCreatedAt: payment.user.createdAt ? payment.user.createdAt.toISOString() : null,
    isPremium: payment.user.isPremium,
    prevPaidCount: prevCount,
    prevPaidTotal: prevAgg._sum.amount ?? 0,
    planLabel: price?.label ?? payment.plan,
    amount: payment.amount,
    method: payment.method,
    comment: payment.comment ?? "",
    appUrl,
    cardNumber: payment.cardNumber ?? null,
    cardHolder: null,
    providerUrl: payment.providerUrl ?? null,
    createdAt: payment.createdAt ? payment.createdAt.toISOString() : null,
    pendingCount,
  };

  const sent = payment.receiptUrl
    ? await sendPaymentReceiptTelegram({ ...base, receiptUrl: payment.receiptUrl })
    : await sendPaymentNotification(base);

  if (sent) {
    await prisma.payment.update({
      where: { id: paymentId },
      data: payment.receiptUrl ? { receiptTelegramSentAt: new Date() } : { telegramSentAt: new Date() },
    });
  }
  revalidatePath("/admin-panel");
  return sent ? { ok: true } : { ok: false, error: t("Telegramga yuborib bo'lmadi") };
}

/**
 * Admin to'lovni tasdiqlaydi → Premium avtomatik faollashadi.
 * Rad etsa — buyurtma yopiladi, foydalanuvchiga bildirishnoma ketadi.
 * Har ikkala holatda admin Telegramiga avtomatik hisobot boradi.
 */
export async function confirmPayment(paymentId: string, approve: boolean) {
  const admin = await requireAdmin();
  const t = await getT();

  const result = await decidePayment(paymentId, approve, admin.id);
  if (!result.ok) {
    return { ok: false, error: result.error ? t(result.error) : t("To'lov topilmadi") };
  }

  // Admin paneldan tasdiqlanganda ham Telegramga avtomatik RASM hisobot yuborish.
  if (telegramConfigured()) {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { user: { select: { id: true, username: true, name: true, email: true } } },
      });
      if (payment) {
        const price = PREMIUM_PRICES[payment.plan as Plan];
        const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
        const { sendPaymentResultTelegram } = await import("@/lib/telegram");
        await sendPaymentResultTelegram({
          paymentId: payment.id,
          username: payment.user.username,
          userName: payment.user.name,
          userId: payment.userId,
          email: payment.user.email,
          planLabel: price?.label ?? payment.plan,
          amount: payment.amount,
          method: payment.method,
          comment: payment.comment ?? "",
          appUrl,
          createdAt: payment.createdAt ? payment.createdAt.toISOString() : new Date().toISOString(),
          approved: approve,
        });
      }
    } catch {
      /* xabar yuborilmadi — tasdiqlash baribir bajarildi */
    }
  }

  // decidePayment da t() qo'llanilmagan — xabarlarni qo'lda beramiz
  revalidatePath("/admin-panel");
  revalidatePath("/premium");
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (payment?.userId && payment.userId !== admin.id) {
    const owner = await prisma.user.findUnique({
      where: { id: payment.userId },
      select: { username: true },
    });
    if (owner?.username) revalidatePath(`/${owner.username}`);
  }
  return { ok: true, approved: approve };
}

/**
 * Demo to'lov (eski funksiya). Endi ishlatilmaydi — joyning
 * endi createPayment + admin tasdiqlashi egallaydi.
 * Kompatibilik uchun qoldirildi.
 */
export async function subscribePremium(plan: Plan, _card?: { number?: string }) {
  return {
    ok: false,
    error: "Yangi to'lov tizimi orqali to'lov qiling: avval so'rov yuboring, admin tasdiqlaydi.",
  };
}

/**
 * Post egasi o'z postidagi izoh muallifiga premium sovg'a qiladi.
 *
 * Shartlar: izoh mening postimda bo'lishi, muallifi menga obuna (follow)
 * bo'lgan bo'lishi va o'zim bo'lmasligi kerak.
 */
const GIFT_PREMIUM_DAYS = 30;

export async function grantPremiumFromComment(commentId: string) {
  const user = await requireUser();
  const t = await getT();

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      userId: true,
      post: { select: { userId: true } },
    },
  });
  if (!comment) return { ok: false, error: t("Izoh topilmadi") };

  if (comment.post.userId !== user.id) {
    return {
      ok: false,
      error: t("Faqat o'z postingizdagi izohlarga premium bera olasiz"),
    };
  }
  if (comment.userId === user.id) {
    return { ok: false, error: t("O'zingizga premium bera olmaysiz") };
  }

  const target = await prisma.user.findUnique({
    where: { id: comment.userId },
    select: { isPremium: true },
  });
  if (!target) return { ok: false, error: t("Foydalanuvchi topilmadi") };
  if (target.isPremium) {
    return { ok: false, error: t("Bu foydalanuvchida premium allaqachon bor") };
  }

  const follows = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: comment.userId,
        followingId: user.id,
      },
    },
  });
  if (!follows) {
    return { ok: false, error: t("Foydalanuvchi sizga obuna bo'lmagan") };
  }

  const endsAt = new Date(Date.now() + GIFT_PREMIUM_DAYS * DAY);

  await prisma.user.update({
    where: { id: comment.userId },
    data: { isPremium: true, premiumUntil: endsAt },
  });

  await prisma.notification.create({
    data: {
      type: "premium",
      receiverId: comment.userId,
      actorId: user.id,
    },
  });

  revalidatePath("/");
  if (user.username) revalidatePath(`/${user.username}`);
  return { ok: true, endsAt: endsAt.toISOString() };
}

/** Cancels auto-renew. Access is kept until the current period ends. */
export async function cancelPremium() {
  const user = await requireUser();

  await prisma.subscription.updateMany({
    where: { userId: user.id, status: "active" },
    data: { status: "cancelled" },
  });

  revalidatePath("/premium");
  revalidatePath("/settings");
  return { ok: true };
}

export async function getMySubscriptions() {
  const user = await requireUser();
  return prisma.subscription.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
}
