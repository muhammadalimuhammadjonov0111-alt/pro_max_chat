import type { Media } from "@/lib/utils";

export async function uploadFile(file: File): Promise<Media> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Faylni yuklab bo'lmadi");
  }

  return res.json();
}
