import { NextResponse } from "next/server";
import { addSavedSearch, deleteSavedSearch, listSavedSearches } from "@/lib/db";
import type { SavedSearch } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ searches: listSavedSearches() });
}

export async function POST(req: Request) {
  let search: SavedSearch;
  try {
    search = (await req.json()) as SavedSearch;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!search.name || !search.params) {
    return NextResponse.json({ error: "name and params are required." }, { status: 400 });
  }
  return NextResponse.json({ search: addSavedSearch(search) }, { status: 201 });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }
  deleteSavedSearch(id);
  return NextResponse.json({ ok: true });
}
