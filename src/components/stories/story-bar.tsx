"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { type StoryGroup } from "@/actions/story";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/use-i18n";
import type { PostUser } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StoryViewer } from "./story-viewer";
import { StoryComposer } from "./story-composer";

export function StoryBar({
  me,
  groups,
}: {
  me: PostUser;
  groups: StoryGroup[];
}) {
  const router = useRouter();
  const t = useT();
  const [viewerIndex, setViewerIndex] = React.useState<number | null>(null);
  const [composing, setComposing] = React.useState(false);

  const myGroup = groups.find((g) => g.user.id === me.id);
  const others = groups.filter((g) => g.user.id !== me.id);
  const ordered = myGroup ? [myGroup, ...others] : others;

  return (
    <>
      <div className="no-scrollbar flex gap-4 overflow-x-auto border-b px-4 py-4 sm:rounded-lg sm:border">
        {/* Your story */}
        <div className="flex w-16 shrink-0 flex-col items-center gap-1">
          <div className="relative">
            <button
              onClick={() =>
                myGroup ? setViewerIndex(0) : setComposing(true)
              }
              className={cn(
                "block rounded-full p-[2px] transition hover:scale-105",
                myGroup?.hasUnseen ? "story-ring" : "bg-border"
              )}
            >
              <span className="block rounded-full bg-background p-[2px]">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={me.image ?? undefined} alt={me.name} />
                  <AvatarFallback>{me.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              </span>
            </button>
            <button
              onClick={() => setComposing(true)}
              className="absolute -bottom-0.5 -end-0.5 rounded-full border-2 border-background bg-[#0095f6] p-0.5 text-white transition hover:scale-110"
              aria-label={t("Hikoya qo'shish")}
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
          <span className="w-full truncate text-center text-xs">
            {myGroup ? t("Hikoyam") : t("Siz")}
          </span>
        </div>

        {others.map((g) => {
          const gi = ordered.findIndex((o) => o.user.id === g.user.id);
          const name = g.user.username ?? g.user.name;
          return (
            <button
              key={g.user.id}
              onClick={() => setViewerIndex(gi)}
              className="flex w-16 shrink-0 flex-col items-center gap-1"
            >
              <span
                className={cn(
                  "block rounded-full p-[2px] transition hover:scale-105",
                  g.hasUnseen ? "story-ring" : "bg-border"
                )}
              >
                <span className="block rounded-full bg-background p-[2px]">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={g.user.image ?? undefined} alt={name} />
                    <AvatarFallback className="text-xs">
                      {name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </span>
              </span>
              <span className="w-full truncate text-center text-xs">{name}</span>
            </button>
          );
        })}

        {others.length === 0 && (
          <Link
            href="/explore"
            className="flex w-40 shrink-0 flex-col justify-center rounded-2xl border border-dashed px-3 py-2 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
          >
            <span className="font-semibold text-foreground">
              {t("Hali hech kim hikoya qo'ymagan")}
            </span>
            <span className="mt-0.5">{t("Atrofdagi odamlarni kuzating →")}</span>
          </Link>
        )}
      </div>

      {viewerIndex !== null && (
        <StoryViewer
          groups={ordered}
          startIndex={viewerIndex}
          me={me}
          onClose={() => setViewerIndex(null)}
          onChanged={() => router.refresh()}
        />
      )}

      <StoryComposer
        open={composing}
        onOpenChange={setComposing}
        onCreated={() => router.refresh()}
      />
    </>
  );
}
