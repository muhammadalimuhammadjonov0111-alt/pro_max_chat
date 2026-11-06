"use client";

import * as React from "react";
import Link from "next/link";
import { Search as SearchIcon, X } from "lucide-react";

import { searchUsers } from "@/actions/user";
import { useT } from "@/hooks/use-i18n";
import { FollowButton } from "@/components/shared/follow-button";
import { VerifiedBadge, PremiumBadge } from "@/components/shared/badges";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Row = {
  id: string;
  username: string | null;
  name: string;
  image: string | null;
  bio: string | null;
  isVerified?: boolean;
  isPremium?: boolean;
  _count: { followers: number; posts: number };
};

export function SearchView({
  suggested,
  followingIds,
  meId,
}: {
  suggested: Row[];
  followingIds: string[];
  meId: string;
}) {
  const t = useT();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<Row[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const following = React.useMemo(() => new Set(followingIds), [followingIds]);

  React.useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      const res = await searchUsers(q);
      setResults(res as Row[]);
      setLoading(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const list = results ?? suggested;
  const title = results
    ? t("Natijalar")
    : t("Siz uchun tavsiya etilgan");

  return (
    <div className="mx-auto max-w-[600px] px-4 py-4">
      <div className="relative mb-4">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            if (!v.trim()) {
              setResults(null);
              setLoading(false);
            }
          }}
          placeholder={t("Qidirish")}
          autoFocus
          className="h-10 w-full rounded-lg border border-input bg-secondary/50 pl-9 pr-9 text-sm outline-none focus:bg-background focus:ring-1 focus:ring-ring"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-muted p-0.5"
            aria-label={t("Tozalash")}
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <p className="mb-3 text-sm font-semibold text-muted-foreground">{title}</p>

      {loading && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          {t("Qidirilmoqda...")}
        </p>
      )}

      {!loading && list.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {t("Hech narsa topilmadi")}
        </p>
      )}

      <div className="divide-y">
        {list.map((u) => {
          const username = u.username ?? u.name;
          return (
            <div key={u.id} className="flex items-center gap-3 py-3">
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
                <p className="truncate text-sm text-muted-foreground">
                  {u.name}
                  {u._count.followers > 0 && (
                    <span className="ml-2 text-xs">
                      {t("{count} ta kuzatuvchi", { count: u._count.followers })}
                    </span>
                  )}
                </p>
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
    </div>
  );
}
