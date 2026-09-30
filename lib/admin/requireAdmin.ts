import { createClient } from "@/lib/supabase/server";

// The one account allowed to use the admin tools — see middleware.ts for
// the matching request-time gate (which returns the real 403; this is the
// same check re-run inside the page/route itself as a second guard, since
// these endpoints hold the service-role key).
export const ADMIN_USERNAME = "phca";

export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, role")
    .eq("id", user.id)
    .maybeSingle();

  return !!profile && profile.username === ADMIN_USERNAME && profile.role.includes("admin");
}
