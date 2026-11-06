"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { getLikes } from "@/actions/post";
import type { PostUser } from "@/lib/types";
import { useT } from "@/hooks/use-i18n";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VerifiedBadge } from "@/components/shared/badges";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function LikesDialog({
  postId,
  open,
  onOpenChange,
}: {
  postId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const t = useT();
  const [likes, setLikes] = React.useState<
    { id: string; user: PostUser }[] | null
  >(null);

  React.useEffect(() => {
    if (open && likes === null) {
      getLikes(postId).then((l) => setLikes(l as never));
    }
  }, [open, likes, postId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="border-b p-4">
          <DialogTitle className="text-center">{t("Yoqtirganlar")}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          {likes === null ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : likes.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {t("Hozircha hech kim yoqtirmagan")}
            </p>
          ) : (
            likes.map((l) => {
              const username = l.user.username ?? l.user.name;
              return (
                <div
                  key={l.id}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <Link href={`/${username}`}>
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={l.user.image ?? undefined}
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
                      {l.user.isVerified && <VerifiedBadge className="h-3.5 w-3.5" />}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {l.user.name}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
