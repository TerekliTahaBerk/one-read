import { validatePublicLaunchConfiguration } from "../lib/launch-config";

const result = validatePublicLaunchConfiguration();
if (!result.ready) {
  console.error("Public launch configuration is incomplete:");
  for (const problem of result.problems) console.error(`- ${problem}`);
  process.exit(1);
}
console.log("Public launch configuration is complete. OneNews delivery remains controlled independently.");
