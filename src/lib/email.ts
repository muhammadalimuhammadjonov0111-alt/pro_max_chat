/**
 * Email yuborish yordamchisi (parol tiklash uchun).
 *
 * Agar SMTP sozlamalari bo'lsa — real email yuboriladi (nodemailer).
 * Agar bo'lmasa (lokal dev) — havola terminalga (console) chiqariladi,
 * shunda o'zingiz uni brauzerda ochishingiz mumkin.
 * Prod bu rejimda email yuborilmaydi (xabar logda ko'rinadi).
 */

export function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getSmtp() {
  return {
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? "587"),
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "noreply@gidgogram.uz",
    secure: (process.env.SMTP_SECURE ?? "").toLowerCase() === "true",
  };
}

export async function sendResetPasswordEmail(to: string, url: string): Promise<void> {
  const smtp = getSmtp();
  if (!smtpConfigured()) {
    // Dev fallback: havola server terminalida chiqadi.
    // Console logda token ochiq qoldiriladi — lokal test uchun.
    console.log(`\n=== [PAROL TIKLASH] ${to} ===`);
    console.log("Havola (brauzerda oching):", url);
    console.log("SMTP sozlanmagan — real email yuborilmadi. .env ga SMTP_* yozsangiz email boradi.\n");
    return;
  }

  const nodemailer = (await import("nodemailer")).default;
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure || smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  await transporter.sendMail({
    from: smtp.from,
    to,
    subject: "Gidgogram — parolni tiklash",
    text: `Parolizni tiklash uchun quyidagi havolani oching:\n${url}\n\nHavola 1 soat ichida tugaydi. Agar siz so'ramagan bo'lsangiz, ushbu xabarni e'tiborsiz qoldiring.`,
    html: `<p>Parolizni tiklash uchun:</p><p><a href="${url}"><b>Parolni tiklash</b></a></p><p>Havola 1 soat ichida tugaydi.</p>`,
  });
}
