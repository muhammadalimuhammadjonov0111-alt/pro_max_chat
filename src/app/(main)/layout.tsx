import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileBottomBar } from "@/components/layout/mobile-bottom-bar";
import { MobileTopBar } from "@/components/layout/mobile-top-bar";
import { CreateDialogProvider } from "@/components/create/create-provider";
import { CallProvider } from "@/components/call/call-provider";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  const [unreadNotifications, unreadMessages] = await Promise.all([
    prisma.notification.count({
      where: { receiverId: user.id, read: false },
    }),
    prisma.message.count({
      where: {
        senderId: { not: user.id },
        seen: false,
        conversation: { members: { some: { userId: user.id } } },
      },
    }),
  ]);

  const navUser = {
    id: user.id,
    username: user.username,
    name: user.name,
    image: user.image,
    isVerified: user.isVerified,
    isPremium: user.isPremium,
    isAdmin: user.role === "ADMIN",
  };

  return (
    <CreateDialogProvider>
      <CallProvider>
      <Sidebar
        user={navUser}
        unreadNotifications={unreadNotifications}
        unreadMessages={unreadMessages}
      />
      <MobileTopBar unreadNotifications={unreadNotifications} />
      <MobileBottomBar user={navUser} />
      <main className="min-h-screen pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0 lg:ps-[236px]">
        <div className="mx-auto w-full max-w-[980px] px-0 sm:px-4 lg:max-w-[1040px] lg:px-8">
          <div className="animate-fade-in">{children}</div>
        </div>
      </main>
      </CallProvider>
    </CreateDialogProvider>
  );
}
