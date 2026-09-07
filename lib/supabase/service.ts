import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

// Service-role client — bypasses RLS entirely. Only for server-only code
// with no user session to authenticate as, e.g. the weekly Card of the
// Week cron route, which runs on Vercel's schedule with no cookies at all.
// Never import this from anything that can run in a browser context.
export function createServiceClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
