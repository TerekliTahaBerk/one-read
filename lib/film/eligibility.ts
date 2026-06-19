export {
  evaluateFilmEligibility,
  getOneFilmEligibilityByEmail,
  toFilmEligibilityInput,
} from "./subscriptions";

import { evaluateFilmEligibility } from "./subscriptions";
import type { FilmSubscriptionWithPrefs } from "./subscriptions";
import type { EligibilityResult } from "@/lib/billing/access";

/** Named OneFilm eligibility entry point, per the product spec. */
export function canReceiveOneFilmEmail(
  sub: FilmSubscriptionWithPrefs,
  now: Date = new Date(),
): EligibilityResult {
  return evaluateFilmEligibility(sub, now);
}
