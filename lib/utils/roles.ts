import type { UserRole } from "@/lib/types/database";

export const ROLE_LABEL: Record<UserRole, string> = {
  collector: "Collector",
  retailer: "Retailer",
  streamer: "Streamer",
  owner: "Owner",
  admin: "Admin",
};

// The only roles a user can pick for themselves (Edit Profile, signup) —
// 'owner'/'admin' are assigned manually via SQL only (see
// lib/supabase/add_owner_admin_roles.sql) and must never appear here.
export const SELECTABLE_ROLES: UserRole[] = ["collector", "retailer", "streamer"];

// Roles that get the distinct "trusted/staff" badge treatment instead of
// the normal one.
export const SPECIAL_ROLES = new Set<UserRole>(["owner", "admin"]);
