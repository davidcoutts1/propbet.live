import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignupForm from "./SignupForm";
import GoogleButton from "@/components/GoogleButton";

export default async function SignupPage({
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
      <Link href={`/${codeQ}`} className="mb-6 text-sm text-muted hover:text-slate-200">
        ← back
      </Link>
      <h1 className="mb-1 text-2xl font-bold">Create your account</h1>
      <p className="mb-6 text-sm text-muted">Join the action in a minute.</p>

      <div className="card space-y-4">
        <SignupForm invite={invite} />
        <div className="flex items-center gap-3 text-xs text-muted">
          <div className="h-px flex-1 bg-border" /> or{" "}
          <div className="h-px flex-1 bg-border" />
        </div>
        <GoogleButton invite={invite} />
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href={`/login${codeQ}`} className="text-accent hover:underline">
          Log in
        </Link>
      </p>
    </main>
  );
}
