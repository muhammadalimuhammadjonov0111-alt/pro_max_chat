import type { MediaOverlay } from "@/lib/utils";

/** Built in filters applied to photos & videos (CSS filter strings). */
export const FILTERS: { id: string; label: string; css: string }[] = [
  { id: "none", label: "Asl", css: "none" },
  { id: "vivid", label: "Yorqin", css: "saturate(1.4) contrast(1.08)" },
  { id: "warm", label: "Issiq", css: "saturate(1.18) sepia(0.16) brightness(1.04)" },
  { id: "cool", label: "Salqin", css: "saturate(1.1) hue-rotate(-10deg) brightness(1.03)" },
  { id: "mono", label: "Oq-qora", css: "grayscale(1) contrast(1.05)" },
  { id: "noir", label: "Noir", css: "grayscale(1) contrast(1.3) brightness(0.94)" },
  { id: "fade", label: "Fade", css: "contrast(0.88) brightness(1.07) saturate(0.88)" },
  { id: "dream", label: "Orzu", css: "saturate(1.35) hue-rotate(16deg) brightness(1.05) contrast(0.94)" },
  { id: "sunset", label: "Quyosh", css: "sepia(0.32) saturate(1.45) hue-rotate(-16deg)" },
  { id: "vintage", label: "Vintage", css: "sepia(0.48) contrast(0.92) brightness(1.05) saturate(0.85)" },
  { id: "cinema", label: "Kino", css: "contrast(1.18) saturate(1.1) brightness(0.96)" },
  { id: "blur", label: "Blur", css: "blur(3px)" },
];

export function filterCss(id?: string): string | undefined {
  if (!id) return undefined;
  const found = FILTERS.find((f) => f.id === id);
  if (!found || found.id === "none") return undefined;
  return found.css;
}

export type OverlayAnimation = NonNullable<MediaOverlay["animation"]>;

export const OVERLAY_ANIMATIONS: OverlayAnimation[] = [
  "none",
  "pop",
  "float",
  "pulse",
  "spin",
  "bounce",
];

export const ANIMATION_LABELS: Record<string, string> = {
  none: "Yo'q",
  pop: "Pop",
  float: "Suzish",
  pulse: "Puls",
  spin: "Aylanish",
  bounce: "Sakrash",
};

export const TEXT_COLORS = [
  "#ffffff",
  "#000000",
  "#f43f5e",
  "#f59e0b",
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#eab308",
];

export const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: "Kulgi",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃",
      "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙",
      "😋", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐",
      "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "😮‍💨", "🤥", "😌",
      "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🥵",
      "🥶", "😵", "🤯", "🤠", "🥳", "😎", "🤓", "🧐", "😕", "😟",
      "🙁", "😮", "😯", "😲", "😳", "🥺", "😦", "😧", "😨", "😰",
      "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫",
    ],
  },
  {
    label: "Ishoralar",
    emojis: [
      "👍", "👎", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙",
      "👈", "👉", "👆", "👇", "☝️", "✋", "🤚", "🖐️", "🖖", "👋",
      "🤝", "🙏", "✍️", "💅", "🤳", "💪", "🦾", "🖕", "👏", "🙌",
      "👐", "🤲", "🤜", "🤛", "✊", "👊", "🫶", "🫰", "🫵", "🫂",
    ],
  },
  {
    label: "Sevgi",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
      "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "♥️",
      "💋", "💌", "🥰", "😍", "💐", "🌹", "🌷", "🌺", "🌸", "💐",
    ],
  },
  {
    label: "Hayvonlar",
    emojis: [
      "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯",
      "🦁", "🐮", "🐷", "🐸", "🐵", "🙈", "🙉", "🙊", "🐔", "🐧",
      "🐦", "🐤", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄",
      "🐝", "🐛", "🦋", "🐌", "🐞", "🐜", "🕷️", "🐢", "🐍", "🐙",
    ],
  },
  {
    label: "Taom",
    emojis: [
      "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍒",
      "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑", "🥦", "🥕",
      "🍔", "🍟", "🍕", "🌭", "🥪", "🌮", "🌯", "🥙", "🍜", "🍝",
      "🍣", "🍱", "🍤", "🍚", "🍩", "🍪", "🎂", "🍰", "🧁", "🍫",
      "🍿", "🍺", "🍻", "🥂", "🍷", "☕", "🍵", "🧋", "🥤", "🍦",
    ],
  },
  {
    label: "Faoliyat",
    emojis: [
      "⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🏉", "🎱", "🏓", "🏸",
      "🥊", "🥋", "⛳", "🏹", "🎣", "🤿", "🎿", "🛷", "⛸️", "🥌",
      "🎯", "🎮", "🎲", "🧩", "🎸", "🎹", "🥁", "🎺", "🎻", "🎤",
      "🎬", "🎨", "🎭", "🩰", "🏆", "🥇", "🥈", "🥉", "🎖️", "🎗️",
    ],
  },
  {
    label: "Belgilar",
    emojis: [
      "✨", "⭐", "🌟", "💫", "⚡", "🔥", "💥", "💯", "💢", "💦",
      "🎉", "🎊", "🎈", "🎁", "🏳️‍🌈", "☀️", "🌙", "⛅", "🌈", "❄️",
      "✅", "❌", "❓", "❗", "💡", "🔔", "🎵", "🎶", "👉", "🔝",
      "👑", "💎", "🏅", "🚀", "🛸", "🌈", "🍀", "🦋", "🐝", "🌸",
    ],
  },
];

/** Big, sticker-like glyph packs. */
export const STICKER_PACKS: { label: string; items: string[] }[] = [
  {
    label: "Yulduzlar",
    items: ["✨", "🌟", "⭐", "💫", "🌠", "🔆", "☀️", "🌤️", "🌈", "💎"],
  },
  {
    label: "Olov",
    items: ["🔥", "💥", "⚡", "🌋", "🎇", "🎆", "💫", "❇️", "✴️", "🌟"],
  },
  {
    label: "Sevgi",
    items: ["❤️‍🔥", "💖", "💘", "💝", "💞", "💓", "💗", "💕", "😍", "🥰"],
  },
  {
    label: "Party",
    items: ["🎉", "🎊", "🥳", "🎈", "🎁", "🪩", "🍾", "🥂", "🎂", "🕺"],
  },
  {
    label: "Tabiat",
    items: ["🌸", "🌺", "🌻", "🌹", "🍀", "🍃", "🌿", "🌱", "🦋", "🐝"],
  },
  {
    label: "Kayfiyat",
    items: ["😎", "🤯", "🥺", "😂", "🤩", "😱", "🫠", "🤡", "👻", "💀"],
  },
];

/** Curated animated GIFs (remote). They degrade gracefully offline. */
export const GIF_PRESETS: { id: string; label: string; url: string }[] = [
  { id: "clap", label: "Qarsak", url: "https://media.giphy.com/media/7rj2ZgttvgomY/giphy.gif" },
  { id: "fire", label: "Olov", url: "https://media.giphy.com/media/3o7abGQa0aRJUurpII/giphy.gif" },
  { id: "love", label: "Sevgi", url: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif" },
  { id: "wow", label: "Voy", url: "https://media.giphy.com/media/5VKbvrjxpVJCM/giphy.gif" },
  { id: "laugh", label: "Kulgi", url: "https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif" },
  { id: "party", label: "Party", url: "https://media.giphy.com/media/g9582DNuQppxC/giphy.gif" },
  { id: "dance", label: "Raqs", url: "https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif" },
  { id: "star", label: "Yulduz", url: "https://media.giphy.com/media/3o7TKu8YjA0nO1XwXC/giphy.gif" },
  { id: "rain", label: "Yomg'ir", url: "https://media.giphy.com/media/3o6Zt6ML6BklcajjsA/giphy.gif" },
  { id: "heart", label: "Yurak", url: "https://media.giphy.com/media/26tPplGWjN0xLybiU/giphy.gif" },
  { id: "crown", label: "Toj", url: "https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif" },
  { id: "cat", label: "Mushuk", url: "https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif" },
];

/** Default sizes (percentage of the media's smallest side). */
export const DEFAULT_OVERLAY_SIZE = {
  emoji: 16,
  sticker: 26,
  text: 8,
  gif: 30,
} as const;
