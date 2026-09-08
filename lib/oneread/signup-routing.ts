/** Billing identifiers alone also exist on expired accounts; they must not
 * prevent a returning reader from purchasing again. Product access is resolved
 * by the server's lifecycle contract, independently of email delivery status. */
export function shouldManageAccount(result: {
  state?: unknown;
  products?: unknown;
  billing?: unknown;
}): boolean {
  const products = result.products as Record<string, { active?: boolean }> | undefined;
  const billing = result.billing as { plans?: { state: string }[] } | undefined;
  return Object.values(products ?? {}).some((product) => product.active === true)
    || result.state === "past_due"
    || Boolean(billing?.plans?.some((plan) => plan.state === "Past due"));
}
