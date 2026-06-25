import type { NextConfig } from "next";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

/**
 * Build metadata — the SINGLE source of the app version, embedded at build time
 * and exposed as NEXT_PUBLIC_* so it ships to the client. No version string is
 * hardcoded in the UI; everything reads src/lib/version.ts which reads these.
 * Updates automatically every deploy: version from package.json, git SHA from
 * Vercel (or local git), build date from the build clock.
 */
const appVersion: string =
  JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")).version || "0.0.0";

const gitSha: string = (() => {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "dev";
  }
})();

const buildDate: string = new Date().toISOString();

/**
 * Security response headers — right-sized for an internal ≤100-user tool. These
 * cost nothing and close the easy gaps (clickjacking, MIME sniffing, referrer
 * leakage, camera/mic/geo access). CSP is intentionally NOT enforced here: the
 * app uses inline styles + Supabase/realtime websockets, so a strict CSP needs
 * per-route nonces — out of proportion for this scale. The headers below are the
 * high-value, zero-risk subset.
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // HSTS — safe behind HTTPS (Vercel terminates TLS). 1 year, include subdomains.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // Embedded at build, shipped to the client. src/lib/version.ts reads these.
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
    NEXT_PUBLIC_GIT_SHA: gitSha,
    NEXT_PUBLIC_BUILD_DATE: buildDate,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
