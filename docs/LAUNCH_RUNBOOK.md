# OneRead public launch runbook

## Before launch

- Confirm CI, unit, integration, Playwright, migration replay, and drift checks are green.
- Review additive migrations; never roll back by deleting subscriber or billing data.
- Configure six unique Polar product IDs: Article, News, and Bundle, monthly and annual.
- Set `POLAR_SERVER=production`, then run `npm run verify:launch` in the protected production environment.
- Verify Polar and Resend webhook secrets, sender configuration, Sentry, and the Better Stack heartbeat.
- Keep `PUBLIC_CHECKOUT_ENABLED=false` and `ONENEWS_DELIVERY_ENABLED=false` while validating the deployment.

## Sandbox verification

With Polar sandbox configuration, test Article, News, and Bundle in both intervals. Verify dual standalones, Article/News → Bundle, Bundle downgrades, interval changes, and the mandatory grandfather warning. Do not infer proration locally; inspect Polar's result.

## Public deployment

Deploy pricing, signup, samples, My OneRead, and unsubscribe surfaces first. Smoke-test without production checkout. When configuration and monitored sandbox evidence are complete, set `PUBLIC_CHECKOUT_ENABLED=true`. The retired legacy endpoint remains closed.

## OneNews beta activation

Public checkout does not enable delivery. Review an approved issue, exact test rendering, recipient count, sources, schedule, and operator dashboard. Then explicitly set `ONENEWS_DELIVERY_ENABLED=true`. Monitor the first OperationalRun, accepted/delivered distinction, failures, suppressions, Sentry, and heartbeat.

## Rollback

Set `PUBLIC_CHECKOUT_ENABLED=false` to stop new purchases and `ONENEWS_DELIVERY_ENABLED=false` to stop News cron delivery. Leave OneArticle and all Polar subscriptions untouched. Roll back code only to a schema-compatible release; do not reverse migrations destructively or delete delivery/idempotency rows.
