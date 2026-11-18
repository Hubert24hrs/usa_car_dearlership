/**
 * Role-based access control for the admin. Client-safe.
 *
 *   ADMIN   — everything (pricing multipliers, users, imports, settings)
 *   SALES   — inventory edits, leads/CRM
 *   FINANCE — leads/CRM (finance apps), read inventory incl. base pricing
 *   CUSTOMER— public site features only (saved cars, saved searches)
 */
import type { Role } from "@/lib/generated/prisma/enums";

export const PERMISSIONS = {
  "admin:access": ["ADMIN", "SALES", "FINANCE"],
  "inventory:read": ["ADMIN", "SALES", "FINANCE"],
  "inventory:write": ["ADMIN", "SALES"],
  "inventory:delete": ["ADMIN"],
  "inventory:import": ["ADMIN"],
  "feeds:manage": ["ADMIN"],
  "leads:read": ["ADMIN", "SALES", "FINANCE"],
  "leads:write": ["ADMIN", "SALES", "FINANCE"],
  /** base_* (feed) pricing is visible to these roles only */
  "pricing:read-base": ["ADMIN", "FINANCE"],
  "pricing:write": ["ADMIN"],
  "settings:write": ["ADMIN"],
  "users:manage": ["ADMIN"],
  "analytics:read": ["ADMIN", "SALES", "FINANCE"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export const STAFF_ROLES: readonly Role[] = ["ADMIN", "SALES", "FINANCE"];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  SALES: "Sales",
  FINANCE: "Finance",
  CUSTOMER: "Customer",
};

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

export function isStaff(role: Role | null | undefined): boolean {
  return Boolean(role && STAFF_ROLES.includes(role));
}
