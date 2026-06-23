import { NextResponse } from "next/server";
import { addWatchlistItem, listWatchlist } from "@/lib/db";
import type { WatchlistItem } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ items: listWatchlist() });
}

export async function POST(req: Request) {
  let item: WatchlistItem;
  try {
    item = (await req.json()) as WatchlistItem;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!item.listingId || !item.title) {
    return NextResponse.json({ error: "listingId and title are required." }, { status: 400 });
  }
  const saved = addWatchlistItem(item);
  return NextResponse.json({ item: saved }, { status: 201 });
}
