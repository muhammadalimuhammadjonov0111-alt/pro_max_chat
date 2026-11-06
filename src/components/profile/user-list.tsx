import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FollowButton } from "@/components/shared/follow-button";
import { VerifiedBadge, PremiumBadge } from "@/components/shared/badges";

type Row = {
  id: string;
  username: string | null;
  name: string;
  image: string | null;
  bio: string | null;
  isVerified?: boolean;
  isPremium?: boolean;
};

export function UserList({
  users,
  meId,
  followingIds,
  emptyText,
}: {
  users: Row[];
  meId: string;
  followingIds: string[];
  emptyText: string;
}) {
  const following = new Set(followingIds);

  if (!users.length) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        {emptyText}
      </p>
    );
  }

  return (
    <div className="divide-y">
      {users.map((u) => {
        const username = u.username ?? u.name;
        return (
          <div key={u.id} className="flex items-center gap-3 px-4 py-3">
            <Link href={`/${username}`}>
              <Avatar className="h-11 w-11">
                <AvatarImage src={u.image ?? undefined} alt={username} />
                <AvatarFallback>
                  {username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={`/${username}`}
                className="flex items-center gap-1 truncate text-sm font-semibold"
              >
                {username}
                {u.isVerified && <VerifiedBadge className="h-3.5 w-3.5" />}
                {u.isPremium && <PremiumBadge className="px-1.5" />}
              </Link>
              <p className="truncate text-sm text-muted-foreground">{u.name}</p>
            </div>
            {u.id !== meId && (
              <FollowButton
                targetId={u.id}
                initialFollowing={following.has(u.id)}
                size="sm"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
