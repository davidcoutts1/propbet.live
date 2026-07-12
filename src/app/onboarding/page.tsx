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
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <h1 className="mb-1 text-2xl font-bold">
        Welcome{profile?.username ? `, ${profile.username}` : ""} 👋
      </h1>
      <p className="mb-6 text-sm text-muted">
        Join a group with an invite code, or start your own.
      </p>
      <OnboardingClient initialInvite={invite ?? ""} />
    </main>
  );
}
