// Betting math. Internally everything is stored as DECIMAL odds (e.g. 2.00 = even).
// American odds are only a display/entry convenience.

/** American (+150 / -200) -> decimal (2.50 / 1.50). */
export function americanToDecimal(american: number): number {
  if (american === 0) return 1;
  return american > 0 ? 1 + american / 100 : 1 + 100 / Math.abs(american);
}

/** Decimal -> American, for display. */
export function decimalToAmerican(decimal: number): number {
  if (decimal <= 1) return 0;
  return decimal >= 2
    ? Math.round((decimal - 1) * 100)
    : Math.round(-100 / (decimal - 1));
}

/** Format decimal odds as a signed American string, e.g. "+150" / "-200". */
export function formatAmerican(decimal: number): string {
  const a = decimalToAmerican(decimal);
  return a > 0 ? `+${a}` : `${a}`;
}

/** Combined decimal odds for a parlay = product of legs. */
export function parlayOdds(decimals: number[]): number {
  return decimals.reduce((acc, d) => acc * d, 1);
}

/** Total payout (stake returned + profit) for a stake at given decimal odds. */
export function payout(stake: number, decimalOdds: number): number {
  return round2(stake * decimalOdds);
}

/** Profit only (payout minus stake). */
export function profit(stake: number, decimalOdds: number): number {
  return round2(stake * decimalOdds - stake);
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });
