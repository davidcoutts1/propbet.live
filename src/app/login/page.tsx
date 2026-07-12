import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "./LoginForm";
import GoogleButton from "@/components/GoogleButton";
import AuthShell from "@/components/AuthShell";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string; next?: string }>;
}) {
  const { invite } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/app");

  const q = invite ? `?invite=${encodeURIComponent(invite)}` : "";

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to your groups and get back in the action."
      backHref={`/${q}`}
    >
      <div className="space-y-5">
        <GoogleButton invite={invite} />
        <div className="flex items-center gap-3 text-xs text-faint">
          <div className="h-px flex-1 bg-border" /> or continue with email{" "}
          <div className="h-px flex-1 bg-border" />
        </div>
        <LoginForm invite={invite} />
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        No account?{" "}
        <Link href={`/signup${q}`} className="font-medium text-primary hover:underline">
          Create one
        </Link>
      </p>
    </AuthShell>
  );
}
