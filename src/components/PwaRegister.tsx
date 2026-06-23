"use client";

import { useEffect } from "react";

/**
 * Registers the service worker on the client. Rendered once in the root
 * layout; required for the browser's "Install app" prompt to appear.
 */
export default function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failures are non-fatal — the app still works in-browser.
      });
    }
  }, []);
  return null;
}
