"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, Loader2 } from "lucide-react";

import { acceptFollowRequest, rejectFollowRequest } from "@/actions/user";
import { useT } from "@/hooks/use-i18n";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VerifiedBadge } from "@/components/shared/badges";

type Request = {
  id: string;
  requester: {
    id: string;
    username: string | null;
    name: string;
    image: string | null;
    isVerified: boolean;
    isPremium: boolean;
  };
};

export function FollowRequests({ requests }: { requests: Request[] }) {
  const router = useRouter();
  const t = useT();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [removed, setRemoved] = React.useState<Set<string>>(new Set());

  const visible = requests.filter((r) => !removed.has(r.id));
  if (!visible.length) return null;

  async function handle(requestId: string, accept: boolean) {
    setBusy(requestId);
    const res = accept
      ? await acceptFollowRequest(requestId)
      : await rejectFollowRequest(requestId);
    setBusy(null);
    if (!res.ok) {
      void 0;
      return;
    }
    setRemoved((s) => new Set(s).add(requestId));
    toast.success(accept ? t("Tasdiqlandi") : t("Rad etildi"));
    router.refresh();
  }

  return (
    <section className="border-b px-4 py-4">
      <h2 className="mb-3 text-sm font-semibold">
        {t("Kuzatish so'rovlari")}
        <span className="ms-2 rounded-full bg-like px-2 py-0.5 text-[10px] text-white">
          {visible.length}
        </span>
      </h2>
      <div className="space-y-3">
        {visible.map((r) => {
          const username = r.requester.username ?? r.requester.name;
          return (
            <div key={r.id} className="flex items-center gap-3">
              <Link href={`/${username}`}>
                <Avatar className="h-11 w-11">
                  <AvatarImage
                    src={r.requester.image ?? undefined}
                    alt={username}
                  />
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
                  {r.requester.isVerified && <VerifiedBadge className="h-3.5 w-3.5" />}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {t("{name} · kuzatishni so'radi", {
                    name: r.requester.name,
                  })}
                </p>
              </div>
              <button
                onClick={() => handle(r.id, true)}
                disabled={busy === r.id}
                className="flex h-8 items-center gap-1 rounded-lg bg-[#0095f6] px-3 text-xs font-semibold text-white hover:bg-[#1877f2] disabled:opacity-50"
              >
                {busy === r.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                {t("Tasdiqlash")}
              </button>
              <button
                onClick={() => handle(r.id, false)}
                disabled={busy === r.id}
                className="flex h-8 items-center gap-1 rounded-lg bg-secondary px-3 text-xs font-semibold hover:bg-secondary/70 disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
