import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    }
  );

  // Refreshes the session if expired — required for Server Components.
  // IMPORTANT: do NOT add anything between createServerClient and getUser, or sessions
  // can randomly disconnect (per Supabase SSR docs).
  const { data: { user } } = await supabase.auth.getUser();

  // Gate /app/* — redirect unauthenticated users to /auth/login
  const isAppRoute = request.nextUrl.pathname.startsWith("/app");
  const isAuthRoute = request.nextUrl.pathname.startsWith("/auth");

  if (isAppRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // If logged in and visiting /auth/login or /auth/signup, send them into the app
  if (isAuthRoute && user && !request.nextUrl.pathname.startsWith("/auth/callback")) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
