import type { ProfitInputs, ProfitResult, RepairType, Settings } from "./types";

/**
 * Estimated profit formula:
 *   resale - buyPrice - shipping - repairCost - fees - otherCosts = profit
 *
 * Fees are computed as a percentage of the resale price (eBay's final value
 * fee is charged on the sale total, not on your buy price).
 */
export function estimateProfit(
  buyPrice: number,
  inputs: ProfitInputs,
): ProfitResult {
  const fees = (inputs.resalePrice * inputs.feesPercent) / 100;
  const profit =
    inputs.resalePrice -
    buyPrice -
    inputs.shipping -
    inputs.repairCost -
    fees -
    inputs.otherCosts;

  // ROI is profit relative to total cash out (what you actually risk).
  const totalCost =
    buyPrice + inputs.shipping + inputs.repairCost + inputs.otherCosts;
  const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0;

  return {
    buyPrice,
    shipping: inputs.shipping,
    repairCost: inputs.repairCost,
    resalePrice: inputs.resalePrice,
    fees,
    otherCosts: inputs.otherCosts,
    profit,
    roi,
  };
}

/**
 * Build a sensible starting repair-cost estimate for a listing by summing the
 * per-issue defaults from settings for each detected repair type.
 */
export function defaultRepairCost(
  repairTypes: RepairType[],
  settings: Settings,
): number {
  return repairTypes.reduce(
    (sum, type) => sum + (settings.repairCosts[type] ?? 0),
    0,
  );
}
