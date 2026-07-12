"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password/confirm`,
    });
    setLoading(false);
    if (error) return setError(error.message);
    setSent(true);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <Link href="/login" className="mb-6 text-sm text-muted hover:text-slate-200">
        ← back to login
      </Link>
      <h1 className="mb-1 text-2xl font-bold">Reset password</h1>
      <p className="mb-6 text-sm text-muted">
        We&apos;ll email you a link to set a new one.
      </p>
      <div className="card">
        {sent ? (
          <div className="rounded-lg bg-primary/15 px-3 py-3 text-sm text-primary">
            If an account exists for {email}, a reset link is on its way.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            {error && (
              <div className="rounded-lg bg-danger/15 px-3 py-2 text-sm text-danger">
                {error}
              </div>
            )}
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <button disabled={loading} className="btn-primary w-full">
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
