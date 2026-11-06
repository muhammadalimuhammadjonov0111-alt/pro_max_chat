import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/lib/session";
import { getAdEligibility, getMyAds } from "@/lib/ads";
import { AdsClient } from "@/components/ads/ads-client";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Reklama") };
}

export default async function AdsPage() {
  const user = await requireUser();
  const [ads, eligibility] = await Promise.all([
    getMyAds(user.id),
    getAdEligibility(user.id),
  ]);

  return <AdsClient ads={ads} eligibility={eligibility} />;
}
