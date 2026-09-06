import { resolveTxt } from "node:dns/promises";
import { resolveResendConfiguration, validateResendProductionConfiguration } from "../lib/resend-config";

const DOMAIN = "oneread.email";
const WEBHOOK_ENDPOINT = "https://www.oneread.email/api/webhook/resend";
const REQUIRED_EVENTS = ["email.bounced", "email.complained"];

type ResendList<T> = { data?: T[] };
type DomainSummary = { id: string; name: string; status: string; capabilities?: { sending?: string } };
type DomainDetail = DomainSummary & { records?: { record: string; type: string; name: string; status: string }[] };
type Webhook = { endpoint: string; status: string; events: string[] };

async function api<T>(path: string, key: string): Promise<T> {
  const response = await fetch(`https://api.resend.com${path}`, {
    headers: { authorization: `Bearer ${key}`, "user-agent": "OneRead production verifier" },
  });
  if (!response.ok) throw new Error(`Resend API ${path} returned ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

async function main() {
  const config = resolveResendConfiguration();
  const failures = validateResendProductionConfiguration();
  const evidence: string[] = [];
  if (!config.apiKey) throw new Error(failures.join("\n"));

  const domains = await api<ResendList<DomainSummary>>("/domains", config.apiKey);
  const summary = domains.data?.find((item) => item.name === DOMAIN);
  if (!summary) failures.push(`${DOMAIN} is not present in the authenticated Resend account.`);
  else {
    evidence.push(`Resend API authentication succeeded; domain id ${summary.id} was found.`);
    const detail = await api<DomainDetail>(`/domains/${summary.id}`, config.apiKey);
    if (detail.status !== "verified" || detail.capabilities?.sending !== "enabled") {
      failures.push(`${DOMAIN} is not verified for sending (status=${detail.status}, sending=${detail.capabilities?.sending ?? "unknown"}).`);
    } else evidence.push(`${DOMAIN} is verified and sending is enabled in Resend.`);
    const authenticationRecords = (detail.records ?? []).filter((record) => ["SPF", "DKIM"].includes(record.record));
    if (authenticationRecords.length === 0) failures.push("Resend returned no SPF/DKIM records for the sending domain.");
    for (const record of authenticationRecords) {
      if (["SPF", "DKIM"].includes(record.record) && record.status !== "verified") {
        failures.push(`${record.record} ${record.type} record ${record.name} is ${record.status}.`);
      }
    }
    if (authenticationRecords.length > 0 && authenticationRecords.every((record) => record.status === "verified")) {
      evidence.push("Resend reports every SPF/DKIM sending record as verified.");
    }
  }

  const webhooks = await api<ResendList<Webhook>>("/webhooks", config.apiKey);
  const webhook = webhooks.data?.find((item) => item.endpoint === WEBHOOK_ENDPOINT);
  if (!webhook) failures.push(`Enabled webhook ${WEBHOOK_ENDPOINT} is not registered.`);
  else if (webhook.status !== "enabled") failures.push(`Resend webhook is ${webhook.status}, not enabled.`);
  else {
    const missingEvents = REQUIRED_EVENTS.filter((event) => !webhook.events.includes(event));
    if (missingEvents.length) failures.push(`Resend webhook is missing events: ${missingEvents.join(", ")}.`);
    else evidence.push("Production webhook is enabled for bounce and complaint events.");
  }

  try {
    const records = (await resolveTxt(`_dmarc.${DOMAIN}`)).map((parts) => parts.join(""));
    const dmarc = records.find((record) => record.toLowerCase().startsWith("v=dmarc1;"));
    if (!dmarc) failures.push(`No DMARC policy was found at _dmarc.${DOMAIN}.`);
    else evidence.push(`Published DMARC policy: ${dmarc}`);
  } catch (error) {
    failures.push(`DMARC DNS lookup failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log("Automated evidence:");
  for (const item of evidence) console.log(`- PASS: ${item}`);
  console.log("Manual gates (never inferred by this script):");
  console.log("- hello@oneread.email receives and can reply to a real message");
  console.log("- Verification and editorial messages land in Gmail and a non-Gmail mailbox");
  console.log("- HTML/text rendering and RFC 8058 one-click unsubscribe work in those mailboxes");
  console.log("- A controlled bounce/complaint reaches production and suppresses the recipient");
  if (failures.length) {
    console.error("Failures:");
    for (const failure of failures) console.error(`- FAIL: ${failure}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
