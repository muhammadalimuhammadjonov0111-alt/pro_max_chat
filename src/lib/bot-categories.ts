/**
 * Catalogue of AI bot categories. Client-safe (no server imports) so both the
 * bot directory and the "create bot" form can use the same list.
 */

export type BotCategory = {
  id: string;
  label: string;
  emoji: string;
  description: string;
  gradient: string;
};

export const BOT_CATEGORIES: BotCategory[] = [
  {
    id: "assistant",
    label: "Universal yordamchi",
    emoji: "🤖",
    description: "Har qanday savolga javob beradi",
    gradient: "from-violet-500 to-indigo-500",
  },
  {
    id: "coder",
    label: "Dasturchi",
    emoji: "💻",
    description: "Kod yozish va xatolarni tuzatish",
    gradient: "from-sky-500 to-cyan-500",
  },
  {
    id: "translator",
    label: "Tarjimon",
    emoji: "🌐",
    description: "Tillar orasida tarjima qiladi",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    id: "writer",
    label: "Yozuvchi",
    emoji: "✍️",
    description: "Matn, post va maqola yozadi",
    gradient: "from-fuchsia-500 to-pink-500",
  },
  {
    id: "teacher",
    label: "O'qituvchi",
    emoji: "🎓",
    description: "Darslar va tushuntirishlar",
    gradient: "from-amber-400 to-orange-500",
  },
  {
    id: "psychologist",
    label: "Psixolog",
    emoji: "🧘",
    description: "Ruhiy qo'llab-quvvatlash",
    gradient: "from-rose-400 to-rose-600",
  },
  {
    id: "legal",
    label: "Huquqshunos",
    emoji: "⚖️",
    description: "Umumiy huquqiy maslahat",
    gradient: "from-slate-600 to-slate-400",
  },
  {
    id: "finance",
    label: "Moliya",
    emoji: "💰",
    description: "Budjet va investitsiya maslahati",
    gradient: "from-lime-500 to-emerald-500",
  },
  {
    id: "fun",
    label: "Ko'ngilxush",
    emoji: "🎉",
    description: "Hazil va qiziqarli suhbat",
    gradient: "from-rose-500 to-red-500",
  },
  {
    id: "general",
    label: "Boshqa",
    emoji: "✨",
    description: "Boshqa turdagi bot",
    gradient: "from-slate-600 to-slate-400",
  },
];

export function getCategory(id: string | null | undefined): BotCategory {
  return (
    BOT_CATEGORIES.find((c) => c.id === id) ??
    BOT_CATEGORIES[BOT_CATEGORIES.length - 1]
  );
}

/** Public presentation scale shown across the bots UI. */
export const BOT_BASE_TOTAL = 42_000_000;
export const BOT_SUBSCRIBER_BASE = 38_000_000;

/** Compact display for very large counters (42M, 38.2M, 1.1K). */
export function formatCompact(n: number): string {
  const fmt = (value: number, suffix: string) => {
    const rounded = Math.round(value * 10) / 10;
    const label = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    return `${label}${suffix}`;
  };
  if (n >= 1_000_000_000) return fmt(n / 1_000_000_000, "B");
  if (n >= 1_000_000) return fmt(n / 1_000_000, "M");
  if (n >= 1_000) return fmt(n / 1_000, "K");
  return String(n);
}
