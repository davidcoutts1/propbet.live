"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupForm({ invite }: { invite?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !username || !password) return setError("All fields are required.");
    if (username.trim().length < 3) return setError("Username must be at least 3 characters.");
    if (/\s/.test(username)) return setError("Username can't contain spaces.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords don't match.");

    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { username: username.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback${
          invite ? `?invite=${encodeURIComponent(invite)}` : ""
        }`,
      },
    });
    setLoading(false);

    if (error) return setError(error.message);

    if (data.session) {
      // email confirmation disabled -> straight into onboarding
      router.push(`/onboarding${invite ? `?invite=${encodeURIComponent(invite)}` : ""}`);
      router.refresh();
    } else {
      setNotice(
        "Check your email to confirm your account, then log in to continue."
      );
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {error && (
        <div className="rounded-lg bg-danger/15 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-lg bg-primary/15 px-3 py-2 text-sm text-primary">
          {notice}
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
        <label className="label">Username</label>
        <input
          className="input"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="lucky_luke"
        />
      </div>
      <div>
        <label className="label">Password</label>
        <input
          type="password"
          className="input"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>
      <div>
        <label className="label">Confirm password</label>
        <input
          type="password"
          className="input"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="••••••••"
        />
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Creating…" : "Next"}
      </button>
    </form>
  );
}
