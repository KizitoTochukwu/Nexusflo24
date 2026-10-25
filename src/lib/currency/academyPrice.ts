// Converts an Academy course price into the student's chosen currency.
// MUST stay identical to convertCoursePrice in supabase/functions/academy-enrol/index.ts
// so the price shown equals the price charged.
export type Rates = Record<string, number>; // USD-based: 1 USD = rate[quote]

export function convertCoursePrice(minor: number, from: string, to: string, rates: Rates): number {
  if (minor <= 0 || from === to) return minor;
  const f = rates[from], t = rates[to];
  if (!f || !t) return minor;
  const raw = (minor * t) / f;
  // NGN rounds to the nearest ₦100; others to the nearest 0.50.
  const step = to === "NGN" ? 10000 : 50;
  return Math.max(step, Math.round(raw / step) * step);
}

export function formatMinorAmount(minor: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency", currency, maximumFractionDigits: currency === "NGN" ? 0 : 2,
  }).format(minor / 100);
}
