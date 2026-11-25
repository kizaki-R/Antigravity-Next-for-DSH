/**
 * Managed official `agy` CLI installer so users with only DSH + agy-next
 * (and no pre-installed Antigravity app or CLI) can sign in, chat, and view
 * account quota out of the box.
 *
 * Uses Google's official Antigravity CLI release manifests and enforces strict
 * `storage.googleapis.com` URL and SHA-512 verification.
 */

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const ANTIGRAVITY_CLI_MANIFEST_BASE =
  "https://antigravity-cli-auto-updater-974169037036.us-central1.run.app/manifests";

const INSTALL_RECORD = ".install-complete.json";
const MANIFEST_TIMEOUT_MS = 15_000;
const DOWNLOAD_TIMEOUT_MS = 180_000;
const MAX_ARCHIVE_BYTES = 250 * 1024 * 1024;

let registeredManagedDir = null;
let inflightInstall = null;

export function setManagedAcpRootForCache(dir) {
  registeredManagedDir = typeof dir === "string" && dir.trim() ? path.resolve(dir.trim()) : null;
}

export function isMuslLinux(platform = process.platform) {
  if (platform !== "linux") return false;
  if (fs.existsSync("/etc/alpine-release")) return true;
  try {
    const report = process.report?.getReport?.();
    return !report?.header?.glibcVersionRuntime;
  } catch {
    return false;
  }
}

export function antigravityCliTarget(
  platform = process.platform,
  arch = process.arch,
  musl = isMuslLinux(platform),
) {
  if (!["darwin", "linux", "win32"].includes(platform) || !["x64", "arm64"].includes(arch)) {
    return null;
  }
  const osName = platform === "win32" ? "windows" : platform;
  return `${osName}_${arch === "x64" ? "amd64" : arch}${platform === "linux" && musl ? "_musl" : ""}`;
}

export function isSupportedCliPlatform(platform = process.platform, arch = process.arch) {
  return antigravityCliTarget(platform, arch, false) !== null;
}

export function parseAntigravityCliRelease(
  value,
  platform = process.platform,
  arch = process.arch,
  musl = isMuslLinux(platform),
) {
  if (!value || typeof value !== "object") return null;
  if (antigravityCliTarget(platform, arch, musl) === null) return null;
  const version = typeof value.version === "string" ? value.version.trim() : "";
  const url = typeof value.url === "string" ? value.url.trim() : "";
  const sha512 = typeof value.sha512 === "string" ? value.sha512.trim().toLowerCase() : "";
  if (!/^\d+\.\d+\.\d+$/.test(version) || !/^[a-f0-9]{128}$/.test(sha512)) {
    return null;
  }

  const osName = platform === "darwin" ? "mac" : platform === "win32" ? "windows" : "linux";
  const cpu = arch === "x64" ? "x64" : "arm64";
  const suffix = platform === "linux" && musl ? "_musl" : "";
  const extension = platform === "win32" ? "exe" : "tar.gz";
  const folder = `${platform === "win32" ? "windows" : platform}-${arch === "arm64" ? "arm" : "x64"}${suffix ? "-musl" : ""}`;
  const prefix = `https://storage.googleapis.com/antigravity-public/antigravity-cli/${version}-`;
  const rest = url.startsWith(prefix) ? url.slice(prefix.length) : "";
  if (!/^\d+\//.test(rest) || rest.replace(/^\d+\//, "") !== `${folder}/cli_${osName}_${cpu}${suffix}.${extension}`) {
    return null;
  }

  return {
    version,
    url,
    sha512,
    executableName: platform === "win32" ? "agy.exe" : "antigravity",
    format: platform === "win32" ? "executable" : "tar.gz",
  };
}

export function candidateManagedAcpDirs({ env = process.env, homedir = os.homedir } = {}) {
  const dirs = [];
  if (registeredManagedDir) dirs.push(registeredManagedDir);
  if (typeof env?.DSH_HOME === "string" && env.DSH_HOME.trim()) {
    dirs.push(path.join(env.DSH_HOME.trim(), "runtimes", "agy-next"));
  }
  const home = homedir();
  if (home) {
    dirs.push(path.join(home, ".dsh", "profiles", "desktop", "runtimes", "agy-next"));
    dirs.push(path.join(home, ".dsh", "runtimes", "agy-next"));
  }
  return [...new Set(dirs.map((d) => path.resolve(d)))];
}

export async function resolveManagedAcpDir({ env = process.env, homedir = os.homedir } = {}) {
  if (!env?.DSH_HOME) {
    try {
      const mod = await import("@deepseek-ai/dsh-home-paths");
      if (typeof mod.dshHomePath === "function") {
        const dir = path.resolve(mod.dshHomePath("runtimes", "agy-next"));
        setManagedAcpRootForCache(dir);
        return dir;
      }
    } catch {
      // Standalone CLI execution without host package.
    }
  }
  const base = (typeof env?.DSH_HOME === "string" && env.DSH_HOME.trim())
    || path.join(homedir(), ".dsh");
  const dir = path.resolve(base, "runtimes", "agy-next");
  setManagedAcpRootForCache(dir);
  return dir;
}

export function findInstalledManagedAcpCli({ platform = process.platform, env = process.env, homedir = os.homedir } = {}) {
  const names = platform === "win32" ? ["agy.exe"] : ["antigravity", "agy"];
  for (const dir of candidateManagedAcpDirs({ env, homedir })) {
    const recordPath = path.join(dir, INSTALL_RECORD);
    let record = null;
    try {
      record = JSON.parse(fs.readFileSync(recordPath, "utf8"));
    } catch {
      record = null;
    }
    const candidates = record?.executableName ? [record.executableName, ...names] : names;
    for (const name of candidates) {
      const binPath = path.join(dir, name);
      try {
        const stat = fs.statSync(binPath);
        if (stat.isFile() && stat.size > 0) {
          return {
            path: binPath,
            version: typeof record?.version === "string" ? record.version : null,
            dir,
          };
        }
      } catch {
        // Not present in this candidate directory.
      }
    }
  }
  return null;
}

async function downloadAndVerifySha512(url, destFile, expectedSha512, fetchImpl) {
  const res = await fetchImpl(url, {
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
  });
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download official Antigravity CLI (HTTP ${res.status})`);
  }
  const hash = createHash("sha512");
  const out = fs.createWriteStream(destFile, { mode: 0o600 });
  let totalBytes = 0;
  try {
    const reader = res.body.getReader();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_ARCHIVE_BYTES) {
        throw new Error("Official Antigravity CLI download exceeded maximum size limit");
      }
      hash.update(value);
      if (!out.write(value)) {
        await new Promise((resolve, reject) => {
          const onDrain = () => {
            cleanup();
            resolve();
          };
          const onError = (error) => {
            cleanup();
            reject(error);
          };
          const cleanup = () => {
            out.off("drain", onDrain);
            out.off("error", onError);
          };
          out.once("drain", onDrain);
          out.once("error", onError);
        });
      }
    }
    await new Promise((resolve, reject) => {
      const onFinish = () => {
        out.off("error", onError);
        resolve();
      };
      const onError = (error) => {
        out.off("finish", onFinish);
        reject(error);
      };
      out.once("finish", onFinish);
      out.once("error", onError);
      out.end();
    });
  } catch (err) {
    out.destroy();
    await fsp.rm(destFile, { force: true }).catch(() => undefined);
    throw err;
  }

  const actualSha512 = hash.digest("hex").toLowerCase();
  if (actualSha512 !== expectedSha512.toLowerCase()) {
    await fsp.rm(destFile, { force: true }).catch(() => undefined);
    throw new Error("SHA-512 verification failed for official Antigravity CLI download");
  }
}

async function findRegularBinary(rootDir, names) {
  const queue = [rootDir];
  while (queue.length > 0) {
    const current = queue.shift();
    const entries = await fsp.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
      } else if (entry.isFile() && names.includes(entry.name)) {
        return fullPath;
      }
    }
  }
  return null;
}

export async function installManagedAcpCli(options = {}) {
  const hasCustom = Boolean(
    options.env || options.platform || options.arch || options.fetch || options.execFile || options.homedir || options.installDir,
  );
  if (!hasCustom && !options.force && inflightInstall) {
    return inflightInstall;
  }

  const run = (async () => {
    const env = options.env ?? process.env;
    const platform = options.platform ?? process.platform;
    const arch = options.arch ?? process.arch;
    const homedir = options.homedir ?? os.homedir;
    const fetchImpl = options.fetch ?? globalThis.fetch;
    const execFileImpl = options.execFile ?? execFileAsync;
    const musl = options.musl ?? isMuslLinux(platform);

    if (!options.force && !options.installDir) {
      const existing = findInstalledManagedAcpCli({ platform, env, homedir });
      if (existing) return existing;
    }

    const target = antigravityCliTarget(platform, arch, musl);
    if (!target) {
      throw new Error(`Unsupported platform for automatic Antigravity CLI install: ${platform}/${arch}`);
    }

    const manifestUrl = `${ANTIGRAVITY_CLI_MANIFEST_BASE}/${target}.json`;
    const manifestRes = await fetchImpl(manifestUrl, {
      signal: AbortSignal.timeout(MANIFEST_TIMEOUT_MS),
    });
    if (!manifestRes.ok) {
      throw new Error(`Could not fetch Antigravity CLI manifest (HTTP ${manifestRes.status})`);
    }
    const manifestJson = await manifestRes.json();
    const asset = parseAntigravityCliRelease(manifestJson, platform, arch, musl);
    if (!asset) {
      throw new Error("Official Antigravity CLI manifest failed validation");
    }

    const installDir = options.installDir
      ? path.resolve(options.installDir)
      : await resolveManagedAcpDir({ env, homedir });
    await fsp.mkdir(installDir, { recursive: true, mode: 0o755 });

    const finalPath = path.join(installDir, asset.executableName);
    const tmpDownload = path.join(installDir, `.download-${process.pid}-${Date.now()}.${asset.format === "executable" ? "exe" : "tar.gz"}`);
    const stagingDir = path.join(installDir, `.extract-${process.pid}-${Date.now()}`);

    try {
      await downloadAndVerifySha512(asset.url, tmpDownload, asset.sha512, fetchImpl);

      if (asset.format === "executable") {
        await fsp.rm(finalPath, { force: true }).catch(() => undefined);
        await fsp.rename(tmpDownload, finalPath);
      } else {
        await fsp.mkdir(stagingDir, { recursive: true, mode: 0o700 });
        await execFileImpl("tar", ["-xzf", tmpDownload, "-C", stagingDir], { timeout: 60_000 });
        const extracted = await findRegularBinary(stagingDir, [asset.executableName, "antigravity", "agy"]);
        if (!extracted) {
          throw new Error("Official Antigravity CLI archive did not contain the executable");
        }
        await fsp.chmod(extracted, 0o755);
        await fsp.rm(finalPath, { force: true }).catch(() => undefined);
        await fsp.rename(extracted, finalPath);
      }

      if (platform !== "win32") {
        await fsp.chmod(finalPath, 0o755).catch(() => undefined);
      }

      const record = {
        version: asset.version,
        sha512: asset.sha512,
        executableName: asset.executableName,
        installedAt: new Date().toISOString(),
      };
      await fsp.writeFile(path.join(installDir, INSTALL_RECORD), `${JSON.stringify(record, null, 2)}\n`, "utf8");
      setManagedAcpRootForCache(installDir);
      return {
        path: finalPath,
        version: asset.version,
        dir: installDir,
        installed: true,
      };
    } finally {
      await fsp.rm(tmpDownload, { force: true }).catch(() => undefined);
      await fsp.rm(stagingDir, { recursive: true, force: true }).catch(() => undefined);
    }
  })();

  if (!hasCustom && !options.force) {
    inflightInstall = run;
    try {
      return await run;
    } finally {
      if (inflightInstall === run) inflightInstall = null;
    }
  }
  return run;
}
