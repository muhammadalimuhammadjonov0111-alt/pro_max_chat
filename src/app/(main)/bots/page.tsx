import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/lib/session";
import {
  listBots,
  getMyBots,
  getBotDirectoryStats,
} from "@/actions/bot";
import { AI_ASSISTANTS_ENABLED } from "@/lib/features";
import { BotsClient } from "@/components/bots/bots-client";
import { BotsMaintenance } from "@/components/bots/bots-maintenance";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("AI botlar") };
}

export default async function BotsPage() {
  await requireUser();
  if (!AI_ASSISTANTS_ENABLED) return <BotsMaintenance />;

  const [bots, myBots, stats] = await Promise.all([
    listBots(),
    getMyBots(),
    getBotDirectoryStats(),
  ]);

  return <BotsClient initialBots={bots} myBots={myBots} stats={stats} />;
}
