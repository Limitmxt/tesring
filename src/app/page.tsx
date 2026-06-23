"use client";

import { useEffect, useMemo, useState } from "react";
import Filters from "@/components/Filters";
import ListingCard from "@/components/ListingCard";
import { estimateProfit } from "@/lib/profit";
import { DEFAULT_SETTINGS } from "@/lib/defaults";
import type { SearchParams, Settings } from "@/lib/types";
import type { CategoryFilter, SortKey, UiListing } from "@/lib/ui-types";

const DEFAULT_PARAMS: SearchParams = {
  keywords: "iPhone cracked screen clean IMEI",
  brand: "all",
  maxPrice: 150,
  maxShipping: null,
  minSellerRating: null,
  minProfit: null,
  includeKeywords: "",
  excludeKeywords: "lot, parts only, icloud locked",
  limit: 50,
};

function liveProfit(l: UiListing) {
  return estimateProfit(l.price, {
    resalePrice: l.resalePrice,
    repairCost: l.repairCostInput,
    shipping: l.shippingInput,
    feesPercent: l.feesPercentInput,
    otherCosts: l.otherCostsInput,
  });
}

export default function DashboardPage() {
  const [params, setParams] = useState<SearchParams>(DEFAULT_PARAMS);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [listings, setListings] = useState<UiListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sort, setSort] = useState<SortKey>("profit");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [showAvoid, setShowAvoid] = useState(false);

  // Load persisted settings (default repair costs / fees) on mount.
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => d.settings && setSettings(d.settings))
      .catch(() => {});
  }, []);

  async function runSearch() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Search failed.");
        setListings([]);
        return;
      }
      const s: Settings = data.settings || settings;
      setSettings(s);
      const mapped: UiListing[] = (data.listings as any[]).map((l) => ({
        ...l,
        resalePrice: 0,
        repairCostInput: l.defaultRepairCost ?? 0,
        shippingInput: l.shipping || s.defaultShipping,
        feesPercentInput: s.defaultFeesPercent,
        otherCostsInput: 0,
      }));
      setListings(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error.");
    } finally {
      setLoading(false);
    }
  }

  function updateListing(next: UiListing) {
    setListings((prev) => prev.map((l) => (l.id === next.id ? next : l)));
  }

  async function classify(listing: UiListing) {
    updateListing({ ...listing, aiLoading: true });
    try {
      const res = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listing, profit: liveProfit(listing) }),
      });
      const data = await res.json();
      updateListing({ ...listing, ai: data.classification, aiLoading: false });
    } catch {
      updateListing({ ...listing, aiLoading: false });
    }
  }

  async function addToWatchlist(listing: UiListing, profitValue: number, sellerMsg: string) {
    const body = {
      listingId: listing.id,
      title: listing.title,
      url: listing.url,
      price: listing.price,
      notes: "",
      repairCost: listing.repairCostInput,
      resalePrice: listing.resalePrice,
      estimatedProfit: profitValue,
      sellerQuestions: sellerMsg,
      status: "Watching",
    };
    const res = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) alert("Saved to watchlist.");
    else alert("Could not save to watchlist.");
  }

  async function saveSearch() {
    const name = prompt("Name this saved search:");
    if (!name) return;
    await fetch("/api/saved-searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, params }),
    });
    alert("Saved search stored.");
  }

  // --- filter + sort (client-side) ---
  const visible = useMemo(() => {
    let rows = [...listings];

    if (!showAvoid) rows = rows.filter((l) => l.category !== "Avoid");
    if (categoryFilter === "good") rows = rows.filter((l) => l.category === "Good Flip");
    if (categoryFilter === "maybe") rows = rows.filter((l) => l.category === "Maybe");

    if (params.minProfit !== null && params.minProfit !== undefined) {
      rows = rows.filter((l) => {
        // Don't hide un-priced listings — you still need to value them.
        if (l.resalePrice <= 0) return true;
        return liveProfit(l).profit >= (params.minProfit as number);
      });
    }

    const riskScore = (l: UiListing) =>
      (l.signals.lockRisk ? 1 : 0) +
      (l.signals.imeiRisk ? 1 : 0) +
      (l.signals.isLotOrScrap ? 1 : 0) +
      (l.hardAvoid ? 1 : 0);

    rows.sort((a, b) => {
      switch (sort) {
        case "score":
          return b.score - a.score;
        case "price":
          return a.price - b.price;
        case "roi":
          return liveProfit(b).roi - liveProfit(a).roi;
        case "risk":
          return riskScore(a) - riskScore(b) || b.score - a.score;
        case "newest":
          return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
        case "profit":
        default:
          return liveProfit(b).profit - liveProfit(a).profit;
      }
    });

    return rows;
  }, [listings, showAvoid, categoryFilter, params.minProfit, sort]);

  return (
    <div className="space-y-5">
      <Filters
        params={params}
        onChange={setParams}
        onSearch={runSearch}
        onSaveSearch={saveSearch}
        loading={loading}
      />

      {error && (
        <div className="rounded-md border border-red-700/50 bg-red-900/20 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {listings.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="flex items-center gap-1">
            <span className="text-neutral-400">Sort:</span>
            <select
              className="field w-auto"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              <option value="profit">Highest profit</option>
              <option value="score">Highest score</option>
              <option value="risk">Lowest risk</option>
              <option value="newest">Newest</option>
              <option value="price">Lowest price</option>
              <option value="roi">Best ROI</option>
            </select>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-neutral-400">Show:</span>
            <select
              className="field w-auto"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
            >
              <option value="all">All</option>
              <option value="good">Good Flip only</option>
              <option value="maybe">Maybe only</option>
            </select>
          </div>
          <label className="flex items-center gap-1.5 text-neutral-300">
            <input
              type="checkbox"
              checked={showAvoid}
              onChange={(e) => setShowAvoid(e.target.checked)}
            />
            Show avoid listings
          </label>
          <span className="ml-auto text-neutral-500">
            {visible.length} of {listings.length} shown
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((l) => (
          <ListingCard
            key={l.id}
            listing={l}
            onChange={updateListing}
            onClassify={classify}
            onAddToWatchlist={addToWatchlist}
          />
        ))}
      </div>

      {!loading && listings.length === 0 && !error && (
        <div className="rounded-lg border border-dashed border-neutral-800 p-10 text-center text-neutral-500">
          Run a search to find flippable phones. Try one of the keyword presets.
        </div>
      )}
    </div>
  );
}
