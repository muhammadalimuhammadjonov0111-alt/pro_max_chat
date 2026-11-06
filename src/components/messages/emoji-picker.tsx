"use client";

import * as React from "react";

import { useT } from "@/hooks/use-i18n";

// ---------------------------------------------------------------------------
// Curated emoji set (no external dependency). Grouped by category, each with
// Uzbek/English search keywords.
// ---------------------------------------------------------------------------

type EmojiCategory = {
  id: string;
  label: string;
  emojis: Array<{ e: string; k: string }>;
};

const CATEGORIES: EmojiCategory[] = [
  {
    id: "smileys",
    label: "Yuzlar",
    emojis: [
      { e: "😀", k: "tabassum roxta smile" },
      { e: "😃", k: "baxtli smile" },
      { e: "😄", k: "kulgi smile" },
      { e: "😁", k: "tabassum tish" },
      { e: "😆", k: "kulgi qahqaha" },
      { e: "😅", k: "tabassum ter" },
      { e: "😂", k: "kulgi yig'la" },
      { e: "🤣", k: "qahqaha LOL" },
      { e: "😊", k: "yumshoq tabassum" },
      { e: "😇", k: "farishta" },
      { e: "🙂", k: "tabassum" },
      { e: "🙃", k: "teskari" },
      { e: "😉", k: "ko'z qisish wink" },
      { e: "😌", k: "xotirjam" },
      { e: "😍", k: "sevgi muhabbat love" },
      { e: "🥰", k: "sevgi yurak love" },
      { e: "😘", k: "bo'qish love" },
      { e: "😗", k: "bo'qish" },
      { e: "😙", k: "tabassum bo'qish" },
      { e: "😚", k: "bo'qish ko'z" },
      { e: "😋", k: "mazali yummy" },
      { e: "😛", k: "til chiqarish" },
      { e: "😝", k: "kulgi til" },
      { e: "🤪", k: "g'alati silliq" },
      { e: "🤨", k: "shubha bosh" },
      { e: "🧐", k: "shisha kuzatish" },
      { e: "🤓", k: "nerd" },
      { e: "😎", k: "ko'zoynak salqin" },
      { e: "🥸", k: "soxta niqob" },
      { e: "🤩", k: "hayrat ajoyib" },
      { e: "🥳", k: "tug'ilgan kun bayram" },
      { e: "😏", k: "panjara" },
      { e: "😒", k: "noroz qattol" },
      { e: "😞", k: "bo'shashgan" },
      { e: "😔", k: "qayg'u" },
      { e: "😟", k: "tashvish" },
      { e: "😕", k: "tushunarsiz" },
      { e: "🙁", k: "burchak kulgi" },
      { e: "☹️", k: "qayg'uli" },
      { e: "😣", k: "qiynalish" },
      { e: "😖", k: "qiynalish yuz" },
      { e: "😫", k: "charchagan" },
      { e: "😩", k: "charchagan yig'la" },
      { e: "🥺", k: "yalinuvchi" },
      { e: "😢", k: "yig'la" },
      { e: "😭", k: "kuchli yig'la" },
      { e: "😤", k: "jahl" },
      { e: "😠", k: "g'azab" },
      { e: "😡", k: "jahl qizil" },
      { e: "🤬", k: "qarg'ish" },
      { e: "🤯", k: "portlash bosh" },
      { e: "😳", k: "qizargan" },
      { e: "🥵", k: "issiq" },
      { e: "🥶", k: "sovuq" },
      { e: "😱", k: "qo'rqinch baqirish" },
      { e: "😨", k: "qo'rqish" },
      { e: "😰", k: "ter sovuq" },
      { e: "😥", k: "afvsir" },
      { e: "😓", k: "ter qayg'u" },
      { e: "🤗", k: "quchoq" },
      { e: "🤔", k: "o'ylash" },
      { e: "🤭", k: "yashirin kulgi" },
      { e: "🫢", k: "yashirin og'iz" },
      { e: "🫣", k: "ko'z yashirish" },
      { e: "🤫", k: "sir shivoa" },
      { e: "😶", k: "jim" },
      { e: "😐", k: "jim yuz" },
      { e: "😑", k: "betaraf" },
      { e: "😬", k: "noqulay" },
      { e: "🙄", k: "ko'z aylantirish" },
      { e: "😯", k: "hayrat" },
      { e: "😴", k: "uxlash" },
      { e: "🤤", k: "soqil" },
      { e: "😪", k: "uyquli" },
      { e: "😵", k: "bosh aylanish" },
      { e: "🫠", k: "erish" },
      { e: "🤠", k: "kovboy" },
      { e: "👻", k: "arvoh" },
      { e: "💀", k: "yalanga" },
      { e: "🤖", k: "robot" },
      { e: "👽", k: "uchqun" },
      { e: "😈", k: "shayton" },
      { e: "💩", k: "kaka" },
      { e: "🤡", k: "maska" },
    ],
  },
  {
    id: "gestures",
    label: "Qo'llar",
    emojis: [
      { e: "👋", k: "salom qo'l" },
      { e: "🤚", k: "qo'l to'xtat" },
      { e: "✋", k: "qo'l to'xtat" },
      { e: "🖖", k: "vulkan salom" },
      { e: "🫱", k: "o'ng qo'l" },
      { e: "🫲", k: "chap qo'l" },
      { e: "🫳", k: "pastga qo'l" },
      { e: "🫴", k: "tepaga qo'l" },
      { e: "👌", k: "yaxshi OK" },
      { e: "🤌", k: "parmak" },
      { e: "🤏", k: "kichik" },
      { e: "✌️", k: "g'alaba V" },
      { e: "🤞", k: "umid panja" },
      { e: "🫰", k: "pul" },
      { e: "🤟", k: "sevgi belgi" },
      { e: "🤘", k: "rock" },
      { e: "🤙", k: "qo'ng'iroq" },
      { e: "👈", k: "chap" },
      { e: "👉", k: "o'ng" },
      { e: "👆", k: "tepaga" },
      { e: "🖕", k: "barmoq" },
      { e: "👇", k: "pastga" },
      { e: "☝️", k: "bir barmoq" },
      { e: "👍", k: "yaxshi like ruxsat" },
      { e: "👎", k: "yo'q dislike" },
      { e: "✊", k: "musht" },
      { e: "👊", k: "musht urish" },
      { e: "🤛", k: "chap musht" },
      { e: "🤜", k: "o'ng musht" },
      { e: "👏", k: "qarsak" },
      { e: "🙌", k: "qo'l ko'tarish" },
      { e: "🫶", k: "yurak qo'l" },
      { e: "👐", k: "ochiq qo'l" },
      { e: "🤲", k: "duo" },
      { e: "🤝", k: "qo'l siqish kelishuv" },
      { e: "🙏", k: "duo rahmat" },
      { e: "💪", k: "kuch muscle" },
      { e: "🦾", k: "metall kuch" },
      { e: "✍️", k: "yozish" },
      { e: "🫵", k: "siz" },
      { e: "💅", k: "manikyur" },
    ],
  },
  {
    id: "love",
    label: "Yuraklar",
    emojis: [
      { e: "❤️", k: "yurak qizil sevgi love" },
      { e: "🧡", k: "to'q sariq yurak" },
      { e: "💛", k: "sariq yurak" },
      { e: "💚", k: "yashil yurak" },
      { e: "💙", k: "ko'k yurak" },
      { e: "💜", k: "binafsha yurak" },
      { e: "🖤", k: "qora yurak" },
      { e: "🤍", k: "oq yurak" },
      { e: "🤎", k: "jigarrang yurak" },
      { e: "💔", k: "siniq yurak" },
      { e: "❤️‍🔥", k: "yong'an yurak" },
      { e: "💕", k: "ikki yurak" },
      { e: "💞", k: "aylanuvchi yuraklar" },
      { e: "💓", k: "urayotgan yurak" },
      { e: "💗", k: "o'sayotgan yurak" },
      { e: "💖", k: "yaltiroq yurak" },
      { e: "💘", k: "strela yurak" },
      { e: "💝", k: "sovg'a yurak" },
      { e: "💌", k: "xat sevgi" },
      { e: "💋", k: "bo'shish sevgi" },
      { e: "😍", k: "sevgi ko'z" },
    ],
  },
  {
    id: "nature",
    label: "Tabiat",
    emojis: [
      { e: "🐶", k: "it puppy" },
      { e: "🐱", k: "mushuk cat" },
      { e: "🐭", k: "sichqoncha" },
      { e: "🐹", k: "kaptar" },
      { e: "🐰", k: "quyon rabbit" },
      { e: "🦊", k: "tilki" },
      { e: "🐻", k: "ayiq" },
      { e: "🐼", k: "panda" },
      { e: "🐨", k: "koala" },
      { e: "🐯", k: "yulbarz" },
      { e: "🦁", k: "shir" },
      { e: "🐮", k: "moliya" },
      { e: "🐷", k: "cho'chqa" },
      { e: "🐸", k: "baqa" },
      { e: "🐵", k: "maymun" },
      { e: "🐔", k: "tovuq" },
      { e: "🐧", k: "pingvin" },
      { e: "🐦", k: "qush" },
      { e: "🦋", k: "kapalak" },
      { e: "🐝", k: "asalari" },
      { e: "🐞", k: "bog' qurti" },
      { e: "🐢", k: "toshbaqa" },
      { e: "🐍", k: "ilon" },
      { e: "🐙", k: "sakkizoyoq" },
      { e: "🐬", k: "delfin" },
      { e: "🐳", k: "kit" },
      { e: "🌸", k: "gul cherry" },
      { e: "🌻", k: "quelid guli" },
      { e: "🌼", k: "gul" },
      { e: "🌷", k: "lola" },
      { e: "🌹", k: "atirgul" },
      { e: "🌵", k: "kaktus" },
      { e: "🌴", k: "palma" },
      { e: "🌳", k: "daraxt" },
      { e: "🍀", k: "baxt shamrock" },
      { e: "🌈", k: "kamalak" },
      { e: "☀️", k: "quyosh" },
      { e: "🌙", k: "oy" },
      { e: "⭐", k: "yulduz" },
      { e: "🔥", k: "olov olovli" },
      { e: "🌊", k: "to'lqin" },
      { e: "❄️", k: "qor" },
    ],
  },
  {
    id: "food",
    label: "Oziq-ovqat",
    emojis: [
      { e: "🍏", k: "olma yashil" },
      { e: "🍎", k: "olma qizil" },
      { e: "🍊", k: "apelsin" },
      { e: "🍋", k: "limon" },
      { e: "🍌", k: "banan" },
      { e: "🍉", k: "tarvuz" },
      { e: "🍇", k: "uzum" },
      { e: "🍓", k: "qulupnay" },
      { e: "🫐", k: "blueberry" },
      { e: "🥝", k: "kivi" },
      { e: "🍅", k: "pomidor" },
      { e: "🥑", k: "avokado" },
      { e: "🥦", k: "brokkoli" },
      { e: "🥕", k: "sabzi" },
      { e: "🌽", k: "makkajo'xori" },
      { e: "🌶️", k: "qalampir" },
      { e: "🍞", k: "non" },
      { e: "🧀", k: "pishloq" },
      { e: "🍔", k: "burger" },
      { e: "🍟", k: "kartoshka fri" },
      { e: "🍕", k: "pitza" },
      { e: "🌭", k: "hot-dog" },
      { e: "🌮", k: "tako" },
      { e: "🍣", k: "sushi" },
      { e: "🍜", k: "lag'mon noodle" },
      { e: "🍦", k: "muzqaymoq" },
      { e: "🍩", k: "ponchik" },
      { e: "🍪", k: "pechene" },
      { e: "🎂", k: "torta" },
      { e: "🍫", k: "shokolad" },
      { e: "🍿", k: "popkorn" },
      { e: "☕", k: "qahva" },
      { e: "🧃", k: "sok" },
      { e: "🥤", k: "ichimlik" },
      { e: "🍺", k: "pivo" },
      { e: "🍷", k: "vino" },
    ],
  },
  {
    id: "activities",
    label: "Sport",
    emojis: [
      { e: "⚽", k: "futbol" },
      { e: "🏀", k: "basketbol" },
      { e: "🏈", k: "amerika futboli" },
      { e: "⚾", k: "beysbol" },
      { e: "🎾", k: "tennis" },
      { e: "🏐", k: "voleybol" },
      { e: "🎱", k: "bilyard" },
      { e: "🏓", k: "stol tennis" },
      { e: "🏸", k: "badminton" },
      { e: "🥅", k: "darvoza" },
      { e: "⛳", k: "golf" },
      { e: "🎿", k: "chang'i" },
      { e: "🏂", k: "snoubord" },
      { e: "🏄", k: "sörf" },
      { e: "🏋️", k: "tang'a sport" },
      { e: "🤸", k: "gimnastika" },
      { e: "🤽", k: "suzish" },
      { e: "🚴", k: "velosiped" },
      { e: "🏆", k: "kubok g'alaba" },
      { e: "🥇", k: "oltin medal" },
      { e: "🥈", k: "kumush medal" },
      { e: "🥉", k: "bronza medal" },
      { e: "🎯", k: "nishon" },
      { e: "🎮", k: "o'yin game" },
      { e: "🎲", k: "zar" },
      { e: "🧩", k: "pazl" },
      { e: "🎨", k: "rasm san'at" },
      { e: "🎭", k: "teatr" },
      { e: "🎤", k: "mikrofon" },
      { e: "🎧", k: "quloqchin" },
      { e: "🎸", k: "gitar" },
      { e: "🎬", k: "kino" },
      { e: "🎪", k: "sirk" },
      { e: "🎉", k: "tug'ilgan kun bayram" },
      { e: "🎊", k: "bayram konfetti" },
      { e: "🎈", k: "shar" },
      { e: "🎁", k: "sovg'a" },
    ],
  },
  {
    id: "objects",
    label: "Buyumlar",
    emojis: [
      { e: "💡", k: "g'oya chiroq" },
      { e: "📱", k: "telefon" },
      { e: "💻", k: "kompyuter noutbuk" },
      { e: "⌨️", k: "klaviatura" },
      { e: "🖥️", k: "monitor" },
      { e: "📷", k: "kamera rasm" },
      { e: "📸", k: "rasm olish" },
      { e: "📹", k: "video kamera" },
      { e: "📞", k: "qo'ng'iroq telefon" },
      { e: "⏰", k: "soat" },
      { e: "⌚", k: "qo'l soati" },
      { e: "💰", k: "pul" },
      { e: "💳", k: "karta" },
      { e: "💎", k: "oltin" },
      { e: "🔑", k: "kalit" },
      { e: "🔒", k: "qulf yopiq" },
      { e: "🔓", k: "qulf ochiq" },
      { e: "📌", k: "pin" },
      { e: "📎", k: "qisgich" },
      { e: "✂️", k: "qaychi" },
      { e: "📦", k: "quti" },
      { e: "📚", k: "kitoblar" },
      { e: "📖", k: "ochiq kitob" },
      { e: "✏️", k: "qalam" },
      { e: "📝", k: "yozish eslatma" },
      { e: "📅", k: "kalendar" },
      { e: "🚀", k: "raketa" },
      { e: "✈️", k: "samolyot" },
      { e: "🚗", k: "mashina" },
      { e: "🏠", k: "uy" },
      { e: "🎁", k: "sovg'a" },
      { e: "🔔", k: "qo'ng'iroq bildirishnoma" },
      { e: "💰", k: "pul cho'ntak" },
    ],
  },
  {
    id: "symbols",
    label: "Belgilar",
    emojis: [
      { e: "💯", k: "yuz foiz to'liq" },
      { e: "✅", k: "to'g'ri ha" },
      { e: "❌", k: "noto'g'ri yo'q" },
      { e: "❗", k: "muhim" },
      { e: "❓", k: "savol" },
      { e: "⚠️", k: "ogohlantirish" },
      { e: "♻️", k: "qayta ishlash" },
      { e: "🌟", k: "yulduz yaltiroq" },
      { e: "✨", k: "yaltiroq seh" },
      { e: "💫", k: "bosh aylanish" },
      { e: "💥", k: "portlash" },
      { e: "💦", k: "ter suv" },
      { e: "💤", k: "uxlash" },
      { e: "💬", k: "gap suhbat" },
      { e: "👀", k: "ko'zlar kuzatish" },
      { e: "🏆", k: "g'alaba kubok" },
      { e: "🔥", k: "olov trend" },
      { e: "💎", k: "oltin olmos" },
      { e: "🫰", k: "pul pul" },
      { e: "☮️", k: "tinchnik" },
      { e: "👑", k: "toj qirol" },
      { e: "🎉", k: "bayram" },
    ],
  },
];

const RECENT_KEY = "gidgogram:emoji-recent";
const MAX_RECENT = 24;

export function EmojiPicker({
  onPick,
  className,
}: {
  onPick: (emoji: string) => void;
  className?: string;
}) {
  const t = useT();
  const [query, setQuery] = React.useState("");
  const [tab, setTab] = React.useState("smileys");
  // Lazy init: the picker only mounts client-side (popover opened by a click),
  // so reading localStorage here can't cause an SSR hydration mismatch.
  const [recent, setRecent] = React.useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.slice(0, MAX_RECENT);
      }
    } catch {
      // localStorage unavailable — recent emojis just stay empty
    }
    return [];
  });

  const pick = React.useCallback(
    (emoji: string) => {
      onPick(emoji);
      setRecent((prev) => {
        const next = [emoji, ...prev.filter((p) => p !== emoji)].slice(
          0,
          MAX_RECENT
        );
        try {
          localStorage.setItem(RECENT_KEY, JSON.stringify(next));
        } catch {
          // best-effort persistence
        }
        return next;
      });
    },
    [onPick]
  );

  const q = query.trim().toLowerCase();
  const active = q
    ? CATEGORIES.flatMap((c) => c.emojis).filter(
        (x) => x.k.includes(q) || x.e === q
      )
    : tab === "recent"
      ? recent.map((e) => ({ e, k: "" }))
      : CATEGORIES.find((c) => c.id === tab)?.emojis ?? [];

  return (
    <div
      className={
        "flex h-72 w-full flex-col overflow-hidden rounded-2xl border bg-popover card-shadow " +
        (className ?? "")
      }
    >
      {/* Search */}
      <div className="border-b p-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("Emoji qidirish...")}
          className="h-8 w-full rounded-lg bg-muted px-3 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* Category tabs */}
      <div className="no-scrollbar flex gap-1 overflow-x-auto border-b px-2 py-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              setTab(c.id);
              setQuery("");
            }}
            className={
              "shrink-0 rounded-full px-2.5 py-1 text-xs transition-colors " +
              (!q && tab === c.id
                ? "bg-accent font-semibold text-foreground"
                : "text-muted-foreground hover:bg-accent/60")
            }
          >
            {t(c.label)}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="thin-scroll flex-1 overflow-y-auto p-2">
        {active.length === 0 ? (
          <p className="p-4 text-center text-xs text-muted-foreground">
            {tab === "recent" && !q
              ? t("Hozircha yaqin emoji yo'q")
              : t("Hech narsa topilmadi")}
          </p>
        ) : (
          <div className="grid grid-cols-8 gap-0.5">
            {active.map((x, i) => (
              <button
                key={`${x.e}-${i}`}
                type="button"
                title={x.k || undefined}
                onClick={() => pick(x.e)}
                className="rounded-lg py-1.5 text-2xl leading-none transition-colors hover:bg-accent"
              >
                {x.e}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Recents hint */}
      {!q && recent.length > 0 && (
        <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
          {t("Oxirgi ishlatilganlar avtomatik saqlanadi")}
        </div>
      )}
    </div>
  );
}
