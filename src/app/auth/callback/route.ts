import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles the OAuth (Google) and email-confirmation redirect. Supabase sends
// back its own `?code=` (PKCE). Our invite code rides along as `?invite=`.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const oauthCode = searchParams.get("code");
  const invite = searchParams.get("invite");
  const next = searchParams.get("next") ?? "/app";

  if (oauthCode) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(oauthCode);
    if (!error) {
      const dest = new URL(next, origin);
      if (invite) dest.searchParams.set("invite", invite);
      return NextResponse.redirect(dest);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
