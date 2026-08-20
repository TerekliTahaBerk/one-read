/**
 * Which routes are allowed to exist in a production build — the single source
 * of truth shared by every layer that enforces it.
 *
 * Plain ESM on purpose: `next.config.mjs` decides the page extensions before
 * any TypeScript is compiled, the CI guard script runs on bare Node, and the
 * Vitest regression suite imports the same functions. One file, one answer, no
 * chance of the build gate and the runtime gate drifting apart.
 *
 * Enforced in three places:
 *   1. Build   — next.config.mjs drops the mock billing files from
 *                `pageExtensions`, so they are never compiled or routable.
 *   2. CI      — scripts/verify-route-manifest.mjs reads the built route
 *                manifest and fails the "Production build" job on a violation.
 *   3. Runtime — lib/billing/mock.ts and lib/billing/provider.ts fail closed,
 *                so even a hand-built artifact cannot mint paid access.
 */

/** Page extensions Next.js uses for every real, shippable route. */
const BASE_PAGE_EXTENSIONS = ["tsx", "ts", "jsx", "js"];

/**
 * Infix marking a file as part of the dev/test mock billing surface, e.g.
 * `route.mock.ts` or `page.mock.tsx`. Next.js only treats a file as a route
 * when its name is exactly `route.<ext>` / `page.<ext>`, so these files are
 * invisible to the router unless `mock.ts`/`mock.tsx` is in `pageExtensions`.
 */
export const MOCK_PAGE_EXTENSIONS = ["mock.tsx", "mock.ts"];

/**
 * Shared shape of every conditional surface in this file.
 *
 * The `VERCEL_ENV === "production"` check is deliberately first and
 * unconditional: it is what guarantees that *no* environment variable can
 * reopen a gated surface on the production deployment. Everything after it only
 * decides which non-production builds opt in.
 *
 * @param {Record<string, string | undefined>} env
 * @param {string} optInVar Name of the env var that opts a preview build in.
 * @returns {boolean}
 */
function surfaceEnabled(env, optInVar) {
  // Production is fail-closed and not negotiable by configuration.
  if (env.VERCEL_ENV === "production") return false;

  // `next dev`, Vitest, and local scripts: developing these surfaces is the
  // whole point of keeping them.
  if (env.NODE_ENV !== "production") return true;

  // A production-mode build that is not the production deployment — a Vercel
  // preview, or a local `next build`. Opt in explicitly; default to off so a
  // plain `npm run build` produces a production-shaped artifact.
  return env[optInVar] === "true";
}

/**
 * Whether the mock billing surface may be compiled and served.
 *
 * The mock provider writes `ACTIVE_PAID` straight into the database with no
 * payment involved. That is exactly what makes it useful for local and preview
 * fixtures, and exactly why it must be impossible to reach in production.
 *
 * @param {Record<string, string | undefined>} [env]
 * @returns {boolean}
 */
export function mockBillingSurfaceEnabled(env = process.env) {
  return surfaceEnabled(env, "MOCK_BILLING_PREVIEW");
}

/**
 * `pageExtensions` for the current environment. Adding a gated extension is
 * what makes `page.mock.tsx` routable; omitting it leaves
 * the file on disk but outside the route tree and outside the bundle.
 *
 * @param {Record<string, string | undefined>} [env]
 * @returns {string[]}
 */
export function pageExtensionsFor(env = process.env) {
  return [
    ...(mockBillingSurfaceEnabled(env) ? MOCK_PAGE_EXTENSIONS : []),
    ...BASE_PAGE_EXTENSIONS,
  ];
}

/**
 * Routes that must never appear in a production build manifest.
 *
 * Each entry carries the reason it is banned so a future reader hitting a red
 * build learns why the rule exists rather than just deleting it.
 *
 * @type {ReadonlyArray<{ id: string, pattern: RegExp, reason: string }>}
 */
export const FORBIDDEN_PRODUCTION_ROUTES = [
  {
    id: "mock-billing-api",
    pattern: /^\/api\/subscribe\/mock(\/|$)/,
    reason:
      "Dev/test billing endpoints. /api/subscribe/mock/complete sets a subscription to ACTIVE_PAID with no payment, so shipping it would make paid access forgeable by anyone who can POST an email address.",
  },
  {
    id: "mock-billing-pages",
    pattern: /^\/article\/subscribe\/mock-/,
    reason:
      "Dev/test checkout and billing-portal pages. They exist only to drive the mock provider's fake payment lifecycle and have no meaning against real Polar billing.",
  },
  {
    id: "retired-products",
    pattern: /^\/(?:film|lingo|waitlist|samples\/film)(\/|$)/,
    reason:
      "Retired or experimental products are not part of the public OneArticle launch.",
  },
  {
    id: "retired-product-apis",
    pattern: /^\/api\/(?:film|lingo|one-article|signup|subscribe|polar\/checkout)(\/|$)/,
    reason:
      "Only the verified /api/oneread flow may create or manage a public subscription.",
  },
  {
    id: "retired-product-operations",
    pattern: /^\/(?:api\/cron\/(?:one-film|one-lingo)|api\/admin\/(?:film|lingo)|admin\/(?:one-film|one-lingo))(\/|$)/,
    reason:
      "OneFilm and OneLingo dispatch and admin operations are retired from production.",
  },
];

/**
 * Finds routes that violate the production route policy.
 *
 * @param {Iterable<string>} routes Route paths, e.g. "/api/subscribe/mock/complete".
 * @returns {Array<{ route: string, id: string, reason: string }>} One entry per violation.
 */
export function findForbiddenRoutes(routes) {
  const violations = [];
  for (const route of routes) {
    for (const rule of FORBIDDEN_PRODUCTION_ROUTES) {
      if (rule.pattern.test(route)) {
        violations.push({ route, id: rule.id, reason: rule.reason });
      }
    }
  }
  return violations;
}
