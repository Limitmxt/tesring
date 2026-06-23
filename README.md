# 📱 Phone Deal Scanner

An MVP web app that helps you find **profitable phones to flip on eBay**. It
searches eBay for damaged/underpriced phones, scores each listing, classifies it
(Good Flip / Maybe / Avoid), estimates profit, and lets you save promising
listings to a watchlist with seller-message templates.

> It does **not** auto-buy anything. It surfaces listings worth checking
> manually and flags the junk: iCloud/Google/FRP-locked, blacklisted, financed,
> water-damaged, scrap lots, and "untested" listings.

---

## Tech stack

- **Framework:** Next.js 14 (App Router) + TypeScript — one app serves both UI and API.
- **Database:** SQLite via `better-sqlite3` (file-based, zero setup).
- **eBay:** Official **Browse API** (`/buy/browse/v1/item_summary/search`) with the
  OAuth2 client-credentials grant. No scraping.
- **AI classifier:** Anthropic Claude (`claude-opus-4-8` by default). Optional —
  the app falls back to a deterministic rule-based classifier when no key is set.
- **Styling:** Tailwind CSS, dark mode, mobile-friendly.

---

## Setup

### 1. Install

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in the values (see the two API-setup sections below). At minimum you need
`EBAY_CLIENT_ID` and `EBAY_CLIENT_SECRET` for live search. The Anthropic key is
optional.

### 3. Run

```bash
npm run dev
```

Open http://localhost:3000. The SQLite database is created automatically at
`./data/scanner.db` on first use.

### 4. Build for production

```bash
npm run build && npm start
```

---

## eBay API setup

1. Create a developer account at **https://developer.ebay.com/**.
2. Go to **My Account → Application Keys**.
3. Create (or use) a **Production** keyset. You need:
   - **App ID (Client ID)** → `EBAY_CLIENT_ID`
   - **Cert ID (Client Secret)** → `EBAY_CLIENT_SECRET`
4. No user login / consent flow is required — the app uses the
   **client-credentials** OAuth grant with the public `api_scope`, which the
   Browse API accepts.
5. (Optional) If you have an **eBay Partner Network** Campaign ID, set
   `EBAY_AFFILIATE_CAMPAIGN_ID` to get affiliate-tagged listing links.

To experiment without production keys, set `EBAY_ENV=sandbox` and use your
sandbox keyset (sandbox inventory is sparse, so results will be thin).

### Anthropic API setup (optional)

1. Get a key at **https://console.anthropic.com/**.
2. Set `ANTHROPIC_API_KEY` in `.env.local`.
3. (Optional) Override `ANTHROPIC_MODEL` — defaults to `claude-opus-4-8`. For
   cheaper, faster classification at scale, try `claude-haiku-4-5`.

Without a key, the **"Classify (AI)"** button still works — it returns the
rule-engine's conservative classification and a generated seller question.

---

## How the scoring works

Every listing gets a **0–100 deal score** (`src/lib/scoring.ts`). It starts at a
neutral **50**, then keyword signals push it up or down, and the result is
clamped to 0–100.

**Positive signals** (examples): `clean IMEI` +30, `no iCloud` +30, `unlocked`
+20, `powers on` +20, `cracked screen` +15, `bad battery` +15, `charging port`
+15, `back glass cracked` +10. Seller ≥98% and "returns accepted" add +10 each.

**Negative signals** (examples): `iCloud locked` −80, `blacklisted` −80,
`bad IMEI` −80, `financed` −70, `water damage` −70, `no power` −60, `scrap` −60,
`untested` −50, `as-is` −35, `lot` −40, `parts only` −30, `missing motherboard`
−90.

**Categories** are assigned conservatively (`Good Flip` / `Maybe` / `Avoid`):

- **Avoid** — any hard-avoid signal is present (locked, blacklisted, financed,
  water damaged, scrap, gold recovery, missing motherboard, etc.). These are
  hidden unless you tick **"Show avoid listings."**
- **Good Flip** — _only_ when **all** hold: score ≥ 70, the phone likely powers
  on, there's a single clear repair issue, no lock/IMEI risk, and it's not a
  lot/scrap or untested.
- **Maybe / Needs Seller Message** — everything else. If information is missing
  (e.g. it doesn't confirm clean IMEI or no iCloud), it lands here, **never**
  Good Flip. The app would rather you ask the seller than buy blind.

The optional **AI classifier** (`src/lib/classify.ts`) re-reads the listing with
the same conservative rules and writes a plain-English summary, risk note, and
seller question. A safety net prevents the AI from ever upgrading a hard-avoid
or locked listing to a buy.

### Profit estimator

`resale − buy − shipping − repair − fees − other = profit`. Fees are a
percentage of resale (eBay's final value fee). Repair costs default to per-issue
estimates from settings (screen/battery/charging port/back glass/camera) and are
fully editable per listing. ROI = profit ÷ total cash out.

### Sold comps

eBay's Browse API does **not** expose sold/completed listings (that needs the
restricted Marketplace Insights API). So resale value is entered manually for
now — each card has an editable "Resale est." field. Wiring up real comps is on
the roadmap below.

---

## Database schema

SQLite (`src/lib/db.ts`), created automatically:

```sql
-- App settings (default repair costs, fee %, default shipping) — single row.
CREATE TABLE settings (
  id    INTEGER PRIMARY KEY CHECK (id = 1),
  data  TEXT NOT NULL              -- JSON-encoded Settings
);

-- Saved listings.
CREATE TABLE watchlist (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id        TEXT NOT NULL,
  title             TEXT NOT NULL,
  url               TEXT NOT NULL,
  price             REAL NOT NULL DEFAULT 0,
  notes             TEXT NOT NULL DEFAULT '',
  repair_cost       REAL NOT NULL DEFAULT 0,
  resale_price      REAL NOT NULL DEFAULT 0,
  estimated_profit  REAL NOT NULL DEFAULT 0,
  seller_questions  TEXT NOT NULL DEFAULT '',
  status            TEXT NOT NULL DEFAULT 'Watching',  -- Watching|Messaged Seller|Bought|Passed|Sold
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Saved searches (for re-running and, later, alerts).
CREATE TABLE saved_searches (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  params      TEXT NOT NULL,        -- JSON-encoded SearchParams
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## Project layout

```
src/
  app/
    page.tsx              Dashboard (search, score, filter/sort, profit, watchlist)
    watchlist/page.tsx    Watchlist manager
    api/
      search/             POST: search eBay + score + initial profit
      classify/           POST: AI (or rule-based) classification for one listing
      watchlist/          GET/POST + [id] PATCH/DELETE
      settings/           GET/PUT default repair costs & fees
      saved-searches/     GET/POST/DELETE
  lib/
    ebay.ts        Browse API client (OAuth + search + normalize)
    scoring.ts     Deterministic score + risk + category engine
    classify.ts    Claude classifier (+ rule-based fallback)
    profit.ts      Profit / ROI math
    messages.ts    Seller-message generator (Apple vs Android)
    keywords.ts    Signal phrases + point values
    db.ts          SQLite persistence
    types.ts       Shared types
  components/      Filters, ListingCard, Badges
```

---

## Roadmap / future improvements

**Phase 3 and beyond** (Phase 1 + 2 are implemented):

- **Real sold comps** — integrate eBay Marketplace Insights (requires access
  approval) or a comps provider to auto-fill resale value per model + storage.
- **Full descriptions** — call the Browse `getItem` endpoint to score against the
  full item description, not just the title/condition.
- **Alerts** — background job over saved searches that notifies (email/SMS/push)
  when a listing scores > 75, profit clears your minimum, and it's clean.
- **IMEI/blacklist checks** — optional paid IMEI-status lookup before buying.
- **Auth + multi-user** — per-user watchlists and settings.
- **Bulk AI classification** — classify the whole result page in one batch call.
- **Model/storage parser** — extract "iPhone 12 64GB" structured fields to drive
  comps and better repair-cost defaults.
- **Image-based condition check** — use a vision model on listing photos to flag
  damage the title omits.
```
