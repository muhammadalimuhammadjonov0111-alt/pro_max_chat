import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

// GIF search backed by Tenor. The official Tenor API was discontinued, so we
// scrape Tenor's public search pages server-side (keeps client code clean and
// avoids CORS) and normalize the CDN URLs we find in the HTML.
const TENOR_SEARCH = "https://tenor.com/search";

export type GifItem = {
  id: string;
  url: string; // full-size animated gif
  preview: string; // small gif for the picker grid
  title: string;
};

// Matches both `media.tenor.com/{id}AAAM/slug.gif` and
// `media1.tenor.com/m/{id}AAAAC/slug.gif` shapes embedded in the HTML.
const GIF_RE =
  /https:\/\/media\d*\.tenor\.com\/(?:m\/)?([A-Za-z0-9_-]+?)(?:AAA[MC])\/([^"'/]+)\.gif/g;

/** Rewrite an id/slug pair to the stable media1 CDN paths. */
function buildUrls(id: string, slug: string) {
  const base = `https://media1.tenor.com/m/${id}`;
  return {
    url: `${base}AAAAC/${slug}.gif`, // full size
    preview: `${base}AAAAM/${slug}.gif`, // ~220px
  };
}

async function scrape(query: string): Promise<GifItem[]> {
  const slug = query ? `${encodeURIComponent(query.trim())}-gifs` : "trending-gifs";
  const res = await fetch(`${TENOR_SEARCH}/${slug}`, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    // Pages are cached at the edge; keeps scraping pressure low.
    next: { revalidate: 600 },
  });
  if (!res.ok) return [];

  const html = await res.text();
  const seen = new Set<string>();
  const items: GifItem[] = [];

  for (const match of html.matchAll(GIF_RE)) {
    const [, id, name] = match;
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    const { url, preview } = buildUrls(id, name);
    items.push({
      id,
      url,
      preview,
      title: name.replace(/-/g, " "),
    });
    if (items.length >= 30) break;
  }

  return items;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim().slice(0, 60) ?? "";

  try {
    let items = await scrape(q);
    // Fallback: if a specific search found nothing, show trending instead.
    if (items.length === 0 && q) items = await scrape("");
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json(
      { error: "GIFlarni yuklab bo'lmadi" },
      { status: 502 }
    );
  }
}
