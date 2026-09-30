import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// The one account allowed to reach /admin* and /api/admin* — see
// lib/admin/requireAdmin.ts, which re-checks this same condition inside
// the page/route handlers themselves as a second guard, since this
// middleware check is what turns a non-admin request into a real 403
// before any admin code (holding the service-role key) ever runs.
const ADMIN_USERNAME = "phca";

export async function isAdminRequest(request: NextRequest): Promise<boolean> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        // Read-only check with no response of its own to attach refreshed
        // cookies to — updateSession() (called right after this on every
        // request) is what actually persists any session refresh.
        setAll() {},
      },
    }
  );

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

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refreshes the auth token if needed — required for Server Components.
  await supabase.auth.getUser();

  return supabaseResponse;
}
