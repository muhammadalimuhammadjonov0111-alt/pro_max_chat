import { z } from "zod";

import type { TranslateFn } from "@/lib/i18n";

/** Strip everything except digits and a leading plus from a phone number. */
export function normalizePhone(value: string) {
  const cleaned = value.trim().replace(/[^\d+]/g, "");
  return `+${cleaned.replace(/\+/g, "")}`;
}

export function isValidPhone(value: string) {
  return /^\+\d{7,15}$/.test(normalizePhone(value));
}

/** Accepts `@name`, `name`, `t.me/name` or a full Telegram URL. */
export function normalizeTelegram(value: string) {
  return value
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^(?:www\.)?(?:t\.me|telegram\.me)\//i, "")
    .replace(/^@/, "")
    .replace(/\/+$/, "");
}

export function isValidTelegram(value: string) {
  return /^\+?[A-Za-z0-9_]{3,64}$/.test(normalizeTelegram(value));
}

/**
 * Ad request form. Validation messages go through `t()` so they follow the
 * UI language, like the other schemas in this folder.
 */
export function createAdSchema(t: TranslateFn) {
  return z
    .object({
      title: z
        .string()
        .trim()
        .min(3, t("Kamida 3 ta belgi"))
        .max(60, t("Ko'pi bilan 60 ta belgi")),
      description: z
        .string()
        .trim()
        .min(10, t("Kamida 10 ta belgi"))
        .max(300, t("Ko'pi bilan 300 ta belgi")),
      targetUrl: z
        .string()
        .trim()
        .min(1, t("Havolani kiriting"))
        .max(300, t("Ko'pi bilan 300 ta belgi"))
        .refine(
          (value) => /^(https?:\/\/)?[^\s/]+\.[^\s]{2,}/i.test(value),
          t("To'g'ri havola kiriting")
        ),
      buttonLabel: z
        .string()
        .trim()
        .max(24, t("Ko'pi bilan 24 ta belgi"))
        .optional()
        .or(z.literal("")),
      imageUrl: z
        .string()
        .trim()
        .max(500, t("Ko'pi bilan 500 ta belgi"))
        .optional()
        .or(z.literal("")),
      videoUrl: z
        .string()
        .trim()
        .max(500, t("Ko'pi bilan 500 ta belgi"))
        .optional()
        .or(z.literal("")),
      audioUrl: z
        .string()
        .trim()
        .max(500, t("Ko'pi bilan 500 ta belgi"))
        .optional()
        .or(z.literal("")),
      audioTitle: z
        .string()
        .trim()
        .max(100, t("Ko'pi bilan 100 ta belgi"))
        .optional()
        .or(z.literal("")),
      contactType: z.enum(["NONE", "PHONE", "TELEGRAM"]),
      contactValue: z
        .string()
        .trim()
        .max(80, t("Ko'pi bilan 80 ta belgi"))
        .optional()
        .or(z.literal("")),
    })
    .superRefine((data, ctx) => {
      if (!data.imageUrl && !data.videoUrl) {
        ctx.addIssue({
          code: "custom",
          path: ["imageUrl"],
          message: t("Rasm yoki video qo'shing"),
        });
      }

      if (data.audioUrl && !data.imageUrl) {
        ctx.addIssue({
          code: "custom",
          path: ["audioUrl"],
          message: t("Musiqa faqat rasm uchun"),
        });
      }

      if (data.contactType === "PHONE" && !isValidPhone(data.contactValue ?? "")) {
        ctx.addIssue({
          code: "custom",
          path: ["contactValue"],
          message: t("To'g'ri telefon raqam kiriting"),
        });
      }

      if (
        data.contactType === "TELEGRAM" &&
        !isValidTelegram(data.contactValue ?? "")
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["contactValue"],
          message: t("To'g'ri Telegram havola kiriting"),
        });
      }
    });
}

export type AdFormValues = z.infer<ReturnType<typeof createAdSchema>>;

/** Extends/looks up an ad from the admin panel. */
export function createExtendAdSchema(t: TranslateFn) {
  return z.object({
    adId: z.string().min(1),
    days: z
      .number({ message: t("Kun soni noto'g'ri") })
      .int(t("Kun soni noto'g'ri"))
      .min(1, t("Kun soni noto'g'ri"))
      .max(365, t("Kun soni noto'g'ri")),
  });
}
