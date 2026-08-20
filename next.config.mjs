import { withSentryConfig } from "@sentry/nextjs";
import { pageExtensionsFor } from "./lib/security/route-policy.mjs";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' https://polar.sh https://*.polar.sh",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "frame-src 'none'",
  "connect-src 'self' https://*.sentry.io https://va.vercel-scripts.com",
  "upgrade-insecure-requests",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Decides whether the dev/test mock billing files (`*.mock.ts[x]`) count as
  // routes at all. In production they are left out, so those endpoints are not
  // compiled, not bundled, and absent from the route manifest — see
  // lib/security/route-policy.mjs. CI re-checks the built manifest.
  pageExtensions: pageExtensionsFor(process.env),
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains",
                },
              ]
            : []),
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(self)",
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Only upload source maps / release artifacts when an auth token is
  // configured (CI/production); local dev and PR builds stay no-op.
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
