import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { username } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "./prisma";

// Usernames that would collide with application routes. Kept in sync with the
// route folders under src/app/(main).
const RESERVED_USERNAMES = new Set([
  "p",
  "tag",
  "search",
  "explore",
  "reels",
  "messages",
  "notifications",
  "premium",
  "settings",
  "login",
  "register",
  "forgot-password",
  "reset-password",
  "admin-panel",
  "banned",
  "api",
  "uploads",
  "upload",
  "story",
  "stories",
  "about",
  "help",
  "terms",
  "privacy",
  "support",
  "gidgogram",
  "me",
  "new",
  "edit",
]);

export const auth = betterAuth({
  appName: "Gidgogram",
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 6,
    resetPasswordTokenExpiresIn: 60 * 60, // 1 soat
    sendResetPassword: async ({ user, url }) => {
      const { sendResetPasswordEmail } = await import("./email");
      await sendResetPasswordEmail(user.email, url);
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh daily
  },
  user: {
    additionalFields: {
      bio: {
        type: "string",
        required: false,
        defaultValue: "",
      },
      link: {
        type: "string",
        required: false,
        defaultValue: "",
      },
      isPrivate: {
        type: "boolean",
        required: false,
        defaultValue: false,
      },
      // privileged fields - cannot be set by the client
      role: {
        type: "string",
        required: false,
        defaultValue: "USER",
        input: false,
      },
      isVerified: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
      isPremium: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
      premiumUntil: {
        type: "date",
        required: false,
        input: false,
      },
      isBanned: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },
  plugins: [username({ usernameValidator }), nextCookies()],
});

/** Allows the same characters as the sign-up schema and blocks app routes. */
function usernameValidator(value: string): boolean {
  return /^[a-zA-Z0-9._]{3,30}$/.test(value) && !RESERVED_USERNAMES.has(value.toLowerCase());
}

export type Session = typeof auth.$Infer.Session;

/** True when a username would collide with an application route. */
export function isReservedUsername(username: string): boolean {
  return RESERVED_USERNAMES.has(username.toLowerCase());
}
