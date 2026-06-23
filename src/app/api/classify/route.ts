import { NextResponse } from "next/server";
import { aiEnabled, classifyWithAi } from "@/lib/classify";
import type { ProfitResult, ScoredListing } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ClassifyBody {
  listing: ScoredListing;
  profit: ProfitResult | null;
}

export async function POST(req: Request) {
  let body: ClassifyBody;
  try {
    body = (await req.json()) as ClassifyBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.listing) {
    return NextResponse.json({ error: "Missing listing." }, { status: 400 });
  }

  const classification = await classifyWithAi(body.listing, body.profit ?? null);
  return NextResponse.json({ classification, aiEnabled: aiEnabled() });
}
