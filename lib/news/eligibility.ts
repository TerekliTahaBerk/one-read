export {
  evaluateNewsEligibility,
  getOneNewsEligibilityByEmail,
  toNewsEligibilityInput,
} from "./subscriptions";

import { evaluateNewsEligibility } from "./subscriptions";
import type { NewsSubscriptionWithPrefs } from "./subscriptions";
import type { EligibilityResult } from "@/lib/billing/access";

/** Named OneNews eligibility entry point, per the product spec. */
export function canReceiveOneNewsEmail(
  sub: NewsSubscriptionWithPrefs,
  now: Date = new Date(),
): EligibilityResult {
  return evaluateNewsEligibility(sub, now);
}
