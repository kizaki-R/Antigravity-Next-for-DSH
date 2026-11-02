/** Shared installed-application OAuth resolution; never reads user tokens. */
import { statSync } from "node:fs";
import { platform, release, arch } from "node:os";
import { fileURLToPath } from "node:url";

async function loadInstalledAgyModule() {
  try {
    const file = fileURLToPath(new URL("./installed-agy.js", import.meta.url));
    const mtime = statSync(file).mtimeMs;
    return await import(`./installed-agy.js?t=${mtime}`);
  } catch {
    return await import("./installed-agy.js");
  }
}

async function loadDiscover() {
  const mod = await loadInstalledAgyModule();
  return mod.discoverInstalledAgy;
}

export async function resolveCustomPath(rawPath, options = {}) {
  const mod = await loadInstalledAgyModule();
  return mod.resolveCustomInstallPath(rawPath, options);
}

/**
 * Settings a discovery call cares about.
 *
 * Reads clientSource and installPath. If installPath was not passed explicitly
 * via settings or environment variables, reads the user's stored preference
 * (`installPath`) from the credential store book.
 */
async function discoveryOptions(settings = {}) {
  const opts = {};
  const source = settings?.clientSource;
  if (['auto', 'desktop', 'ide'].includes(source)) opts.clientSource = source;

  let installPath = settings?.installPath;
  if (!installPath) {
    try {
      const { CredentialStore } = await import("./store.js");
      const book = await new CredentialStore(settings?.credentialPath).readBook();
      if (typeof book?.installPath === "string" && book.installPath.trim()) {
        installPath = book.installPath.trim();
      }
    } catch {
      // Store unavailable or corrupt; fall through to defaults.
    }
  }
  if (typeof installPath === "string" && installPath.trim()) {
    opts.installPath = installPath.trim();
  }
  return opts;
}

/** Require a local Antigravity installation, including for existing logins. */
export async function resolveOAuthClient(settings = {}) {
  const discoverInstalledAgy = await loadDiscover();
  const options = await discoveryOptions(settings);
  const installation = await discoverInstalledAgy(options);
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
  let options = {};
  try {
    const discoverInstalledAgy = await loadDiscover();
    options = await discoveryOptions(settings);
    const installation = await discoverInstalledAgy(options);
    return {
      configured: true,
      installed: true,
      source: "installed-app",
      // "desktop" or "ide": the page can say which build supplied the client.
      kind: installation.kind ?? "desktop",
      version: installation.version,
      path: installation.installPath,
      customPath: options.installPath ?? null,
      error: null,
    };
  } catch (error) {
    return {
      configured: false,
      installed: false,
      source: "error",
      kind: null,
      path: null,
      customPath: options.installPath ?? null,
      code: error.code ?? "AGY_INSTALL_UNAVAILABLE",
      error: error.message,
      // Report only when the user asks for it; never on the status hot path.
    };
  }
}
