/**
 * Shaxsiy plastik kartaga P2P (karta -> karta) to'lov so'rovi (merchant emas).
 *
 * Muhim: Click va Payme ommaviy veb-P2P havola (card+summa+izohni oldindan
 * to'ldirib beradigan URL) bermaydi. Eski `https://click.uz/{karta}/{summa}`
 * formati 404 beradi — shuning uchun uni ishlatmaymiz.
 *
 * To'g'ri oqim:
 *   1. Foydalanuvchi Click/Payme ilovasini ochadi (click.uz / payme.uz).
 *   2. Karta raqami, summa va izoh kodini ilovada qo'lda kiritadi / nusxalaydi.
 *   3. Chek/skrinshotni saytga yuklaydi → Telegramga yuboriladi.
 *
 * CLICK_PAY_URI / PAYME_PAY_URI ga to'liq ilova havolasini yozish mumkin.
 * Agar ular bo'sh bo'lsa official sayt ishlatiladi.
 */

export type PaymentMethod = "click" | "payme";

export interface PaymentConfig {
  /** Shaxsiy karta raqami (faqat raqamlar, serverda .env dan). */
  cardNumber: string;
  /** Karta egasi ismi (ko'rsatish uchun, ixtiyoriy). */
  cardHolder: string;
  clickBase: string;
  clickUrl: string;
  paymeBase: string;
  paymeUrl: string;
}

export function getPaymentConfig(): PaymentConfig {
  const clickBase = (process.env.CLICK_PAY_URI ?? "https://click.uz").replace(/\/$/, "");
  const paymeBase = (process.env.PAYME_PAY_URI ?? "https://payme.uz").replace(/\/$/, "");
  return {
    cardNumber: (process.env.PAYMENT_CARD_NUMBER ?? "").replace(/\D/g, ""),
    cardHolder: process.env.PAYMENT_CARD_HOLDER ?? "",
    clickBase,
    clickUrl: clickBase.startsWith("http") ? clickBase : "https://click.uz",
    paymeBase,
    paymeUrl: paymeBase.startsWith("http") ? paymeBase : "https://payme.uz",
  };
}

export function isPaymentsConfigured(): boolean {
  return getPaymentConfig().cardNumber.length >= 12;
}

/** "8600 1234 5678 9012" ko'rinishida formatlash. */
export function formatCardNumber(card: string): string {
  const digits = card.replace(/\D/g, "");
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

/** UI'da to'liq karta o'rniga maskalangan ko'rinish (masalan buyurtma sahifasida). */
export function maskedCard(card: string): string {
  const digits = card.replace(/\D/g, "");
  if (digits.length < 4) return "****";
  return `**** **** **** ${digits.slice(-4)}`;
}

/**
 * To'lov sizni ilovaga olib chiqadigan Ishonchli havola.
 * Karta/summa/izoh URL ga yopishtirilmaydi (Click/Payme buni qo'llamaydi),
 * ular UI da nusxalab-olish tugmalari bilan beriladi.
 */
export function buildPaymentLink(
  method: PaymentMethod,
  _args: { cardNumber: string; amount: number; comment: string }
): string {
  const cfg = getPaymentConfig();
  return method === "click" ? cfg.clickUrl : cfg.paymeUrl;
}

/** Har bir to'lov so'roviga noyob, qisqa izoh kodi. */
export function generatePaymentComment(paymentId: string): string {
  // Payment id dan 6 ta belgi — admin kartada qaysi buyurtma ekanini tanaydi.
  return `GID-${paymentId.slice(-6).toUpperCase()}`;
}
