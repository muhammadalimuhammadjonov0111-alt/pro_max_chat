import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/lib/session";
import { getReels } from "@/lib/queries";
import { getActiveAds } from "@/lib/ads";
import { ReelsFeed } from "@/components/reels/reels-feed";
import { toPostUser } from "@/lib/types";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Reels") };
}

export default async function ReelsPage() {
  const user = await requireUser();
  const me = toPostUser(user);
  const [reels, ads] = await Promise.all([getReels(user.id), getActiveAds()]);

  return (
    <div className="-mx-0 sm:-mx-4 lg:-mx-8">
      <ReelsFeed reels={reels} me={me} ads={ads} />
    </div>
  );
}
