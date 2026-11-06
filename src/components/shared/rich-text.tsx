import Link from "next/link";
import * as React from "react";

/**
 * Renders a caption, turning #hashtags and @mentions into links
 * and bare URLs into clickable links.
 */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(\s+)/);

  return (
    <>
      {parts.map((part, i) => {
        if (/^#[^\s#]+$/.test(part)) {
          return (
            <Link
              key={i}
              href={`/tag/${part.slice(1)}`}
              className="text-[#0095f6] hover:underline"
            >
              {part}
            </Link>
          );
        }
        if (/^@[A-Za-z0-9._]+$/.test(part)) {
          return (
            <Link
              key={i}
              href={`/${part.slice(1)}`}
              className="text-[#0095f6] hover:underline"
            >
              {part}
            </Link>
          );
        }
        if (/^https?:\/\/\S+$/.test(part)) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noreferrer"
              className="text-[#0095f6] hover:underline"
            >
              {part}
            </a>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

/** Extract hashtags from a caption. */
export function extractHashtags(text: string | null): string[] {
  if (!text) return [];
  const matches = text.match(/#[^\s#]+/g) ?? [];
  return [...new Set(matches.map((m) => m.slice(1)))];
}
