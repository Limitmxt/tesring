import type { Settings } from "./types";

// Default repair-cost estimates + fee assumptions. Lives in its own module so
// both server code (db.ts) and client components can import it without pulling
// in the native SQLite dependency.
export const DEFAULT_SETTINGS: Settings = {
  repairCosts: {
    screen: 45,
    battery: 20,
    chargingPort: 25,
    backGlass: 40,
    camera: 30,
  },
  defaultFeesPercent: 13.25, // eBay final value fee ballpark for electronics
  defaultShipping: 8,
};
