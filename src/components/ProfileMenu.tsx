"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Group, Profile } from "@/lib/types";
import { changeUsername, signOut } from "@/actions/profile";
import AdminPanel from "@/components/AdminPanel";

export default function ProfileMenu({
  group,
  profile,
  isAdmin,
  myGroups,
  members,
}: {
  group: Group;
  profile: Profile;
  isAdmin: boolean;
  myGroups: { id: string; name: string }[];
  members: { userId: string; username: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [username, setUsername] = useState(profile.username);
  const [nameMsg, setNameMsg] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  // lock background scroll while the drawer is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const initial = profile.username?.[0]?.toUpperCase() ?? "?";
  const inviteLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/?invite=${group.invite_code}`
      : "";

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked; user can select manually */
    }
  }

  async function shareInvite() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${group.name} on propbet.live`,
          text: `Join my group "${group.name}" — code ${group.invite_code}`,
          url: inviteLink,
        });
        return;
      } catch {
        /* fell through to copy */
      }
    }
    copyInvite();
  }

  async function saveUsername() {
    setNameMsg(null);
    const res = await changeUsername(username);
    if (!res.ok) return setNameMsg(res.error);
    setEditingName(false);
    router.refresh();
  }

  async function doSignOut() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="grid h-9 w-9 place-items-center rounded-full bg-brand-gradient text-sm font-bold text-slate-950 ring-2 ring-primary/20 transition hover:ring-primary/40"
        aria-label="Profile menu"
      >
        {initial}
      </button>

      {open &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-[100]">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <div className="absolute right-0 top-0 flex h-full w-full max-w-sm animate-fade-up flex-col overflow-y-auto border-l border-border bg-surface p-5 shadow-float">
            <div className="mb-5 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-lg font-bold text-slate-950">
                  {initial}
                </div>
                <div>
                  <div className="font-semibold">{profile.username}</div>
                  <div className="text-xs text-muted">{profile.email}</div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-muted hover:text-slate-200"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Invite */}
            <section className="card mb-4">
              <div className="label">Invite to {group.name}</div>
              <div className="mb-3 flex items-center justify-between gap-2">
                <code className="rounded-lg bg-surface2 px-3 py-2 font-mono text-lg tracking-widest">
                  {group.invite_code}
                </code>
                <div className="flex gap-2">
                  <button className="btn-ghost !px-3 !py-2" onClick={copyInvite}>
                    {copied ? "Copied!" : "Copy"}
                  </button>
                  <button className="btn-primary !px-3 !py-2" onClick={shareInvite}>
                    Share
                  </button>
                </div>
              </div>
              <p className="break-all text-xs text-muted">{inviteLink}</p>
            </section>

            {/* Groups */}
            <section className="card mb-4">
              <div className="label">Your groups</div>
              <div className="space-y-1.5">
                {myGroups.map((g) => (
                  <Link
                    key={g.id}
                    href={`/g/${g.id}/bets`}
                    onClick={() => setOpen(false)}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                      g.id === group.id
                        ? "bg-primary/15 text-primary"
                        : "bg-surface2 hover:bg-border"
                    }`}
                  >
                    {g.name}
                    {g.id === group.id && <span className="text-xs">current</span>}
                  </Link>
                ))}
              </div>
              <Link
                href="/onboarding"
                onClick={() => setOpen(false)}
                className="btn-ghost mt-3 w-full"
              >
                + Create or join another
              </Link>
            </section>

            {/* Account */}
            <section className="card mb-4">
              <div className="label">Account</div>
              {editingName ? (
                <div className="space-y-2">
                  {nameMsg && (
                    <div className="rounded-lg bg-danger/15 px-3 py-2 text-xs text-danger">
                      {nameMsg}
                    </div>
                  )}
                  <input
                    className="input"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button className="btn-primary flex-1" onClick={saveUsername}>
                      Save
                    </button>
                    <button
                      className="btn-ghost flex-1"
                      onClick={() => {
                        setEditingName(false);
                        setUsername(profile.username);
                        setNameMsg(null);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="flex w-full items-center justify-between rounded-lg bg-surface2 px-3 py-2 text-sm hover:bg-border"
                  onClick={() => setEditingName(true)}
                >
                  <span>Change username</span>
                  <span className="text-muted">{profile.username} ›</span>
                </button>
              )}
              <Link
                href="/reset-password"
                onClick={() => setOpen(false)}
                className="mt-2 flex w-full items-center justify-between rounded-lg bg-surface2 px-3 py-2 text-sm hover:bg-border"
              >
                <span>Reset password</span>
                <span className="text-muted">›</span>
              </Link>
            </section>

            {isAdmin && (
              <AdminPanel groupId={group.id} members={members} currentAdmin={profile.id} />
            )}

            <button onClick={doSignOut} className="btn-danger mt-2 w-full">
              Sign out
            </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
