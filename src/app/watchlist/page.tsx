"use client";

import { useEffect, useState } from "react";
import type { WatchlistItem } from "@/lib/types";

const STATUSES: WatchlistItem["status"][] = [
  "Watching",
  "Messaged Seller",
  "Bought",
  "Passed",
  "Sold",
];

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/watchlist")
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .finally(() => setLoading(false));
  }, []);

  function patch(id: number, changes: Partial<WatchlistItem>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...changes } : it)));
  }

  async function save(item: WatchlistItem) {
    if (!item.id) return;
    await fetch(`/api/watchlist/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
  }

  async function remove(id: number) {
    await fetch(`/api/watchlist/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  if (loading) return <p className="text-neutral-400">Loading watchlist…</p>;

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-800 p-10 text-center text-neutral-500">
        Your watchlist is empty. Add listings from the scanner.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Watchlist</h1>
      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-900/50 p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium hover:underline"
              >
                {item.title}
              </a>
              <button
                className="text-xs text-red-400 hover:text-red-300"
                onClick={() => item.id && remove(item.id)}
              >
                Remove
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Num label="Price ($)" value={item.price} onChange={(v) => patch(item.id!, { price: v })} />
              <Num label="Repair ($)" value={item.repairCost} onChange={(v) => patch(item.id!, { repairCost: v })} />
              <Num label="Resale ($)" value={item.resalePrice} onChange={(v) => patch(item.id!, { resalePrice: v })} />
              <Num label="Profit ($)" value={item.estimatedProfit} onChange={(v) => patch(item.id!, { estimatedProfit: v })} />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <label className="block sm:col-span-1">
                <span className="label">Status</span>
                <select
                  className="field"
                  value={item.status}
                  onChange={(e) => patch(item.id!, { status: e.target.value as WatchlistItem["status"] })}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="label">Notes</span>
                <input
                  className="field"
                  value={item.notes}
                  onChange={(e) => patch(item.id!, { notes: e.target.value })}
                />
              </label>
            </div>

            <label className="block">
              <span className="label">Seller questions</span>
              <textarea
                className="field"
                rows={2}
                value={item.sellerQuestions}
                onChange={(e) => patch(item.id!, { sellerQuestions: e.target.value })}
              />
            </label>

            <div className="flex justify-end">
              <button className="btn-primary" onClick={() => save(item)}>
                Save changes
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Num({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        className="field"
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </label>
  );
}
