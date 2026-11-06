"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Music2 } from "lucide-react";

import type { StoryGroup } from "@/actions/story";
import { timeAgo } from "@/lib/utils";
import { useT } from "@/hooks/use-i18n";
import { StoryViewer } from "@/components/stories/story-viewer";
import { StoryComposer } from "@/components/stories/story-composer";
import type { PostUser } from "@/lib/types";

/**
 * The story / highlight bubble row shown under a profile header. Owners can
 * add a story right here; tapping a bubble opens the shared story player.
 */
export function HighlightsRow({
  group,
  me,
  isMe,
}: {
  group: StoryGroup | null;
  me: PostUser;
  isMe: boolean;
}) {
  const router = useRouter();
  const t = useT();
  const [viewing, setViewing] = React.useState(false);
  const [composing, setComposing] = React.useState(false);

  const stories = group?.stories ?? [];
  if (!stories.length && !isMe) return null;

  return (
    <div className="relative">
      <div className="flex items-start gap-3.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {isMe && (
          <button
            type="button"
            onClick={() => setComposing(true)}
            className="group flex w-[76px] shrink-0 flex-col items-center gap-1.5"
          >
            <span className="relative grid h-[70px] w-[70px] place-items-center rounded-full border-2 border-dashed border-primary/40 bg-primary/5 text-primary transition group-hover:border-primary/70 group-hover:bg-primary/10 group-active:scale-95">
              <Plus className="h-6 w-6" />
            </span>
            <span className="text-[11px] font-semibold text-muted-foreground">
              {t("Hikoya")}
            </span>
          </button>
        )}

        {stories.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setViewing(true)}
            className="group flex w-[76px] shrink-0 flex-col items-center gap-1.5"
          >
            <span className="story-ring rounded-full p-[2.5px] transition group-hover:brightness-110 group-active:scale-95">
              <span className="block rounded-full bg-background p-[2px]">
                <span
                  className="relative block h-[62px] w-[62px] overflow-hidden rounded-full bg-muted"
                  style={
                    s.kind === "text"
                      ? { background: s.background ?? undefined }
                      : undefined
                  }
                >
                  {s.kind === "text" ? (
                    <span className="grid h-full w-full place-items-center px-2 text-center text-[13px] font-extrabold leading-tight text-white drop-shadow">
                      {(s.content ?? "").slice(0, 24)}
                    </span>
                  ) : s.mediaType === "video" ? (
                    <video
                      src={s.mediaUrl ?? undefined}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.mediaUrl ?? undefined}
                      alt=""
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                    />
                  )}
                  {s.music && (
                    <span className="absolute bottom-0.5 end-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white">
                      <Music2 className="h-2.5 w-2.5" />
                    </span>
                  )}
                </span>
              </span>
            </span>
            <span className="w-full truncate text-center text-[11px] font-medium text-muted-foreground">
              {timeAgo(s.createdAt)}
            </span>
          </button>
        ))}
      </div>

      {viewing && group && (
        <StoryViewer
          groups={[group]}
          startIndex={0}
          me={me}
          onClose={() => setViewing(false)}
          onChanged={() => router.refresh()}
        />
      )}

      <StoryComposer
        open={composing}
        onOpenChange={setComposing}
        onCreated={() => router.refresh()}
      />
    </div>
  );
}
