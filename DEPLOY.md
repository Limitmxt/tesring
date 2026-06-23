# Deploy guide — put the app online (free) and install it on your phone

This walks you through getting the app onto the internet with a secure
`https://…` address using **Render** (free). Once it's online, you can install
it on your phone's home screen.

You'll do this **once**. After that, your phone just opens the saved app.

**Time:** ~10 minutes. **Cost:** $0 on the free plan.

---

## Before you start, get your eBay keys

The app needs eBay API keys to search. Get them first so you can paste them in
during deploy:

1. Go to **https://developer.ebay.com/** and sign up (free).
2. Open **My Account → Application Keys**.
3. Create a **Production** keyset.
4. Copy two values — you'll paste them into Render later:
   - **App ID (Client ID)**
   - **Cert ID (Client Secret)**

(Optional) For AI listing explanations, also get an Anthropic key at
**https://console.anthropic.com/**. You can skip this — the app still works
without it.

---

## Step 1 — Make sure the code is on your `main` branch

The code currently lives on a feature branch. The simplest thing is to merge it
into `main` on GitHub:

1. Open your repo on GitHub.
2. If there's a **Pull Request** for the `claude/phone-deal-scanner-mvp-…`
   branch, open it and click **Merge**.
3. If there's no PR yet: on GitHub, switch to the feature branch, click
   **Contribute → Open pull request → Create → Merge**.

(That's it — Render will deploy from `main`.)

---

## Step 2 — Create a Render account

1. Go to **https://render.com** and click **Get Started**.
2. Sign up with **GitHub** (this lets Render see your repo). Approve access.

---

## Step 3 — Deploy with the Blueprint

1. In the Render dashboard, click **New +** (top right) → **Blueprint**.
2. Pick your repository from the list and click **Connect**.
3. Render reads the included `render.yaml` and shows a service called
   **phone-deal-scanner**. Click **Apply** / **Deploy**.
4. Render will prompt you for the secret values. Paste:
   - **EBAY_CLIENT_ID** → your eBay App ID
   - **EBAY_CLIENT_SECRET** → your eBay Cert ID
   - **ANTHROPIC_API_KEY** → your Anthropic key, or leave blank
5. Confirm. Render starts building. The first build takes ~3–5 minutes.

When it finishes you'll see a green **Live** badge and a URL like
`https://phone-deal-scanner.onrender.com`. Click it — that's your app.

---

## Step 4 — Install it on your phone

Open that `https://…onrender.com` URL on your phone:

- **Android (Chrome):** tap **⋮** → **Install app** (or **Add to Home screen**).
- **iPhone (Safari):** tap **Share** → **Add to Home Screen**.

Done — the app is now an icon on your home screen.

---

## Good to know (free plan limits)

- **Cold starts:** free services "sleep" after ~15 minutes of no use. The next
  visit takes ~30–50 seconds to wake up, then it's fast. Normal for free.
- **Watchlist resets on restart:** on the free plan the database is temporary,
  so your saved watchlist/searches can disappear when the service restarts. To
  make storage **permanent**, see below.

### Make storage permanent (optional, small monthly cost)

1. In Render, open the **phone-deal-scanner** service → **Settings**.
2. Change the **Instance Type** from Free to the cheapest paid plan (this is
   required to attach storage).
3. Go to **Disks → Add Disk**: name it `data`, **Mount Path** `/var/data`,
   size `1 GB`.
4. Go to **Environment** and change **DATABASE_PATH** to `/var/data/scanner.db`.
5. **Save** — Render redeploys, and your watchlist now persists forever.

---

## Updating the app later

Any time you push new code to `main` on GitHub, Render automatically rebuilds
and redeploys (because `autoDeploy` is on). Nothing else to do.
