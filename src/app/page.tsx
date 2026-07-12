import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GoogleButton from "@/components/GoogleButton";

export default async function Landing({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/app");

  const codeQ = invite ? `?invite=${encodeURIComponent(invite)}` : "";

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-10 text-center">
        <div className="mb-3 inline-flex items-center gap-2 text-3xl font-black tracking-tight">
          <span className="text-primary">prop</span>
          <span>bet</span>
          <span className="text-accent">.live</span>
        </div>
        <p className="text-muted">
          Simulated prop &amp; straight bets with your friends. No real money —
          all the bragging rights.
        </p>
      </div>

      {invite && (
        <div className="card mb-6 border-primary/40 bg-primary/10 text-center text-sm">
          You&apos;ve been invited with code{" "}
          <span className="font-mono font-bold">{invite}</span> — sign up to join.
        </div>
      )}

      <div className="card space-y-3">
        <GoogleButton invite={invite} />
        <div className="flex items-center gap-3 text-xs text-muted">
          <div className="h-px flex-1 bg-border" /> or{" "}
          <div className="h-px flex-1 bg-border" />
        </div>
        <Link href={`/signup${codeQ}`} className="btn-primary w-full">
          Create an account
        </Link>
        <Link href={`/login${codeQ}`} className="btn-ghost w-full">
          Log in
        </Link>
      </div>

      <p className="mt-6 text-center text-xs text-muted">
        For entertainment only. propbet.live does not facilitate real-money
        gambling.
      </p>
    </main>
  );
}
