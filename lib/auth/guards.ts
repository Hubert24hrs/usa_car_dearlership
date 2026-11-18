/**
 * Server-side authorization guards. Always re-check the user in the database
 * (role changes / deactivation take effect immediately, not at token expiry).
 * Every admin page AND every admin server action must call one of these.
 */
import "server-only";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "./index";
import { can, type Permission } from "./permissions";

export type CurrentUser = { id: string; email: string; name: string | null; role: "CUSTOMER" | "SALES" | "FINANCE" | "ADMIN" };

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });
  if (!user || !user.isActive) return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

/** For pages: redirects to sign-in (or the admin home) instead of throwing. */
export async function requirePagePermission(permission: Permission, callbackUrl = "/admin"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/account/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  if (!can(user.role, permission)) {
    redirect(permission === "admin:access" ? "/account?denied=1" : "/admin?denied=1");
  }
  return user;
}

export class AuthorizationError extends Error {
  constructor(message = "You do not have permission to do that.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** For server actions / route handlers. */
export async function requirePermission(permission: Permission): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !can(user.role, permission)) throw new AuthorizationError();
  return user;
}
