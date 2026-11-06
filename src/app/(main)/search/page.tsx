import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getSuggestedUsers } from "@/actions/user";
import { SearchView } from "@/components/search/search-view";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Qidirish") };
}

export default async function SearchPage() {
  const user = await requireUser();

  const [suggested, following] = await Promise.all([
    getSuggestedUsers(user.id, 12),
    prisma.follow.findMany({
      where: { followerId: user.id },
      select: { followingId: true },
    }),
  ]);

  return (
    <div className="pb-20 sm:pb-8">
      <SearchView
        suggested={suggested}
        followingIds={following.map((f) => f.followingId)}
        meId={user.id}
      />
    </div>
  );
}
