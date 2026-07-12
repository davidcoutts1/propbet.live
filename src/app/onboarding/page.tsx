import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingClient from "./OnboardingClient";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  return (
    <main className="relative flex min-h-dvh flex-col justify-center overflow-hidden px-6 py-10">
      <div className="pointer-events-none absolute inset-0 bg-brand-radial" />
      <div className="relative mx-auto w-full max-w-md animate-fade-up">
        <div className="mb-6 flex items-center gap-2 font-display text-lg font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-gradient text-slate-950">
            P
          </span>
          prop<span className="text-gradient -ml-1.5">bet</span>
        </div>
        <h1 className="mb-1 font-display text-3xl font-bold tracking-tight">
          Welcome{profile?.username ? `, ${profile.username}` : ""} 👋
        </h1>
        <p className="mb-6 text-muted">
          Join a group with an invite code, or start your own.
        </p>
        <OnboardingClient initialInvite={invite ?? ""} />
      </div>
    </main>
  );
}
