/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // better-sqlite3 is a native module; keep it out of the bundler so the
    // .node binary is loaded at runtime instead of being traced/bundled.
    serverComponentsExternalPackages: ["better-sqlite3"],
  },
};

module.exports = nextConfig;
