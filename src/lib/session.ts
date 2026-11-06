import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { prisma } from "./prisma";

/** Returns the better-auth session (or null). */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** Returns the full DB user (with username/bio) or null. */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.user) return null;
  return prisma.user.findUnique({
    where: { id: session.user.id },
  });
}

/** For protected server components. Redirects to /login (or /banned). */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.isBanned) redirect("/banned");
  return user;
}

/** For admin-only server components. Redirects non-admins to /login (or /banned). */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.isBanned) redirect("/banned");
  if (user.role !== "ADMIN") redirect("/");
  return user;
}
