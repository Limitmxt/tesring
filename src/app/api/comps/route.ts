import { NextResponse } from "next/server";
import { EbayConfigError, fetchCompPrices } from "@/lib/ebay";
import { normalizeModel, summarizePrices, type CompResult } from "@/lib/comps";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CompsBody {
  titles: string[];
}

export interface CompEstimate extends CompResult {
  key: string;
  label: string;
}

// In-memory cache so repeated searches for the same model don't re-hit eBay.
// Keyed by model key; 1-hour TTL. Resets on server restart (fine for an MVP).
const cache = new Map<string, { value: CompEstimate | null; at: number }>();
const TTL = 60 * 60 * 1000;
const MAX_UNIQUE = 30; // cap eBay calls per request

export async function POST(req: Request) {
  let body: CompsBody;
  try {
    body = (await req.json()) as CompsBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const titles = Array.isArray(body.titles) ? body.titles : [];
  const infos = titles.map((t) => normalizeModel(t));

  // Unique, parseable model keys we still need to look up.
  const now = Date.now();
  const needed = new Map<string, { query: string; label: string }>();
  for (const info of infos) {
    if (!info.ok) continue;
    const cached = cache.get(info.key);
    if (cached && now - cached.at < TTL) continue;
    if (!needed.has(info.key)) needed.set(info.key, { query: info.query, label: info.label });
  }

  const toFetch = [...needed.entries()].slice(0, MAX_UNIQUE);

  try {
    await Promise.all(
      toFetch.map(async ([key, { query, label }]) => {
        try {
          const prices = await fetchCompPrices(query);
          const summary = summarizePrices(prices);
          cache.set(key, {
            value: summary ? { ...summary, key, label } : null,
            at: now,
          });
        } catch {
          cache.set(key, { value: null, at: now });
        }
      }),
    );
  } catch (err) {
    if (err instanceof EbayConfigError) {
      return NextResponse.json({ error: err.message, code: "EBAY_CONFIG" }, { status: 400 });
    }
  }

  // Build per-title estimates aligned to the input order.
  const estimates = infos.map((info) => {
    if (!info.ok) return null;
    const cached = cache.get(info.key);
    return cached ? cached.value : null;
  });

  return NextResponse.json({ estimates });
}
