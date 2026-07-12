import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignupForm from "./SignupForm";
import GoogleButton from "@/components/GoogleButton";
import AuthShell from "@/components/AuthShell";

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

  const q = invite ? `?invite=${encodeURIComponent(invite)}` : "";

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join the action in under a minute."
      backHref={`/${q}`}
    >
      <div className="space-y-5">
        <GoogleButton invite={invite} />
        <div className="flex items-center gap-3 text-xs text-faint">
          <div className="h-px flex-1 bg-border" /> or sign up with email{" "}
          <div className="h-px flex-1 bg-border" />
        </div>
        <SignupForm invite={invite} />
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href={`/login${q}`} className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
