import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Refreshes the Supabase auth session on every request and gates access to
 * the authenticated app. Any redirect must carry over the cookies that the
 * refresh wrote, or the browser keeps stale tokens and appears logged out.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: nothing between createServerClient and getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic =
    path === "/" ||
    path.startsWith("/login") ||
    path.startsWith("/signup") ||
    path.startsWith("/auth") ||
    path.startsWith("/reset-password");

  // Carry the (possibly refreshed) auth cookies onto a redirect response.
  const redirectTo = (pathname: string, opts?: { next?: string }) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    if (opts?.next) url.searchParams.set("next", opts.next);
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  // Not signed in and hitting a protected route -> login
  if (!user && !isPublic) {
    return redirectTo("/login", { next: path });
  }

  // Signed in and sitting on login/signup -> into the app
  if (user && (path.startsWith("/login") || path.startsWith("/signup"))) {
    return redirectTo("/app");
  }

  return response;
}
