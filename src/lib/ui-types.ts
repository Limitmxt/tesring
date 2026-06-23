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
}

export type SortKey =
  | "profit"
  | "score"
  | "risk"
  | "newest"
  | "price"
  | "roi";

export type CategoryFilter = "all" | "good" | "maybe";
