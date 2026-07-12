"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm({ invite }: { invite?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) return setError(error.message);
    router.push(`/app${invite ? `?invite=${encodeURIComponent(invite)}` : ""}`);
    router.refresh();
  }

  return (
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
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label className="label">Password</label>
        <input
          type="password"
          className="input"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>
      <div className="text-right">
        <Link href="/reset-password" className="text-xs text-accent hover:underline">
          Forgot password?
        </Link>
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
