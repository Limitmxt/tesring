import type { MetadataRoute } from "next";

// Web app manifest — makes the site installable as a home-screen app.
// Next.js serves this at /manifest.webmanifest.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Phone Deal Scanner",
    short_name: "Deal Scanner",
    description: "Find profitable phones to flip on eBay.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0a",
    theme_color: "#059669",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
