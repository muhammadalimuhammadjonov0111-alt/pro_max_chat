import { notFound } from "next/navigation";

import { requireUser } from "@/lib/session";
import { getPostById } from "@/lib/queries";
import { PostPageClient } from "@/components/feed/post-page-client";
import { toPostUser } from "@/lib/types";

export default async function PostPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const user = await requireUser();
  const post = await getPostById(postId, user.id);
  if (!post) notFound();

  const me = toPostUser(user);

  return <PostPageClient post={post} me={me} />;
}
