"use client";

import { useMemo, useState } from "react";
import { estimateProfit } from "@/lib/profit";
import { generateSellerMessage } from "@/lib/messages";
import type { UiListing } from "@/lib/ui-types";
import { CategoryBadge, ScoreBadge, TagPill } from "./Badges";

interface Props {
  listing: UiListing;
  onChange: (next: UiListing) => void;
  onClassify: (listing: UiListing) => void;
  onEstimate: (listing: UiListing) => void;
  onAddToWatchlist: (listing: UiListing, profitValue: number, sellerMsg: string) => void;
}

function money(n: number): string {
  return `$${n.toFixed(2)}`;
}

const REPAIR_LABELS: Record<string, string> = {
  screen: "Screen",
  battery: "Battery",
  chargingPort: "Charging port",
  backGlass: "Back glass",
  camera: "Camera",
};

export default function ListingCard({
  listing,
  onChange,
  onClassify,
  onEstimate,
  onAddToWatchlist,
}: Props) {
  const [copied, setCopied] = useState(false);

  // Recompute profit live from the editable inputs.
  const profit = useMemo(
    () =>
      estimateProfit(listing.price, {
        resalePrice: listing.resalePrice,
        repairCost: listing.repairCostInput,
        shipping: listing.shippingInput,
        feesPercent: listing.feesPercentInput,
        otherCosts: listing.otherCostsInput,
      }),
    [
      listing.price,
      listing.resalePrice,
      listing.repairCostInput,
      listing.shippingInput,
      listing.feesPercentInput,
      listing.otherCostsInput,
    ],
  );

  const profitColor =
    profit.profit > 30 ? "text-emerald-400" : profit.profit > 0 ? "text-yellow-400" : "text-red-400";

  const sellerMsg = generateSellerMessage(listing);

  function setNum(key: keyof UiListing, value: string) {
    onChange({ ...listing, [key]: Number(value) || 0 });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-900/50 p-3">
      {/* header */}
      <div className="flex gap-3">
        {listing.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.imageUrl}
            alt=""
            className="h-20 w-20 shrink-0 rounded-md object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md bg-neutral-800 text-2xl">
            📱
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <a
              href={listing.url}
              target="_blank"
              rel="noreferrer"
              className="line-clamp-2 text-sm font-medium text-neutral-100 hover:underline"
            >
              {listing.title}
            </a>
            <ScoreBadge score={listing.score} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
            <CategoryBadge category={listing.category} />
            <span>{money(listing.price)}</span>
            <span>+ {money(listing.shipping)} ship</span>
            <span>{listing.condition}</span>
            {listing.sellerFeedbackPercent !== null && (
              <span>{listing.sellerFeedbackPercent}% seller</span>
            )}
          </div>
        </div>
      </div>

      {/* tags */}
      <div className="flex flex-wrap gap-1">
        {listing.tags.map((t, i) => (
          <TagPill key={i} tag={t} />
        ))}
      </div>

      {/* profit estimator */}
      <div className="rounded-md border border-neutral-800 bg-neutral-950/60 p-2">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Field label="Resale est. ($)">
            <input
              className="field"
              type="number"
              value={listing.resalePrice || ""}
              placeholder={listing.compResale ? String(listing.compResale) : "auto/enter"}
              onChange={(e) => setNum("resalePrice", e.target.value)}
            />
            {listing.compLoading ? (
              <p className="mt-0.5 text-[10px] text-neutral-500">estimating…</p>
            ) : listing.compResale ? (
              <p className="mt-0.5 text-[10px] text-emerald-400">
                auto ~${listing.compResale} · {listing.compSample} comps (${listing.compLow}–$
                {listing.compHigh})
              </p>
            ) : listing.compSample === 0 ? (
              <p className="mt-0.5 text-[10px] text-neutral-500">no comps — enter manually</p>
            ) : null}
          </Field>
          <Field label="Repair ($)">
            <input
              className="field"
              type="number"
              value={listing.repairCostInput}
              onChange={(e) => setNum("repairCostInput", e.target.value)}
            />
            {listing.signals.repairTypes.length > 0 ? (
              <p className="mt-0.5 text-[10px] text-neutral-500">
                auto: {listing.signals.repairTypes.map((t) => REPAIR_LABELS[t]).join(", ")} (${listing.defaultRepairCost})
              </p>
            ) : (
              <p className="mt-0.5 text-[10px] text-neutral-500">no issue detected</p>
            )}
          </Field>
          <Field label="Shipping ($)">
            <input
              className="field"
              type="number"
              value={listing.shippingInput}
              onChange={(e) => setNum("shippingInput", e.target.value)}
            />
          </Field>
          <Field label="Fees (%)">
            <input
              className="field"
              type="number"
              value={listing.feesPercentInput}
              onChange={(e) => setNum("feesPercentInput", e.target.value)}
            />
          </Field>
          <Field label="Other ($)">
            <input
              className="field"
              type="number"
              value={listing.otherCostsInput}
              onChange={(e) => setNum("otherCostsInput", e.target.value)}
            />
          </Field>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-neutral-400">
            Buy {money(listing.price)} · Fees {money(profit.fees)}
          </span>
          <span className={`font-semibold ${profitColor}`}>
            Profit {money(profit.profit)} · ROI {profit.roi.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* AI classification */}
      {listing.ai && (
        <div className="rounded-md border border-neutral-800 bg-neutral-950/60 p-2 text-xs text-neutral-300">
          <div className="mb-1 flex items-center gap-2">
            <CategoryBadge category={listing.ai.category} />
            <span className="font-medium text-neutral-200">AI read</span>
          </div>
          <p className="leading-relaxed">{listing.ai.summary}</p>
          <p className="mt-1 text-neutral-400">
            <span className="text-neutral-500">Risks:</span> {listing.ai.risks}
          </p>
        </div>
      )}

      {/* reasons (rule engine) */}
      {!listing.ai && listing.reasons.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-4 text-xs text-neutral-400">
          {listing.reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      )}

      {/* actions */}
      <div className="flex flex-wrap gap-2">
        <button
          className="btn-ghost"
          disabled={listing.compLoading}
          onClick={() => onEstimate(listing)}
        >
          {listing.compLoading ? "Estimating…" : "Estimate resale"}
        </button>
        <button
          className="btn-ghost"
          disabled={listing.aiLoading}
          onClick={() => onClassify(listing)}
        >
          {listing.aiLoading ? "Classifying…" : listing.ai ? "Re-classify (AI)" : "Classify (AI)"}
        </button>
        <button
          className="btn-ghost"
          onClick={() => {
            navigator.clipboard?.writeText(listing.ai?.sellerQuestion ?? sellerMsg);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Copied!" : "Copy seller msg"}
        </button>
        <button
          className="btn-primary"
          onClick={() =>
            onAddToWatchlist(listing, profit.profit, listing.ai?.sellerQuestion ?? sellerMsg)
          }
        >
          + Watchlist
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[10px] uppercase tracking-wide text-neutral-500">
        {label}
      </span>
      {children}
    </label>
  );
}
