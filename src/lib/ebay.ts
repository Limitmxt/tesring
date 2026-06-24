import type { Brand, Listing, SearchParams } from "./types";

// ---------------------------------------------------------------------------
// eBay Browse API client (OAuth2 client-credentials grant).
//
// We use the official Buy Browse API — NOT scraping. Search results come from
// /buy/browse/v1/item_summary/search. The summary payload does not include the
// full item description, so we score against the title + condition. That is
// usually enough to flag the obvious red flags; the AI classifier and a manual
// look fill in the rest.
// ---------------------------------------------------------------------------

const ENV = process.env.EBAY_ENV === "sandbox" ? "sandbox" : "production";
const API_BASE =
  ENV === "sandbox" ? "https://api.sandbox.ebay.com" : "https://api.ebay.com";
const MARKETPLACE_ID = process.env.EBAY_MARKETPLACE_ID || "EBAY_US";

// "Cell Phones & Smartphones" category — keeps results to actual phones.
const CELL_PHONES_CATEGORY = "9355";

let cachedToken: { value: string; expiresAt: number } | null = null;

export class EbayConfigError extends Error {}

function getCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new EbayConfigError(
      "Missing EBAY_CLIENT_ID / EBAY_CLIENT_SECRET. Add them to .env.local — see .env.example.",
    );
  }
  return { clientId, clientSecret };
}

/** Fetch (and cache) an application OAuth token via the client-credentials grant. */
async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const { clientId, clientSecret } = getCredentials();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(`${API_BASE}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "https://api.ebay.com/oauth/api_scope",
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`eBay OAuth failed (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.value;
}

function brandKeyword(brand: Brand): string {
  switch (brand) {
    case "iPhone":
      return "iPhone";
    case "Samsung":
      return "Samsung Galaxy";
    case "Google Pixel":
      return "Google Pixel";
    default:
      return "";
  }
}

/** Build the Browse API `filter` string from the user's parameters. */
function buildFilters(params: SearchParams): string {
  const filters: string[] = [
    "buyingOptions:{FIXED_PRICE|AUCTION}",
  ];
  if (params.maxPrice && params.maxPrice > 0) {
    filters.push(`price:[..${params.maxPrice}]`, "priceCurrency:USD");
  }
  if (params.maxShipping !== null && params.maxShipping !== undefined) {
    filters.push(`maxDeliveryCost:${params.maxShipping}`);
  }
  return filters.join(",");
}

function normalizeItem(item: any): Listing {
  const shippingOption = item.shippingOptions?.[0];
  const shipping = shippingOption?.shippingCost?.value
    ? Number(shippingOption.shippingCost.value)
    : 0;

  // Build the text we score against: title + condition + any short blurb.
  const parts = [item.title, item.condition, item.shortDescription].filter(
    Boolean,
  );

  return {
    id: String(item.itemId ?? item.legacyItemId ?? item.title),
    title: item.title ?? "Untitled listing",
    text: parts.join(" . "),
    price: item.price?.value ? Number(item.price.value) : 0,
    currency: item.price?.currency ?? "USD",
    shipping,
    condition: item.condition ?? "Unknown",
    imageUrl: item.image?.imageUrl ?? item.thumbnailImages?.[0]?.imageUrl ?? null,
    url: item.itemAffiliateWebUrl ?? item.itemWebUrl ?? "#",
    sellerName: item.seller?.username ?? null,
    sellerFeedbackPercent: item.seller?.feedbackPercentage
      ? Number(item.seller.feedbackPercentage)
      : null,
    sellerFeedbackScore: item.seller?.feedbackScore
      ? Number(item.seller.feedbackScore)
      : null,
    returnsAccepted: Boolean(item.returnTerms?.returnsAccepted),
    createdAt: item.itemCreationDate ?? null,
  };
}

/**
 * Search eBay for listings matching the supplied parameters.
 * Returns normalized listings; scoring/classification happen downstream.
 */
export async function searchListings(params: SearchParams): Promise<Listing[]> {
  const token = await getAccessToken();

  const q = [brandKeyword(params.brand), params.keywords, params.includeKeywords]
    .filter(Boolean)
    .join(" ")
    .trim();

  const url = new URL(`${API_BASE}/buy/browse/v1/item_summary/search`);
  url.searchParams.set("q", q || "phone");
  url.searchParams.set("category_ids", CELL_PHONES_CATEGORY);
  url.searchParams.set("limit", String(Math.min(params.limit ?? 50, 200)));
  const filters = buildFilters(params);
  if (filters) url.searchParams.set("filter", filters);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "X-EBAY-C-MARKETPLACE-ID": MARKETPLACE_ID,
    "Content-Type": "application/json",
  };
  const campaignId = process.env.EBAY_AFFILIATE_CAMPAIGN_ID;
  if (campaignId) {
    headers["X-EBAY-C-ENDUSERCTX"] = `affiliateCampaignId=${campaignId}`;
  }

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`eBay search failed (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as { itemSummaries?: any[] };
  let listings = (data.itemSummaries ?? []).map(normalizeItem);

  // Client-side exclude-keyword filtering (the Browse API has no "NOT" query).
  const excludes = params.excludeKeywords
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);
  if (excludes.length) {
    listings = listings.filter(
      (l) => !excludes.some((kw) => l.text.toLowerCase().includes(kw)),
    );
  }

  // Seller-rating filter (applied client-side since it's not a Browse filter).
  if (params.minSellerRating !== null && params.minSellerRating !== undefined) {
    listings = listings.filter(
      (l) =>
        l.sellerFeedbackPercent === null ||
        l.sellerFeedbackPercent >= (params.minSellerRating as number),
    );
  }

  return listings;
}

// Words that mean a comp is NOT a clean working unit — we drop these so the
// resale estimate reflects sellable phones, not other damaged/locked listings.
const COMP_EXCLUDE = [
  "cracked",
  "crack",
  "broken",
  "shatter",
  "for parts",
  "parts only",
  "icloud lock",
  "icloud locked",
  "google lock",
  "frp",
  "blacklist",
  "bad imei",
  "bad esn",
  "lot of",
  "bulk",
  "scrap",
  "as-is",
  "as is",
  "repair",
  "faulty",
  "not working",
  "won't",
  "wont",
  "doesn't",
  "does not",
  "water damage",
  "damaged",
];

/**
 * Fetch asking prices of comparable working/used units for a model query.
 * Used by the resale estimator. Returns the list of item prices (USD).
 */
export async function fetchCompPrices(query: string): Promise<number[]> {
  const token = await getAccessToken();

  const url = new URL(`${API_BASE}/buy/browse/v1/item_summary/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("category_ids", CELL_PHONES_CATEGORY);
  url.searchParams.set("limit", "50");
  // Used + refurbished, fixed-price (asking prices closest to resale value).
  url.searchParams.set(
    "filter",
    "conditionIds:{2000|2010|2020|2030|2500|3000},buyingOptions:{FIXED_PRICE}",
  );

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "X-EBAY-C-MARKETPLACE-ID": MARKETPLACE_ID,
    "Content-Type": "application/json",
  };

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) throw new Error(`eBay comps failed (${res.status})`);

  const data = (await res.json()) as { itemSummaries?: any[] };
  return (data.itemSummaries ?? [])
    .filter((it) => {
      const t = (it.title ?? "").toLowerCase();
      return !COMP_EXCLUDE.some((w) => t.includes(w));
    })
    .map((it) => (it.price?.value ? Number(it.price.value) : 0))
    .filter((p) => p > 0);
}
