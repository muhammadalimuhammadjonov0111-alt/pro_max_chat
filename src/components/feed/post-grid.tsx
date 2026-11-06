"use client";

import * as React from "react";
import Image from "next/image";
import { Heart, MessageCircle, Play } from "lucide-react";

import { parseMedia, formatCount } from "@/lib/utils";
import type { PostWithDetails, PostUser } from "@/lib/types";
import { useT } from "@/hooks/use-i18n";
import { PostDetailDialog } from "./post-detail";

export function PostGrid({
  posts,
  me,
  emptyText,
}: {
  posts: PostWithDetails[];
  me: PostUser;
  emptyText?: string;
}) {
  const t = useT();
  const [active, setActive] = React.useState<PostWithDetails | null>(null);

  if (!posts.length) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        {emptyText ?? t("Hozircha post yo'q")}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
        {posts.map((post, i) => {
          const media = parseMedia(post.media);
          const first = media[0];
          return (
            <button
              key={post.id}
              onClick={() => setActive(post)}
              className="group relative aspect-square overflow-hidden bg-muted"
            >
              {first?.type === "video" ? (
                <>
                  <video
                    src={first.url}
                    className="h-full w-full object-cover"
                    muted
                  />
                  <Play className="absolute end-2 top-2 h-4 w-4 fill-white text-white" />
                </>
              ) : (
                <Image
                  src={first?.url ?? "/globe.svg"}
                  alt={post.caption ?? "post"}
                  width={400}
                  height={400}
                  className="h-full w-full object-cover"
                  loading={i === 0 ? "eager" : undefined}
                  unoptimized
                />
              )}

              <div className="absolute inset-0 hidden items-center justify-center gap-5 bg-black/40 text-sm font-semibold text-white group-hover:flex">
                <span className="flex items-center gap-1.5">
                  <Heart className="h-5 w-5 fill-white" />
                  {formatCount(post._count.likes)}
                </span>
                <span className="flex items-center gap-1.5">
                  <MessageCircle className="h-5 w-5 fill-white" />
                  {formatCount(post._count.comments)}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {active && (
        <PostDetailDialog
          post={active}
          me={me}
          open={!!active}
          onOpenChange={(o) => !o && setActive(null)}
        />
      )}
    </>
  );
}
