"use client";

import { DEFAULT_KEYWORD_PRESETS } from "@/lib/keywords";
import type { Brand, SearchParams } from "@/lib/types";

interface Props {
  params: SearchParams;
  onChange: (next: SearchParams) => void;
  onSearch: () => void;
  onSaveSearch: () => void;
  loading: boolean;
}

const BRANDS: Brand[] = ["all", "iPhone", "Samsung", "Google Pixel"];

export default function Filters({ params, onChange, onSearch, onSaveSearch, loading }: Props) {
  function set<K extends keyof SearchParams>(key: K, value: SearchParams[K]) {
    onChange({ ...params, [key]: value });
  }

  function numOrNull(v: string): number | null {
    const n = Number(v);
    return v === "" || Number.isNaN(n) ? null : n;
  }

  return (
    <form
      className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-900/50 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch();
      }}
    >
      <div>
        <label className="label">Search keywords</label>
        <input
          className="field"
          value={params.keywords}
          placeholder="iPhone cracked screen clean IMEI"
          onChange={(e) => set("keywords", e.target.value)}
          list="keyword-presets"
        />
        <datalist id="keyword-presets">
          {DEFAULT_KEYWORD_PRESETS.map((k) => (
            <option key={k} value={k} />
          ))}
        </datalist>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div>
          <label className="label">Brand</label>
          <select
            className="field"
            value={params.brand}
            onChange={(e) => set("brand", e.target.value as Brand)}
          >
            {BRANDS.map((b) => (
              <option key={b} value={b}>
                {b === "all" ? "All brands" : b}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Max price ($)</label>
          <input
            className="field"
            type="number"
            min={0}
            value={params.maxPrice ?? ""}
            onChange={(e) => set("maxPrice", numOrNull(e.target.value))}
          />
        </div>
        <div>
          <label className="label">Max shipping ($)</label>
          <input
            className="field"
            type="number"
            min={0}
            value={params.maxShipping ?? ""}
            onChange={(e) => set("maxShipping", numOrNull(e.target.value))}
          />
        </div>
        <div>
          <label className="label">Min seller rating (%)</label>
          <input
            className="field"
            type="number"
            min={0}
            max={100}
            value={params.minSellerRating ?? ""}
            onChange={(e) => set("minSellerRating", numOrNull(e.target.value))}
          />
        </div>
        <div>
          <label className="label">Min profit ($)</label>
          <input
            className="field"
            type="number"
            value={params.minProfit ?? ""}
            onChange={(e) => set("minProfit", numOrNull(e.target.value))}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="label">Include keywords (extra)</label>
          <input
            className="field"
            value={params.includeKeywords}
            placeholder="unlocked"
            onChange={(e) => set("includeKeywords", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Exclude keywords (comma-separated)</label>
          <input
            className="field"
            value={params.excludeKeywords}
            placeholder="lot, icloud locked, parts only"
            onChange={(e) => set("excludeKeywords", e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Searching…" : "Search eBay"}
        </button>
        <button type="button" className="btn-ghost" onClick={onSaveSearch}>
          Save this search
        </button>
      </div>
    </form>
  );
}
