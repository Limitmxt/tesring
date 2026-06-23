import type { ScoredListing } from "./types";

/**
 * Generate a short, copy-paste seller message tailored to the platform.
 * Apple phones get the iCloud/Find My questions; Android gets Google/FRP.
 */
export function generateSellerMessage(listing: ScoredListing): string {
  const text = listing.text.toLowerCase();
  const isApple = text.includes("iphone") || text.includes("ipad") || text.includes("apple");

  if (isApple) {
    return (
      "Hey, quick question before I buy. Does the phone power on, is it fully " +
      "paid off (not financed), and is the IMEI clean / not blacklisted? Also, " +
      "is iCloud / Find My iPhone fully removed and the phone signed out? Thanks!"
    );
  }

  return (
    "Hey, quick question before I buy. Does the phone power on, is it factory " +
    "reset, and is the Google account / FRP lock removed? Also, is the IMEI " +
    "clean and not blacklisted or financed? Thanks!"
  );
}
