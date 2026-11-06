import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/lib/session";
import { getExplorePosts } from "@/lib/queries";
import { PostGrid } from "@/components/feed/post-grid";
import { toPostUser } from "@/lib/types";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Kashf etish") };
}

export default async function ExplorePage() {
  const user = await requireUser();
  const me = toPostUser(user);
  const t = await getT();
  const posts = await getExplorePosts(user.id);

  return (
    <div className="pb-20 sm:pb-8 sm:pt-4">
      <h1 className="px-4 py-3 text-lg font-semibold sm:px-1">
        {t("Kashf etish")}
      </h1>
      <PostGrid posts={posts} me={me} emptyText={t("Hozircha post yo'q")} />
    </div>
  );
}
