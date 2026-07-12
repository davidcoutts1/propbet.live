import Link from "next/link";

export default function AuthShell({
  title,
  subtitle,
  backHref = "/",
  children,
}: {
  title: string;
  subtitle: string;
  backHref?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel — desktop only */}
      <div className="relative hidden overflow-hidden bg-surface lg:block">
        <div className="absolute inset-0 bg-brand-gradient opacity-90" />
        <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(0,0,0,0)_40%,rgba(6,9,15,0.75)_100%)]" />
        <div className="relative flex h-full flex-col justify-between p-12 text-slate-950">
          <Link href="/" className="flex items-center gap-2 font-display text-xl font-bold">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-950/90 text-primary">
              P
            </span>
            propbet.live
          </Link>
          <div>
            <h2 className="max-w-sm font-display text-4xl font-bold leading-tight">
              The group chat, but everyone&apos;s got skin in the game.
            </h2>
            <ul className="mt-8 space-y-3 text-slate-950/80">
              {[
                "Fake bankrolls, real bragging rights",
                "Straight bets, props & parlays",
                "Live leaderboard + group chat",
              ].map((t) => (
                <li key={t} className="flex items-center gap-3 font-medium">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-950/90 text-xs text-primary">
                    ✓
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-sm text-slate-950/70">
            For entertainment only — no real-money wagering.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="relative flex flex-col justify-center overflow-hidden px-5 py-10 sm:px-8">
        <div className="pointer-events-none absolute inset-0 bg-brand-radial lg:hidden" />
        <div className="relative mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 font-display text-lg font-bold lg:hidden"
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-gradient text-slate-950">
                P
              </span>
              propbet
            </Link>
            <Link
              href={backHref}
              className="ml-auto text-sm text-muted transition hover:text-slate-200"
            >
              ← back
            </Link>
          </div>

          <div className="animate-fade-up">
            <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
            <p className="mt-2 text-muted">{subtitle}</p>
            <div className="mt-7">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
