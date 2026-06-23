import { NextResponse } from "next/server";
import { EbayConfigError, searchListings } from "@/lib/ebay";
import { scoreListing } from "@/lib/scoring";
import { getSettings } from "@/lib/db";
import { defaultRepairCost, estimateProfit } from "@/lib/profit";
import type { SearchParams } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let params: SearchParams;
  try {
    params = (await req.json()) as SearchParams;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const settings = getSettings();
    const listings = await searchListings(params);

    // Score each listing and attach a starting profit estimate using the
    // user's default repair costs / fees so the dashboard isn't blank.
    const scored = listings.map((listing) => {
      const s = scoreListing(listing);
      const repairCost = defaultRepairCost(s.signals.repairTypes, settings);
      const profit = estimateProfit(s.price, {
        resalePrice: 0, // unknown until the user enters sold-comps / a value
        repairCost,
        shipping: s.shipping || settings.defaultShipping,
        feesPercent: settings.defaultFeesPercent,
        otherCosts: 0,
      });
      return { ...s, profit, defaultRepairCost: repairCost };
    });

    return NextResponse.json({ listings: scored, settings });
  } catch (err) {
    if (err instanceof EbayConfigError) {
      return NextResponse.json({ error: err.message, code: "EBAY_CONFIG" }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Search failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
