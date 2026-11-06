"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCheck,
  Copy,
  CornerUpLeft,
  FileText,
  Flag,
  ImagePlus,
  Loader2,
  MapPin,
  MessageSquareText,
  Mic,
  MoreVertical,
  Music,
  Pencil,
  Phone,
  Search,
  Send,
  SmilePlus,
  Sticker,
  Trash2,
  User,
  Video,
  X,
} from "lucide-react";
import { FaInfoCircle } from "react-icons/fa";
import { toast } from "sonner";

import {
  deleteMessage,
  editMessage,
  getMessages,
  sendMessage,
  markConversationRead,
  searchMessages,
  toggleMessageReaction,
} from "@/actions/message";
import { uploadFile } from "@/lib/upload";
import { AI_ASSISTANTS_ENABLED } from "@/lib/features";
import { cn } from "@/lib/utils";
import { TimeAgo } from "@/components/shared/time-ago";
import { BotBadge } from "@/components/shared/badges";
import { EmojiPicker } from "@/components/messages/emoji-picker";
import { GifPicker } from "@/components/messages/gif-picker";
import { VoiceMessagePlayer } from "@/components/messages/voice-message";
import type { PostUser } from "@/lib/types";
import type { TranslateFn } from "@/lib/i18n";
import { useT } from "@/hooks/use-i18n";
import { useCall } from "@/components/call/call-provider";
import { ReportDialog } from "@/components/feed/report-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ConversationItem = {
  id: string;
  members: (PostUser & { isOnline?: boolean })[];
  lastMessage: {
    text: string | null;
    mediaType: string | null;
    createdAt: Date;
    senderId: string;
  } | null;
  updatedAt: Date;
  lastReadAt: Date;
  unreadCount?: number;
};

export type MessageItem = {
  id: string;
  text: string | null;
  imageUrl: string | null;
  mediaType?: string | null;
  senderId: string;
  createdAt: Date;
  seen: boolean;
  sender: PostUser;
  reactions: { emoji: string; userId: string }[];
  replyTo?: {
    id: string;
    text: string | null;
    mediaType: string | null;
    senderId: string;
    sender: { name: string; username: string | null };
  } | null;
};

/** Instagram-style quick reaction emojis. */
const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "😡", "🙏"] as const;

/** Built-in sticker set (sent as sticker messages, rendered bare). */
const STICKERS = [
  "😀", "😂", "🤣", "😊", "😍", "😘", "😎", "🥳", "😭",
  "😡", "😱", "🤔", "😴", "😇", "🤗", "🥺", "👍", "👎",
  "👏", "🙌", "🙏", "💪", "🫡", "🤝", "✌️", "🫶", "🔥",
  "🎉", "💯", "✨", "⭐", "🦄", "🐱", "💀", "🤖", "❤️",
] as const;

/** Fixed waveform bar heights for the recording indicator. */
const REC_WAVE_BARS = [
  0.3, 0.55, 0.75, 0.4, 0.9, 0.65, 0.45, 0.8, 0.5,
  0.7, 0.35, 0.6, 0.85, 0.42, 0.78, 0.52, 0.68, 0.3,
] as const;

function formatRecTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export type MessageSearchResult = {
  id: string;
  text: string;
  createdAt: Date;
  conversationId: string;
  senderName: string;
  other: PostUser | null;
};

type MediaKind = "image" | "video" | "gif" | "audio" | "sticker" | "file";

function detectKind(m: MessageItem): MediaKind | null {
  if (!m.imageUrl) return null;
  if (m.mediaType === "video" || m.mediaType === "gif") return m.mediaType;
  if (m.mediaType === "image") return "image";
  if (m.mediaType === "audio") return "audio";
  if (m.mediaType === "sticker") return "sticker";
  if (m.mediaType === "file") return "file";
  // Legacy rows (saved before mediaType existed): infer from the extension.
  if (/\.(mp4|webm|mov)(\?|$)/i.test(m.imageUrl)) return "video";
  if (/\.gif(\?|$)/i.test(m.imageUrl)) return "gif";
  if (/\.(mp3|m4a|aac|ogg|wav|weba)(\?|$)/i.test(m.imageUrl)) return "audio";
  return "image";
}

/** Preview line for the conversation list. */
function lastMessagePreview(
  last: ConversationItem["lastMessage"],
  t: TranslateFn
): string {
  if (!last) return t("Yangi suhbat");
  if (last.text) return last.text;
  if (last.mediaType === "video") return t("📹 Video");
  if (last.mediaType === "gif") return "GIF";
  if (last.mediaType === "audio") return t("🎤 Ovozli xabar");
  if (last.mediaType === "sticker") return t("🧩 Stiker");
  if (last.mediaType === "file") return t("📎 Fayl");
  return t("📷 Rasm");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Wraps every case-insensitive match of `query` in a highlight span. */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark
            key={i}
            className="rounded bg-amber-300/70 px-0.5 text-inherit dark:bg-amber-400/40"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

function MessageBubble({
  m,
  meId,
  consecutive,
  query = "",
  onEdit,
  onDelete,
  onReply,
  onToggleReaction,
}: {
  m: MessageItem;
  meId: string;
  consecutive: boolean;
  query?: string;
  onEdit: (id: string, text: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReply: (m: MessageItem) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
}) {
  const t = useT();
  const mine = m.senderId === meId;
  const kind = detectKind(m);
  const isMedia =
    kind === "image" ||
    kind === "video" ||
    kind === "gif" ||
    kind === "sticker" ||
    kind === "file";
  const hasText = !!m.text;

  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(m.text ?? "");
  const [saving, setSaving] = React.useState(false);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  const reactionGroups = React.useMemo(() => {
    const map = new Map<string, string[]>();
    for (const reaction of m.reactions ?? []) {
      const list = map.get(reaction.emoji) ?? [];
      list.push(reaction.userId);
      map.set(reaction.emoji, list);
    }
    return [...map.entries()].map(([emoji, users]) => ({ emoji, users }));
  }, [m.reactions]);

  React.useEffect(() => {
    if (!editing) return;
    const frame = requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      const end = el.value.length;
      el.setSelectionRange(end, end);
    });
    return () => cancelAnimationFrame(frame);
  }, [editing]);

  function startEdit() {
    setDraft(m.text ?? "");
    setEditing(true);
  }

  async function saveEdit(e?: React.FormEvent) {
    e?.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await onEdit(m.id, draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function copyText() {
    if (!m.text) return;
    try {
      await navigator.clipboard.writeText(m.text);
      toast.success(t("Nusxalandi"));
    } catch {
      void 0;
    }
  }

  const previewSender = mine
    ? t("Siz")
    : (m.sender?.username ?? m.sender?.name ?? t("Foydalanuvchi"));
  const previewText =
    m.text ??
    (kind === "audio"
      ? t("🎤 Ovozli xabar")
      : kind === "sticker"
        ? t("🧩 Stiker")
        : kind === "file"
          ? t("📎 Fayl")
          : kind === "video"
            ? t("📹 Video")
            : kind === "gif"
              ? "GIF"
              : t("📷 Rasm"));

  const actions = (
    <div className="flex shrink-0 self-center px-0.5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t("Amallar")}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground opacity-100 transition-all hover:bg-accent hover:text-foreground data-[state=open]:scale-110 data-[state=open]:bg-accent data-[state=open]:text-foreground data-[state=open]:opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align={mine ? "end" : "start"}
          className="w-72 overflow-hidden rounded-2xl border border-border/60 bg-popover/95 p-0 shadow-2xl backdrop-blur-xl"
        >
          {/* Source message preview (Telegram-style) */}
          <div className="flex items-center gap-2.5 border-b border-border/50 bg-muted/40 px-3 py-2.5">
            <span
              className="h-9 w-1 shrink-0 rounded-full bg-gradient-to-b from-[#833ab4] via-[#c13584] to-[#e1306c]"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-[11px] font-bold leading-tight text-[#c13584]">
                {previewSender}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {previewText}
              </p>
            </div>
          </div>

          {/* Quick reactions — big playful pill */}
          <div className="flex items-center justify-center gap-1 border-b border-border/50 px-3 py-2">
            {QUICK_REACTIONS.map((emoji) => (
              <DropdownMenuItem
                key={emoji}
                onSelect={() => onToggleReaction(m.id, emoji)}
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full p-0 text-2xl outline-none transition-all hover:scale-125 hover:bg-accent focus:scale-125 focus:bg-accent"
              >
                {emoji}
              </DropdownMenuItem>
            ))}
          </div>

          {/* Actions */}
          <div className="p-1.5">
            <DropdownMenuItem
              onClick={() => onReply(m)}
              className="gap-3 rounded-xl px-2 py-2 outline-none"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-violet-500">
                <CornerUpLeft className="h-4 w-4" />
              </span>
              <span className="font-medium">{t("Javob berish")}</span>
            </DropdownMenuItem>
            {hasText && (
              <DropdownMenuItem
                onClick={copyText}
                className="gap-3 rounded-xl px-2 py-2 outline-none"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-sky-500">
                  <Copy className="h-4 w-4" />
                </span>
                <span className="font-medium">{t("Nusxalash")}</span>
              </DropdownMenuItem>
            )}
            {mine && (
              <DropdownMenuItem
                onClick={startEdit}
                className="gap-3 rounded-xl px-2 py-2 outline-none"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
                  <Pencil className="h-4 w-4" />
                </span>
                <span className="font-medium">{t("Tahrirlash")}</span>
              </DropdownMenuItem>
            )}
            {mine && (
              <DropdownMenuItem
                onClick={() => onDelete(m.id)}
                className="gap-3 rounded-xl px-2 py-2 text-red-600 outline-none focus:bg-red-500/10 focus:text-red-600"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                  <Trash2 className="h-4 w-4" />
                </span>
                <span className="font-medium">{t("O'chirish")}</span>
              </DropdownMenuItem>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div
      id={`message-${m.id}`}
      className={cn(
        "group flex scroll-mt-20 animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
        mine ? "justify-end" : "justify-start",
        consecutive ? "mt-1" : "mt-3"
      )}
    >
      {mine && actions}
      <div
        className={cn(
          "max-w-[78%] md:max-w-[65%]",
          mine ? "items-end" : "items-start"
        )}
      >
        {editing ? (
          <form
            onSubmit={saveEdit}
            className="w-full min-w-[220px] rounded-3xl border bg-card p-2 shadow-sm"
          >
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void saveEdit();
                }
                if (e.key === "Escape") setEditing(false);
              }}
              rows={2}
              placeholder={t("Xabar yozing...")}
              className="min-h-16 w-full resize-none rounded-2xl border border-input bg-background px-3 py-2 text-[15px] outline-none focus:ring-1 focus:ring-ring"
            />
            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {t("Bekor qilish")}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center rounded-full bg-[#0095f6] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#1877f2] disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  t("Saqlash")
                )}
              </button>
            </div>
          </form>
        ) : (
          <div
            className={cn(
              "overflow-hidden",
              isMedia
                ? "rounded-3xl bg-transparent p-0"
                : cn(
                    "rounded-3xl px-4 py-2.5 text-[15px] leading-snug break-words whitespace-pre-wrap shadow-sm",
                    hasText && !isMedia ? "max-w-fit" : "",
                    mine
                      ? "rounded-br-md bg-gradient-to-br from-[#833ab4] via-[#c13584] to-[#e1306c] text-white"
                      : "rounded-bl-md bg-muted text-foreground"
                  )
            )}
          >
            {/* Quoted reply (Instagram "reply" style) */}
            {m.replyTo && (
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById(`message-${m.replyTo!.id}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "center" })
                }
                className={cn(
                  "mb-1.5 block w-full max-w-[260px] overflow-hidden rounded-2xl border-l-4 px-2.5 py-1.5 text-left",
                  mine
                    ? "border-white/60 bg-white/20"
                    : "border-foreground/30 bg-foreground/5"
                )}
              >
                <span
                  className={cn(
                    "block text-[10px] font-bold leading-tight",
                    mine ? "text-white/85" : "text-muted-foreground"
                  )}
                >
                  {m.replyTo.senderId === meId
                    ? t("Siz")
                    : (m.replyTo.sender.username ?? m.replyTo.sender.name)}
                </span>
                <span
                  className={cn(
                    "block truncate text-xs leading-snug",
                    mine ? "text-white/80" : "text-muted-foreground"
                  )}
                >
                  {m.replyTo.text ??
                    (m.replyTo.mediaType === "video"
                      ? t("📹 Video")
                      : m.replyTo.mediaType === "gif"
                        ? "GIF"
                        : m.replyTo.mediaType === "sticker"
                          ? t("🧩 Stiker")
                          : m.replyTo.mediaType === "file"
                            ? t("📎 Fayl")
                            : t("📷 Rasm"))}
                </span>
              </button>
            )}
            {kind === "audio" && m.imageUrl && (
              <VoiceMessagePlayer src={m.imageUrl} mine={mine} id={m.id} />
            )}

            {kind === "sticker" && (
              <span className="block select-none px-1 text-[64px] leading-none drop-shadow-sm">
                {m.text}
              </span>
            )}

            {kind === "file" && m.imageUrl && (
              <a
                href={m.imageUrl}
                download={m.text ?? undefined}
                target="_blank"
                rel="noreferrer"
                className="flex max-w-[280px] items-center gap-3 rounded-2xl border border-border/60 bg-card p-2.5 text-foreground transition-colors hover:bg-accent"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
                  <FileText className="h-6 w-6" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {m.text ?? t("Fayl")}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {t("Yuklab olish")}
                  </span>
                </span>
              </a>
            )}

            {kind === "image" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={m.imageUrl!}
                alt={t("Rasm")}
                loading="lazy"
                className="max-h-80 rounded-3xl object-cover"
              />
            )}

            {kind === "gif" && (
              // GIF is stored as an external animated image URL.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={m.imageUrl!}
                alt="GIF"
                loading="lazy"
                className="max-h-64 rounded-3xl bg-muted object-contain"
              />
            )}

            {kind === "video" && (
              <video
                src={m.imageUrl!}
                controls
                playsInline
                preload="metadata"
                className="max-h-80 rounded-3xl bg-black"
              />
            )}

            {/* Caption below media, if any */}
            {hasText && kind !== "sticker" && kind !== "file" && (
              <p
                className={cn(
                  "mt-1 px-1 text-[15px] leading-snug break-words whitespace-pre-wrap",
                  isMedia && "text-foreground"
                )}
              >
                <Highlight text={m.text ?? ""} query={query} />
              </p>
            )}
          </div>
        )}

        {/* Reaction chips (Instagram-style) */}
        {reactionGroups.length > 0 && (
          <div
            className={cn(
              "mt-1 flex flex-wrap gap-1 px-1",
              mine ? "justify-end" : "justify-start"
            )}
          >
            {reactionGroups.map(({ emoji, users }) => {
              const ours = users.includes(meId);
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onToggleReaction(m.id, emoji)}
                  aria-pressed={ours}
                  aria-label={emoji}
                  className={cn(
                    "flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs leading-none shadow-sm backdrop-blur transition-colors",
                    ours
                      ? "border-transparent bg-[#c13584] text-white"
                      : "border-border bg-card/90 hover:bg-accent"
                  )}
                >
                  <span className="text-[13px]">{emoji}</span>
                  {users.length > 1 && (
                    <span className="text-[10px] font-semibold tabular-nums">
                      {users.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Timestamp + read receipt */}
        <div
          className={cn(
            "mt-0.5 flex items-center gap-1 px-2 text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100",
            mine ? "justify-end" : "justify-start"
          )}
        >
          <TimeAgo date={m.createdAt} />
          {mine &&
            (m.seen ? (
              <CheckCheck className="h-3.5 w-3.5 text-[#0095f6]" />
            ) : (
              <CheckCheck className="h-3.5 w-3.5 text-muted-foreground/60" />
            ))}
        </div>
      </div>
      {!mine && actions}
    </div>
  );
}

export function MessagesClient({
  me,
  conversations,
  initialSelectedId = null,
  initialMessages = [],
}: {
  me: PostUser;
  conversations: ConversationItem[];
  initialSelectedId?: string | null;
  initialMessages?: MessageItem[];
}) {
  const router = useRouter();
  const { startCallWith } = useCall();
  const t = useT();
  const [selectedId, setSelectedId] = React.useState<string | null>(
    initialSelectedId
  );
  const [messages, setMessages] = React.useState<MessageItem[]>(initialMessages);
  const [text, setText] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [showEmoji, setShowEmoji] = React.useState(false);
  const [showGifs, setShowGifs] = React.useState(false);
  const [showStickers, setShowStickers] = React.useState(false);
  const [infoOpen, setInfoOpen] = React.useState(false);
  const [reportOpen, setReportOpen] = React.useState(false);

  // Chat-wide search
  const [chatQuery, setChatQuery] = React.useState("");
  const [results, setResults] = React.useState<MessageSearchResult[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [msgSearchOpen, setMsgSearchOpen] = React.useState(false);
  const [messageQuery, setMessageQuery] = React.useState("");
  const [replyTarget, setReplyTarget] = React.useState<MessageItem | null>(null);
  const [recording, setRecording] = React.useState(false);
  const [recordSeconds, setRecordSeconds] = React.useState(0);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const recordChunksRef = React.useRef<Blob[]>([]);
  const recordCancelRef = React.useRef(false);
  const recordStreamRef = React.useRef<MediaStream | null>(null);

  const bottomRef = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const audioInputRef = React.useRef<HTMLInputElement>(null);
  const docInputRef = React.useRef<HTMLInputElement>(null);
  const inputWrapRef = React.useRef<HTMLDivElement>(null);
  const msgSearchRef = React.useRef<HTMLInputElement>(null);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;
  const other = selected?.members.find((m) => m.id !== me.id) ?? null;
  const botPaused = !AI_ASSISTANTS_ENABLED && !!other?.isBot;
  const callPeer = other
    ? {
        id: other.id,
        name: other.name,
        username: other.username,
        image: other.image ?? null,
        isVerified: other.isVerified,
        isBot: !!other.isBot,
      }
    : null;

  const load = React.useCallback(async (id: string) => {
    const data = await getMessages(id);
    setMessages(data as MessageItem[]);
    void markConversationRead(id);
  }, []);

  React.useEffect(() => {
    if (selectedId) {
      const frame = requestAnimationFrame(() => {
        void load(selectedId);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [selectedId, load]);

  // Poll for new messages
  React.useEffect(() => {
    if (!selectedId) return;
    const timer = setInterval(() => {
      void load(selectedId);
    }, 3000);
    return () => clearInterval(timer);
  }, [selectedId, load]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, messageQuery]);

  // Debounced server-side message search
  React.useEffect(() => {
    const q = chatQuery.trim();
    if (q.length < 2) {
      const frame = requestAnimationFrame(() => {
        setResults([]);
        setSearching(false);
      });
      return () => cancelAnimationFrame(frame);
    }
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const found = await searchMessages(q);
        setResults(found as MessageSearchResult[]);
      } finally {
        setSearching(false);
      }
    }, 320);
    return () => clearTimeout(handle);
  }, [chatQuery]);

  React.useEffect(() => {
    if (msgSearchOpen) msgSearchRef.current?.focus();
  }, [msgSearchOpen]);

  function openConversation(id: string, fromSearch = false) {
    setSelectedId(id);
    if (fromSearch) {
      setMessageQuery(chatQuery.trim());
      setMsgSearchOpen(true);
    } else {
      setMessageQuery("");
      setMsgSearchOpen(false);
    }
    setChatQuery("");
  }

  const chatResults = conversations.filter((c) => {
    const q = chatQuery.trim().toLowerCase();
    if (!q) return true;
    const u = c.members.find((m) => m.id !== me.id);
    const name = (u?.username ?? u?.name ?? "").toLowerCase();
    return name.includes(q) || (c.lastMessage?.text ?? "").toLowerCase().includes(q);
  });

  function toggleEmoji() {
    setShowEmoji((v) => !v);
    setShowGifs(false);
    setShowStickers(false);
  }

  function toggleGifs() {
    setShowGifs((v) => !v);
    setShowEmoji(false);
    setShowStickers(false);
  }

  function toggleStickers() {
    setShowStickers((v) => !v);
    setShowEmoji(false);
    setShowGifs(false);
  }

  const handleReply = React.useCallback((m: MessageItem) => {
    setReplyTarget(m);
  }, []);

  const handleToggleReaction = React.useCallback(
    async (messageId: string, emoji: string) => {
      // Optimistic toggle.
      setMessages((list) =>
        list.map((m) => {
          if (m.id !== messageId) return m;
          const reactions = m.reactions ?? [];
          const ours = reactions.findIndex(
            (r) => r.emoji === emoji && r.userId === me.id
          );
          const next =
            ours >= 0
              ? reactions.filter((_, i) => i !== ours)
              : [...reactions, { emoji, userId: me.id }];
          return { ...m, reactions: next };
        })
      );
      const res = await toggleMessageReaction(messageId, emoji);
      if (!res.ok) {
        void 0;
        if (selectedId) void load(selectedId);
      }
    },
    [me.id, selectedId, load, t]
  );

  async function startRecording() {
    if (recording) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      void 0;
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordStreamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "";
      const recorder = new MediaRecorder(
        stream,
        mime ? { mimeType: mime } : undefined
      );
      recordChunksRef.current = [];
      recordCancelRef.current = false;
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        recordStreamRef.current = null;
        recorderRef.current = null;
        if (recordCancelRef.current || recordChunksRef.current.length === 0) {
          recordChunksRef.current = [];
          return;
        }
        const blob = new Blob(recordChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        recordChunksRef.current = [];
        const file = new File([blob], `voice-${Date.now()}.webm`, {
          type: blob.type,
        });
        void sendVoiceMessage(file);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecordSeconds(0);
      setRecording(true);
    } catch {
      void 0;
    }
  }

  function stopRecording(send: boolean) {
    recordCancelRef.current = !send;
    try {
      recorderRef.current?.stop();
    } catch {
      recordStreamRef.current?.getTracks().forEach((track) => track.stop());
      recorderRef.current = null;
    }
    setRecording(false);
  }

  async function sendVoiceMessage(file: File) {
    if (!selectedId) return;
    const target = selectedId;
    const quoteId = replyTarget?.id;
    setUploading(true);
    try {
      const media = await uploadFile(file);
      const res = await sendMessage(target, "", media.url, "audio", quoteId);
      if (res.ok) {
        setReplyTarget(null);
        await load(target);
        router.refresh();
      } else {
        void 0;
      }
    } catch (err) {
      void 0;
    } finally {
      setUploading(false);
    }
  }

  // Recording timer tick.
  React.useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(
      () => setRecordSeconds((seconds) => seconds + 1),
      1000
    );
    return () => window.clearInterval(timer);
  }, [recording]);

  // Stop the mic if the component unmounts mid-recording.
  React.useEffect(() => {
    return () => {
      recordCancelRef.current = true;
      try {
        recorderRef.current?.stop();
      } catch {
        /* already stopped */
      }
      recordStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    if (!selectedId || !text.trim() || sending) return;
    setSending(true);
    const body = text;
    const tempId = `temp-${Date.now()}`;
    const quoteId = replyTarget?.id;
    const quote = replyTarget
      ? {
          id: replyTarget.id,
          text: replyTarget.text,
          mediaType: replyTarget.mediaType ?? null,
          senderId: replyTarget.senderId,
          sender: {
            name: replyTarget.sender.name,
            username: replyTarget.sender.username ?? null,
          },
        }
      : null;
    setText("");
    setReplyTarget(null);
    // Optimistic: show the message right away while (a possibly slow) AI bot
    // is generating its answer on the server.
    setMessages((list) => [
      ...list,
      {
        id: tempId,
        text: body,
        imageUrl: null,
        mediaType: null,
        senderId: me.id,
        createdAt: new Date(),
        seen: false,
        sender: me,
        reactions: [],
        replyTo: quote,
      },
    ]);
    const res = await sendMessage(selectedId, body, undefined, undefined, quoteId);
    setSending(false);
    if (res.ok) {
      await load(selectedId);
      router.refresh();
    } else {
      setMessages((list) => list.filter((m) => m.id !== tempId));
      void 0;
    }
  }

  async function sendMedia(
    file: File,
    kind: "image" | "video",
    caption?: string
  ) {
    if (!selectedId) return;
    setUploading(true);
    try {
      const media = await uploadFile(file);
      const quoteId = replyTarget?.id;
      const res = await sendMessage(
        selectedId,
        caption ?? "",
        media.url,
        kind,
        quoteId
      );
      if (res.ok) {
        setReplyTarget(null);
        await load(selectedId);
        router.refresh();
      } else {
        void 0;
      }
    } catch (err) {
      void 0;
    } finally {
      setUploading(false);
    }
  }

  async function handleImage(file: File | undefined) {
    if (!file) return;
    await sendMedia(file, file.type.startsWith("video") ? "video" : "image");
  }

  async function handleGif(gif: { id: string; url: string; title: string }) {
    if (!selectedId) return;
    setShowGifs(false);
    const quoteId = replyTarget?.id;
    const res = await sendMessage(selectedId, "", gif.url, "gif", quoteId);
    if (res.ok) {
      setReplyTarget(null);
      await load(selectedId);
      router.refresh();
    } else {
      void 0;
    }
  }

  async function sendSticker(emoji: string) {
    if (!selectedId) return;
    setShowStickers(false);
    const quoteId = replyTarget?.id;
    const res = await sendMessage(
      selectedId,
      emoji,
      undefined,
      "sticker",
      quoteId
    );
    if (res.ok) {
      setReplyTarget(null);
      await load(selectedId);
      router.refresh();
    } else {
      void 0;
    }
  }

  async function sendMusic(file: File | undefined) {
    if (!file || !selectedId) return;
    const target = selectedId;
    const quoteId = replyTarget?.id;
    setUploading(true);
    try {
      const media = await uploadFile(file);
      const res = await sendMessage(target, "", media.url, "audio", quoteId);
      if (res.ok) {
        setReplyTarget(null);
        setShowStickers(false);
        await load(target);
        router.refresh();
      } else {
        void 0;
      }
    } catch (err) {
      void 0;
    } finally {
      setUploading(false);
    }
  }

  async function sendLocation() {
    if (!selectedId) return;
    if (!navigator.geolocation) {
      void 0;
      return;
    }
    setShowStickers(false);
    const target = selectedId;
    const quoteId = replyTarget?.id;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        void (async () => {
          const res = await sendMessage(
            target,
            `📍 https://www.google.com/maps?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`,
            undefined,
            undefined,
            quoteId
          );
          if (res.ok) {
            setReplyTarget(null);
            await load(target);
            router.refresh();
          } else {
            void 0;
          }
        })();
      },
      () => void 0,
      { timeout: 8000, maximumAge: 60_000 }
    );
  }

  async function sendDocument(file: File | undefined) {
    if (!file || !selectedId) return;
    const target = selectedId;
    const quoteId = replyTarget?.id;
    setUploading(true);
    try {
      const media = await uploadFile(file);
      const res = await sendMessage(
        target,
        file.name.slice(0, 120),
        media.url,
        "file",
        quoteId
      );
      if (res.ok) {
        setReplyTarget(null);
        setShowStickers(false);
        await load(target);
        router.refresh();
      } else {
        void 0;
      }
    } catch (err) {
      void 0;
    } finally {
      setUploading(false);
    }
  }

  async function handleEditMessage(id: string, body: string) {
    const res = await editMessage(id, body);
    if (res.ok) {
      setMessages((list) =>
        list.map((m) => (m.id === id ? { ...m, text: body.trim() || null } : m))
      );
      toast.success(t("Xabar tahrirlandi"));
      router.refresh();
    } else {
      void 0;
    }
  }

  async function handleDeleteMessage(id: string) {
    if (!window.confirm(t("Bu xabarni o'chirishni xohlaysizmi?"))) return;
    const res = await deleteMessage(id);
    if (res.ok) {
      setMessages((list) => list.filter((m) => m.id !== id));
      toast.success(t("Xabar o'chirildi"));
      router.refresh();
    } else {
      void 0;
    }
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] md:h-screen">
      {/* Conversation list */}
      <aside
        className={cn(
          "w-full flex-col md:flex md:w-[350px] md:border-e md:border-border/60",
          selectedId ? "hidden md:flex" : "flex"
        )}
      >
        <div className="space-y-2.5 border-b border-border/60 px-3 pb-3 pt-4">
          <div className="flex items-center justify-between px-1">
            <h1 className="text-[22px] font-extrabold leading-7 tracking-tight">
              {t("Xabarlar")}
            </h1>
            <span className="text-xs font-medium text-muted-foreground">
              @{me.username}
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
            <input
              value={chatQuery}
              onChange={(e) => setChatQuery(e.target.value)}
              placeholder={t("Suhbat yoki xabarni qidirish...")}
              className="h-10 w-full rounded-full border-0 bg-secondary/70 ps-10 pe-10 text-sm outline-none transition placeholder:text-muted-foreground/80 focus:bg-secondary focus:ring-2 focus:ring-ring/30"
            />
            {searching ? (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            ) : (
              chatQuery && (
                <button
                  onClick={() => setChatQuery("")}
                  aria-label={t("Tozalash")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )
            )}
          </div>
        </div>

        <div className="thin-scroll flex-1 overflow-y-auto">
          {/* Message results */}
          {chatQuery.trim().length >= 2 && (
            <div className="border-b">
              <p className="px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                {t("Xabarlar · {count}", { count: results.length })}
              </p>
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => openConversation(r.conversationId, true)}
                  className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent"
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary">
                    <MessageSquareText className="h-4 w-4 text-muted-foreground" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">
                      @{r.senderName}
                    </p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      <Highlight text={r.text} query={chatQuery} />
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      <TimeAgo date={r.createdAt} />
                    </p>
                  </div>
                  <CornerUpLeft className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </button>
              ))}
              {!searching && results.length === 0 && (
                <p className="px-4 pb-3 text-xs text-muted-foreground">
                  {t("Xabar topilmadi")}
                </p>
              )}
            </div>
          )}

          {/* Conversations */}
          {chatQuery && (
            <p className="px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {t("Suhbatlar · {count}", { count: chatResults.length })}
            </p>
          )}
          {conversations.length === 0 && !chatQuery && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {t("Hozircha suhbat yo'q")}
            </p>
          )}
          {chatResults.map((c) => {
            const u = c.members.find((m) => m.id !== me.id);
            const name = u?.username ?? u?.name ?? t("Foydalanuvchi");
            const unread = c.unreadCount ?? 0;
            const active = selectedId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={cn(
                  "group flex w-full items-center gap-3 px-3 py-2 text-left transition-colors duration-150 hover:bg-accent/60",
                  active && "bg-accent"
                )}
              >
                <div className="relative shrink-0">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={u?.image ?? undefined} alt={name} />
                    <AvatarFallback className="text-base font-bold">
                      {name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {u?.isOnline && !u?.isBot && (
                    <span
                      className="absolute bottom-0 end-0 h-4 w-4 rounded-full bg-emerald-500 ring-2 ring-background"
                      aria-label={t("Faol hozir")}
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p
                      className={cn(
                        "truncate text-[15px] leading-5",
                        unread > 0 ? "font-bold" : "font-normal"
                      )}
                    >
                      {name}
                    </p>
                    {u?.isVerified && (
                      <BadgeCheck className="h-4 w-4 shrink-0 text-[#0095f6]" />
                    )}
                    {u?.isBot && <BotBadge className="shrink-0" />}
                    <span className="ml-auto shrink-0 text-[11px] tabular-nums text-muted-foreground">
                      <TimeAgo date={c.lastMessage?.createdAt ?? c.updatedAt} />
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <p
                      className={cn(
                        "min-w-0 flex-1 truncate text-[13px] leading-4",
                        unread > 0
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {lastMessagePreview(c.lastMessage, t)}
                    </p>
                    {unread > 0 && (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#0095f6] px-1.5 text-[11px] font-bold text-white">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Chat */}
      <section
        className={cn(
          "relative flex-1 flex-col overflow-hidden",
          selectedId ? "flex" : "hidden md:flex"
        )}
      >
        {!selected ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="rounded-full border-2 p-5">
              <Send className="h-10 w-10" />
            </div>
            <p className="font-semibold">{t("Xabarlaringiz")}</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              {t("Birotdan xabar yuboring yoki mavjud suhbatni tanlang.")}
            </p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex h-[60px] shrink-0 items-center gap-3 border-b border-border/60 px-4">
              <button
                className="md:hidden"
                onClick={() => setSelectedId(null)}
                aria-label={t("Orqaga")}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <Link
                href={`/${other?.username}`}
                className="flex min-w-0 items-center gap-3"
              >
                <div className="relative shrink-0">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={other?.image ?? undefined} alt="user" />
                    <AvatarFallback>
                      {other?.name?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {other?.isOnline && !other?.isBot && (
                    <span className="absolute bottom-0 end-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background" />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="flex items-center gap-1 text-[15px] font-semibold leading-5">
                    <span className="truncate">{other?.username ?? other?.name}</span>
                    {other?.isVerified && (
                      <BadgeCheck className="h-4 w-4 shrink-0 text-[#0095f6]" />
                    )}
                    {other?.isBot && <BotBadge />}
                  </span>
                  {other?.isBot ? (
                    AI_ASSISTANTS_ENABLED ? (
                      <span className="text-[10px] font-medium text-violet-500">
                        {t("AI · onlayn")}
                      </span>
                    ) : null
                  ) : other?.isOnline ? (
                    <span className="text-[11px] font-medium leading-4 text-emerald-600 dark:text-emerald-400">
                      {t("Faol hozir")}
                    </span>
                  ) : (
                    other?.isPremium && (
                      <span className="text-[10px] font-medium text-amber-500">
                        {t("Premium")}
                      </span>
                    )
                  )}
                </div>
              </Link>
              <div className="ml-auto flex shrink-0 items-center gap-0.5">
                <button
                  onClick={() => setInfoOpen(true)}
                  aria-label={t("Chat haqida")}
                  className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <FaInfoCircle className="h-6 w-6" />
                </button>
                <button
                  onClick={() => {
                    if (callPeer && selectedId) {
                      void startCallWith(selectedId, callPeer, "audio");
                    }
                  }}
                  disabled={!callPeer || !!callPeer.isBot}
                  aria-label={t("Audio qo'ng'iroq")}
                  title={
                    callPeer?.isBot
                      ? t("Botlar bilan qo'ng'iroq qilish mumkin emas")
                      : t("Audio qo'ng'iroq")
                  }
                  className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Phone className="h-6 w-6" />
                </button>
                <button
                  onClick={() => {
                    if (callPeer && selectedId) {
                      void startCallWith(selectedId, callPeer, "video");
                    }
                  }}
                  disabled={!callPeer || !!callPeer.isBot}
                  aria-label={t("Video qo'ng'iroq")}
                  title={
                    callPeer?.isBot
                      ? t("Botlar bilan qo'ng'iroq qilish mumkin emas")
                      : t("Video qo'ng'iroq")
                  }
                  className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Video className="h-6 w-6" />
                </button>
              </div>
            </div>

            {botPaused && (
              <div className="mx-4 mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                {t("AI yordamchilar vaqtinchalik ishlamayapti")}
              </div>
            )}

            {/* Messages */}
            <div className="thin-scroll flex-1 space-y-0 overflow-y-auto px-4 py-2">
              {messages.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <span className="text-4xl">👋</span>
                  <p className="text-sm text-muted-foreground">
                    {t("Hali xabar yo'q. Salom deb yozing!")}
                  </p>
                </div>
              )}
              {messages.map((m, i) => {
                const prev = messages[i - 1];
                const consecutive =
                  !!prev &&
                  prev.senderId === m.senderId &&
                  new Date(m.createdAt).getTime() -
                    new Date(prev.createdAt).getTime() <
                    5 * 60 * 1000;
                return (
                  <MessageBubble
                    key={m.id}
                    m={m}
                    meId={me.id}
                    consecutive={consecutive}
                    onEdit={handleEditMessage}
                    onDelete={handleDeleteMessage}
                    onReply={handleReply}
                    onToggleReaction={handleToggleReaction}
                  />
                );
              })}
              {sending && other?.isBot && (
                <div className="mt-3 flex justify-start">
                  <div className="flex items-center gap-1.5 rounded-3xl bg-secondary px-4 py-3">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Composer */}
            <div ref={inputWrapRef} className="relative shrink-0 border-t border-border/60 p-3">
              {/* Popovers */}
              {showEmoji && (
                <div className="absolute bottom-full start-3 z-20 mb-2 w-[340px] max-w-[calc(100vw-2rem)] animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200">
                  <EmojiPicker
                    onPick={(e) => setText((prev) => prev + e)}
                  />
                </div>
              )}
              {showGifs && (
                <div className="absolute bottom-full start-3 z-20 mb-2 w-[360px] max-w-[calc(100vw-2rem)] animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200">
                  <GifPicker onPick={handleGif} />
                </div>
              )}
              {showStickers && (
                <div className="absolute bottom-full start-3 z-20 mb-2 w-[340px] max-w-[calc(100vw-2rem)] animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 rounded-2xl border bg-popover p-3 shadow-2xl duration-200">
                  <div className="mb-2 flex items-center justify-between gap-2 px-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      Choose a GIF or sticker
                    </p>
                    <button
                      onClick={() => setShowStickers(false)}
                      aria-label={t("Yopish")}
                      className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mb-2 grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => audioInputRef.current?.click()}
                      className="flex h-16 flex-col items-center justify-center gap-1 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white transition hover:brightness-110 active:scale-95"
                    >
                      <Music className="h-5 w-5" />
                      <span className="text-[10px] font-bold">{t("Musiqa")}</span>
                    </button>
                    <button
                      onClick={() => void sendLocation()}
                      className="flex h-16 flex-col items-center justify-center gap-1 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white transition hover:brightness-110 active:scale-95"
                    >
                      <MapPin className="h-5 w-5" />
                      <span className="text-[10px] font-bold">{t("Joylashuv")}</span>
                    </button>
                    <button
                      onClick={() => docInputRef.current?.click()}
                      className="flex h-16 flex-col items-center justify-center gap-1 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white transition hover:brightness-110 active:scale-95"
                    >
                      <FileText className="h-5 w-5" />
                      <span className="text-[10px] font-bold">{t("Fayl")}</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-6 gap-1">
                    {/* GIF tile — opens the GIF picker */}
                    <button
                      onClick={() => {
                        setShowStickers(false);
                        setShowGifs(true);
                      }}
                      className="col-span-2 flex h-[4.5rem] flex-col items-center justify-center gap-1 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 text-white transition hover:brightness-110 active:scale-95"
                    >
                      <span className="text-lg font-black leading-none tracking-tight">
                        GIF
                      </span>
                      <span className="text-[9px] font-semibold uppercase tracking-widest text-white/90">
                        Giphy
                      </span>
                    </button>
                    {STICKERS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => void sendSticker(emoji)}
                        aria-label={emoji}
                        className="flex h-11 items-center justify-center rounded-xl text-[26px] leading-none transition-colors hover:bg-accent active:scale-90"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Reply quote bar (Instagram-style) */}
              {replyTarget && (
                <div className="mb-2 flex animate-in fade-in-0 slide-in-from-bottom-2 items-center gap-2 rounded-2xl border-l-4 border-[#c13584] bg-muted px-3 py-2 duration-200">
                  <CornerUpLeft className="h-4 w-4 shrink-0 text-[#c13584]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold leading-tight text-[#c13584]">
                      {t("Javob berish")}:{" "}
                      {replyTarget.senderId === me.id
                        ? t("Siz")
                        : (replyTarget.sender.username ??
                          replyTarget.sender.name)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {replyTarget.text ??
                        (replyTarget.mediaType === "video"
                          ? t("📹 Video")
                          : replyTarget.mediaType === "gif"
                            ? "GIF"
                            : replyTarget.mediaType === "sticker"
                              ? t("🧩 Stiker")
                              : replyTarget.mediaType === "file"
                                ? t("📎 Fayl")
                                : t("📷 Rasm"))}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyTarget(null)}
                    aria-label={t("Iqtibosni bekor qilish")}
                    className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <form onSubmit={handleSend} className="flex items-end gap-2">
                <fieldset disabled={botPaused} className="contents">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => {
                    handleImage(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*,.mp3,.m4a,.aac,.ogg,.wav,.weba"
                  className="hidden"
                  onChange={(e) => {
                    void sendMusic(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <input
                  ref={docInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
                  className="hidden"
                  onChange={(e) => {
                    void sendDocument(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                {/* Input pill: emoji left, GIF/attach/mic right — all inside */}
                {recording ? (
                  <div className="flex min-w-0 flex-1 animate-in fade-in-0 items-center gap-2 rounded-full border border-red-500/40 bg-red-500/[0.06] px-2.5 py-1.5 duration-200">
                    <span className="relative ml-1 flex h-3.5 w-3.5 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-red-500" />
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-red-500">
                      {formatRecTime(recordSeconds)}
                    </span>
                    <div
                      className="flex h-6 min-w-0 flex-1 items-center justify-center gap-[3px] overflow-hidden"
                      aria-hidden="true"
                    >
                      {REC_WAVE_BARS.map((level, i) => (
                        <span
                          key={i}
                          className="animate-voice-wave w-[3px] origin-center rounded-full bg-red-400/80"
                          style={{
                            height: `${Math.round(level * 100)}%`,
                            animationDelay: `${(i % 7) * 0.09}s`,
                          }}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => stopRecording(false)}
                      aria-label={t("Yozishni bekor qilish")}
                      className="shrink-0 rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => stopRecording(true)}
                      aria-label={t("Ovozli xabarni yuborish")}
                      className="shrink-0 rounded-full bg-[#c13584] p-2.5 text-white shadow-sm transition transition-transform hover:bg-[#a92e74] active:scale-95"
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                <div className="flex min-w-0 flex-1 items-end rounded-full border border-input bg-background transition-shadow focus-within:ring-1 focus-within:ring-ring">
                  {/* Emoji */}
                  <button
                    type="button"
                    onClick={toggleEmoji}
                    aria-label={t("Emoji")}
                    className={cn(
                      "mb-1 ml-1 shrink-0 rounded-full p-1.5 transition-colors hover:bg-accent",
                      showEmoji && "bg-accent text-[#0095f6]"
                    )}
                  >
                    <SmilePlus className="h-6 w-6 text-muted-foreground" />
                  </button>

                  <div className="relative flex min-w-0 flex-1 items-end">
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      rows={1}
                      placeholder={t("Xabar yozing...")}
                      className="max-h-32 min-h-10 w-full resize-none border-0 bg-transparent px-1.5 py-2.5 text-[15px] outline-none placeholder:text-muted-foreground focus:ring-0"
                    />
                  </div>

                  {/* Stickers / GIF / music / files — rich media panel */}
                  <button
                    type="button"
                    onClick={toggleStickers}
                    aria-label={t("Stikerlar")}
                    className={cn(
                      "mb-1 shrink-0 rounded-full p-1.5 transition-colors hover:bg-accent",
                      showStickers && "bg-accent text-[#0095f6]"
                    )}
                  >
                    <Sticker className="h-6 w-6 text-muted-foreground" />
                  </button>

                  {/* Attach image/video */}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    aria-label={t("Rasm yoki video yuborish")}
                    className="mb-1 shrink-0 rounded-full p-1.5 transition-colors hover:bg-accent disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : (
                      <ImagePlus className="h-6 w-6 text-muted-foreground" />
                    )}
                  </button>

                  {/* Record voice message */}
                  <button
                    type="button"
                    onClick={() => void startRecording()}
                    aria-label={t("Ovozli xabar yozish")}
                    disabled={uploading}
                    className="mb-1 mr-1 shrink-0 rounded-full p-1.5 transition-colors hover:bg-accent disabled:opacity-50"
                  >
                    <Mic className="h-6 w-6 text-muted-foreground" />
                  </button>
                </div>
                )}

                {/* Send button — hidden while recording (the voice UI has its own) */}
                {!recording && (
                <button
                  type="submit"
                  disabled={!text.trim() || sending}
                  aria-label={t("Yuborish")}
                  className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0095f6] text-white transition-all hover:bg-[#1877f2] active:scale-95 disabled:opacity-40"
                >
                  {sending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
                )}
                </fieldset>
              </form>
            </div>
          </>
        )}

        {/* Chat info slide-over (Instagram-style details panel) */}
        {infoOpen && other && (
          <>
            <button
              className="absolute inset-0 z-30 animate-in fade-in-0 bg-black/45 duration-200"
              onClick={() => setInfoOpen(false)}
              aria-label={t("Yopish")}
            />
            <aside className="absolute end-0 top-0 z-40 flex h-full w-[300px] max-w-[85vw] animate-in slide-in-from-right-6 flex-col overflow-y-auto border-l border-border/60 bg-background shadow-2xl duration-200">
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                <p className="text-base font-bold tracking-tight">
                  {t("Chat haqida")}
                </p>
                <button
                  onClick={() => setInfoOpen(false)}
                  aria-label={t("Yopish")}
                  className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex flex-col items-center gap-2 border-b border-border/60 px-4 pb-6 pt-6">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage
                      src={other.image ?? undefined}
                      alt={other.username ?? other.name}
                    />
                    <AvatarFallback className="text-2xl font-bold">
                      {(other.name || other.username || "?")
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {other.isOnline && !other.isBot && (
                    <span className="absolute bottom-1 end-1 h-5 w-5 rounded-full bg-emerald-500 ring-4 ring-background" />
                  )}
                </div>
                <p className="flex items-center gap-1.5 text-lg font-bold leading-6">
                  <span className="max-w-[200px] truncate">
                    {other.username ?? other.name}
                  </span>
                  {other.isVerified && (
                    <BadgeCheck className="h-5 w-5 shrink-0 text-[#0095f6]" />
                  )}
                </p>
                {other.isBot ? (
                  <p className="text-xs font-semibold text-violet-500">
                    {t("AI · onlayn")}
                  </p>
                ) : other.isOnline ? (
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {t("Faol hozir")}
                  </p>
                ) : null}
                {other.isPremium && (
                  <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                    Premium
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 p-3">
                <Link
                  href={`/${other.username}`}
                  onClick={() => setInfoOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-accent"
                >
                  <User className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {t("Profilni ko'rish")}
                  </span>
                </Link>
                <button
                  onClick={() => {
                    setInfoOpen(false);
                    if (callPeer && selectedId) {
                      void startCallWith(selectedId, callPeer, "audio");
                    }
                  }}
                  disabled={!!other.isBot}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Phone className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {t("Audio qo'ng'iroq")}
                  </span>
                </button>
                <button
                  onClick={() => {
                    setInfoOpen(false);
                    if (callPeer && selectedId) {
                      void startCallWith(selectedId, callPeer, "video");
                    }
                  }}
                  disabled={!!other.isBot}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Video className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {t("Video qo'ng'iroq")}
                  </span>
                </button>
                {selectedId && (
                  <button
                    onClick={() => {
                      setInfoOpen(false);
                      setReportOpen(true);
                    }}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-accent"
                  >
                    <Flag className="h-5 w-5 shrink-0 text-destructive" />
                    <span className="text-sm font-medium text-destructive">
                      {t("Suhbatni shikoyat qilish")}
                    </span>
                  </button>
                )}
              </div>
            </aside>
          </>
        )}
      </section>

      {selectedId && (
        <ReportDialog
          targetType="conversation"
          targetId={selectedId}
          targetConversationId={selectedId}
          open={reportOpen}
          onOpenChange={setReportOpen}
        />
      )}
    </div>
  );
}
