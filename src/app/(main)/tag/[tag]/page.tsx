import { Hash } from "lucide-react";

import { requireUser } from "@/lib/session";
import { toPostUser } from "@/lib/types";
import { getPostsByTag } from "@/actions/post";
import { getT } from "@/lib/i18n/server";
import { PostGrid } from "@/components/feed/post-grid";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  return { title: `#${tag}` };
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  const user = await requireUser();
  const me = toPostUser(user);
  const t = await getT();
  const posts = await getPostsByTag(decoded, user.id);

  return (
    <div className="pb-24 sm:pb-10 sm:pt-4">
      <header className="flex items-center gap-3 border-b px-4 py-5 sm:rounded-t-2xl sm:border">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
          <Hash className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-lg font-bold">#{decoded}</h1>
          <p className="text-sm text-muted-foreground">
            {t("{count} ta post", { count: posts.length })}
          </p>
        </div>
      </header>

      <div className="sm:border sm:border-t-0 sm:rounded-b-2xl sm:p-1">
        <PostGrid
          posts={posts}
          me={me}
          emptyText={t("Bu hashtag bo'yicha post yo'q")}
        />
      </div>
    </div>
  );
}
