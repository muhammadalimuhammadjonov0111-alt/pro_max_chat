"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import type { PostWithDetails, PostUser } from "@/lib/types";
import { PostDetailDialog } from "./post-detail";

export function PostPageClient({
  post,
  me,
}: {
  post: PostWithDetails;
  me: PostUser;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(true);

  return (
    <PostDetailDialog
      post={post}
      me={me}
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) router.push("/");
      }}
    />
  );
}
