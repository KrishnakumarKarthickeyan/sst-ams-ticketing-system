import type { NextConfig } from "next";

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
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
