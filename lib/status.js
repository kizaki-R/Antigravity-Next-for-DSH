/** Shared installed-application OAuth resolution; never reads user tokens. */
import { statSync } from "node:fs";
import { platform, release, arch } from "node:os";
import { fileURLToPath } from "node:url";

async function loadDiscover() {
  try {
    const file = fileURLToPath(new URL("./installed-agy.js", import.meta.url));
    const mtime = statSync(file).mtimeMs;
    const mod = await import(`./installed-agy.js?t=${mtime}`);
    return mod.discoverInstalledAgy;
  } catch {
    const mod = await import("./installed-agy.js");
    return mod.discoverInstalledAgy;
  }
}

/** Require a local Antigravity installation, including for existing logins. */
export async function resolveOAuthClient(settings = {}) {
  const discoverInstalledAgy = await loadDiscover();
  const installation = await discoverInstalledAgy();
  return { clientId: installation.clientId, clientSecret: installation.clientSecret };
}

/**
 * Environment facts a support request needs, with nothing that identifies the
 * user: no account, no token, no client values, and no absolute home path.
 *
 * Absolute paths are reported as a root name plus a boolean, because the useful
 * question ("did it look in the right place?") does not require exposing where
 * the user's profile lives.
 */
export function diagnoseEnvironment(overrides = {}) {
  const env = overrides.env ?? process.env;
  const plat = overrides.platform ?? process.platform;
  const present = (p) => { try { return statSync(p).isDirectory(); } catch { return false; } };
  const join = (...parts) => parts.filter(Boolean).join(plat === "win32" ? "\\" : "/");

  const roots = [];
  if (plat === "win32") {
    const local = env.LOCALAPPDATA;
    const pf = env.ProgramFiles;
    const pf86 = env["ProgramFiles(x86)"];
    roots.push(
      { label: "LOCALAPPDATA/Programs/antigravity", path: join(local, "Programs", "antigravity") },
      { label: "LOCALAPPDATA/Programs/Antigravity IDE", path: join(local, "Programs", "Antigravity IDE") },
      { label: "ProgramFiles/Antigravity", path: join(pf, "Antigravity") },
      { label: "ProgramFiles(x86)/Antigravity", path: join(pf86, "Antigravity") },
    );
  } else if (plat === "darwin") {
    roots.push(
      { label: "/Applications/Antigravity.app", path: "/Applications/Antigravity.app" },
      { label: "/Applications/Antigravity IDE.app", path: "/Applications/Antigravity IDE.app" },
    );
  } else {
    roots.push(
      { label: "/opt/Antigravity", path: "/opt/Antigravity" },
      { label: "/opt/Antigravity IDE", path: "/opt/Antigravity IDE" },
    );
  }

  return {
    os: `${plat} ${release()} ${arch()}`,
    node: process.versions.node,
    electron: process.versions.electron ?? null,
    installPathOverride: typeof env.AGY_NEXT_INSTALL_PATH === "string" && env.AGY_NEXT_INSTALL_PATH.trim()
      ? "set (path withheld)"
      : "not set",
    // Each candidate as a label plus whether it exists, never the full path.
    candidates: roots.map(({ label, path }) => ({ label, exists: path ? present(path) : false })),
  };
}

/** Only safe installation metadata may reach the browser, never client values. */
export async function oauthClientStatus(settings = {}) {
  try {
    const discoverInstalledAgy = await loadDiscover();
    const installation = await discoverInstalledAgy();
    return {
      configured: true,
      installed: true,
      source: "installed-app",
      // "desktop" or "ide": the page can say which build supplied the client.
      kind: installation.kind ?? "desktop",
      version: installation.version,
      path: installation.installPath,
      error: null,
    };
  } catch (error) {
    return {
      configured: false,
      installed: false,
      source: "error",
      kind: null,
      path: null,
      code: error.code ?? "AGY_INSTALL_UNAVAILABLE",
      error: error.message,
      // Report only when the user asks for it; never on the status hot path.
    };
  }
}
