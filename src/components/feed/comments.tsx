"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Crown, Heart, Loader2 } from "lucide-react";

import { addComment, deleteComment } from "@/actions/post";
import { grantPremiumFromComment } from "@/actions/premium";
import { useT } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";
import { TimeAgo } from "@/components/shared/time-ago";
import type { CommentWithUser, PostUser } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VerifiedBadge, PremiumBadge } from "@/components/shared/badges";
import { RichText } from "@/components/shared/rich-text";

export function Comments({
  postId,
  me,
  postOwnerId,
  compact = false,
  comments = [],
  onAdded,
}: {
  postId: string;
  me: PostUser;
  postOwnerId?: string;
  compact?: boolean;
  comments?: CommentWithUser[];
  onAdded?: () => void;
}) {
  const router = useRouter();
  const t = useT();
  const [text, setText] = React.useState("");
  const [posting, setPosting] = React.useState(false);
  const [local, setLocal] = React.useState<CommentWithUser[]>([]);

  const all = [...comments, ...local];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || posting) return;
    setPosting(true);
    const res = await addComment(postId, text);
    setPosting(false);
    if (res.ok && res.comment) {
      setLocal((l) => [
        ...l,
        {
          id: res.comment.id,
          text: res.comment.text,
          createdAt: res.comment.createdAt,
          userId: res.comment.userId,
          user: {
            id: me.id,
            username: me.username,
            name: me.name,
            image: me.image,
            isVerified: me.isVerified,
            isPremium: me.isPremium,
          },
        },
      ]);
      setText("");
      onAdded?.();
      router.refresh();
    }
  }

  const input = (
    <form
      onSubmit={submit}
      className={cn(
        "flex items-center gap-2",
        compact &&
          "rounded-full border bg-background/60 px-3.5 py-2 transition-colors focus-within:border-primary/50"
      )}
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("Izoh qoldiring...")}
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        disabled={posting}
      />
      {text.trim() && (
        <button
          type="submit"
          disabled={posting}
          className="shrink-0 text-sm font-bold text-violet-500 transition hover:opacity-80 disabled:opacity-50"
        >
          {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Joylash")}
        </button>
      )}
    </form>
  );

  if (compact) {
    return <div className="pt-1">{input}</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {all.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("Hozircha izoh yo'q. Birinchi bo'ling!")}
          </p>
        ) : (
          all.map((c) => (
            <CommentRow
              key={c.id}
              comment={c}
              me={me}
              postOwnerId={postOwnerId}
              canDelete={me.id === c.userId || postOwnerId === me.id}
              onDelete={() => setLocal((l) => l.filter((x) => x.id !== c.id))}
            />
          ))
        )}
      </div>
      <div className="border-t p-3">{input}</div>
    </div>
  );
}

function CommentRow({
  comment,
  canDelete = false,
  me,
  postOwnerId,
  onDelete,
}: {
  comment: CommentWithUser;
  canDelete?: boolean;
  me?: PostUser;
  postOwnerId?: string;
  onDelete?: () => void;
}) {
  const username = comment.user.username ?? comment.user.name;
  const router = useRouter();
  const t = useT();
  const [liked, setLiked] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [granting, setGranting] = React.useState(false);

  const isPostOwner = me?.id && postOwnerId && me.id === postOwnerId;
  const canGrantPremium =
    isPostOwner &&
    me?.id !== comment.userId &&
    !comment.user.isPremium;

  async function handleDelete() {
    setBusy(true);
    const res = await deleteComment(comment.id);
    setBusy(false);
    if (res.ok) {
      onDelete?.();
      router.refresh();
    }
  }

  async function handleGrantPremium() {
    if (granting) return;
    setGranting(true);
    const res = await grantPremiumFromComment(comment.id);
    setGranting(false);
    if (!res.ok) {
      void 0;
      return;
    }
    toast.success(t("Premium sovg'a qilindi 🎉"));
    router.refresh();
  }

  return (
    <div className="group flex gap-3 rounded-2xl px-2 py-1.5 transition-colors hover:bg-accent/40">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={comment.user.image ?? undefined} alt={username} />
        <AvatarFallback className="text-[10px]">
          {username.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 text-sm">
        <p>
          <Link
            href={`/${username}`}
            className="mr-1 inline-flex items-center gap-1 font-semibold hover:opacity-70"
          >
            {username}
            {comment.user.isVerified && <VerifiedBadge className="h-3.5 w-3.5" />}
            {comment.user.isPremium && <PremiumBadge className="px-1.5" />}
          </Link>
          <RichText text={comment.text} />
        </p>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <TimeAgo date={comment.createdAt} />
          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={busy}
              className="font-semibold opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100 disabled:opacity-50"
            >
              {t("O'chirish")}
            </button>
          )}
          {canGrantPremium && (
            <button
              onClick={handleGrantPremium}
              disabled={granting}
              className="flex items-center gap-1 font-semibold opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100 disabled:opacity-50"
              title={t("Sizga obuna bo'lgan foydalanuvchiga premium sovg'a qilish")}
            >
              {granting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Crown className="h-3.5 w-3.5" />
              )}
              {t("Premium berish")}
            </button>
          )}
        </div>
      </div>
      <button
        onClick={() => setLiked((v) => !v)}
        className="self-end rounded-full p-1 transition hover:bg-rose-500/10 active:scale-90"
        aria-label={t("Izohni yoqtirish")}
      >
        <Heart
          className={cn(
            "h-3.5 w-3.5 transition-colors",
            liked ? "fill-like text-like" : "text-muted-foreground"
          )}
        />
      </button>
    </div>
  );
}
