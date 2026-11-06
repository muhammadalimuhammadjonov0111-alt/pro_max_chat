import { NextRequest, NextResponse } from "next/server";
import { decidePayment } from "@/lib/payment-core";
import { prisma } from "@/lib/prisma";
import { getTelegramConfig, registerTelegramWebhook } from "@/lib/telegram";

// Telegram webhook: admin Telegram ichidan to'lovni tasdiqlash/rad etish.
// URL: https://<sizning-domain>/api/telegram/webhook
// Sozlama: .env da TELEGRAM_WEBHOOK_SECRET (ixtiyoriy) + NEXT_PUBLIC_APP_URL
//
// GET  — holatni tekshirish + webhookni ro'yxatdan o'tkazish (almashtirish).
// POST — Telegram Update (message / callback_query) qabul qilish.

type TgMessage = {
  text?: string;
  chat?: { id?: number };
  message_id?: number;
};
type TgCallback = {
  id?: string;
  data?: string;
  message?: TgMessage;
  from?: { id?: number };
};
type TgUpdate = {
  message?: TgMessage;
  callback_query?: TgCallback;
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET() {
  const { token, chatId } = getTelegramConfig();
  const configured = Boolean(token && chatId);
  if (!configured) {
    return NextResponse.json({ ok: false, telegramConfigured: false });
  }
  // Webhookni avtomatik ro'yxatdan o'tkazib ko'ramiz (domain ochiq bo'lishi shart).
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (appUrl && !appUrl.includes("localhost")) {
    try {
      const reg = await registerTelegramWebhook(`${appUrl}/api/telegram/webhook`);
      return NextResponse.json({
        ok: true,
        telegramConfigured: true,
        webhookRegistered: reg,
        webhookUrl: `${appUrl}/api/telegram/webhook`,
        hint: "Botga /start bering. To'lov xabarlaridagi tugmalar shu webhook orqali ishlaydi.",
      });
    } catch {
      return NextResponse.json({
        ok: true,
        telegramConfigured: true,
        webhookRegistered: false,
      });
    }
  }
  return NextResponse.json({
    ok: true,
    telegramConfigured: true,
    webhookRegistered: false,
    hint: "Webhook faqat ommaviy domain (NEXT_PUBLIC_APP_URL https://...) bilan ishlaydi. Lokal uchun test: Admin panel → «Telegramni tekshirish».",
  });
}

export async function POST(req: NextRequest) {
  const secret = getTelegramConfig().secret;
  if (secret) {
    const header = req.headers.get("x-telegram-bot-api-secret-token");
    if (header !== secret) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }
  }

  let update: TgUpdate;
  try {
    update = (await req.json()) as TgUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const { token, chatId } = getTelegramConfig();
  if (!token || !chatId) return NextResponse.json({ ok: true });

  const adminChatId = String(chatId);

  async function tgApi(method: string, body: Record<string, unknown>): Promise<boolean> {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async function sendText(chatIdStr: string, text: string) {
    await tgApi("sendMessage", {
      chat_id: chatIdStr,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
  }

  // --- callback_query: Tasdiqlash / Rad etish tugmalari ---
  const cb = update.callback_query;
  if (cb?.data) {
    const from = String(cb.from?.id ?? "");
    const isAdmin = from === adminChatId;
    const cbId = cb.id ?? "";
    if (!isAdmin) {
      await tgApi("answerCallbackQuery", {
        callback_query_id: cbId,
        text: "Faqat admin tasdiqlashi mumkin.",
        show_alert: true,
      });
      return NextResponse.json({ ok: true });
    }

    const [action, paymentId] = cb.data.split(":");
    const approve = action === "pay_approve";
    if (!paymentId || (action !== "pay_approve" && action !== "pay_reject")) {
      await tgApi("answerCallbackQuery", { callback_query_id: cbId, text: "Noto'g'ri buyurtma" });
      return NextResponse.json({ ok: true });
    }

    const result = await decidePayment(paymentId, approve, undefined);
    if (!result.ok) {
      await tgApi("answerCallbackQuery", {
        callback_query_id: cbId,
        text: result.error ?? "Bu so'rov allaqachon ko'rib chiqilgan",
        show_alert: true,
      });
      return NextResponse.json({ ok: true });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: { select: { id: true, username: true, name: true, email: true } } },
    });
    const label = payment
      ? `${payment.user.name} (@${payment.user.username ?? "—"}) · ${payment.amount.toLocaleString("ru-RU").replace(/,/g, " ")} so'm · ${payment.method === "click" ? "Click" : "Payme"} · <code>${payment.comment ?? "—"}</code>`
      : paymentId;

    await tgApi("answerCallbackQuery", {
      callback_query_id: cbId,
      text: approve ? "✅ Tasdiqlandi" : "❌ Rad etildi",
    });

    // Original xabar rasm (photo) bo'lsa caption ni yangilaymiz, aks holda matnni.
    const msg = cb.message;
    if (msg?.chat?.id && msg.message_id) {
      const editCaption = approve
        ? `✅ <b>TO'LOV TASDIQLANDI (Telegram)</b>\n${escapeHtml(label)}\nPremium avtomatik yoqildi.`
        : `❌ <b>TO'LOV RAD ETILDI (Telegram)</b>\n${escapeHtml(label)}`;
      const editedAsCaption = await tgApi("editMessageCaption", {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        caption: editCaption,
        parse_mode: "HTML",
      });
      // Agar caption sifatida o'zgarmasa (matnli xabar bo'lsa), matn sifatida ham urinamiz.
      if (editedAsCaption !== true) {
        await tgApi("editMessageText", {
          chat_id: msg.chat.id,
          message_id: msg.message_id,
          text: editCaption,
          parse_mode: "HTML",
        });
      }
    }

    // Natijani RASM sifatida ham yuboramiz (chiroyli dizayn).
    try {
      if (payment) {
        const price = (await import("@/lib/types")).PREMIUM_PRICES[payment.plan as "monthly" | "yearly"];
        const { sendPaymentResultTelegram } = await import("@/lib/telegram");
        const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
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
      /* fallback matn quyida */
    }
    return NextResponse.json({ ok: true });
  }

  // --- message: /start va yordam ---
  const msg = update.message;
  if (msg?.text && msg.chat?.id) {
    const chatIdStr = String(msg.chat.id);
    const isAdmin = chatIdStr === adminChatId;
    if (msg.text.trim() === "/start") {
      if (isAdmin) {
        await sendText(
          chatIdStr,
          `👋 Salom, Admin!\n\n` +
            `Bot saytga ulangan. Yangi to'lov va cheklar shu yerga tushadi.\n` +
            `Xabar tugmalaridan Premiumni to'g'ridan-to'g'ri tasdiqlashingiz mumkin.\n\n` +
            `Bu chat_id: <code>${escapeHtml(chatIdStr)}</code>`
        );
      } else {
        await sendText(
          chatIdStr,
          `👋 Salom! Bu bot faqat admin bildirishnomalari uchun.\n` +
            `To'lov qilish uchun saytdagi Premium sahifasini foydalaning.`
        );
      }
    } else if (isAdmin && msg.text.trim() === "/status") {
      const [users, premium, pending, paid, revenueAgg, recent] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isPremium: true } }),
        prisma.payment.count({ where: { status: "pending" } }),
        prisma.payment.count({ where: { status: "paid" } }),
        prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "paid" } }),
        prisma.payment.findMany({
          orderBy: { createdAt: "desc" },
          take: 5,
          include: { user: { select: { username: true, name: true } } },
        }),
      ]);
      const revenue = revenueAgg._sum.amount ?? 0;
      const recentLines = recent
        .map(
          (p) =>
            `• ${escapeHtml(p.user.name)} (@${escapeHtml(p.user.username ?? "—")}) — ${p.amount.toLocaleString("ru-RU").replace(/,/g, " ")} so'm — ${escapeHtml(p.status)} — <code>${escapeHtml(p.comment ?? "—")}</code>`
        )
        .join("\n");
      await sendText(
        chatIdStr,
        `📊 <b>Sayt — haqiqiy ma'lumotlar:</b>\n` +
          `• Foydalanuvchilar: ${users}\n` +
          `• Premium faol: ${premium}\n` +
          `• Kutilmoqda: ${pending}\n` +
          `• Tasdiqlangan: ${paid}\n` +
          `• Umumiy tushum: ${revenue.toLocaleString("ru-RU").replace(/,/g, " ")} so'm\n\n` +
          `<b>🕐 Oxirgi 5 to'lov:</b>\n${recentLines || "Hali to'lov yo'q"}\n\n` +
          `Buyruqlar:\n/start — salom\n/status — statistikalar\n/payments — kutilayotganlar ro'yxati\n/help — yordam`
      );
    } else if (isAdmin && msg.text.trim() === "/payments") {
      const pendings = await prisma.payment.findMany({
        where: { status: "pending" },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { user: { select: { username: true, name: true, email: true } } },
      });
      if (pendings.length === 0) {
        await sendText(chatIdStr, `✅ Kutilayotgan to'lov yo'q.`);
      } else {
        const lines = pendings.map(
          (p, i) =>
            `${i + 1}. ${escapeHtml(p.user.name)} (@${escapeHtml(p.user.username ?? "—")})\n` +
            `   📧 ${escapeHtml(p.user.email)}\n` +
            `   💰 ${p.amount.toLocaleString("ru-RU").replace(/,/g, " ")} so'm · ${p.method === "click" ? "Click" : "Payme"} · <code>${escapeHtml(p.comment ?? "—")}</code>\n` +
            `   🆔 <code>${escapeHtml(p.id)}</code>${p.receiptUrl ? `\n   🧾 Chek: <a href="${escapeHtml((process.env.NEXT_PUBLIC_APP_URL ?? "") + p.receiptUrl)}">ochish</a> ✅` : "\n   🧾 Chek: hali yo'q"}`
        );
        await sendText(
          chatIdStr,
          `⏳ <b>Kutilayotgan to'lovlar (${pendings.length} ta):</b>\n\n${lines.join("\n\n")}\n\n` +
            `Tasdiqlash uchun yuqoridagi xabar tugmalarini bosing yoki Admin panelni oching.`
        );
      }
    } else if (isAdmin && (msg.text.trim() === "/help" || msg.text.trim() === "/menu")) {
      await sendText(
        chatIdStr,
        `🤖 <b>Gidgogram Admin Bot</b>\n\n` +
          `Buyruqlar:\n` +
          `/start — salom / ulanganligini tekshirish\n` +
          `/status — sayt statistikasi (haqiqiy ma'lumotlar)\n` +
          `/payments — kutilayotgan to'lovlar ro'yxati\n` +
          `/help — shu yordam\n\n` +
          `Tugmalar: har bir to'lov xabaridagi ✅ Tasdiqlash / ❌ Rad etish — to'g'ridan-to'g'ri shu yerdan Premium yoqiladi.`
      );
    } else if (isAdmin && msg.text.trim().startsWith("/user ")) {
      const q = msg.text.trim().slice(6).trim().replace(/^@/, "");
      const found = await prisma.user.findFirst({
        where: { username: q },
        include: {
          _count: { select: { posts: true, followers: true, following: true } },
          payments: { orderBy: { createdAt: "desc" }, take: 5 },
        },
      });
      if (!found) {
        await sendText(chatIdStr, `🔍 @${escapeHtml(q)} topilmadi.`);
      } else {
        const payLines = found.payments
          .map(
            (p) =>
              `• ${p.amount.toLocaleString("ru-RU").replace(/,/g, " ")} so'm · ${p.method} · ${escapeHtml(p.status)} · <code>${escapeHtml(p.comment ?? "—")}</code> · ${new Date(p.createdAt).toLocaleString("uz-UZ")}`
          )
          .join("\n");
        await sendText(
          chatIdStr,
          `👤 <b>${escapeHtml(found.name)} (@${escapeHtml(found.username ?? "—")})</b>\n` +
            `📧 Email: <code>${escapeHtml(found.email)}</code>\n` +
            `🆔 ID: <code>${escapeHtml(found.id)}</code>\n` +
            `📅 Ro'yxatdan: ${new Date(found.createdAt).toLocaleString("uz-UZ")}\n` +
            `👑 Premium: ${found.isPremium ? "✅" : "❌"}${found.premiumUntil ? ` (${new Date(found.premiumUntil).toLocaleDateString("uz-UZ")})` : ""}\n` +
            `📊 Post: ${found._count.posts} · Obunachi: ${found._count.followers} · Obuna: ${found._count.following}\n\n` +
            `<b>💳 Oxirgi to'lovlar:</b>\n${payLines || "Hali to'lov yo'q"}`
        );
      }
    }
  }

  return NextResponse.json({ ok: true });
}
