#!/usr/bin/env node
/**
 * Portable host-contract lane.
 *
 * `npm run verify` runs bin/check-offline.mjs, which imports lib/index.js and
 * therefore needs the @deepseek-ai/dsh-llm peer set. Outside an installed DSH
 * those peers do not resolve, so the script exits 2 with an explanation instead
 * of running. That is correct for an end user, but it leaves the host-contract
 * assertions unexecuted on a plain checkout.
 *
 * This entry registers bin/peer-resolve.mjs against AGY_PEER_ROOT and then runs
 * the very same check-offline.mjs, so the contract is actually exercised rather
 * than silently skipped. It hooks only this process's imports.
 */
import { existsSync, statSync } from "node:fs";
import { register } from "node:module";

const root = (process.env.AGY_PEER_ROOT ?? "").trim();
if (!root) {
  console.error("verify:peers needs AGY_PEER_ROOT set to a node_modules directory that");
  console.error("provides the @deepseek-ai/* peer packages. Example:");
  console.error("  AGY_PEER_ROOT=/path/to/node_modules npm run verify:peers");
  process.exit(2);
}
if (!existsSync(root) || !statSync(root).isDirectory()) {
  console.error(`AGY_PEER_ROOT is not a directory: ${root}`);
  process.exit(2);
}
console.log(`verify:peers — peers root: ${root}`);

register("./peer-resolve.mjs", import.meta.url);
await import("./check-offline.mjs");
