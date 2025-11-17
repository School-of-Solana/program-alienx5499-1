import { after } from "mocha";
import { getCachedTestContext, cleanupTestAccounts } from "./setup";

after(async () => {
  const ctx = getCachedTestContext();
  if (!ctx) return;
  try {
    await cleanupTestAccounts(ctx);
  } catch (error) {
    console.warn("Cleanup skipped:", (error as Error).message);
  }
});
