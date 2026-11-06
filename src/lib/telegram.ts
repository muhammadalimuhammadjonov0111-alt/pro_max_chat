/**
 * Telegram bot orqali admin ga xabar yuborish (to'lov so'rovlari + cheklar).
 *
 * Sozlama (.env):
 *   TELEGRAM_BOT_TOKEN      — BotFather dan olingan bot tokeni (maxfiy)
 *   TELEGRAM_ADMIN_CHAT_ID  — xabar boradigan chat (admin ning chat_id si)
 *   TELEGRAM_WEBHOOK_SECRET — webhook maxfiyligi (ixtiyoriy, tavsiya etiladi)
 *   NEXT_PUBLIC_APP_URL     — sayt manzili (havolalar uchun)
 *
 * Xavfsizlik: token hech qachon mijozga (client) yuborilmaydi,
 * faqat server action / webhook ichida ishlatiladi.
 * To'liq karta raqami Telegramga yuborilmaydi (faqat maskalangan).
 */

import fs from "fs/promises";
import path from "path";
import { maskedCard, formatCardNumber } from "./payment-links";

export function telegramConfigured(): boolean {
  return Boolean(
    process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ADMIN_CHAT_ID
  );
}

export function getTelegramConfig() {
  return {
    token: process.env.TELEGRAM_BOT_TOKEN ?? "",
    chatId: process.env.TELEGRAM_ADMIN_CHAT_ID ?? "",
    secret: process.env.TELEGRAM_WEBHOOK_SECRET ?? "",
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface PaymentNotificationInput {
  paymentId: string;
  username: string | null;
  userName: string;
  userId?: string;
  email?: string | null;
  userCreatedAt?: string | null;
  isPremium?: boolean;
  prevPaidCount?: number;
  prevPaidTotal?: number;
  planLabel: string;
  amount: number;
  method: string;
  comment: string;
  appUrl: string;
  cardNumber?: string | null;
  cardHolder?: string | null;
  providerUrl?: string | null;
  createdAt?: string | null;
  pendingCount?: number;
  ip?: string | null;
  userAgent?: string | null;
  sessionId?: string | null;
}

function fmtSom(n: number): string {
  return n.toLocaleString("ru-RU").replace(/,/g, " ");
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("uz-UZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function buildPaymentText(input: PaymentNotificationInput, opts?: { isReceipt?: boolean }): string {
  const amount = fmtSom(input.amount);
  const methodLabel = input.method === "click" ? "Click" : "Payme";
  const now = input.createdAt ? fmtDate(input.createdAt) : fmtDate(new Date().toISOString());

  const title = opts?.isReceipt
    ? "🧾 <b>CHEK KELIB TUSHDI</b> // RECEIPT INTERCEPTED"
    : "🚨 <b>TO'LOV ANIQLANDI</b> // PAYMENT INTERCEPTED";

  const lines: string[] = [
    `━━━━━━━━━━━━━━━━━━━━━`,
    `<code>◆ SYSTEM ALERT :: GIDGRAM-CORE</code>`,
    title,
    `━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `<code>[ TARGET :: FOYDALANUVCHI ]</code>`,
    `» <b>${escapeHtml(input.userName)}</b> (@${escapeHtml(input.username ?? "—")})`,
  ];
  if (input.userId) lines.push(`» ID      : <code>${escapeHtml(input.userId)}</code>`);
  if (input.email) lines.push(`» EMAIL   : <code>${escapeHtml(input.email)}</code>`);
  if (input.userCreatedAt) lines.push(`» RO'YXAT  : ${fmtDate(input.userCreatedAt)}`);
  lines.push(`» PREMIUM : ${input.isPremium ? "🟢 FAOL" : "🔴 YO'Q"}`);
  if (input.prevPaidCount !== undefined) {
    lines.push(
      `» TARIX   : ${input.prevPaidCount} ta · ${fmtSom(input.prevPaidTotal ?? 0)} so'm`
    );
  }
  if (input.ip) lines.push(`» IP      : <code>${escapeHtml(input.ip)}</code>`);
  if (input.userAgent) lines.push(`» DEVICE  : <code>${escapeHtml(input.userAgent.slice(0, 90))}</code>`);
  if (input.sessionId) lines.push(`» SESSION : <code>${escapeHtml(input.sessionId.slice(0, 32))}</code>`);
  lines.push(``);
  lines.push(`<code>[ PAYLOAD :: TO'LOV ]</code>`);
  lines.push(`» TARIF   : ${escapeHtml(input.planLabel)}`);
  lines.push(`» SUMMA   : <b>${amount} so'm</b>`);
  lines.push(`» USUL    : ${methodLabel} (karta → karta)`);
  lines.push(`» IZOH    : <code>${escapeHtml(input.comment)}</code>`);
  lines.push(`» BUYURTMA: <code>${escapeHtml(input.paymentId)}</code>`);
  if (input.cardNumber) {
    const masked = maskedCard(input.cardNumber);
    lines.push(`» KARTA   : <code>${escapeHtml(masked)}</code>`);
    lines.push(`» KARTA   : <code>${escapeHtml(formatCardNumber(input.cardNumber))}</code>`);
  }
  if (input.cardHolder) lines.push(`» EGA     : ${escapeHtml(input.cardHolder)}`);
  if (input.providerUrl) {
    lines.push(`» HAVOLA  : ${escapeHtml(input.providerUrl)}`);
  }
  lines.push(`» VAQT    : ${now} (Toshkent)`);
  if (input.pendingCount !== undefined) {
    lines.push(`» KUTILMOQ: ${input.pendingCount} ta`);
  }
  lines.push(``);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`<code>STATUS :: PENDING // TEKSHIRUV TALAB QILINADI</code>`);
  lines.push(`Pul tushganini tekshirib, pastdagi tugma yoki Admin paneldan tasdiqlang:`);
  lines.push(`${escapeHtml(input.appUrl)}/admin-panel`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);

  return lines.join("\n");
}

function paymentButtons(paymentId: string, opts?: { appUrl?: string; receiptUrl?: string | null }) {
  const rows: Array<Array<{ text: string; callback_data?: string; url?: string }>> = [
    [
      { text: "✅ Tasdiqlash", callback_data: `pay_approve:${paymentId}` },
      { text: "❌ Rad etish", callback_data: `pay_reject:${paymentId}` },
    ],
  ];
  if (opts?.appUrl) {
    rows.push([
      { text: "📋 Admin panelda ochish", url: `${opts.appUrl.replace(/\/$/, "")}/admin-panel` },
    ]);
  }
  if (opts?.receiptUrl) {
    const full = opts.receiptUrl.startsWith("http")
      ? opts.receiptUrl
      : `${(opts.appUrl ?? "").replace(/\/$/, "")}${opts.receiptUrl}`;
    rows.push([{ text: "🧾 Chekni ochish", url: full }]);
  }
  return { inline_keyboard: rows };
}

/**
 * Yangi to'lov so'rovi haqida adminga Telegram xabar yuboradi.
 * Birinchi urinish: chiroyli rasm (infografika) + qisqa caption + tugmalar.
 * Rasm yaratib bo'lmasa — to'liq matnli xabar (fallback).
 * Xato berib qo'yilsa ham buyurtma yaratilishi to'xtamaydi (fire-and-forget).
 */
export async function sendPaymentNotification(
  input: PaymentNotificationInput
): Promise<boolean> {
  const { token, chatId } = getTelegramConfig();
  if (!token || !chatId) return false;

  // 1) Avval chiroyli rasm bilan yuborishga harakat qilamiz.
  try {
    const { buildPaymentPng } = await import("./payment-image");
    const png = await buildPaymentPng({
      paymentId: input.paymentId,
      username: input.username,
      userName: input.userName,
      userId: input.userId,
      email: input.email,
      amount: input.amount,
      method: input.method,
      comment: input.comment,
      planLabel: input.planLabel,
      createdAt: input.createdAt,
      status: "PENDING // TEKSHIRUV TALAB QILINADI",
      isReceipt: false,
    });
    const form = new FormData();
    form.append("chat_id", chatId);
    form.append(
      "caption",
      `🚨 <b>TO'LOV ANIQLANDI</b>\n` +
        `👤 <b>${escapeHtml(input.userName)}</b> (@${escapeHtml(input.username ?? "—")})\n` +
        `💰 <b>${fmtSom(input.amount)} so'm</b> · ${input.method === "click" ? "Click" : "Payme"}\n` +
        `🏷 Izoh: <code>${escapeHtml(input.comment)}</code>\n` +
        `🆔 <code>${escapeHtml(input.paymentId)}</code>\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `To'liq ma'lumot rasmda. Tasdiqlash uchun pastdagi tugmani bosing.`,
    );
    form.append("parse_mode", "HTML");
    form.append("photo", new Blob([new Uint8Array(png)], { type: "image/png" }), `${input.paymentId}.png`);
    form.append("reply_markup", JSON.stringify(paymentButtons(input.paymentId, { appUrl: input.appUrl })));
    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: "POST",
      body: form,
    });
    if (res.ok) return true;
  } catch {
    /* fallback: pastda matn yuboramiz */
  }

  // 2) Fallback: matnli xabar.
  const text = buildPaymentText(input);

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
          reply_markup: paymentButtons(input.paymentId, { appUrl: input.appUrl }),
        }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * To'lov cheki (skrinshot/rasm) ni adminga Telegram orqali yuboradi.
 *
 * receiptUrl — saytdagi yuklangan fayl: "/uploads/<name>.jpg"
 * Fayl diskdan o'qilib sendPhoto sifatida yuboriladi (caption bilan).
 * Rasm emas (masalan PDF) bo'lsa sendDocument ishlatiladi.
 * Fayl topilmasa — havola bilan matn yuboriladi (fallback).
 */
export async function sendPaymentReceiptTelegram(
  input: PaymentNotificationInput & { receiptUrl: string; receiptFileName?: string }
): Promise<boolean> {
  const { token, chatId } = getTelegramConfig();
  if (!token || !chatId || !input.receiptUrl) return false;

  const caption = buildPaymentText(input, { isReceipt: true }).slice(0, 1000);

  // Faqat "/uploads/..." ko'rinishidagi fayllarni diskdan yuboramiz.
  const name = input.receiptUrl
    .replace(/^\/uploads\//, "")
    .split(/[?#]/)[0]
    .trim();

  const isSafeName = /^[A-Za-z0-9._-]+$/.test(name) && !name.includes("..");

  if (isSafeName) {
    try {
      const filePath = path.join(process.cwd(), "uploads", name);
      const dir = path.join(process.cwd(), "uploads");
      if (path.dirname(filePath) !== dir) throw new Error("bad path");

      const buffer = await fs.readFile(filePath);
      const ext = path.extname(name).toLowerCase();
      const isImage = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext);
      const mime =
        ext === ".png"
          ? "image/png"
          : ext === ".webp"
            ? "image/webp"
            : ext === ".gif"
              ? "image/gif"
              : ext === ".pdf"
                ? "application/pdf"
                : "image/jpeg";
      const fileName = `${input.paymentId}${ext || ".jpg"}`;

      const form = new FormData();
      form.append("chat_id", chatId);
      form.append("caption", caption);
      form.append("parse_mode", "HTML");
      form.append("photo", new Blob([new Uint8Array(buffer)], { type: mime }), fileName);
      // sendDocument uchun alohida field nomi kerak; sendPhoto API photo kutiladi.
      const apiMethod = isImage ? "sendPhoto" : "sendDocument";
      if (!isImage) {
        // sendDocument da "photo" emas "document" maydoni kutiladi — formni almashtiramiz
        form.delete("photo");
        form.append("document", new Blob([new Uint8Array(buffer)], { type: mime }), fileName);
      }
      form.append(
        "reply_markup",
        JSON.stringify(paymentButtons(input.paymentId, { appUrl: input.appUrl, receiptUrl: input.receiptUrl }))
      );

      const res = await fetch(`https://api.telegram.org/bot${token}/${apiMethod}`, {
        method: "POST",
        body: form,
      });
      if (res.ok) return true;
      // sendPhoto muvaffaqiyatsiz bo'lsa document fallback
      if (isImage) {
        try {
          const form2 = new FormData();
          form2.append("chat_id", chatId);
          form2.append("caption", caption);
          form2.append("parse_mode", "HTML");
          form2.append("document", new Blob([new Uint8Array(buffer)], { type: mime }), fileName);
          form2.append(
            "reply_markup",
            JSON.stringify(paymentButtons(input.paymentId, { appUrl: input.appUrl, receiptUrl: input.receiptUrl }))
          );
          const res2 = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
            method: "POST",
            body: form2,
          });
          if (res2.ok) return true;
        } catch {
          /* fallthrough fallback */
        }
      }
    } catch {
      /* fallthrough: fayl o'qilmadi — fallback xabar */
    }
  }

  // Fallback: fayl topilmasa, havola bilan matn yuboramiz.
  try {
    const appUrl = input.appUrl.replace(/\/$/, "");
    const full = `${appUrl}${input.receiptUrl.startsWith("/") ? "" : "/"}${input.receiptUrl}`;
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `${caption}\n\n🧾 Chek: ${escapeHtml(full)}`,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: paymentButtons(input.paymentId, { appUrl: input.appUrl, receiptUrl: input.receiptUrl }),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Umumiy matn yuborish (test / webhook javoblari uchun). */
export async function sendTelegramText(text: string): Promise<boolean> {
  const { token, chatId } = getTelegramConfig();
  if (!token || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Tasdiqlash/rad etish natijasi — chiroyli rasm sifatida (fallback: matn). */
export async function sendPaymentResultTelegram(input: PaymentNotificationInput & { approved: boolean }): Promise<boolean> {
  const { token, chatId } = getTelegramConfig();
  if (!token || !chatId) return false;

  try {
    const { buildResultPng } = await import("./payment-image");
    const png = await buildResultPng({
      paymentId: input.paymentId,
      username: input.username,
      userName: input.userName,
      userId: input.userId,
      email: input.email,
      amount: input.amount,
      method: input.method,
      comment: input.comment,
      planLabel: input.planLabel,
      createdAt: input.createdAt ?? new Date().toISOString(),
      approved: input.approved,
    });
    const form = new FormData();
    form.append("chat_id", chatId);
    form.append(
      "caption",
      input.approved
        ? `✅ <b>TO'LOV TASDIQLANDI</b>\n👤 <b>${escapeHtml(input.userName)}</b> (@${escapeHtml(input.username ?? "—")})\n💰 <b>${fmtSom(input.amount)} so'm</b> · ${input.method === "click" ? "Click" : "Payme"}\n🏷 <code>${escapeHtml(input.comment)}</code>\n👑 Premium yoqildi.`
        : `❌ <b>TO'LOV RAD ETILDI</b>\n👤 <b>${escapeHtml(input.userName)}</b> (@${escapeHtml(input.username ?? "—")})\n💰 <b>${fmtSom(input.amount)} so'm</b> · ${input.method === "click" ? "Click" : "Payme"}\n🏷 <code>${escapeHtml(input.comment)}</code>`,
    );
    form.append("parse_mode", "HTML");
    form.append("photo", new Blob([new Uint8Array(png)], { type: "image/png" }), `${input.paymentId}-result.png`);
    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: "POST", body: form });
    if (res.ok) return true;
  } catch {
    /* fallback */
  }

  // Fallback: matn
  const amount = fmtSom(input.amount);
  const text = input.approved
    ? `✅ <b>TO'LOV TASDIQLANDI (Admin panel)</b>\n\n👤 <b>${escapeHtml(input.userName)}</b> (@${escapeHtml(input.username ?? "—")})\n💰 <b>${amount} so'm</b> · ${input.method === "click" ? "Click" : "Payme"}\n🏷 <code>${escapeHtml(input.comment)}</code>\n🆔 <code>${escapeHtml(input.paymentId)}</code>\n👑 Premium yoqildi.`
    : `❌ <b>TO'LOV RAD ETILDI (Admin panel)</b>\n\n👤 <b>${escapeHtml(input.userName)}</b> (@${escapeHtml(input.username ?? "—")})\n💰 <b>${amount} so'm</b> · ${input.method === "click" ? "Click" : "Payme"}\n🏷 <code>${escapeHtml(input.comment)}</code>\n🆔 <code>${escapeHtml(input.paymentId)}</code>`;
  return sendTelegramText(text);
}

/** Statistika — chiroyli rasm sifatida (fallback: matn). */
export async function sendTelegramStatsImage(): Promise<boolean> {
  const { token, chatId } = getTelegramConfig();
  if (!token || !chatId) return false;
  try {
    const { prisma } = await import("./prisma");
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
    try {
      const me = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const meJson = me.ok ? await me.json() : null;
      const { buildStatsPng } = await import("./payment-image");
      const png = await buildStatsPng({
        users,
        premium,
        pending,
        paid,
        revenue,
        botUsername: meJson?.result?.username ?? "bot",
        recent: recent.map((p) => ({ name: p.user.name, username: p.user.username, amount: p.amount, status: p.status, comment: p.comment })),
      });
      const form = new FormData();
      form.append("chat_id", chatId);
      form.append(
        "caption",
        `📊 <b>SAYT STATISTIKASI — RASM</b>\n👥 ${users} · 👑 ${premium} · ⏳ ${pending} · ✅ ${paid}\n💰 Tushum: ${fmtSom(revenue)} so'm\n\nTo'liq ma'lumot rasmda.`,
      );
      form.append("parse_mode", "HTML");
      form.append("photo", new Blob([new Uint8Array(png)], { type: "image/png" }), "stats.png");
      const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: "POST", body: form });
      if (res.ok) return true;
    } catch {
      /* fallback matn */
    }
    // Fallback
    const text =
      `📊 <b>SAYT STATISTIKASI</b>\n👥 Foydalanuvchilar: ${users}\n👑 Premium: ${premium}\n⏳ Kutilmoqda: ${pending}\n✅ Tasdiqlangan: ${paid}\n💰 Tushum: ${fmtSom(revenue)} so'm`;
    return sendTelegramText(text);
  } catch {
    return false;
  }
}

/** Bot tokeni va chat_id to'g'ri ulanganini tekshirish + haqiqiy statistika. */
export async function testTelegramConnection(): Promise<{
  ok: boolean;
  botUsername?: string;
  error?: string;
}> {
  const { token, chatId } = getTelegramConfig();
  if (!token || !chatId) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN yoki TELEGRAM_ADMIN_CHAT_ID sozlanmagan" };
  }
  try {
    const me = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    if (!me.ok) return { ok: false, error: "Bot tokeni noto'g'ri (getMe muvaffaqiyatsiz)" };
    const meJson = (await me.json()) as { result?: { username?: string } };

    // Haqiqiy ma'lumotlar: sayt statistikasi — RASM bilan (fallback: matn).
    let sent = false;
    try {
      sent = await sendTelegramStatsImage();
    } catch {
      sent = false;
    }
    if (!sent) {
      const text =
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `<code>◆ SYSTEM :: TELEGRAM ULANISH TEKSHIRILDI</code>\n` +
        `🟢 <b>Ulanishda muvaffaqiyatli</b>\n` +
        `» Bot  : @${escapeHtml(meJson.result?.username ?? "bot")}\n` +
        `» Vaqt : ${new Date().toLocaleString("uz-UZ")} (Toshkent)\n` +
        `━━━━━━━━━━━━━━━━━━━━━`;
      sent = await sendTelegramText(text);
    }
    if (!sent) {
      return {
        ok: false,
        botUsername: meJson.result?.username,
        error: "Test xabar yuborib bo'lmadi. Botga /start berilganini va chat_id to'g'riligini tekshiring (bot admin bilan suhbat boshlagan bo'lishi kerak).",
      };
    }
    return { ok: true, botUsername: meJson.result?.username };
  } catch {
    return { ok: false, error: "Telegram API ga bog'lanib bo'lmadi" };
  }
}

/** Webhookni ro'yxatdan o'tkazish (setWebhook). */
export async function registerTelegramWebhook(webhookUrl: string): Promise<boolean> {
  const { token, secret } = getTelegramConfig();
  if (!token || !webhookUrl) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["message", "callback_query"],
        ...(secret ? { secret_token: secret } : {}),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
