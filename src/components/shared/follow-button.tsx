"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { toggleFollow } from "@/actions/user";
import { useT } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

export function FollowButton({
  targetId,
  initialFollowing,
  initialRequested = false,
  className,
  size = "default",
}: {
  targetId: string;
  initialFollowing: boolean;
  initialRequested?: boolean;
  className?: string;
  size?: "default" | "sm";
}) {
  const t = useT();
  const [following, setFollowing] = React.useState(initialFollowing);
  const [requested, setRequested] = React.useState(initialRequested);
  const [loading, setLoading] = React.useState(false);

  async function handleClick() {
    setLoading(true);
    const prevF = following;
    const prevR = requested;

    // optimistic
    if (following) setFollowing(false);
    else if (requested) setRequested(false);
    else setRequested(true);

    const res = await toggleFollow(targetId);
    setLoading(false);

    if (!res.ok) {
      setFollowing(prevF);
      setRequested(prevR);
      void 0;
      return;
    }

    setFollowing(res.following);
    setRequested(!!res.requested);
    if (res.requested) toast.success(t("So'rov yuborildi"));
  }

  const label = following
    ? t("Kuzatilmoqda")
    : requested
      ? t("So'rov yuborilgan")
      : t("Kuzatish");

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={cn(
        "inline-flex items-center justify-center gap-1 rounded-lg font-semibold transition-colors disabled:opacity-60",
        size === "sm" ? "h-8 px-4 text-xs" : "h-8 px-6 text-sm",
        following || requested
          ? "bg-secondary text-foreground hover:bg-secondary/70"
          : "bg-[#0095f6] text-white hover:bg-[#1877f2]",
        className
      )}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {label}
    </button>
  );
}
