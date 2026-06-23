// Shared types used across the API routes, scoring engine, and UI.

export type Brand = "iPhone" | "Samsung" | "Google Pixel" | "all";

export type DealCategory = "Good Flip" | "Maybe" | "Avoid";

/** A warning/info tag shown on a listing card. */
export interface Tag {
  label: string;
  /** "good" highlights a positive signal, "bad" a risk, "info" neutral. */
  tone: "good" | "bad" | "info";
}

/** The raw, normalized listing pulled from the eBay Browse API. */
export interface Listing {
  id: string;
  title: string;
  /** Full text we scored against (title + condition + any description). */
  text: string;
  price: number;
  currency: string;
  shipping: number;
  condition: string;
  imageUrl: string | null;
  url: string;
  sellerName: string | null;
  /** Seller positive-feedback percentage, 0-100, or null if unavailable. */
  sellerFeedbackPercent: number | null;
  sellerFeedbackScore: number | null;
  returnsAccepted: boolean;
  /** ISO timestamp the listing was created, when eBay provides it. */
  createdAt: string | null;
}

/** Output of the deterministic scoring + risk engine for one listing. */
export interface ScoredListing extends Listing {
  score: number;
  category: DealCategory;
  tags: Tag[];
  /** Why the rule engine landed on this category, in plain English. */
  reasons: string[];
  /** True if a hard-avoid keyword (locked, blacklisted, etc.) was found. */
  hardAvoid: boolean;
  /** Signals detected, used by the profit estimator + AI classifier. */
  signals: {
    powersOn: boolean;
    lockRisk: boolean;
    imeiRisk: boolean;
    clearRepairIssue: boolean;
    isLotOrScrap: boolean;
    repairTypes: RepairType[];
  };
}

export type RepairType =
  | "screen"
  | "battery"
  | "chargingPort"
  | "backGlass"
  | "camera";

/** Editable, per-listing profit inputs (defaults filled from settings). */
export interface ProfitInputs {
  resalePrice: number;
  repairCost: number;
  shipping: number;
  feesPercent: number;
  otherCosts: number;
}

export interface ProfitResult {
  buyPrice: number;
  shipping: number;
  repairCost: number;
  resalePrice: number;
  fees: number;
  otherCosts: number;
  profit: number;
  roi: number; // percentage
}

/** AI classifier output (when an Anthropic key is configured). */
export interface AiClassification {
  category: DealCategory;
  whyGood: string;
  risks: string;
  sellerQuestion: string;
  avoid: boolean;
  summary: string;
}

/** Default repair-cost estimates + fee assumptions (persisted in settings). */
export interface Settings {
  repairCosts: Record<RepairType, number>;
  defaultFeesPercent: number;
  defaultShipping: number;
}

export interface WatchlistItem {
  id?: number;
  listingId: string;
  title: string;
  url: string;
  price: number;
  notes: string;
  repairCost: number;
  resalePrice: number;
  estimatedProfit: number;
  sellerQuestions: string;
  status: "Watching" | "Messaged Seller" | "Bought" | "Passed" | "Sold";
  createdAt?: string;
}

export interface SavedSearch {
  id?: number;
  name: string;
  params: SearchParams;
  createdAt?: string;
}

/** Search + filter parameters submitted from the dashboard. */
export interface SearchParams {
  keywords: string;
  brand: Brand;
  maxPrice: number | null;
  maxShipping: number | null;
  minSellerRating: number | null;
  minProfit: number | null;
  includeKeywords: string;
  excludeKeywords: string;
  limit?: number;
}
