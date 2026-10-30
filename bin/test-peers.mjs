#!/usr/bin/env node
/**
 * Portable peer-testing lane.
 *
 * The old `test:peers` script hardcoded a personal absolute file:// loader
 * path, so a clean clone could never run it. This entry is repo-internal:
 * it requires AGY_PEER_ROOT (the node_modules directory that provides the
 * DSH peer packages), registers bin/peer-resolve.mjs as a test-only resolver,
 * and runs the regression suite with peer misses treated as failures.
 *
 * Security note: this hooks only this process's imports; it never patches the
 * packaged plugin or a real DSH home, and it touches nothing outside
 * AGY_PEER_ROOT.
 */
import { existsSync, statSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { register } from "node:module";

const root = (process.env.AGY_PEER_ROOT ?? "").trim();
if (!root) {
  console.error("test:peers needs AGY_PEER_ROOT set to a node_modules directory that");
  console.error("provides the @deepseek-ai/* peer packages. Example:");
  console.error('  AGY_PEER_ROOT=/path/to/node_modules npm run test:peers');
  process.exit(2);
}
if (!existsSync(root) || !statSync(root).isDirectory()) {
  console.error(`AGY_PEER_ROOT is not a directory: ${root}`);
  process.exit(2);
}
console.log(`test:peers — peers root: ${root}`);

// Missing peers must fail this lane instead of being skipped.
process.env.AGY_TESTS_STRICT = "1";

register("./peer-resolve.mjs", import.meta.url);
await import("./test-regressions.mjs");
