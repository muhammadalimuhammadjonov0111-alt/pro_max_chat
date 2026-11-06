import "server-only";

import type { TranslateFn } from "@/lib/i18n";

/**
 * AI engine behind Gidgogram bots.
 *
 * The primary path calls an OpenAI-compatible chat completion endpoint
 * (OpenRouter when `OPENROUTER_API_KEY` is set, otherwise OpenAI). When no key
 * is configured — or the request fails — we fall back to a deterministic local
 * responder so bots always answer, even offline.
 */

export type BotProfile = {
  name: string;
  botPrompt: string | null;
  botCategory: string | null;
  botDescription: string | null;
};

export type ChatTurn = { role: "user" | "assistant"; content: string };

const CATEGORY_NAMES: Record<string, string> = {
  assistant: "universal yordamchi",
  coder: "dasturchi yordamchisi",
  translator: "tarjimon",
  writer: "matn muharriri",
  teacher: "o'qituvchi",
  psychologist: "psixolog",
  legal: "huquqiy maslahatchi",
  finance: "moliya maslahatchisi",
  fun: "ko'ngilxush bot",
  general: "AI yordamchi",
};

export function categoryLabel(category: string | null): string {
  if (!category) return "AI yordamchi";
  return CATEGORY_NAMES[category] ?? "AI yordamchi";
}

/** Builds the system prompt that shapes a bot's personality. */
export function botSystemPrompt(bot: BotProfile): string {
  const role = categoryLabel(bot.botCategory);
  const lines = [
    `Sen "${bot.name}" ismli ${role}san.`,
    "Foydalanuvchilar bilan o'zbek tilida (foydalanuvchi boshqa tilda yozsa o'sha tilda) do'stona, aniq va foydali muloqot qil.",
    "Javoblaring qisqa, amaliy va tushunarli bo'lsin. Kerak bo'lsa ro'yxat yoki qadamlar bilan tushuntir.",
    "Hech qachon o'zingni AI modeli ekanligini aytib odamni chalg'itma; o'zingni shu bot sifatida tanishtir.",
    "Zararli, noqonuniy yoki xavfli harakatlarga yordam berma.",
  ];
  if (bot.botDescription) {
    lines.push(`Vazifang haqida qisqacha: ${bot.botDescription}`);
  }
  if (bot.botPrompt) {
    lines.push(`Qo'shimcha ko'rsatmalar: ${bot.botPrompt}`);
  }
  return lines.join("\n");
}

type ChatConfig = { url: string; key: string; model: string };

function resolveConfig(): ChatConfig | null {
  const model = process.env.BOT_MODEL ?? "openai/gpt-4o-mini";
  if (process.env.OPENROUTER_API_KEY) {
    return {
      url: "https://openrouter.ai/api/v1/chat/completions",
      key: process.env.OPENROUTER_API_KEY,
      model,
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      url: "https://api.openai.com/v1/chat/completions",
      key: process.env.OPENAI_API_KEY,
      model: process.env.BOT_MODEL ?? "gpt-4o-mini",
    };
  }
  return null;
}

async function callModel(
  config: ChatConfig,
  bot: BotProfile,
  history: ChatTurn[]
): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.key}`,
        // OpenRouter attribution headers (ignored by OpenAI).
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        "X-Title": "Gidgogram",
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.7,
        max_tokens: 600,
        messages: [
          { role: "system", content: botSystemPrompt(bot) },
          ...history.slice(-12),
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return h;
}

/** Deterministic, category-aware answer used when no AI provider is set. */
export function fallbackReply(
  bot: BotProfile,
  question: string,
  t: TranslateFn
): string {
  const q = question.trim();
  const seed = hash(q + bot.name);
  const firstLine = q.split("\n").find((l) => l.trim())?.trim() ?? q;

  const intros = [
    'Yaxshi savol! "{line}" bo\'yicha fikrlarim:',
    '"{line}" — buni ko\'rib chiqdim:',
    'Tushundim, "{line}" haqida:',
    "Ajoyib savol! Mana fikrlarim:",
  ];

  const bodies: Record<string, string> = {
    coder:
      "Kodni kichik qismlarga bo'ling va har bir qismni alohida sinab ko'ring.",
    translator:
      "Tarjima qilinadigan matnni yuboring — ma'no va uslubni saqlab tarjima qilaman.",
    writer:
      "Matnni kirish, 3 ta asosiy fikr va xulosa qismlariga ajratib yozing.",
    teacher:
      "Mavzuni oddiy so'zlar bilan tushuntirib ko'ring — bu eng samarali o'rganish usuli.",
    psychologist:
      "Avval nafasni tiklang: 4 soniya nafas olib, 6 soniya chiqaring. His-tuyg'ularingizni yozib qo'ying.",
    legal:
      "Bu umumiy ma'lumot, rasmiy yuridik maslahat emas. Aniq holat uchun advokatga murojaat qiling.",
    finance:
      "Budjetning 50% ehtiyojga, 30% istakka, 20% jamg'armaga bo'ling.",
    fun:
      "Bugun 3 ta yaxshi narsani sanang va bittasini do'stingizga aytib bering! 🎉",
    assistant:
      "Avval eng muhim bitta vazifani bajaring, keyin qolganlariga o'ting.",
  };

  const key =
    bot.botCategory && bodies[bot.botCategory] ? bot.botCategory : "assistant";
  const intro = t(pick(intros, seed), { line: firstLine });
  const body = t(bodies[key]);
  const outro = t(
    "Batafsil yordam kerak bo'lsa, aniq savolingizni yozing — birga hal qilamiz! 🤝"
  );

  return `${intro}\n\n${body}\n\n${outro}`;
}

/** Produces a bot reply for the given conversation history. */
export async function generateBotReply(
  bot: BotProfile,
  history: ChatTurn[],
  t: TranslateFn
): Promise<string> {
  const lastUser =
    [...history].reverse().find((turn) => turn.role === "user")?.content ?? "";
  if (!lastUser.trim()) {
    return t("Salom! Sizga qanday yordam bera olaman? 🙂");
  }

  const config = resolveConfig();
  if (config) {
    const ai = await callModel(config, bot, history);
    if (ai) return ai;
  }

  return fallbackReply(bot, lastUser, t);
}
