import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_SETTINGS } from "./defaults";
import type { RepairType, SavedSearch, Settings, WatchlistItem } from "./types";

// ---------------------------------------------------------------------------
// SQLite persistence (watchlist, settings, saved searches).
//
// We lazily open a singleton connection. Next.js can reload modules in dev, so
// we stash the handle on globalThis to avoid re-opening the file repeatedly.
// ---------------------------------------------------------------------------

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "scanner.db");

const globalForDb = globalThis as unknown as { _scannerDb?: Database.Database };

export { DEFAULT_SETTINGS };

function getDb(): Database.Database {
  if (globalForDb._scannerDb) return globalForDb._scannerDb;

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS watchlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      listing_id TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      repair_cost REAL NOT NULL DEFAULT 0,
      resale_price REAL NOT NULL DEFAULT 0,
      estimated_profit REAL NOT NULL DEFAULT 0,
      seller_questions TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Watching',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS saved_searches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      params TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  globalForDb._scannerDb = db;
  return db;
}

// --- settings ---

export function getSettings(): Settings {
  const row = getDb().prepare("SELECT data FROM settings WHERE id = 1").get() as
    | { data: string }
    | undefined;
  if (!row) return DEFAULT_SETTINGS;
  try {
    const parsed = JSON.parse(row.data) as Settings;
    // Merge so newly-added repair types still get a default.
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      repairCosts: { ...DEFAULT_SETTINGS.repairCosts, ...parsed.repairCosts },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  getDb()
    .prepare(
      "INSERT INTO settings (id, data) VALUES (1, @data) ON CONFLICT(id) DO UPDATE SET data = @data",
    )
    .run({ data: JSON.stringify(settings) });
}

// --- watchlist ---

function rowToWatchlistItem(r: any): WatchlistItem {
  return {
    id: r.id,
    listingId: r.listing_id,
    title: r.title,
    url: r.url,
    price: r.price,
    notes: r.notes,
    repairCost: r.repair_cost,
    resalePrice: r.resale_price,
    estimatedProfit: r.estimated_profit,
    sellerQuestions: r.seller_questions,
    status: r.status,
    createdAt: r.created_at,
  };
}

export function listWatchlist(): WatchlistItem[] {
  return (getDb().prepare("SELECT * FROM watchlist ORDER BY created_at DESC").all() as any[]).map(
    rowToWatchlistItem,
  );
}

export function addWatchlistItem(item: WatchlistItem): WatchlistItem {
  const info = getDb()
    .prepare(
      `INSERT INTO watchlist
        (listing_id, title, url, price, notes, repair_cost, resale_price, estimated_profit, seller_questions, status)
       VALUES
        (@listingId, @title, @url, @price, @notes, @repairCost, @resalePrice, @estimatedProfit, @sellerQuestions, @status)`,
    )
    .run({
      listingId: item.listingId,
      title: item.title,
      url: item.url,
      price: item.price,
      notes: item.notes ?? "",
      repairCost: item.repairCost ?? 0,
      resalePrice: item.resalePrice ?? 0,
      estimatedProfit: item.estimatedProfit ?? 0,
      sellerQuestions: item.sellerQuestions ?? "",
      status: item.status ?? "Watching",
    });
  return { ...item, id: Number(info.lastInsertRowid) };
}

export function updateWatchlistItem(id: number, patch: Partial<WatchlistItem>): void {
  const existing = getDb().prepare("SELECT * FROM watchlist WHERE id = ?").get(id) as any;
  if (!existing) return;
  const merged = { ...rowToWatchlistItem(existing), ...patch };
  getDb()
    .prepare(
      `UPDATE watchlist SET
        notes = @notes, repair_cost = @repairCost, resale_price = @resalePrice,
        estimated_profit = @estimatedProfit, seller_questions = @sellerQuestions,
        status = @status, price = @price
       WHERE id = @id`,
    )
    .run({
      id,
      notes: merged.notes,
      repairCost: merged.repairCost,
      resalePrice: merged.resalePrice,
      estimatedProfit: merged.estimatedProfit,
      sellerQuestions: merged.sellerQuestions,
      status: merged.status,
      price: merged.price,
    });
}

export function deleteWatchlistItem(id: number): void {
  getDb().prepare("DELETE FROM watchlist WHERE id = ?").run(id);
}

// --- saved searches ---

export function listSavedSearches(): SavedSearch[] {
  return (getDb().prepare("SELECT * FROM saved_searches ORDER BY created_at DESC").all() as any[]).map(
    (r) => ({ id: r.id, name: r.name, params: JSON.parse(r.params), createdAt: r.created_at }),
  );
}

export function addSavedSearch(search: SavedSearch): SavedSearch {
  const info = getDb()
    .prepare("INSERT INTO saved_searches (name, params) VALUES (@name, @params)")
    .run({ name: search.name, params: JSON.stringify(search.params) });
  return { ...search, id: Number(info.lastInsertRowid) };
}

export function deleteSavedSearch(id: number): void {
  getDb().prepare("DELETE FROM saved_searches WHERE id = ?").run(id);
}

export type { RepairType };
