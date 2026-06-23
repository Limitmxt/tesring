import type { Metadata, Viewport } from "next";
import Link from "next/link";
import PwaRegister from "@/components/PwaRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "Phone Deal Scanner",
  description: "Find profitable phones to flip on eBay.",
  manifest: "/manifest.webmanifest",
  // iOS uses these for the home-screen icon and full-screen behavior.
  appleWebApp: {
    capable: true,
    title: "Deal Scanner",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-180.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#059669",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-neutral-800 bg-neutral-900/60 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span aria-hidden>📱</span>
              <span>Phone Deal Scanner</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/" className="text-neutral-300 hover:text-white">
                Scanner
              </Link>
              <Link href="/watchlist" className="text-neutral-300 hover:text-white">
                Watchlist
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
        <PwaRegister />
      </body>
    </html>
  );
}
