import type { AiClassification, ProfitResult, ScoredListing } from "./types";

/**
 * A scored listing as returned by /api/search, plus the client-side editable
 * profit inputs and any AI classification fetched on demand.
 */
export interface UiListing extends ScoredListing {
  profit: ProfitResult;
  defaultRepairCost: number;
  // Editable profit inputs (mirror profit.* but mutable in the UI).
  resalePrice: number;
  repairCostInput: number;
  shippingInput: number;
  feesPercentInput: number;
  otherCostsInput: number;
  ai?: AiClassification;
  aiLoading?: boolean;
  // Auto resale estimate ("comps") from active eBay listings.
  compResale?: number;
  compSample?: number;
  compLow?: number;
  compHigh?: number;
  compLoading?: boolean;
}

export interface CompEstimate {
  key: string;
  label: string;
  resale: number;
  sampleSize: number;
  low: number;
  high: number;
}

export type SortKey =
  | "profit"
  | "score"
  | "risk"
  | "newest"
  | "price"
  | "roi";

export type CategoryFilter = "all" | "good" | "maybe";
