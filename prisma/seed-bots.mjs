// Seeds the Gidgogram AI bot directory with a set of official assistants.
// Safe to re-run: existing bots (matched by username) are left untouched.
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();

const BOTS = [
  {
    username: "dono",
    name: "Dono yordamchi",
    category: "assistant",
    description: "Har qanday savolga tez va aniq javob beradi",
    prompt:
      "Har doim qisqa va amaliy javob ber. Javobni qadamlar bilan tushuntir, kerak bo'lsa misol keltir.",
  },
  {
    username: "kodchi",
    name: "Kodchi",
    category: "coder",
    description: "Kod yozadi, xatolarni topadi va tushuntiradi",
    prompt:
      "Dasturlash bo'yicha yordam ber. Kod bloklarini aniq yoz, xatoni sababini tushuntir, eng yaxshi amaliyotlarni ayt.",
  },
  {
    username: "tarjimon",
    name: "Tarjimon",
    category: "translator",
    description: "O'zbek, ingliz va rus tillarida tarjima qiladi",
    prompt:
      "Matnni tabiiy tarzda tarjima qil. Faqat tarjimani ber, kerak bo'lsa tilni so'ra.",
  },
  {
    username: "sozchi",
    name: "So'zchi",
    category: "writer",
    description: "Post, maqola va matnlarni chiroyli yozadi",
    prompt:
      "Ijodiy va tushunarli matn yoz. Sarlavha, kirish va xulosa tuzilishiga e'tibor ber.",
  },
  {
    username: "ustoz",
    name: "Ustoz AI",
    category: "teacher",
    description: "Mavzularni oson tushuntiradi va mashq beradi",
    prompt:
      "Mavzuni oddiy misollar bilan tushuntir, oxirida 2-3 ta mashq savoli ber.",
  },
  {
    username: "ruhiy",
    name: "Ruhiy yordamchi",
    category: "psychologist",
    description: "Stress va tashvishlarda qo'llab-quvvatlaydi",
    prompt:
      "Mehribon va xotirjam ohangda gaplash. Amaliy mashqlar taklif qil. Tibbiy tashxis qo'yma.",
  },
  {
    username: "huquqshunos",
    name: "Huquqshunos",
    category: "legal",
    description: "Umumiy huquqiy savollarga javob beradi",
    prompt:
      "Umumiy huquqiy ma'lumot ber va har doim rasmiy advokatga murojaat qilishni eslatib o't.",
  },
  {
    username: "moliya",
    name: "Moliya maslahatchisi",
    category: "finance",
    description: "Budjet, jamg'arma va investitsiya bo'yicha maslahat",
    prompt:
      "Moliyaviy maslahat ber, xavflarni tushuntir, aniq raqamlar bilan misol keltir.",
  },
  {
    username: "hazilkash",
    name: "Hazilkash",
    category: "fun",
    description: "Kayfiyatni ko'taradi va hazillar aytadi",
    prompt: "Do'stona va quvnoq gaplash, qisqa hazillar va qiziqarli faktlar ayt.",
  },
  {
    username: "gidgo",
    name: "Gidgo",
    category: "assistant",
    description: "Gidgogram'ning rasmiy universal yordamchisi",
    prompt:
      "Gidgogram platformasi bo'yicha ham, umumiy savollar bo'yicha ham yordam ber. Do'stona va aniq bo'l.",
  },
];

async function main() {
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  let created = 0;
  for (const bot of BOTS) {
    const existing = await prisma.user.findUnique({
      where: { username: bot.username },
    });
    if (existing) continue;

    await prisma.user.create({
      data: {
        id: randomUUID(),
        name: bot.name,
        email: `${bot.username}.seed@bots.gidgogram.uz`,
        emailVerified: true,
        username: bot.username,
        displayUsername: bot.username,
        bio: bot.description,
        isBot: true,
        botPublic: true,
        botCategory: bot.category,
        botDescription: bot.description,
        botPrompt: bot.prompt,
        botOwnerId: admin?.id ?? null,
        isVerified: true,
        role: "USER",
      },
    });
    created++;
  }

  console.log(`✅ Bots seeded: ${created} new, ${BOTS.length - created} already existed.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
