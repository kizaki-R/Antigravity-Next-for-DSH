#!/usr/bin/env node
/**
 * Publish guard: refuse to publish a working tree that differs from the
 * released commit.
 *
 * Why this exists: v1.0.1 was published from a working tree that predated the
 * commit retiring the on-page build badge, while CHANGELOG described the later
 * git state. Users installing from npm got a page that still showed the badge.
 * The changelog was not wrong about the repository; the tarball simply was not
 * built from it.
 *
 * `npm publish` always ships the working directory, never a git ref, so the
 * only way to keep them aligned is to check before shipping:
 *
 *   - every tracked file must match HEAD (no uncommitted edits)
 *   - no tracked file may be deleted
 *   - HEAD must be clean, so the version tag can point at what shipped
 *
 * Untracked files are allowed: npm honours `files`, and scratch output is not
 * part of the package.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const run = (args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

function fatal(message, detail) {
  console.error(`\n[publish guard] ${message}`);
  if (detail) console.error(detail);
  console.error("\nPublishing was blocked. Commit the change first, then publish from that commit.");
  process.exit(1);
}

// A tarball built outside a git checkout cannot be traced to a commit.
let insideRepo = true;
try {
  run(["rev-parse", "--is-inside-work-tree"]);
} catch {
  insideRepo = false;
}
if (!insideRepo) {
  console.warn("[publish guard] not a git checkout; skipping HEAD comparison.");
  process.exit(0);
}

// Tracked modifications: staged, unstaged, and deletions all count.
const status = run(["status", "--porcelain", "--untracked-files=no"]);
if (status) {
  fatal("the working tree has uncommitted changes to tracked files.", status);
}

const head = run(["rev-parse", "--short", "HEAD"]);
const version = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;

// The tag is optional on a first publish but, when present, must agree.
let tag;
try {
  tag = run(["describe", "--tags", "--exact-match", "HEAD"]);
} catch {
  tag = null;
}
if (tag && tag !== `v${version}` && tag !== version) {
  fatal(`HEAD is tagged ${tag} but package.json says ${version}.`, "Tag and version must agree so the release is traceable.");
}

console.log(`[publish guard] ok — publishing agy-next@${version} from ${head}${tag ? ` (${tag})` : ""}`);
