// ---------------------------------------------------------------------------
// Resale-value estimation ("comps").
//
// eBay's Browse API does not expose SOLD/completed prices (that needs the
// restricted Marketplace Insights API). As a practical proxy we:
//   1. parse the phone model + storage out of the listing title,
//   2. search active "working/used" listings of that same model,
//   3. take a trimmed median of those asking prices as the resale estimate.
//
// It's an estimate from the live market, not true sold comps — good enough to
// auto-compute profit, and the user can always override the value by hand.
// ---------------------------------------------------------------------------

export interface ModelInfo {
  /** True if we confidently parsed a model and can run comps. */
  ok: boolean;
  /** Dedupe/cache key, e.g. "iphone|iphone 12|128gb". */
  key: string;
  /** eBay search query for comparable working units. */
  query: string;
  /** Human label, e.g. "iphone 12 128gb". */
  label: string;
}

export interface CompResult {
  resale: number;
  sampleSize: number;
  low: number; // 25th percentile
  high: number; // 75th percentile
}

/** Extract a normalized model + storage from a listing title. */
export function normalizeModel(title: string): ModelInfo {
  const t = title.toLowerCase();

  const storageMatch = t.match(/(\d{2,4})\s?(gb|tb)\b/);
  const storage = storageMatch ? `${storageMatch[1]}${storageMatch[2]}` : "";

  let brand = "";
  let model = "";
  let m: RegExpMatchArray | null;

  if ((m = t.match(/iphone\s?(\d{1,2}|xs max|xs|xr|x)\s?(pro max|pro|plus|mini)?/))) {
    brand = "iphone";
    const core = m[1].trim();
    const variant = (m[2] || "").trim();
    model = `iphone ${core}${variant ? " " + variant : ""}`.trim();
  } else if (t.includes("iphone se")) {
    brand = "iphone";
    model = "iphone se";
  } else if (
    (m = t.match(
      /galaxy\s?(note\s?\d{1,2}|s\s?\d{1,2}|z\s?flip\s?\d?|z\s?fold\s?\d?|a\d{2})\s?(ultra|plus|\+|fe)?/,
    ))
  ) {
    brand = "samsung";
    const core = m[1].replace(/\s+/g, " ").trim();
    const variant = (m[2] || "").replace("+", "plus").trim();
    model = `galaxy ${core}${variant ? " " + variant : ""}`.trim();
  } else if ((m = t.match(/pixel\s?(\d{1,2})\s?(pro xl|pro|xl|a)?/))) {
    brand = "pixel";
    const core = m[1].trim();
    const variant = (m[2] || "").trim();
    model = `pixel ${core}${variant ? " " + variant : ""}`.trim();
  }

  const ok = Boolean(model);
  const label = ok ? `${model}${storage ? " " + storage : ""}` : "";
  const key = ok ? `${brand}|${model}|${storage}` : `raw|${t.slice(0, 40)}`;
  const query = ok ? `${model}${storage ? " " + storage : ""} unlocked` : "";
  return { ok, key, query, label };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/**
 * Turn a set of comparable asking prices into a resale estimate. Trims the
 * extreme 10% on each end to reduce outliers, then uses the median.
 * Returns null if there aren't enough comps to be meaningful.
 */
export function summarizePrices(prices: number[]): CompResult | null {
  if (prices.length < 3) return null;
  const sorted = [...prices].sort((a, b) => a - b);
  const trim = Math.floor(sorted.length * 0.1);
  const core = sorted.slice(trim, sorted.length - trim);
  const arr = core.length >= 3 ? core : sorted;
  return {
    resale: Math.round(percentile(arr, 50)),
    sampleSize: prices.length,
    low: Math.round(percentile(arr, 25)),
    high: Math.round(percentile(arr, 75)),
  };
}
