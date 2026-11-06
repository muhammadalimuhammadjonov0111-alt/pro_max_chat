import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/lib/session";
import { AI_ASSISTANTS_ENABLED } from "@/lib/features";
import { CreateBotClient } from "@/components/bots/create-bot-client";
import { BotsMaintenance } from "@/components/bots/bots-maintenance";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Bot yaratish") };
}

export default async function CreateBotPage() {
  const user = await requireUser();
  if (!AI_ASSISTANTS_ENABLED) return <BotsMaintenance />;

  const base = (user.username ?? user.name ?? "my")
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "")
    .slice(0, 24);

  return <CreateBotClient defaultUsername={base || "my"} />;
}
