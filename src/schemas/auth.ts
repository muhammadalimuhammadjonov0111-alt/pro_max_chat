import { z } from "zod";

import type { TranslateFn } from "@/lib/i18n";

/**
 * Form schemas are created from a `t()` function so that validation messages
 * are localised. Uzbek is the source language and the lookup key.
 */

export function createLoginSchema(t: TranslateFn) {
  return z.object({
    password: z.string().min(1, t("Parolni kiriting")),
    identifier: z.string().min(1, t("Email yoki username kiriting")).max(50),
  });
}

export function createRegisterSchema(t: TranslateFn) {
  return z
    .object({
      name: z.string().min(1, t("To'liq ismingizni kiriting")).max(50),
      email: z.string().min(1, t("Email kiriting")).email(t("To'g'ri email kiriting")),
      username: z
        .string()
        .min(3, t("Kamida 3 ta belgi"))
        .max(30, t("Ko'pi bilan 30 ta belgi"))
        .regex(
          /^[a-zA-Z0-9._]+$/,
          t("Faqat harflar, raqamlar, nuqta va pastki chiziq")
        ),
      password: z.string().min(6, t("Kamida 6 ta belgi")),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("Parollar mos kelmadi"),
      path: ["confirmPassword"],
    });
}

export function createEditProfileSchema(t: TranslateFn) {
  return z.object({
    name: z.string().min(1, t("Ismingizni kiriting")).max(50),
    username: z
      .string()
      .min(3, t("Kamida 3 ta belgi"))
      .max(30, t("Ko'pi bilan 30 ta belgi"))
      .regex(
        /^[a-zA-Z0-9._]+$/,
        t("Faqat harflar, raqamlar, nuqta va pastki chiziq")
      ),
    bio: z
      .string()
      .max(150, t("Ko'pi bilan 150 ta belgi"))
      .optional()
      .or(z.literal("")),
    link: z
      .string()
      .max(100, t("Ko'pi bilan 100 ta belgi"))
      .optional()
      .or(z.literal("")),
    phone: z
      .string()
      .max(24, t("Ko'pi bilan 24 ta belgi"))
      .regex(/^[+()\-\s0-9]*$/, t("Faqat raqam va + ( ) - belgilari"))
      .optional()
      .or(z.literal("")),
    gender: z.enum(["", "male", "female", "other"]).optional(),
    birthday: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, t("Sanani tanlang"))
      .optional()
      .or(z.literal("")),
    location: z
      .string()
      .max(80, t("Ko'pi bilan 80 ta belgi"))
      .optional()
      .or(z.literal("")),
  });
}

export function createChangePasswordSchema(t: TranslateFn) {
  return z
    .object({
      currentPassword: z.string().min(1, t("Joriy parolni kiriting")),
      newPassword: z.string().min(6, t("Kamida 6 ta belgi")),
      confirmPassword: z.string(),
    })
    .refine((d) => d.newPassword === d.confirmPassword, {
      message: t("Parollar mos kelmadi"),
      path: ["confirmPassword"],
    });
}

export function createChangeEmailSchema(t: TranslateFn) {
  return z.object({
    email: z.string().min(1, t("Email kiriting")).email(t("To'g'ri email kiriting")),
  });
}

export type LoginValues = z.infer<ReturnType<typeof createLoginSchema>>;
export type RegisterValues = z.infer<ReturnType<typeof createRegisterSchema>>;
export type EditProfileValues = z.infer<
  ReturnType<typeof createEditProfileSchema>
>;
export type ChangePasswordValues = z.infer<
  ReturnType<typeof createChangePasswordSchema>
>;
export type ChangeEmailValues = z.infer<
  ReturnType<typeof createChangeEmailSchema>
>;
