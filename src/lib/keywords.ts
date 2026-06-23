import type { RepairType } from "./types";

// ---------------------------------------------------------------------------
// Default search keyword presets. These are the queries the user described —
// the kinds of damaged-but-fixable phones worth flipping.
// ---------------------------------------------------------------------------
export const DEFAULT_KEYWORD_PRESETS: string[] = [
  "iPhone cracked screen clean IMEI",
  "iPhone bad battery unlocked",
  "Samsung cracked screen unlocked",
  "iPhone no iCloud cracked",
  "iPhone powers on for repair",
  "iPhone charging port issue",
  "iPhone back glass cracked unlocked",
  "iPhone for repair clean IMEI",
  "iPhone unlocked damaged",
  "Samsung bad battery unlocked",
];

// ---------------------------------------------------------------------------
// Scoring signals. Each entry is a phrase (matched case-insensitively against
// the listing text) and the points it adds (positive) or subtracts (negative).
//
// These mirror the business rules: reward clear, fixable, unlocked phones;
// punish locked / blacklisted / scrap / untested listings.
// ---------------------------------------------------------------------------
export interface KeywordSignal {
  phrase: string;
  points: number;
}

export const POSITIVE_SIGNALS: KeywordSignal[] = [
  { phrase: "clean imei", points: 30 },
  { phrase: "no icloud", points: 30 },
  { phrase: "icloud removed", points: 30 },
  { phrase: "find my off", points: 20 },
  { phrase: "unlocked", points: 20 },
  { phrase: "factory reset", points: 15 },
  { phrase: "powers on", points: 20 },
  { phrase: "turns on", points: 20 },
  { phrase: "boots", points: 15 },
  { phrase: "works", points: 15 },
  { phrase: "working", points: 15 },
  { phrase: "cracked screen", points: 15 },
  { phrase: "bad battery", points: 15 },
  { phrase: "battery issue", points: 15 },
  { phrase: "charging port", points: 15 },
  { phrase: "back glass cracked", points: 10 },
  { phrase: "cracked back", points: 10 },
  { phrase: "returns accepted", points: 10 },
];

export const NEGATIVE_SIGNALS: KeywordSignal[] = [
  { phrase: "icloud locked", points: -80 },
  { phrase: "icloud lock", points: -80 },
  { phrase: "google locked", points: -80 },
  { phrase: "frp locked", points: -80 },
  { phrase: "frp lock", points: -80 },
  { phrase: "blacklisted", points: -80 },
  { phrase: "bad imei", points: -80 },
  { phrase: "bad esn", points: -80 },
  { phrase: "financed", points: -70 },
  { phrase: "unpaid balance", points: -70 },
  { phrase: "water damage", points: -70 },
  { phrase: "liquid damage", points: -70 },
  { phrase: "password locked", points: -70 },
  { phrase: "passcode locked", points: -70 },
  { phrase: "no power", points: -60 },
  { phrase: "does not turn on", points: -60 },
  { phrase: "won't turn on", points: -60 },
  { phrase: "scrap", points: -60 },
  { phrase: "gold recovery", points: -80 },
  { phrase: "untested", points: -50 },
  { phrase: "as-is", points: -35 },
  { phrase: "as is", points: -35 },
  { phrase: "lot of", points: -40 },
  { phrase: "bulk lot", points: -40 },
  { phrase: "wholesale lot", points: -40 },
  { phrase: "parts only", points: -30 },
  { phrase: "for parts", points: -30 },
  { phrase: "missing motherboard", points: -90 },
  { phrase: "no motherboard", points: -90 },
];

// ---------------------------------------------------------------------------
// Hard-avoid phrases. A match flags the listing as "Avoid" regardless of
// score, and hides it unless the user opts to show avoid listings.
// ---------------------------------------------------------------------------
export const HARD_AVOID_PHRASES: string[] = [
  "icloud locked",
  "icloud lock",
  "google locked",
  "frp locked",
  "frp lock",
  "blacklisted",
  "bad imei",
  "bad esn",
  "financed",
  "water damage",
  "liquid damage",
  "gold recovery",
  "scrap",
  "missing motherboard",
  "no motherboard",
  "password locked",
  "passcode locked",
];

// Signals that the phone likely powers on.
export const POWERS_ON_PHRASES = [
  "powers on",
  "turns on",
  "boots",
  "works",
  "working",
  "fully functional",
];

// Signals that point to a lock problem (iCloud / Google / FRP / passcode).
export const LOCK_RISK_PHRASES = [
  "icloud locked",
  "icloud lock",
  "google locked",
  "frp locked",
  "frp lock",
  "password locked",
  "passcode locked",
  "account locked",
];

// Signals of an IMEI / ESN problem.
export const IMEI_RISK_PHRASES = [
  "bad imei",
  "bad esn",
  "blacklisted",
  "financed",
  "unpaid balance",
];

// Signals this is a bulk lot / scrap pile rather than a single phone.
export const LOT_SCRAP_PHRASES = [
  "lot of",
  "bulk lot",
  "wholesale lot",
  "scrap",
  "gold recovery",
  "untested lot",
];

// Repair-issue phrases mapped to a repair type (used for the profit estimator).
export const REPAIR_TYPE_PHRASES: { type: RepairType; phrases: string[] }[] = [
  { type: "screen", phrases: ["cracked screen", "broken screen", "screen replacement", "lcd"] },
  { type: "battery", phrases: ["bad battery", "battery issue", "battery health", "needs battery"] },
  { type: "chargingPort", phrases: ["charging port", "charge port", "won't charge", "wont charge"] },
  { type: "backGlass", phrases: ["back glass", "cracked back", "broken back"] },
  { type: "camera", phrases: ["camera issue", "broken camera", "camera not working", "rear camera"] },
];
