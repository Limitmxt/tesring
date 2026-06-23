import Anthropic from "@anthropic-ai/sdk";
import { generateSellerMessage } from "./messages";
import type { AiClassification, DealCategory, ProfitResult, ScoredListing } from "./types";

// ---------------------------------------------------------------------------
// AI listing classifier (optional layer on top of the rule engine).
//
// When ANTHROPIC_API_KEY is set, we ask Claude to read the listing and produce
// a conservative Good Flip / Maybe / Avoid call with a plain-English rationale
// and a seller question. When the key is absent, we fall back to a deterministic
// classification derived from the rule engine, so the app always works.
// ---------------------------------------------------------------------------

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

export function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// JSON schema the model must conform to (structured outputs guarantee shape).
const CLASSIFICATION_SCHEMA = {
  type: "object",
  properties: {
    category: { type: "string", enum: ["Good Flip", "Maybe", "Avoid"] },
    whyGood: { type: "string" },
    risks: { type: "string" },
    sellerQuestion: { type: "string" },
    avoid: { type: "boolean" },
    summary: { type: "string" },
  },
  required: ["category", "whyGood", "risks", "sellerQuestion", "avoid", "summary"],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `You help a phone reseller decide whether a damaged/used phone listing is worth buying to fix and reflip.

Be CONSERVATIVE. The reseller would rather miss a deal than buy junk. Apply these rules:

- Mark "Avoid" if the listing shows: iCloud locked, Google/FRP locked, blacklisted, bad IMEI, financed, water damaged, scrap, gold recovery, random bulk lot, untested lot, or missing motherboard.
- Mark "Good Flip" ONLY if ALL of these hold: the phone likely powers on, there is no obvious lock issue, there is no obvious IMEI issue, the repair issue is clear and single, the estimated profit is positive, and it is not a lot/scrap.
- If information is missing (e.g. it doesn't say clean IMEI or no iCloud), mark "Maybe", NOT "Good Flip".

Write the explanation in plain, direct English. Keep "summary" to one or two sentences in the style of:
"Maybe. Good because it says unlocked and cracked screen only. Risk is it does not clearly say clean IMEI or no iCloud lock. Message seller before buying."`;

/** Deterministic fallback used when no AI key is configured (or AI fails). */
export function ruleBasedClassification(listing: ScoredListing): AiClassification {
  const goodReasons: string[] = [];
  if (listing.signals.powersOn) goodReasons.push("listing says it powers on");
  if (listing.tags.some((t) => t.label === "Unlocked")) goodReasons.push("unlocked");
  if (listing.signals.clearRepairIssue) goodReasons.push("a single clear repair issue");
  if (listing.tags.some((t) => t.label === "Clean IMEI")) goodReasons.push("clean IMEI stated");

  const whyGood = goodReasons.length
    ? `Good because ${goodReasons.join(", ")}.`
    : "Not much positive is confirmed in the listing text.";

  const risks = listing.reasons.length
    ? listing.reasons.join(" ")
    : "No obvious risks detected, but the listing is light on detail.";

  return {
    category: listing.category,
    whyGood,
    risks,
    sellerQuestion: generateSellerMessage(listing),
    avoid: listing.category === "Avoid",
    summary: `${listing.category}. ${whyGood} ${risks}`.trim(),
  };
}

/**
 * Classify a listing with Claude. Falls back to the rule-based result if the
 * AI key is missing or the call fails — the caller always gets a usable answer.
 */
export async function classifyWithAi(
  listing: ScoredListing,
  profit: ProfitResult | null,
): Promise<AiClassification> {
  if (!aiEnabled()) return ruleBasedClassification(listing);

  const client = new Anthropic();

  const profitLine =
    profit !== null
      ? `Estimated profit: $${profit.profit.toFixed(2)} (ROI ${profit.roi.toFixed(0)}%), based on resale $${profit.resalePrice}, buy $${profit.buyPrice}, repair $${profit.repairCost}, shipping $${profit.shipping}, fees $${profit.fees.toFixed(2)}.`
      : "Estimated profit: not yet entered by the user.";

  const userContent = [
    `Title: ${listing.title}`,
    `Condition: ${listing.condition}`,
    `Price: $${listing.price} + $${listing.shipping} shipping`,
    `Seller feedback: ${listing.sellerFeedbackPercent ?? "unknown"}%`,
    `Returns accepted: ${listing.returnsAccepted ? "yes" : "no"}`,
    `Rule-engine score: ${listing.score}/100, tentative category: ${listing.category}`,
    `Detected signals: ${JSON.stringify(listing.signals)}`,
    profitLine,
    "",
    "Classify this listing for flipping. Respond using the required JSON shape.",
  ].join("\n");

  try {
    // `output_config` (structured outputs) may be newer than the installed
    // SDK's static types, so we build the params loosely and cast on the call.
    const createParams = {
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      output_config: { format: { type: "json_schema", schema: CLASSIFICATION_SCHEMA } },
      messages: [{ role: "user", content: userContent }],
    };
    const res = await client.messages.create(createParams as any);

    const textBlock = res.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return ruleBasedClassification(listing);

    const parsed = JSON.parse(textBlock.text) as AiClassification;

    // Safety net: never let the AI upgrade a hard-avoid listing to a buy.
    if (listing.hardAvoid || listing.signals.lockRisk || listing.signals.imeiRisk) {
      parsed.category = "Avoid";
      parsed.avoid = true;
    }
    return parsed;
  } catch {
    return ruleBasedClassification(listing);
  }
}

export type { DealCategory };
