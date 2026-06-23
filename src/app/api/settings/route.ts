import { NextResponse } from "next/server";
import { getSettings, saveSettings } from "@/lib/db";
import type { Settings } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ settings: getSettings() });
}

export async function PUT(req: Request) {
  let settings: Settings;
  try {
    settings = (await req.json()) as Settings;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  saveSettings(settings);
  return NextResponse.json({ settings });
}
