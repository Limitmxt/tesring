import {
  HARD_AVOID_PHRASES,
  IMEI_RISK_PHRASES,
  LOCK_RISK_PHRASES,
  LOT_SCRAP_PHRASES,
  NEGATIVE_SIGNALS,
  POSITIVE_SIGNALS,
  POWERS_ON_PHRASES,
  REPAIR_TYPE_PHRASES,
} from "./keywords";
import type {
  DealCategory,
  Listing,
  RepairType,
  ScoredListing,
  Tag,
} from "./types";

// Score starts neutral at 50 so a plain, info-light listing lands mid-scale.
// Positive/negative keyword signals push it up or down, then we clamp to 0-100.
const BASE_SCORE = 50;

// A listing only earns "Good Flip" if it clears this score AND passes the
// conservative risk checks below. Everything uncertain falls to "Maybe".
const GOOD_FLIP_MIN_SCORE = 70;

function hasPhrase(text: string, phrase: string): boolean {
  return text.includes(phrase);
}

function detectRepairTypes(text: string): RepairType[] {
  const found = new Set<RepairType>();
  for (const { type, phrases } of REPAIR_TYPE_PHRASES) {
    if (phrases.some((p) => hasPhrase(text, p))) found.add(type);
  }
  return [...found];
}

/**
 * Run the keyword scoring + risk engine on a single listing.
 *
 * The result is deterministic and works with no external services — the AI
 * classifier (see classify.ts) is a separate, optional enrichment layer.
 */
export function scoreListing(listing: Listing): ScoredListing {
  const text = listing.text.toLowerCase();

  let score = BASE_SCORE;
  const tags: Tag[] = [];
  const reasons: string[] = [];

  // --- keyword signals ---
  for (const { phrase, points } of POSITIVE_SIGNALS) {
    if (hasPhrase(text, phrase)) score += points;
  }
  for (const { phrase, points } of NEGATIVE_SIGNALS) {
    if (hasPhrase(text, phrase)) score += points; // points are negative
  }

  // --- seller-quality signals (not in listing text) ---
  if (listing.sellerFeedbackPercent !== null && listing.sellerFeedbackPercent >= 98) {
    score += 10;
    tags.push({ label: "Seller 98%+", tone: "good" });
  }
  if (listing.returnsAccepted) {
    score += 10;
    tags.push({ label: "Returns accepted", tone: "good" });
  }

  // --- risk signals ---
  const hardAvoid = HARD_AVOID_PHRASES.some((p) => hasPhrase(text, p));
  const powersOn = POWERS_ON_PHRASES.some((p) => hasPhrase(text, p));
  const lockRisk = LOCK_RISK_PHRASES.some((p) => hasPhrase(text, p));
  const imeiRisk = IMEI_RISK_PHRASES.some((p) => hasPhrase(text, p));
  const isLotOrScrap = LOT_SCRAP_PHRASES.some((p) => hasPhrase(text, p));
  const repairTypes = detectRepairTypes(text);
  const clearRepairIssue = repairTypes.length === 1;

  // --- tags shown on the card ---
  if (hasPhrase(text, "clean imei")) tags.push({ label: "Clean IMEI", tone: "good" });
  else if (!imeiRisk) tags.push({ label: "Clean IMEI not stated", tone: "info" });

  if (hasPhrase(text, "no icloud") || hasPhrase(text, "icloud removed"))
    tags.push({ label: "No iCloud lock", tone: "good" });
  else if (!lockRisk) tags.push({ label: "iCloud status not stated", tone: "info" });

  if (hasPhrase(text, "unlocked")) tags.push({ label: "Unlocked", tone: "good" });
  if (powersOn) tags.push({ label: "Powers on", tone: "good" });
  if (clearRepairIssue) tags.push({ label: "Clear repair issue", tone: "good" });

  if (lockRisk) tags.push({ label: "Lock risk", tone: "bad" });
  if (imeiRisk) tags.push({ label: "IMEI risk", tone: "bad" });
  if (hasPhrase(text, "water damage") || hasPhrase(text, "liquid damage"))
    tags.push({ label: "Water damage", tone: "bad" });
  if (hasPhrase(text, "untested")) tags.push({ label: "Untested", tone: "bad" });
  if (isLotOrScrap) tags.push({ label: "Lot / scrap", tone: "bad" });
  if (hasPhrase(text, "as-is") || hasPhrase(text, "as is"))
    tags.push({ label: "As-is", tone: "bad" });

  score = Math.max(0, Math.min(100, score));

  // --- conservative categorisation ---
  // Rule: never call something a "Good Flip" while a lock/IMEI risk, scrap, or
  // power problem is present, or when the repair issue isn't clearly a single
  // fixable thing. Anything uncertain becomes "Maybe / Needs Seller Message".
  let category: DealCategory;
  if (hardAvoid || lockRisk || imeiRisk) {
    category = "Avoid";
    reasons.push("Contains a hard-avoid signal (locked, blacklisted, financed, water damaged, or scrap).");
  } else if (
    score >= GOOD_FLIP_MIN_SCORE &&
    powersOn &&
    clearRepairIssue &&
    !isLotOrScrap &&
    !hasPhrase(text, "untested") &&
    !hasPhrase(text, "no power")
  ) {
    category = "Good Flip";
    reasons.push("Likely powers on, has a single clear repair issue, and shows no lock/IMEI red flags.");
  } else {
    category = "Maybe";
    if (!powersOn) reasons.push("Listing doesn't clearly say the phone powers on.");
    if (!clearRepairIssue && repairTypes.length === 0)
      reasons.push("No clear single repair issue described.");
    if (!clearRepairIssue && repairTypes.length > 1)
      reasons.push("Multiple repair issues — harder to estimate cost.");
    if (!hasPhrase(text, "clean imei")) reasons.push("Doesn't confirm clean IMEI — ask the seller.");
    if (!hasPhrase(text, "no icloud") && !hasPhrase(text, "icloud removed"))
      reasons.push("Doesn't confirm iCloud/Find My is removed — ask the seller.");
  }

  return {
    ...listing,
    score,
    category,
    tags,
    reasons,
    hardAvoid,
    signals: { powersOn, lockRisk, imeiRisk, clearRepairIssue, isLotOrScrap, repairTypes },
  };
}
