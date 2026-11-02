#!/usr/bin/env node
/**
 * Guard: the settings page must not hardcode the plugin version.
 *
 * The footer shipped "npm v1.0.0" as a literal, so a later tarball still claimed
 * 1.0.0 on screen. The version belongs to /status, which reads package.json on
 * the host side; a literal in the browser bundle can only drift again.
 *
 * Only string literals that look like this plugin's own version are flagged. A
 * quoted bare semver is reported too, because that is the shape of the bug.
 * URLs, email addresses and long free text are ignored.
 */
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../lib/ui.js", import.meta.url), "utf8");

// "npm v1.2.3", "v1.2.3", or a bare "1.2.3" used as UI text.
const LITERAL = /(["'`])((?:npm\s+)?v?\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?)\1/g;
// A URL or address containing a version-ish path segment is not a version label.
const ALLOWED = /^(?:https?:\/\/|\/\/)|@|\.(?:json|js|mjs)$/;

const problems = [];
for (const match of source.matchAll(LITERAL)) {
  const value = match[2];
  if (ALLOWED.test(value)) continue;
  // Free text that merely starts with a number is not a version label.
  if (/\s/.test(value) && !/^npm\s/.test(value) && !/^v/.test(value)) continue;
  const line = source.slice(0, match.index).split("\n").length;
  problems.push({ line, value });
}

if (problems.length) {
  console.error("Hardcoded version literal(s) in lib/ui.js:");
  for (const p of problems) console.error(`  line ${p.line}: ${p.value}`);
  console.error("");
  console.error("Read it from /status instead: `status.version` is filled from package.json.");
  process.exit(1);
}
console.log("ui.js: no hardcoded plugin version.");
