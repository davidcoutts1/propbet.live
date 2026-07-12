import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  const q = invite ? `?invite=${encodeURIComponent(invite)}` : "";

  const features = [
    {
      icon: "🎯",
      title: "Straight bets & parlays",
      body: "Post any market — moneyline, props, over/under. Stack legs into a parlay and the odds math just works.",
    },
    {
      icon: "🏆",
      title: "Live leaderboard",
      body: "Everyone ranked by total worth. Track win/loss records and watch the trash talk write itself.",
    },
    {
      icon: "💬",
      title: "Group chat",
      body: "Realtime messaging with reactions built in. Celebrate the wins, roast the bad beats.",
    },
    {
      icon: "🛡️",
      title: "You run the book",
      body: "As group admin, settle bets, top up balances, and hand off the keys whenever you want.",
    },
  ];

  return (
    <div className="relative min-h-dvh overflow-hidden">
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0 bg-brand-radial" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        {/* Nav */}
        <header className="flex items-center justify-between py-5">
          <div className="flex items-center gap-2 text-lg font-display font-bold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-gradient text-slate-950">
              P
            </span>
            <span>
              prop<span className="text-gradient">bet</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/login${q}`} className="btn-ghost hidden sm:inline-flex">
              Log in
            </Link>
            <Link href={`/signup${q}`} className="btn-primary">
              Get started
            </Link>
          </div>
        </header>

        {/* Hero */}
        <section className="grid items-center gap-10 py-12 lg:grid-cols-2 lg:py-20">
          <div className="animate-fade-up text-center lg:text-left">
            {invite && (
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-sm">
                🎟️ Invited with code{" "}
                <span className="font-mono font-bold tracking-widest">{invite}</span>
              </div>
            )}
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface2/60 px-3 py-1 text-xs font-medium text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Simulated · Social · Free forever
            </div>
            <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Bet with your friends.
              <br />
              <span className="text-gradient">Zero real money.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-lg text-lg text-muted lg:mx-0">
              Spin up a group, hand everyone a fake bankroll, and settle who
              actually knows ball. All the thrill of a sportsbook — none of the
              damage.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
              <Link href={`/signup${q}`} className="btn-primary w-full px-6 py-3 text-base sm:w-auto">
                Create your group →
              </Link>
              <Link href={`/login${q}`} className="btn-ghost w-full px-6 py-3 text-base sm:w-auto">
                I have an account
              </Link>
            </div>
            <p className="mt-4 text-xs text-faint">
              For entertainment only. No gambling, no payouts, no catch.
            </p>
          </div>

          {/* Product mock */}
          <div className="animate-fade-up [animation-delay:120ms]">
            <div className="mx-auto max-w-sm rounded-3xl border border-borderLight bg-surface/80 p-4 shadow-float backdrop-blur">
              <div className="mb-3 flex items-center justify-between px-1">
                <span className="font-display text-sm font-semibold">Bet slip</span>
                <span className="chip text-primary">Parlay · 2 legs</span>
              </div>
              <div className="space-y-2">
                <div className="rounded-xl border border-border bg-surface2 p-3">
                  <div className="text-sm font-medium">Chiefs vs Bills</div>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-muted">Chiefs ML</span>
                    <span className="text-accent">+140</span>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-surface2 p-3">
                  <div className="text-sm font-medium">Total points</div>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-muted">Over 48.5</span>
                    <span className="text-accent">-110</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-brand-gradient p-3 text-slate-950">
                <div className="text-xs font-semibold uppercase tracking-wide">
                  $50 to win
                </div>
                <div className="font-display text-lg font-bold tabular">$164.50</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="grid gap-4 pb-16 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="card transition hover:border-borderLight">
              <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-surface2 text-xl">
                {f.icon}
              </div>
              <h3 className="mb-1 font-display text-base font-semibold">{f.title}</h3>
              <p className="text-sm text-muted">{f.body}</p>
            </div>
          ))}
        </section>

        <footer className="border-t border-border py-8 text-center text-xs text-faint">
          © propbet.live — a simulated betting game. Not affiliated with any
          sportsbook. No real-money wagering.
        </footer>
      </div>
    </div>
  );
}
