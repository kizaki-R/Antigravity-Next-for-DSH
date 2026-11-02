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
 *   - HEAD must already exist on the remote, so strangers can audit the tarball
 *   - the version tag, when present, must agree with package.json
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

// The published tarball must be reachable from the public repository, or nobody
// can audit what shipped. A branch with no upstream cannot be checked, so it is
// treated the same as being behind: refuse, and say which command fixes it.
let upstream = null;
try {
  upstream = run(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
} catch {
  upstream = null;
}
if (!upstream) {
  fatal("the current branch has no upstream, so the published commit could not be found on the remote.",
    "Set one with: git push --set-upstream origin <branch>");
}
const ahead = Number(run(["rev-list", "--count", `@{u}..HEAD`]));
if (Number.isFinite(ahead) && ahead > 0) {
  fatal(`HEAD is ${ahead} commit${ahead === 1 ? "" : "s"} ahead of ${upstream}.`,
    "Push first, so the tarball's commit exists on the remote:\n    git push");
}

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

console.log(`[publish guard] ok — publishing agy-next@${version} from ${head}${tag ? ` (${tag})` : ""}, pushed to ${upstream}`);
