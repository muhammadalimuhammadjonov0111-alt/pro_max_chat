"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/session";

export type AdminGifItem = {
  id: string;
  url: string;
  title: string;
  createdAt: string;
};

const MAX_TITLE = 120;

/** Public list of admin-managed GIFs (for the GIF picker). Any signed-in user. */
export async function listAdminGifs(): Promise<AdminGifItem[]> {
  await requireUser();
  const rows = await prisma.adminGif.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map((g) => ({
    id: g.id,
    url: g.url,
    title: g.title,
    createdAt: g.createdAt.toISOString(),
  }));
}

/** Adds a GIF (already uploaded via /api/upload) to the picker catalog. */
export async function addAdminGif(input: {
  url: string;
  title?: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await requireAdmin();
  const url = (input.url ?? "").trim();
  const title = (input.title ?? "").trim().slice(0, MAX_TITLE);
  if (!url || (url.length > 500)) {
    return { ok: false, error: "Havola noto'g'ri" };
  }
  // Accept only local uploads or https links — never javascript:/data: URLs.
  if (!url.startsWith("/uploads/") && !url.startsWith("https://")) {
    return { ok: false, error: "Faqat /uploads/ yoki https:// havola" };
  }
  const row = await prisma.adminGif.create({
    data: { url, title },
    select: { id: true },
  });
  revalidatePath("/admin-panel");
  return { ok: true, id: row.id };
}

/** Removes a GIF from the picker catalog. */
export async function deleteAdminGif(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const gif = await prisma.adminGif.findUnique({ where: { id } });
  if (!gif) return { ok: false, error: "GIF topilmadi" };
  await prisma.adminGif.delete({ where: { id } });
  revalidatePath("/admin-panel");
  return { ok: true };
}
