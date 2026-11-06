"use client";

import { Bookmark, Clapperboard, Grid3x3, type LucideIcon } from "lucide-react";

import type { PostWithDetails, PostUser } from "@/lib/types";
import { useT } from "@/hooks/use-i18n";
import { PostGrid } from "@/components/feed/post-grid";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export function ProfileTabs({
  posts,
  reels,
  saved,
  me,
  isMe,
}: {
  posts: PostWithDetails[];
  reels: PostWithDetails[];
  saved: PostWithDetails[];
  me: PostUser;
  isMe: boolean;
}) {
  const t = useT();
  return (
    <Tabs defaultValue="posts" className="mt-5">
      <div className="px-4 sm:px-8">
        <TabsList className="glass-panel grid h-auto w-full grid-cols-3 gap-1 rounded-2xl p-1">
          <Trigger value="posts" icon={Grid3x3} label={t("Postlar")} count={posts.length} />
          <Trigger value="reels" icon={Clapperboard} label={t("Reels")} count={reels.length} />
          <Trigger
            value="saved"
            icon={Bookmark}
            label={t("Saqlangan")}
            count={saved.length}
            disabled={!isMe}
          />
        </TabsList>
      </div>

      <TabsContent value="posts" className="mt-3">
        <PostGrid posts={posts} me={me} emptyText={t("Hozircha post yo'q")} />
      </TabsContent>
      <TabsContent value="reels" className="mt-3">
        <PostGrid posts={reels} me={me} emptyText={t("Hozircha reel yo'q")} />
      </TabsContent>
      <TabsContent value="saved" className="mt-3">
        <PostGrid posts={saved} me={me} emptyText={t("Saqlangan postlar yo'q")} />
      </TabsContent>
    </Tabs>
  );
}

function Trigger({
  value,
  icon: Icon,
  label,
  count,
  disabled,
}: {
  value: string;
  icon: LucideIcon;
  label: string;
  count: number;
  disabled?: boolean;
}) {
  return (
    <TabsTrigger
      value={value}
      disabled={disabled}
      className={cn(
        "group flex-col gap-0 rounded-xl border-0 py-2.5 text-muted-foreground transition-all",
        "data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm",
        "hover:text-foreground disabled:opacity-40"
      )}
    >
      <span className="flex items-center gap-1.5">
        <Icon className="h-4 w-4" />
        <span className="text-[11px] font-semibold uppercase tracking-wider">
          {label}
        </span>
      </span>
      {count > 0 && (
        <span className="mt-0.5 text-[11px] font-medium tabular-nums text-muted-foreground group-data-[state=active]:text-foreground/70">
          {count}
        </span>
      )}
    </TabsTrigger>
  );
}
