import { NextResponse } from "next/server";
import { deleteWatchlistItem, updateWatchlistItem } from "@/lib/db";
import type { WatchlistItem } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const id = Number(params.id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }
  let patch: Partial<WatchlistItem>;
  try {
    patch = (await req.json()) as Partial<WatchlistItem>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  updateWatchlistItem(id, patch);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const id = Number(params.id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }
  deleteWatchlistItem(id);
  return NextResponse.json({ ok: true });
}
