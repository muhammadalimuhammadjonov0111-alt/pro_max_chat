import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/lib/session";
import { SettingsClient } from "@/components/settings/settings-client";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Sozlamalar") };
}

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="pb-24 sm:pb-12">
      <SettingsClient
        user={{
          name: user.name,
          username: user.username,
          email: user.email,
          image: user.image,
          bio: user.bio,
          link: user.link,
          phone: user.phone,
          gender: user.gender,
          birthday: user.birthday
            ? user.birthday.toISOString().slice(0, 10)
            : null,
          location: user.location,
          isPrivate: user.isPrivate,
          isVerified: user.isVerified,
          isPremium: user.isPremium,
          premiumUntil: user.premiumUntil
            ? user.premiumUntil.toISOString()
            : null,
          isAdmin: user.role === "ADMIN",
          createdAt: user.createdAt.toISOString(),
        }}
      />
    </div>
  );
}
