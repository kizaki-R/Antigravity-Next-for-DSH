// Test-only ESM resolver: maps a bare package specifier onto a directory you
// point AGY_PEER_ROOT at, so `npm run test:peers` can exercise the host-supplied
// @deepseek-ai/* peer packages outside an installed app.
//
// Resolution order per package: exports "." (with conditions) -> main ->
// index.js/index.mjs/index.cjs; per subpath: exports subpath -> physical file ->
// extension guesses. It never writes anything and is never used when the plugin
// runs inside DSH, where the host resolves these packages itself.
import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

// Windows accepts both separators in file URLs, so a plain "/" suffix works on
// every platform pathToFileURL meaningfully reports here.
const rawRoot = (process.env.AGY_PEER_ROOT ?? "").trim();
const ROOT = rawRoot ? pathToFileURL(`${rawRoot.replace(/[\\/]+$/, "")}/`) : null;

if (!ROOT) throw new Error("AGY_PEER_ROOT is not set"); // guarded by bin/test-peers.mjs

const manifestCache = new Map();

function isFile(url) {
  try { return statSync(fileURLToPath(url)).isFile(); } catch { return false; }
}

function manifest(name) {
  if (manifestCache.has(name)) return manifestCache.get(name);
  let parsed = null;
  try { parsed = JSON.parse(readFileSync(fileURLToPath(new URL(`${name}/package.json`, ROOT)), "utf8")); } catch { parsed = null; }
  manifestCache.set(name, parsed);
  return parsed;
}

/** Relative filename for one subpath of an `exports` object (or plain string). */
function fromExports(exportsField, sub) {
  if (!exportsField) return null;
  const key = sub ? `./${sub}` : ".";
  const pick = (value) => {
    if (typeof value === "string") return value;
    if (value && typeof value === "object") {
      for (const c of ["import", "default", "require", "node"]) {
        if (typeof value[c] === "string") return value[c];
        if (value[c] && typeof value[c] === "object") {
          const nested = pick(value[c]);
          if (nested) return nested;
        }
      }
    }
    return null;
  };
  if (typeof exportsField === "string" && !sub) return exportsField;
  return pick(exportsField[key]);
}

/** Resolve one bare specifier inside the peers root, or null to fall through. */
function locate(specifier) {
  const parts = specifier.split("/");
  const name = specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
  const sub = parts.slice(name.startsWith("@") ? 2 : 1).join("/");

  const base = new URL(`${name}/`, ROOT);
  if (!existsSync(fileURLToPath(base))) return null;

  if (sub) {
    const viaExports = fromExports(manifest(name)?.exports, sub);
    if (viaExports) {
      const u = new URL(viaExports.replace(/^\.\//, ""), base);
      if (isFile(u)) return u;
    }
    const direct = new URL(sub, base);
    if (isFile(direct)) return direct;
    for (const c of [`${sub}.js`, `${sub}/index.js`, `${sub}.mjs`, `${sub}.cjs`]) {
      const u = new URL(c, base);
      if (isFile(u)) return u;
    }
    return null;
  }

  const m = manifest(name);
  const viaExports = fromExports(m?.exports, "");
  if (viaExports) {
    const u = new URL(viaExports.replace(/^\.\//, ""), base);
    if (isFile(u)) return u;
  }
  if (typeof m?.main === "string") {
    const u = new URL(m.main, base);
    if (isFile(u)) return u;
  }
  for (const c of ["index.js", "index.mjs", "index.cjs"]) {
    const u = new URL(c, base);
    if (isFile(u)) return u;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  // Only bare specifiers stop here; relative paths and URLs fall through.
  if (specifier.startsWith(".") || specifier.startsWith("/") || specifier.includes(":")) {
    return nextResolve(specifier, context);
  }
  const url = locate(specifier);
  if (url) return { url: url.href, shortCircuit: true };
  return nextResolve(specifier, context);
}
