"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
  Pencil,
  Eye,
  Flag,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";

import {
  toggleLike,
  toggleSave,
  getComments,
  deletePost,
  recordView,
} from "@/actions/post";
import { useT } from "@/hooks/use-i18n";
import { parseMedia, formatNumber, cn } from "@/lib/utils";
import { TimeAgo } from "@/components/shared/time-ago";
import { useVideoMuted, toggleVideoMuted } from "@/lib/video-sound";
import type { PostWithDetails, PostUser, CommentWithUser } from "@/lib/types";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VerifiedBadge, PremiumBadge } from "@/components/shared/badges";
import { RichText } from "@/components/shared/rich-text";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Comments } from "./comments";
import { LikesDialog } from "./likes-dialog";
import { filterCss } from "@/lib/media-presets";
import { OverlayLayer } from "@/components/media/overlay-layer";
import { EditPostDialog } from "./edit-post-dialog";
import { ReportDialog } from "./report-dialog";

export function PostDetailDialog({
  post,
  me,
  open,
  onOpenChange,
}: {
  post: PostWithDetails;
  me: PostUser;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const t = useT();
  const media = React.useMemo(() => parseMedia(post.media), [post.media]);
  const [index, setIndex] = React.useState(0);
  const [liked, setLiked] = React.useState(post.likedByMe);
  const [likeCount, setLikeCount] = React.useState(post._count.likes);
  const [saved, setSaved] = React.useState(post.savedByMe);
  const [comments, setComments] = React.useState<CommentWithUser[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [likesOpen, setLikesOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [reportOpen, setReportOpen] = React.useState(false);
  const muted = useVideoMuted();

  React.useEffect(() => {
    if (open && comments.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(true);
      getComments(post.id)
        .then((c) => setComments(c as CommentWithUser[]))
        .finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const isOwner = post.userId === me.id;

  const viewedRef = React.useRef(false);
  React.useEffect(() => {
    if (open && !isOwner && !viewedRef.current) {
      viewedRef.current = true;
      recordView(post.id).catch(() => {});
    }
  }, [open, isOwner, post.id]);

  async function handleLike() {
    setLiked((v) => !v);
    setLikeCount((c) => (liked ? c - 1 : c + 1));
    await toggleLike(post.id);
  }

  async function handleSave() {
    setSaved((v) => !v);
    const res = await toggleSave(post.id);
    toast.success(res.saved ? t("Saqlandi") : t("Olib tashlandi"));
  }

  async function handleDelete() {
    const res = await deletePost(post.id);
    if (res.ok) {
      toast.success(t("Post o'chirildi"));
      onOpenChange(false);
      router.refresh();
    }
  }

  const username = post.user.username ?? post.user.name;
  const current = media[index];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl overflow-hidden p-0" hideClose>
        <div className="grid max-h-[85vh] md:grid-cols-[1.4fr_1fr]">
          <div className="relative flex items-center justify-center bg-black">
            {current?.type === "video" ? (
              <video
                src={current.url}
                className="max-h-[85vh] w-full"
                style={{ filter: filterCss(current.edit?.filter) }}
                autoPlay
                preload="auto"
                loop
                muted={muted}
              />
            ) : (
              <Image
                src={current?.url ?? "/globe.svg"}
                alt="post"
                width={1080}
                height={1080}
                className="max-h-[85vh] w-full object-contain"
                style={{ filter: filterCss(current?.edit?.filter) }}
                unoptimized
              />
            )}
            <OverlayLayer overlays={current?.overlays} />
            {current?.type === "video" && (
              <button
                type="button"
                onClick={() => toggleVideoMuted()}
                className="absolute bottom-3 end-3 z-20 grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur-md transition hover:bg-black/70 active:scale-90"
                aria-label={muted ? t("Ovozni yoqish") : t("Ovozni o'chirish")}
              >
                {muted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </button>
            )}
            {media.length > 1 && (
              <>
                {index > 0 && (
                  <button
                    onClick={() => setIndex((i) => i - 1)}
                    className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/80 p-1 text-black"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                )}
                {index < media.length - 1 && (
                  <button
                    onClick={() => setIndex((i) => i + 1)}
                    className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/80 p-1 text-black"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                )}
              </>
            )}
          </div>

          <div className="flex max-h-[85vh] flex-col">
            <header className="flex items-center gap-3 border-b p-4">
              <Avatar className="h-8 w-8">
                <AvatarImage src={post.user.image ?? undefined} alt={username} />
                <AvatarFallback className="text-[10px]">
                  {username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Link
                href={`/${username}`}
                className="flex flex-1 items-center gap-1 text-sm font-semibold"
              >
                {username}
                {post.user.isVerified && <VerifiedBadge className="h-3.5 w-3.5" />}
                {post.user.isPremium && <PremiumBadge className="px-1.5" />}
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button aria-label={t("more")}>
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {isOwner ? (
                    <>
                      <DropdownMenuItem onClick={() => setEditOpen(true)}>
                        <Pencil /> {t("Tahrirlash")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleDelete}
                        className="text-like focus:text-like"
                      >
                        <Trash2 /> {t("O'chirish")}
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `${window.location.origin}/p/${post.id}`
                          );
                          toast.success(t("Havola nusxalandi"));
                        }}
                      >
                        {t("Havolani nusxalash")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setReportOpen(true)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Flag /> {t("Shikoyat qilish")}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </header>

            <div className="flex-1 overflow-hidden">
              {post.caption && (
                <div className="flex gap-3 border-b p-4">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={post.user.image ?? undefined} alt={username} />
                    <AvatarFallback className="text-[10px]">
                      {username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm">
                    <Link
                      href={`/${username}`}
                      className="mr-1 inline-flex items-center gap-1 font-semibold"
                    >
                      {username}
                      {post.user.isVerified && (
                        <VerifiedBadge className="h-3.5 w-3.5" />
                      )}
                    </Link>
                    <RichText text={post.caption} />
                    <TimeAgo date={post.createdAt} className="mt-1 block text-xs text-muted-foreground" />
                    {post.editedAt && <> · {t("tahrirlangan")}</>}
                  </p>
                </div>
              )}

              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Comments
                  postId={post.id}
                  me={me}
                  postOwnerId={post.userId}
                  comments={comments}
                />
              )}
            </div>

            <div className="border-t">
              <div className="flex items-center gap-4 px-4 pt-3">
                <button onClick={handleLike} aria-label={t("like")}>
                  <Heart
                    className={cn("h-6 w-6", liked ? "fill-like text-like" : "")}
                  />
                </button>
                <MessageCircle className="h-6 w-6 -scale-x-100" />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/p/${post.id}`
                    );
                    toast.success(t("Havola nusxalandi"));
                  }}
                  aria-label={t("share")}
                >
                  <Send className="h-6 w-6" />
                </button>
                <button onClick={handleSave} className="ms-auto" aria-label={t("save")}>
                  <Bookmark className={cn("h-6 w-6", saved && "fill-current")} />
                </button>
              </div>
              <div className="flex items-center gap-4 p-4 pt-2 text-sm">
                <button
                  onClick={() => setLikesOpen(true)}
                  className="font-semibold hover:opacity-70"
                >
                  {t("{count} ta yoqdi", { count: formatNumber(likeCount) })}
                </button>
                {isOwner && post._count.views > 0 && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Eye className="h-3.5 w-3.5" />
                    {t("{count} ko'rish", { count: formatNumber(post._count.views) })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <LikesDialog
          postId={post.id}
          open={likesOpen}
          onOpenChange={setLikesOpen}
        />
        <EditPostDialog post={post} open={editOpen} onOpenChange={setEditOpen} />
        <ReportDialog
          targetType="post"
          targetId={post.id}
          open={reportOpen}
          onOpenChange={setReportOpen}
        />
      </DialogContent>
    </Dialog>
  );
}
