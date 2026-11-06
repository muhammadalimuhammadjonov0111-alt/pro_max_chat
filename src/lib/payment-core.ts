import { prisma } from "@/lib/prisma";
import { PREMIUM_PRICES, type Plan } from "@/lib/types";

const DAY = 24 * 60 * 60 * 1000;

export async function activatePremiumForUser(
  userId: string,
  plan: Plan,
  amount: number
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  const now = new Date();
  const base =
    user.premiumUntil && user.premiumUntil.getTime() > now.getTime()
      ? user.premiumUntil
      : now;
  const endsAt = new Date(base.getTime() + PREMIUM_PRICES[plan].days * DAY);
  await prisma.subscription.create({
    data: { userId, plan, amount, status: "active", endsAt },
  });
  await prisma.user.update({
    where: { id: userId },
    data: { isPremium: true, premiumUntil: endsAt },
  });
  return endsAt;
}

/**
 * To'lovni tasdiqlash/rad etishning yagona markazi.
 * Admin paneldan ham, Telegram inline tugmalaridan ham shu funksiya chaqiriladi.
 * confirmedById — Telegram dan tasdiqlanganda null bo'lishi mumkin (bot).
 */
export async function decidePayment(
  paymentId: string,
  approve: boolean,
  confirmedById?: string | null
): Promise<{ ok: boolean; error?: string }> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return { ok: false, error: "To'lov topilmadi" };
  if (payment.status !== "pending") {
    return { ok: false, error: "Bu so'rov allaqachon ko'rib chiqilgan" };
  }

  if (approve) {
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "paid",
        confirmedAt: new Date(),
        confirmedById: confirmedById ?? undefined,
      },
    });
    await activatePremiumForUser(payment.userId, payment.plan as Plan, payment.amount);
    if (confirmedById) {
      await prisma.notification.create({
        data: {
          type: "premium",
          receiverId: payment.userId,
          actorId: confirmedById,
        },
      });
    } else {
      // Telegram orqali tasdiqlanganda — adminni topib notification yuboramiz
      const admin = await prisma.user.findFirst({
        where: { role: "ADMIN" },
        select: { id: true },
      });
      if (admin) {
        await prisma.notification.create({
          data: {
            type: "premium",
            receiverId: payment.userId,
            actorId: admin.id,
          },
        });
      }
    }
  } else {
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "rejected",
        confirmedAt: new Date(),
        confirmedById: confirmedById ?? undefined,
        rejectReason: "To'lov tasdiqlanmadi",
      },
    });
    const actorId =
      confirmedById ??
      (await prisma.user
        .findFirst({ where: { role: "ADMIN" }, select: { id: true } })
        .then((a) => a?.id ?? payment.userId)) ??
      payment.userId;
    await prisma.notification.create({
      data: {
        type: "premium_rejected",
        receiverId: payment.userId,
        actorId,
      },
    });
  }

  return { ok: true };
}
