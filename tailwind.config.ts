import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Deal-status palette used across cards, badges, and table rows.
        good: "#22c55e",
        maybe: "#eab308",
        avoid: "#ef4444",
      },
    },
  },
  plugins: [],
};

export default config;
