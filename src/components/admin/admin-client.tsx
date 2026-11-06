"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Users,
  ImageIcon,
  Clapperboard,
  Bot,
  Heart,
  MessageCircle,
  TrendingUp,
  Wallet,
  ReceiptText,
  BadgeCheck,
  Crown,
  ShieldCheck,
  Ban,
  Trash2,
  Search,
  Loader2,
  Flag,
  UserCog,
  CheckCircle2,
  XCircle,
  LayoutDashboard,
  Megaphone,
  Pencil,
  MoreVertical,
  Eye,
  Link2,
  UserPlus,
  Sparkles,
  Send,
  Power,
  Clock,
  Copy,
  Eraser,
  Info,
  AlertTriangle,
  CheckCheck,
  Film,
  CalendarDays,
} from "lucide-react";

import {
  adminSetVerified,
  adminSetPremium,
  adminSetRole,
  adminToggleBan,
  adminDeleteUser,
  adminDeletePost,
  adminSetReportStatus,
  adminBulkReportStatus,
  adminUpdateUser,
  adminSetPrivate,
  adminDeleteUserPosts,
  adminDeleteUserStories,
  adminCreateAnnouncement,
  adminToggleAnnouncement,
  adminDeleteAnnouncement,
  adminGetReportedConversation,
  adminDeleteMessage,
} from "@/actions/admin";
import { confirmPayment, testTelegram } from "@/actions/premium";
import {
  adminCreateBot,
  adminDeleteBot,
  type BotListItem,
} from "@/actions/bot";
import { BOT_CATEGORIES, getCategory } from "@/lib/bot-categories";
import { useT } from "@/hooks/use-i18n";
import { formatNumber, parseMedia, cn, formatDate } from "@/lib/utils";
import { TimeAgo } from "@/components/shared/time-ago";
import { formatSom } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  VerifiedBadge,
  AdminBadge,
  PremiumBadge,
} from "@/components/shared/badges";
import { AdminAdsPanel } from "@/components/admin/admin-ads";
import { AdminGifsPanel } from "@/components/admin/admin-gifs";
import type { AdminGifItem } from "@/actions/admin-gifs";
import type { AdminAd } from "@/actions/ads";

type Stats = {
  users: number;
  posts: number;
  reels: number;
  stories: number;
  comments: number;
  likes: number;
  follows: number;
  messages: number;
  premiumUsers: number;
  verifiedUsers: number;
  bannedUsers: number;
  admins: number;
  openReports: number;
  revenue: number;
  newUsers7d: number;
  newPosts7d: number;
  messages24h: number;
  activeSubscriptions: number;
  activeAnnouncements: number;
};

type AdminUser = {
  id: string;
  name: string;
  username: string | null;
  email: string;
  image: string | null;
  role: string;
  isVerified: boolean;
  isPremium: boolean;
  isBanned: boolean;
  isPrivate: boolean;
  createdAt: string;
  _count: { posts: number; followers: number; following: number };
};

type AdminPost = {
  id: string;
  caption: string | null;
  media: string;
  isReel: boolean;
  createdAt: string;
  user: { id: string; username: string | null; name: string; isVerified: boolean };
  _count: { likes: number; comments: number; views: number };
};

type AdminSub = {
  id: string;
  plan: string;
  amount: number;
  status: string;
  endsAt: string;
  createdAt: string;
  user: { id: string; username: string | null; name: string; image: string | null };
};

export type AdminPayment = {
  id: string;
  plan: string;
  amount: number;
  method: string;
  status: string;
  comment: string | null;
  cardNumber: string | null;
  createdAt: string;
  confirmedAt: string | null;
  telegramSentAt: string | null;
  receiptUrl: string | null;
  receiptTelegramSentAt: string | null;
  user: { id: string; username: string | null; name: string; image: string | null };
};

type AdminReport = {
  id: string;
  targetType: string;
  targetId: string;
  targetConversationId?: string | null;
  reason: string;
  status: string;
  createdAt: string;
  reporter: {
    id: string;
    username: string | null;
    name: string;
    image: string | null;
  };
};

type ReportedConversation = {
  id: string;
  createdAt: string | Date;
  members: { id: string; username: string | null; name: string; image: string | null; isBanned: boolean }[];
  messages: {
    id: string;
    text: string | null;
    imageUrl: string | null;
    mediaType: string | null;
    senderId: string;
    senderName: string;
    createdAt: string | Date;
  }[];
};

type AdminAnnouncement = {
  id: string;
  title: string;
  body: string;
  level: string;
  active: boolean;
  createdAt: string;
  expiresAt: string | null;
};

const GRADIENTS = [
  "from-blue-500 to-indigo-500",
  "from-violet-500 to-fuchsia-500",
  "from-pink-500 to-rose-500",
  "from-emerald-500 to-teal-500",
  "from-amber-400 to-orange-500",
  "from-sky-400 to-cyan-500",
  "from-rose-500 to-red-500",
  "from-lime-500 to-emerald-500",
  "from-slate-700 to-slate-500",
  "from-purple-500 to-indigo-500",
];

function StatCard({
  icon: Icon,
  label,
  value,
  tint,
  hint,
  delay = 0,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tint: string;
  hint?: string;
  delay?: number;
}) {
  return (
    <div
      className="hover-lift animate-fade-in-up surface group relative overflow-hidden p-4"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={cn(
          "absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br opacity-10 blur-xl transition-opacity group-hover:opacity-25",
          tint
        )}
      />
      <span
        className={cn(
          "mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md",
          tint
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <p className="text-2xl font-extrabold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {hint && (
        <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-500">
          <TrendingUp className="h-3 w-3" /> {hint}
        </p>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
        active
          ? "border-transparent bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-background hover:bg-accent"
      )}
    >
      {children}
    </button>
  );
}

function EmptyState({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-14 text-muted-foreground">
      <span className="icon-tile-soft">
        <Icon className="h-5 w-5" />
      </span>
      <p className="text-sm">{text}</p>
    </div>
  );
}

export function AdminClient({
  adminName,
  adminUsername,
  stats,
  users,
  posts,
  subs,
  payments = [],
  reports,
  announcements,
  bots,
  ads,
  gifs,
}: {
  adminName: string;
  adminUsername: string | null;
  stats: Stats;
  users: AdminUser[];
  posts: AdminPost[];
  subs: AdminSub[];
  payments?: AdminPayment[];
  reports: AdminReport[];
  announcements: AdminAnnouncement[];
  bots: BotListItem[];
  ads: AdminAd[];
  gifs: AdminGifItem[];
}) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [userFilter, setUserFilter] = React.useState<
    "all" | "verified" | "premium" | "admin" | "banned" | "private"
  >("all");

  const [postQuery, setPostQuery] = React.useState("");
  const [postFilter, setPostFilter] = React.useState<"all" | "reels">("all");

  const [reportFilter, setReportFilter] = React.useState<
    "all" | "open" | "resolved" | "dismissed"
  >("open");

  const [paymentFilter, setPaymentFilter] = React.useState<
    "all" | "pending" | "paid" | "rejected"
  >("pending");

  const [convPreview, setConvPreview] =
    React.useState<ReportedConversation | null>(null);
  const [convLoading, setConvLoading] = React.useState(false);

  const [editing, setEditing] = React.useState<AdminUser | null>(null);

  async function run(
    key: string,
    fn: () => Promise<{ ok: boolean; error?: string }>,
    successMsg = t("Bajarildi")
  ) {
    setBusy(key);
    try {
      const res = await fn();
      if (!res.ok) void 0;
      else {
        toast.success(successMsg);
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  const filteredUsers = users.filter((u) => {
    const q = query.trim().toLowerCase();
    const matches =
      !q ||
      u.name.toLowerCase().includes(q) ||
      (u.username ?? "").toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q);
    if (!matches) return false;
    switch (userFilter) {
      case "verified":
        return u.isVerified;
      case "premium":
        return u.isPremium;
      case "admin":
        return u.role === "ADMIN";
      case "banned":
        return u.isBanned;
      case "private":
        return u.isPrivate;
      default:
        return true;
    }
  });

  const filteredPosts = posts.filter((p) => {
    const q = postQuery.trim().toLowerCase();
    if (postFilter === "reels" && !p.isReel) return false;
    if (!q) return true;
    return (
      (p.caption ?? "").toLowerCase().includes(q) ||
      (p.user.username ?? p.user.name).toLowerCase().includes(q)
    );
  });

  const filteredReports = reports.filter((r) =>
    reportFilter === "all" ? true : r.status === reportFilter
  );

  const openReports = reports.filter((r) => r.status === "open").length;
  const pendingAds = ads.filter((a) => a.status === "PENDING").length;
  const revenueSubs = subs.filter((s) => s.status === "active");

  async function confirmAndRun(
    message: string,
    key: string,
    fn: () => Promise<{ ok: boolean; error?: string }>,
    successMsg?: string
  ) {
    if (!confirm(message)) return;
    await run(key, fn, successMsg);
  }

  return (
    <div className="pb-24 sm:pb-12">
      {/* Hero */}
      <header className="aurora relative mb-5 mt-4 overflow-hidden rounded-2xl border bg-card card-shadow sm:mt-6">
        <div className="relative z-10 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-slate-600 text-white shadow-lg">
              <UserCog className="h-6 w-6" />
            </span>
            <div>
              <h1 className="flex items-center gap-1.5 text-xl font-extrabold tracking-tight">
                {t("Admin panel")}
                <ShieldCheck className="h-4.5 w-4.5 text-amber-500" />
              </h1>
              <p className="text-sm text-muted-foreground">
                {adminName} · @{adminUsername ?? "admin"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold">
              {t("{count} foydalanuvchi", { count: formatNumber(stats.users) })}
            </span>
            {openReports > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-3 py-1.5 text-xs font-semibold text-destructive">
                <Flag className="h-3.5 w-3.5" />{" "}
                {t("{count} ochiq shikoyat", { count: openReports })}
              </span>
            )}
          </div>
        </div>
      </header>

      <Tabs defaultValue="overview">
        <TabsList className="mb-5 h-11 w-full justify-start gap-1 overflow-x-auto rounded-2xl bg-muted/70 p-1 no-scrollbar">
          <TabsTrigger value="overview" className="rounded-xl">
            <LayoutDashboard className="me-1.5 h-4 w-4" /> {t("Umumiy")}
          </TabsTrigger>
          <TabsTrigger value="users" className="rounded-xl">
            <Users className="me-1.5 h-4 w-4" /> {t("Foydalanuvchilar")}
          </TabsTrigger>
          <TabsTrigger value="posts" className="rounded-xl">
            <ImageIcon className="me-1.5 h-4 w-4" /> {t("Kontent")}
          </TabsTrigger>
          <TabsTrigger value="subs" className="rounded-xl">
            <Wallet className="me-1.5 h-4 w-4" /> {t("Obunalar")}
          </TabsTrigger>
          <TabsTrigger value="payments" className="rounded-xl">
            <Wallet className="me-1.5 h-4 w-4" /> {t("To'lovlar")}
            {payments.filter((p) => p.status === "pending").length > 0 && (
              <span className="ms-1.5 rounded-full bg-amber-500 px-1.5 text-[10px] text-white">
                {payments.filter((p) => p.status === "pending").length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="reports" className="rounded-xl">
            <Flag className="me-1.5 h-4 w-4" /> {t("Shikoyatlar")}
            {openReports > 0 && (
              <span className="ms-1.5 rounded-full bg-destructive px-1.5 text-[10px] text-white">
                {openReports}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="bots" className="rounded-xl">
            <Bot className="me-1.5 h-4 w-4" /> {t("AI botlar")}
          </TabsTrigger>
          <TabsTrigger value="announce" className="rounded-xl">
            <Megaphone className="me-1.5 h-4 w-4" /> {t("Xabarnoma")}
          </TabsTrigger>
          <TabsTrigger value="ads" className="rounded-xl">
            <Sparkles className="me-1.5 h-4 w-4" /> {t("Reklama")}
            {pendingAds > 0 && (
              <span className="ms-1.5 rounded-full bg-amber-500 px-1.5 text-[10px] text-white">
                {pendingAds}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="gifs" className="rounded-xl">
            <Film className="me-1.5 h-4 w-4" /> {t("GIF'lar")}
          </TabsTrigger>
        </TabsList>

        {/* ---------------------------------------------------------- */}
        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard icon={Users} label={t("Foydalanuvchilar")} value={formatNumber(stats.users)} tint={GRADIENTS[0]} hint={t("+{count} bu hafta", { count: stats.newUsers7d })} delay={0} />
            <StatCard icon={ImageIcon} label={t("Postlar")} value={formatNumber(stats.posts)} tint={GRADIENTS[1]} hint={t("+{count} bu hafta", { count: stats.newPosts7d })} delay={40} />
            <StatCard icon={Clapperboard} label={t("Reels")} value={formatNumber(stats.reels)} tint={GRADIENTS[2]} delay={80} />
            <StatCard icon={Wallet} label={t("Daromad")} value={formatSom(stats.revenue)} tint={GRADIENTS[3]} delay={120} />
            <StatCard icon={Crown} label={t("Premium a'zolar")} value={formatNumber(stats.premiumUsers)} tint={GRADIENTS[4]} delay={160} />
            <StatCard icon={BadgeCheck} label={t("Tasdiqlangan")} value={formatNumber(stats.verifiedUsers)} tint={GRADIENTS[5]} delay={200} />
            <StatCard icon={Heart} label={t("Yoqtirishlar")} value={formatNumber(stats.likes)} tint={GRADIENTS[6]} delay={240} />
            <StatCard icon={MessageCircle} label={t("Izohlar")} value={formatNumber(stats.comments)} tint={GRADIENTS[7]} delay={280} />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { icon: Sparkles, label: t("Story"), value: stats.stories },
              { icon: Link2, label: t("Kuzatishlar"), value: stats.follows },
              { icon: Send, label: t("Xabar"), value: stats.messages },
              { icon: MessageCircle, label: t("24s xabar"), value: stats.messages24h },
              { icon: Ban, label: t("Bloklangan"), value: stats.bannedUsers },
              { icon: ShieldCheck, label: t("Adminlar"), value: stats.admins },
            ].map((s) => (
              <div
                key={s.label}
                className="surface flex items-center gap-3 p-3"
              >
                <span className="icon-tile-soft h-9 w-9">
                  <s.icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-bold">{formatNumber(s.value)}</p>
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="surface p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-bold">
                  <UserPlus className="h-4 w-4 text-primary" /> {t("Yangi foydalanuvchilar")}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {t("{count} jami", { count: formatNumber(stats.users) })}
                </span>
              </div>
              <div className="space-y-2">
                {users.slice(0, 5).map((u) => (
                  <Link
                    key={u.id}
                    href={`/${u.username ?? ""}`}
                    className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-accent"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={u.image ?? undefined} alt={u.name} />
                      <AvatarFallback>
                        {u.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1 truncate text-sm font-semibold">
                        {u.username ?? u.name}
                        {u.isVerified && <VerifiedBadge className="h-3.5 w-3.5" />}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {u.email}
                      </p>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      <TimeAgo date={u.createdAt} />
                    </span>
                  </Link>
                ))}
                {users.length === 0 && <EmptyState icon={Users} text={t("Bo'sh")} />}
              </div>
            </section>

            <section className="surface p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-bold">
                  <Film className="h-4 w-4 text-pink-500" /> {t("So'nggi postlar")}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {t("{count} jami", { count: formatNumber(stats.posts) })}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {posts.slice(0, 8).map((p) => {
                  const thumb = parseMedia(p.media)[0];
                  return (
                    <Link
                      key={p.id}
                      href={`/p/${p.id}`}
                      className="group relative aspect-square overflow-hidden rounded-xl border bg-secondary"
                    >
                      {thumb ? (
                        <Image
                          src={thumb.url}
                          alt="post"
                          width={140}
                          height={140}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          unoptimized
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        </span>
                      )}
                      {p.isReel && (
                        <Clapperboard className="absolute end-1.5 top-1.5 h-3.5 w-3.5 text-white drop-shadow" />
                      )}
                      <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-gradient-to-t from-black/70 to-transparent py-1 text-[10px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                        <Heart className="h-3 w-3" /> {p._count.likes}
                        <MessageCircle className="h-3 w-3" /> {p._count.comments}
                      </span>
                    </Link>
                  );
                })}
              </div>
              {posts.length === 0 && <EmptyState icon={ImageIcon} text={t("Postlar yo'q")} />}
            </section>
          </div>
        </TabsContent>

        {/* ---------------------------------------------------------- */}
        {/* USERS */}
        <TabsContent value="users" className="space-y-4">
          <div className="surface space-y-3 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("Ism, username yoki email bo'yicha qidirish...")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="ps-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["all", t("Barchasi"), stats.users],
                  ["verified", t("Tasdiqlangan"), stats.verifiedUsers],
                  ["premium", t("Premium"), stats.premiumUsers],
                  ["admin", t("Adminlar"), stats.admins],
                  ["banned", t("Bloklangan"), stats.bannedUsers],
                  ["private", t("Yopiq"), null],
                ] as const
              ).map(([key, label, count]) => (
                <FilterChip
                  key={key}
                  active={userFilter === key}
                  onClick={() => setUserFilter(key)}
                >
                  {label}
                  {count !== null && (
                    <span className="ms-1 opacity-70">{formatNumber(count)}</span>
                  )}
                </FilterChip>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border bg-card">
            {filteredUsers.map((u) => (
              <div
                key={u.id}
                className="flex flex-col gap-3 border-b p-3 transition-colors last:border-0 hover:bg-accent/40 sm:flex-row sm:items-center"
              >
                <Link
                  href={`/${u.username ?? ""}`}
                  className="flex flex-1 items-center gap-3"
                >
                  <Avatar className="h-11 w-11 ring-2 ring-border">
                    <AvatarImage src={u.image ?? undefined} alt={u.name} />
                    <AvatarFallback>
                      {u.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-1 text-sm font-semibold">
                      <span className="truncate">{u.username ?? u.name}</span>
                      {u.isVerified && <VerifiedBadge className="h-3.5 w-3.5" />}
                      {u.role === "ADMIN" && <AdminBadge className="h-3.5 w-3.5" />}
                      {u.isPremium && <PremiumBadge />}
                      {u.isBanned && (
                        <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-white">
                          {t("Bloklangan")}
                        </span>
                      )}
                      {u.isPrivate && (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          {t("Yopiq")}
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {u.email} ·{" "}
                      {t("{posts} post · {followers} kuzatuvchi", {
                        posts: u._count.posts,
                        followers: u._count.followers,
                      })}
                    </p>
                  </div>
                </Link>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    size="icon-sm"
                    variant={u.isVerified ? "blue" : "outline"}
                    title={u.isVerified ? t("Tasdiqni olish") : t("Tasdiqlash")}
                    disabled={busy === `v${u.id}`}
                    onClick={() =>
                      run(`v${u.id}`, () => adminSetVerified(u.id, !u.isVerified))
                    }
                  >
                    {busy === `v${u.id}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <BadgeCheck className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="icon-sm"
                    variant={u.isPremium ? "gradient" : "outline"}
                    title={u.isPremium ? t("Premiumdan olish") : t("Premium qilish")}
                    disabled={busy === `p${u.id}`}
                    onClick={() =>
                      run(`p${u.id}`, () => adminSetPremium(u.id, !u.isPremium))
                    }
                  >
                    <Crown className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant={u.role === "ADMIN" ? "default" : "outline"}
                    title={u.role === "ADMIN" ? t("Adminlikdan olish") : t("Admin qilish")}
                    disabled={busy === `r${u.id}`}
                    onClick={() =>
                      run(`r${u.id}`, () =>
                        adminSetRole(u.id, u.role === "ADMIN" ? "USER" : "ADMIN")
                      )
                    }
                  >
                    <ShieldCheck className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="outline"
                    title={u.isBanned ? t("Blokdan chiqarish") : t("Bloklash")}
                    disabled={busy === `b${u.id}`}
                    onClick={() => run(`b${u.id}`, () => adminToggleBan(u.id))}
                  >
                    <Ban className="h-4 w-4" />
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon-sm" variant="outline" title={t("Ko'proq")}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => setEditing(u)}>
                        <Pencil /> {t("Tahrirlash")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          run(`pv${u.id}`, () =>
                            adminSetPrivate(u.id, !u.isPrivate)
                          )
                        }
                      >
                        <Eye /> {u.isPrivate ? t("Ochiq qilish") : t("Yopiq qilish")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          void navigator.clipboard
                            ?.writeText(u.id)
                            .then(() => toast.success(t("ID nusxalandi")))
                        }
                      >
                        <Copy /> {t("ID nusxalash")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() =>
                          confirmAndRun(
                            t("{name} ning barcha postlari o'chirilsinmi?", {
                              name: u.name,
                            }),
                            `wp${u.id}`,
                            () => adminDeleteUserPosts(u.id),
                            t("Postlar o'chirildi")
                          )
                        }
                      >
                        <Eraser /> {t("Postlarini o'chirish")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          confirmAndRun(
                            t("{name} ning story lari o'chirilsinmi?", {
                              name: u.name,
                            }),
                            `ws${u.id}`,
                            () => adminDeleteUserStories(u.id),
                            t("Story lar o'chirildi")
                          )
                        }
                      >
                        <Eraser /> {t("Story larini o'chirish")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() =>
                          confirmAndRun(
                            t("{name} butunlay o'chirilsinmi? Bu qaytarilmaydi.", {
                              name: u.name,
                            }),
                            `d${u.id}`,
                            () => adminDeleteUser(u.id),
                            t("Foydalanuvchi o'chirildi")
                          )
                        }
                      >
                        <Trash2 /> {t("Hisobni o'chirish")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <EmptyState icon={Users} text={t("Foydalanuvchi topilmadi")} />
            )}
          </div>
        </TabsContent>

        {/* ---------------------------------------------------------- */}
        {/* POSTS */}
        <TabsContent value="posts" className="space-y-4">
          <div className="surface space-y-3 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("Izoh yoki muallif bo'yicha qidirish...")}
                value={postQuery}
                onChange={(e) => setPostQuery(e.target.value)}
                className="ps-9"
              />
            </div>
            <div className="flex gap-2">
              <FilterChip
                active={postFilter === "all"}
                onClick={() => setPostFilter("all")}
              >
                {t("Barcha postlar")}
              </FilterChip>
              <FilterChip
                active={postFilter === "reels"}
                onClick={() => setPostFilter("reels")}
              >
                <Film className="me-1 inline h-3.5 w-3.5" /> Reels
              </FilterChip>
            </div>
          </div>

          <div className="space-y-2">
            {filteredPosts.map((p, i) => {
              const thumb = parseMedia(p.media)[0];
              return (
                <div key={p.id} className="surface flex items-center gap-3 p-3">
                  <Link href={`/p/${p.id}`} className="shrink-0">
                    {thumb ? (
                      <Image
                        src={thumb.url}
                        alt="post"
                        width={64}
                        height={64}
                        className="h-16 w-16 rounded-xl object-cover"
                        loading={i === 0 ? "eager" : undefined}
                        unoptimized
                      />
                    ) : (
                      <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-secondary">
                        <ImageIcon className="h-5 w-5" />
                      </span>
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                      @{p.user.username ?? p.user.name}
                      {p.user.isVerified && <VerifiedBadge className="h-3.5 w-3.5" />}
                      {p.isReel && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px]">
                          <Clapperboard className="h-3 w-3" /> Reel
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.caption ?? t("Izohsiz")}
                    </p>
                    <p className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Heart className="h-3 w-3" /> {formatNumber(p._count.likes)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />{" "}
                        {formatNumber(p._count.comments)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Eye className="h-3 w-3" /> {formatNumber(p._count.views)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" /> <TimeAgo date={p.createdAt} />
                      </span>
                    </p>
                  </div>
                  <Button
                    size="icon-sm"
                    variant="outline"
                    className="text-destructive"
                    disabled={busy === `dp${p.id}`}
                    onClick={() =>
                      confirmAndRun(
                        t("Post o'chirilsinmi?"),
                        `dp${p.id}`,
                        () => adminDeletePost(p.id),
                        t("Post o'chirildi")
                      )
                    }
                  >
                    {busy === `dp${p.id}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              );
            })}
            {filteredPosts.length === 0 && (
              <EmptyState icon={ImageIcon} text={t("Postlar topilmadi")} />
            )}
          </div>
        </TabsContent>

        {/* ---------------------------------------------------------- */}
        {/* SUBS */}
        <TabsContent value="subs" className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={Wallet} label={t("Faol obunalar")} value={formatNumber(stats.activeSubscriptions)} tint={GRADIENTS[3]} />
            <StatCard icon={Crown} label={t("Premium a'zolar")} value={formatNumber(stats.premiumUsers)} tint={GRADIENTS[4]} />
            <StatCard icon={CalendarDays} label={t("Umumiy daromad")} value={formatSom(stats.revenue)} tint={GRADIENTS[5]} />
          </div>

          <div className="overflow-hidden rounded-2xl border bg-card">
            <div className="grid grid-cols-4 gap-2 border-b bg-secondary/50 px-4 py-2.5 text-xs font-semibold text-muted-foreground">
              <span>{t("Foydalanuvchi")}</span>
              <span>{t("Tarif")}</span>
              <span>{t("Summa")}</span>
              <span>{t("Holat")}</span>
            </div>
            {subs.map((s) => (
              <div
                key={s.id}
                className="grid grid-cols-4 items-center gap-2 border-b px-4 py-3 text-sm last:border-0"
              >
                <Link
                  href={`/${s.user.username ?? ""}`}
                  className="flex items-center gap-2 truncate font-medium"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={s.user.image ?? undefined} alt={s.user.name} />
                    <AvatarFallback className="text-[10px]">
                      {s.user.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">@{s.user.username ?? s.user.name}</span>
                </Link>
                <span className="capitalize">
                  {s.plan === "yearly" ? t("Yillik") : t("Oylik")}
                </span>
                <span className="font-semibold">{formatSom(s.amount)}</span>
                <span>
                  <Badge
                    variant={s.status === "active" ? "default" : "secondary"}
                    className="capitalize"
                  >
                    {s.status}
                  </Badge>
                </span>
              </div>
            ))}
            {subs.length === 0 && (
              <EmptyState icon={Wallet} text={t("Obunalar yo'q")} />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("Faol obunalar: {active} · Jami daromad: {total}", {
              active: revenueSubs.length,
              total: formatSom(stats.revenue),
            })}
          </p>
        </TabsContent>

        {/* ---------------------------------------------------------- */}
        {/* PAYMENTS */}
        <TabsContent value="payments" className="space-y-4">
          <div className="surface flex flex-wrap items-center gap-2 p-3">
            {(
              [
                ["pending", t("Kutilmoqda")],
                ["all", t("Barchasi")],
                ["paid", t("Tasdiqlangan")],
                ["rejected", t("Rad etilgan")],
              ] as const
            ).map(([key, label]) => (
              <FilterChip
                key={key}
                active={paymentFilter === key}
                onClick={() => setPaymentFilter(key)}
              >
                {label}
              </FilterChip>
            ))}
            <span className="ms-auto text-xs text-muted-foreground">
              {t("Kartaingizga pul tushganini tekshirib tasdiqlang")}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={busy === "tg-test"}
              onClick={() =>
                confirmAndRun(
                  t("Telegram botga test xabar yuborilsinmi?"),
                  "tg-test",
                  () => testTelegram(),
                  t("Test xabar yuborildi")
                )
              }
            >
              <Send className="h-3.5 w-3.5" /> {t("Telegramni tekshirish")}
            </Button>
          </div>

          <div className="space-y-2">
            {payments
              .filter((p) => (paymentFilter === "all" ? true : p.status === paymentFilter))
              .map((p) => (
                <div key={p.id} className="surface flex flex-col gap-3 p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <span className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    p.status === "pending"
                      ? "bg-amber-500/15 text-amber-600"
                      : p.status === "paid"
                        ? "bg-emerald-500/15 text-emerald-600"
                        : "bg-destructive/10 text-destructive"
                  )}>
                    <Wallet className="h-4 w-4" />
                  </span>
                  <div className="flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                      @{p.user.username ?? p.user.name} · {formatSom(p.amount)}
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px]">
                        {p.method === "click" ? "Click" : "Payme"}
                      </span>
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px] capitalize">
                        {p.plan === "yearly" ? t("Yillik") : t("Oylik")}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t("Izoh")}: <code>{p.comment}</code> ·{" "}
                      <TimeAgo date={p.createdAt} />
                      {p.telegramSentAt && <> · {t("Telegramga yuborilgan")}</>}
                      {p.receiptTelegramSentAt && <> · {t("Chek Telegramda")}</>}
                    </p>
                    {p.receiptUrl ? (
                      <p className="mt-1 flex items-center gap-2 text-xs">
                        <ReceiptText className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {t("Chek yuklangan")}{p.receiptTelegramSentAt ? ` · ${t("Telegramga yuborilgan")}` : ""}
                        </span>
                        <a href={p.receiptUrl} target="_blank" rel="noopener" className="underline">
                          {t("Chekni ko'rish")}
                        </a>
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("Chek hali yuklanmagan")}
                      </p>
                    )}
                  </div>
                  <Badge variant={p.status === "paid" ? "default" : p.status === "rejected" ? "destructive" : "secondary"} className="capitalize">
                    {p.status}
                  </Badge>
                  {p.status === "pending" && (
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === `pay${p.id}`}
                        onClick={() =>
                          confirmAndRun(
                            t("Bu to'lov tasdiqlansinmi? Premium avtomatik yoqiladi."),
                            `pay${p.id}`,
                            () => confirmPayment(p.id, true),
                            t("To'lov tasdiqlandi")
                          )
                        }
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> {t("Tasdiqlash")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === `rej${p.id}`}
                        onClick={() =>
                          confirmAndRun(
                            t("Bu to'lov rad etilsinmi?"),
                            `rej${p.id}`,
                            () => confirmPayment(p.id, false),
                            t("Rad etildi")
                          )
                        }
                      >
                        <XCircle className="h-3.5 w-3.5" /> {t("Rad")}
                      </Button>
                    </div>
                  )}
                  </div>
                  {p.receiptUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <a href={p.receiptUrl} target="_blank" rel="noopener" className="block overflow-hidden rounded-xl border">
                      {/* Chek rasm ko'rinishi (PDF bo'lsa ochiladi) */}
                      {p.receiptUrl.toLowerCase().endsWith(".pdf") ? (
                        <span className="block bg-secondary/50 p-3 text-xs">📄 PDF chek — ochish uchun bosing</span>
                      ) : (
                        <img src={p.receiptUrl} alt="Chek" className="max-h-64 w-full object-contain bg-black/5" loading="lazy" />
                      )}
                    </a>
                  )}
                </div>
              ))}
            {payments.filter((p) => (paymentFilter === "all" ? true : p.status === paymentFilter)).length === 0 && (
              <EmptyState icon={Wallet} text={t("To'lovlar yo'q")} />
            )}
          </div>
        </TabsContent>

        {/* ---------------------------------------------------------- */}
        {/* REPORTS */}
        <TabsContent value="reports" className="space-y-4">
          <div className="surface flex flex-wrap items-center gap-2 p-3">
            {(
              [
                ["open", t("Ochiq")],
                ["resolved", t("Hal qilingan")],
                ["dismissed", t("Rad etilgan")],
                ["all", t("Barchasi")],
              ] as const
            ).map(([key, label]) => (
              <FilterChip
                key={key}
                active={reportFilter === key}
                onClick={() => setReportFilter(key)}
              >
                {label}
              </FilterChip>
            ))}
            <div className="ms-auto flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={busy === "bulk-resolve" || openReports === 0}
                onClick={() =>
                  confirmAndRun(
                    t("Barcha ochiq shikoyatlar hal qilingan deb belgilanadimi?"),
                    "bulk-resolve",
                    () => adminBulkReportStatus("resolved"),
                    t("Barchasi hal qilindi")
                  )
                }
              >
                <CheckCheck className="h-4 w-4" /> {t("Barchasini hal qilish")}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {filteredReports.map((r) => (
              <div
                key={r.id}
                className="surface flex flex-col gap-3 p-3 sm:flex-row sm:items-center"
              >
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    r.status === "open"
                      ? "bg-destructive/12 text-destructive"
                      : "bg-secondary text-muted-foreground"
                  )}
                >
                  <Flag className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold">
                    @{r.reporter.username ?? r.reporter.name}{" "}
                    <span className="text-muted-foreground">→</span>{" "}
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-xs capitalize">
                      {r.targetType}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">{r.reason}</p>
                  <p className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> <TimeAgo date={r.createdAt} />
                    </span>
                    <Badge variant="secondary" className="capitalize">
                      {r.status}
                    </Badge>
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(r.targetType === "conversation" || r.targetType === "message") && r.targetConversationId && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={convLoading}
                      onClick={async () => {
                        setConvLoading(true);
                        try {
                          const data = await adminGetReportedConversation(
                            r.targetConversationId!
                          );
                          setConvPreview(data as ReportedConversation | null);
                        } finally {
                          setConvLoading(false);
                        }
                      }}
                    >
                      <Eye className="h-3.5 w-3.5" /> {t("Suhbatni ko'rish")}
                    </Button>
                  )}
                  {r.status === "open" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === `rr${r.id}`}
                        onClick={() =>
                          run(`rr${r.id}`, () =>
                            adminSetReportStatus(r.id, "resolved")
                          )
                        }
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> {t("Hal qilindi")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === `rd${r.id}`}
                        onClick={() =>
                          run(`rd${r.id}`, () =>
                            adminSetReportStatus(r.id, "dismissed")
                          )
                        }
                      >
                        <XCircle className="h-3.5 w-3.5" /> {t("Rad")}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {filteredReports.length === 0 && (
              <EmptyState icon={TrendingUp} text={t("Shikoyatlar yo'q")} />
            )}
          </div>
        </TabsContent>

        {/* Reported conversation modal */}
        <Dialog open={!!convPreview} onOpenChange={(o) => !o && setConvPreview(null)}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("Shikoyat qilingan suhbat")}</DialogTitle>
            </DialogHeader>
            {convPreview && (
              <div className="space-y-3">
                <div className="rounded-xl bg-secondary/60 p-3 text-xs">
                  <p className="font-semibold">{t("Ishtirokchilar")}</p>
                  {convPreview.members.map((m) => (
                    <p key={m.id} className="mt-1 flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={m.image ?? undefined} alt={m.name} />
                        <AvatarFallback className="text-[9px]">
                          {m.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      @{m.username ?? m.name}
                      {m.isBanned && (
                        <span className="rounded bg-destructive px-1 text-[10px] text-white">{t("Bloklangan")}</span>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="ms-auto"
                        disabled={busy === `ban${m.id}`}
                        onClick={() => run(`ban${m.id}`, () => adminToggleBan(m.id))}
                      >
                        <Ban className="h-3.5 w-3.5" /> {t("Bloklash")}
                      </Button>
                    </p>
                  ))}
                </div>
                <div className="space-y-1.5">
                  {convPreview.messages.map((m) => (
                    <div key={m.id} className="group flex items-start gap-2 rounded-xl border px-3 py-2 text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold">@{m.senderName} · <TimeAgo date={m.createdAt} /></p>
                        <p className="whitespace-pre-wrap break-words">{m.text}</p>
                        {m.imageUrl && <p className="text-[11px] text-muted-foreground">[media: {m.mediaType}]</p>}
                      </div>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100"
                        title={t("Xabarni o'chirish")}
                        disabled={busy === `dm${m.id}`}
                        onClick={() =>
                          run(`dm${m.id}`, async () => {
                            await adminDeleteMessage(m.id);
                            setConvPreview((prev) =>
                              prev
                                ? { ...prev, messages: prev.messages.filter((x) => x.id !== m.id) }
                                : prev
                            );
                            return { ok: true };
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {convPreview.messages.length === 0 && (
                    <p className="text-sm text-muted-foreground">{t("Xabarlar yo'q")}</p>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {t("Faqat shikoyat qilingan suhbat ko'rsatiladi.")}
                </p>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ---------------------------------------------------------- */}
        {/* ANNOUNCEMENTS */}
        {/* BOTS */}
        <TabsContent value="bots" className="space-y-4">
          <BotComposer busy={busy} onDone={() => router.refresh()} />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                icon: Bot,
                label: t("Jami botlar"),
                value: bots.length,
                tint: GRADIENTS[4],
              },
              {
                icon: Users,
                label: t("Ommaviy"),
                value: bots.filter((b) => b.botPublic).length,
                tint: GRADIENTS[0],
              },
              {
                icon: MessageCircle,
                label: t("Javoblar"),
                value: bots.reduce((s, b) => s + b.replyCount, 0),
                tint: GRADIENTS[2],
              },
              {
                icon: Heart,
                label: t("Obunachilar"),
                value: bots.reduce((s, b) => s + b.followerCount, 0),
                tint: GRADIENTS[1],
              },
            ].map((s) => (
              <div key={s.label} className="surface flex items-center gap-3 p-3">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-white",
                    s.tint
                  )}
                >
                  <s.icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-bold">{formatNumber(s.value)}</p>
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {bots.length === 0 ? (
              <EmptyState icon={Bot} text={t("Hozircha AI bot yo'q")} />
            ) : (
              bots.map((b) => {
                const cat = getCategory(b.botCategory);
                return (
                  <div key={b.id} className="surface p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-11 w-11">
                        <AvatarImage src={b.image ?? undefined} alt={b.name} />
                        <AvatarFallback>
                          {b.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/${b.username ?? ""}`}
                          className="flex items-center gap-1.5 text-sm font-bold hover:underline"
                        >
                          {b.name}
                          {b.isVerified && (
                            <BadgeCheck className="h-3.5 w-3.5 text-[#0095f6]" />
                          )}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">
                          @{b.username} · {cat.emoji} {t(cat.label)}
                        </p>
                        <p className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {formatNumber(b.followerCount)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            {formatNumber(b.replyCount)}
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-bold",
                              b.botPublic
                                ? "bg-emerald-500/15 text-emerald-600"
                                : "bg-secondary text-muted-foreground"
                            )}
                          >
                            {b.botPublic ? t("Ommaviy") : t("Yopiq")}
                          </span>
                        </p>
                      </div>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        title={t("Botni o'chirish")}
                        disabled={busy === `db${b.id}`}
                        onClick={() =>
                          run(
                            `db${b.id}`,
                            () => adminDeleteBot(b.id),
                            t("Bot o'chirildi")
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="announce" className="space-y-4">
          <AnnouncementComposer
            busy={busy}
            onDone={() => router.refresh()}
          />
          <div className="space-y-2">
            {announcements.map((a) => (
              <div key={a.id} className="surface p-4">
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white",
                      a.level === "warning"
                        ? "bg-gradient-to-br from-amber-400 to-orange-500"
                        : a.level === "success"
                          ? "bg-gradient-to-br from-emerald-500 to-teal-500"
                          : "bg-gradient-to-br from-blue-500 to-indigo-500"
                    )}
                  >
                    {a.level === "warning" ? (
                      <AlertTriangle className="h-5 w-5" />
                    ) : a.level === "success" ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Info className="h-5 w-5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-bold">
                      {a.title}
                      {a.active ? (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                          {t("Faol")}
                        </span>
                      ) : (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                          {t("O'chirilgan")}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 whitespace-pre-line text-sm text-muted-foreground">
                      {a.body}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <CalendarDays className="h-3 w-3" />
                      {formatDate(a.createdAt)}
                      {a.expiresAt && (
                        <>
                          <span>·</span>
                          <Clock className="h-3 w-3" />
                          {t("{date} gacha", { date: formatDate(a.expiresAt) })}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button
                      size="icon-sm"
                      variant={a.active ? "outline" : "gradient"}
                      title={a.active ? t("Faolsizlantirish") : t("Faollashtirish")}
                      disabled={busy === `ta${a.id}`}
                      onClick={() =>
                        run(`ta${a.id}`, () =>
                          adminToggleAnnouncement(a.id, !a.active)
                        )
                      }
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="outline"
                      className="text-destructive"
                      disabled={busy === `da${a.id}`}
                      onClick={() =>
                        confirmAndRun(
                          t("Xabarnoma o'chirilsinmi?"),
                          `da${a.id}`,
                          () => adminDeleteAnnouncement(a.id),
                          t("O'chirildi")
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {announcements.length === 0 && (
              <EmptyState icon={Megaphone} text={t("Xabarnomalar yo'q")} />
            )}
          </div>
        </TabsContent>

        <TabsContent value="ads" className="space-y-4">
          <AdminAdsPanel ads={ads} />
        </TabsContent>

        <TabsContent value="gifs" className="space-y-4">
          <AdminGifsPanel gifs={gifs} />
        </TabsContent>
      </Tabs>

      {/* Edit user dialog */}
      <EditUserDialog
        key={editing?.id ?? "none"}
        user={editing}
        onDone={() => {
          setEditing(null);
          router.refresh();
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function AnnouncementComposer({
  busy,
  onDone,
}: {
  busy: string | null;
  onDone: () => void;
}) {
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [level, setLevel] = React.useState<"info" | "warning" | "success">("info");
  const [expiresAt, setExpiresAt] = React.useState("");
  const [notify, setNotify] = React.useState(true);
  const t = useT();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      void 0;
      return;
    }
    const res = await adminCreateAnnouncement({
      title,
      body,
      level,
      expiresAt: expiresAt || null,
      notify,
    });
    if (!res.ok) {
      void 0;
      return;
    }
    toast.success(t("Xabarnoma yaratildi"));
    setTitle("");
    setBody("");
    setExpiresAt("");
    setLevel("info");
    onDone();
  }

  return (
    <form onSubmit={submit} className="surface space-y-4 p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-500 text-white shadow-md">
          <Megaphone className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-sm font-bold">{t("Yangi xabarnoma")}</h2>
          <p className="text-xs text-muted-foreground">
            {t("Sayt bosh sahifasida banner sifatida ko'rsatiladi")}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>{t("Sarlavha")}</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("Masalan: Yangi Reels funksiyasi!")}
          maxLength={80}
        />
      </div>

      <div className="space-y-1.5">
        <Label>{t("Matn")}</Label>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("Batafsil ma'lumot...")}
          className="min-h-[80px] resize-none"
          maxLength={400}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t("Turi")}</Label>
          <div className="flex gap-2">
            {(
              [
                ["info", t("Ma'lumot")],
                ["warning", t("Ogohlantirish")],
                ["success", t("Yangilik")],
              ] as const
            ).map(([key, label]) => (
              <FilterChip
                key={key}
                active={level === key}
                onClick={() => setLevel(key)}
              >
                {label}
              </FilterChip>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />{" "}
            {t("Tugash sanasi (ixtiyoriy)")}
          </Label>
          <Input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border bg-background/60 p-3">
        <div>
          <p className="text-sm font-medium">{t("Bildirishnoma ham yuborilsin")}</p>
          <p className="text-xs text-muted-foreground">
            {t("Barcha foydalanuvchilarga notification yuboriladi")}
          </p>
        </div>
        <Switch checked={notify} onCheckedChange={setNotify} />
      </div>

      <Button
        type="submit"
        variant="gradient"
        className="w-full"
        disabled={busy === "announce"}
      >
        {busy === "announce" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        {t("E'lon qilish")}
      </Button>
    </form>
  );
}

function BotComposer({
  busy,
  onDone,
}: {
  busy: string | null;
  onDone: () => void;
}) {
  const [name, setName] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [category, setCategory] = React.useState("assistant");
  const [description, setDescription] = React.useState("");
  const [prompt, setPrompt] = React.useState("");
  const [isPublic, setIsPublic] = React.useState(true);
  const t = useT();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await adminCreateBot({
      name,
      username,
      botDescription: description,
      botPrompt: prompt,
      botCategory: category,
      botPublic: isPublic,
    });
    if (!res.ok) {
      void 0;
      return;
    }
    toast.success(t("AI bot yaratildi"));
    setName("");
    setUsername("");
    setDescription("");
    setPrompt("");
    setCategory("assistant");
    onDone();
  }

  return (
    <form onSubmit={submit} className="surface space-y-4 p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-md">
          <Bot className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-sm font-bold">{t("Yangi AI bot")}</h2>
          <p className="text-xs text-muted-foreground">
            {t("Rasmiy bot yaratish — foydalanuvchilar u bilan yozishadi")}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t("Nomi")}</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("Masalan: Gidgogram yordamchisi")}
            maxLength={50}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Username</Label>
          <Input
            value={username}
            onChange={(e) =>
              setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""))
            }
            placeholder={t("yordamchi")}
            maxLength={30}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>{t("Kategoriya")}</Label>
        <div className="flex flex-wrap gap-2">
          {BOT_CATEGORIES.map((c) => (
            <FilterChip
              key={c.id}
              active={category === c.id}
              onClick={() => setCategory(c.id)}
            >
              {c.emoji} {t(c.label)}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>{t("Qisqa tavsif")}</Label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("Bot nima qiladi?")}
          maxLength={120}
        />
      </div>

      <div className="space-y-1.5">
        <Label>{t("Ko'rsatmalar (prompt)")}</Label>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value.slice(0, 1000))}
          placeholder={t("Bot qanday javob berishi kerak?")}
          className="min-h-[80px] resize-none"
        />
      </div>

      <div className="flex items-center justify-between rounded-xl border bg-background/60 p-3">
        <div>
          <p className="text-sm font-medium">{t("Ommaviy bot")}</p>
          <p className="text-xs text-muted-foreground">
            {t("Botlar ro'yxatida ko'rinadi")}
          </p>
        </div>
        <Switch checked={isPublic} onCheckedChange={setIsPublic} />
      </div>

      <Button
        type="submit"
        variant="gradient"
        className="w-full"
        disabled={busy === "bot" || !name.trim() || !username.trim()}
      >
        {busy === "bot" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
        {t("Botni yaratish")}
      </Button>
    </form>
  );
}

function EditUserDialog({
  user,
  onDone,
}: {
  user: AdminUser | null;
  onDone: () => void;
}) {
  const t = useT();
  const [name, setName] = React.useState(user?.name ?? "");
  const [username, setUsername] = React.useState(user?.username ?? "");
  const [email, setEmail] = React.useState(user?.email ?? "");
  const [saving, setSaving] = React.useState(false);

  async function save() {
    if (!user) return;
    setSaving(true);
    const res = await adminUpdateUser(user.id, { name, username, email });
    setSaving(false);
    if (!res.ok) {
      void 0;
      return;
    }
    toast.success(t("Saqlandi"));
    onDone();
  }

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onDone()}>
      <DialogContent className="max-w-md">
        <DialogHeader className="border-b p-4">
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" /> {t("Foydalanuvchini tahrirlash")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 p-4 pt-0">
          {user && (
            <div className="flex items-center gap-3 rounded-xl bg-secondary/60 p-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.image ?? undefined} alt={user.name} />
                <AvatarFallback>
                  {user.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {user.username ?? user.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {t("{posts} post · {followers} kuzatuvchi", {
                    posts: formatNumber(user._count.posts),
                    followers: formatNumber(user._count.followers),
                  })}
                </p>
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>{t("Ism")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Username</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onDone}>
              {t("Bekor qilish")}
            </Button>
            <Button
              variant="gradient"
              className="flex-1"
              disabled={saving}
              onClick={save}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("Saqlash")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
