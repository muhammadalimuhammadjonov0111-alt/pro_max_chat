import type { MediaOverlay } from "@/lib/utils";

/** Track attached to a story ("Musiqa"). */
export type StoryMusic = {
  title: string;
  url: string;
};

/** A story can be a photo/video ("media") or a typed card ("text"). */
export type StoryKind = "media" | "text";

export type StoryItem = {
  id: string;
  userId: string;
  kind: StoryKind;
  mediaUrl: string | null;
  mediaType: string; // "image" | "video"
  content: string | null;
  background: string | null;
  overlays: MediaOverlay[];
  music: StoryMusic | null;
  createdAt: Date;
  expiresAt: Date;
  // engagement (visible to everyone as numbers, details only to the owner)
  viewCount: number;
  commentCount: number;
  reactions: { emoji: string; count: number }[];
  myReaction: string | null;
};

/** Gradient cards offered when creating a text story. */
export const STORY_BACKGROUNDS = [
  "linear-gradient(135deg,#667eea 0%,#764ba2 100%)",
  "linear-gradient(135deg,#f093fb 0%,#f5576c 100%)",
  "linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)",
  "linear-gradient(135deg,#43e97b 0%,#38f9d7 100%)",
  "linear-gradient(135deg,#fa709a 0%,#fee140 100%)",
  "linear-gradient(135deg,#30cfd0 0%,#330867 100%)",
  "linear-gradient(135deg,#ff9a9e 0%,#fecfef 100%)",
  "linear-gradient(160deg,#0f0c29 0%,#302b63 50%,#24243e 100%)",
  "linear-gradient(135deg,#f6d365 0%,#fda085 100%)",
  "linear-gradient(135deg,#5ee7df 0%,#b490ca 100%)",
];

/** Quick reactions a viewer can send on a story. */
export const STORY_REACTIONS = ["❤️", "🔥", "😂", "😮", "😢", "👏", "😍", "💯"];

/** Parse the `overlays` JSON column, tolerating legacy / broken rows. */
export function parseStoryOverlays(json: string | null): MediaOverlay[] {
  if (!json) return [];
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (o): o is MediaOverlay =>
        !!o &&
        typeof o === "object" &&
        typeof (o as MediaOverlay).value === "string" &&
        typeof (o as MediaOverlay).x === "number" &&
        typeof (o as MediaOverlay).y === "number"
    );
  } catch {
    return [];
  }
}

/** How long a story stays on screen before auto-advancing (ms). */
export function storyDurationMs(story: { mediaType: string }): number {
  return story.mediaType === "video" ? 15000 : 5000;
}
