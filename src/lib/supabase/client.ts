import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client. We use a loose type generic here so the
 * hand-written Row interfaces (lib/types/database.ts) drive type safety
 * at the call site via `as` casts on `data`. Once you run
 * `supabase gen types typescript`, swap the generic for the generated Database.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
