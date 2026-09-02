/** Best-effort Better Stack heartbeat. The secret URL is never logged. */
export async function emitCronHeartbeat(
  url: string | undefined = process.env.BETTER_STACK_CRON_HEARTBEAT_URL,
  request: typeof fetch = fetch,
): Promise<boolean> {
  const target = url?.trim();
  if (!target) return false;
  try {
    const response = await request(target, { method: "GET", cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  }
}
