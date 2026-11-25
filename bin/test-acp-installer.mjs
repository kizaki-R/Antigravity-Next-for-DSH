#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  antigravityCliTarget,
  findInstalledManagedAcpCli,
  getAcpInstallProgress,
  installManagedAcpCli,
  parseAntigravityCliRelease,
  setManagedAcpRootForCache,
} from "../lib/acp/installer.js";
import { resolveAcpLaunch } from "../lib/acp/runtime.js";
import { buildStatus } from "../lib/web-api.js";

// 1. Platform targets
assert.equal(antigravityCliTarget("win32", "x64", false), "windows_amd64");
assert.equal(antigravityCliTarget("win32", "arm64", false), "windows_arm64");
assert.equal(antigravityCliTarget("darwin", "arm64", false), "darwin_arm64");
assert.equal(antigravityCliTarget("darwin", "x64", false), "darwin_amd64");
assert.equal(antigravityCliTarget("linux", "x64", false), "linux_amd64");
assert.equal(antigravityCliTarget("linux", "x64", true), "linux_amd64_musl");
assert.equal(antigravityCliTarget("linux", "arm64", false), "linux_arm64");
assert.equal(antigravityCliTarget("freebsd", "x64", false), null);

// 2. Manifest validation (valid + tampered rejection)
const fakeSha = "a".repeat(128);
{
  const okWin = parseAntigravityCliRelease(
    {
      version: "1.5.17",
      url: "https://storage.googleapis.com/antigravity-public/antigravity-cli/1.5.17-4823843970351104/windows-x64/cli_windows_x64.exe",
      sha512: fakeSha,
    },
    "win32",
    "x64",
    false,
  );
  assert.equal(okWin.executableName, "agy.exe");
  assert.equal(okWin.format, "executable");

  const okWinArm = parseAntigravityCliRelease(
    {
      version: "1.5.17",
      url: "https://storage.googleapis.com/antigravity-public/antigravity-cli/1.5.17-4823843970351104/windows-arm/cli_windows_arm64.exe",
      sha512: fakeSha,
    },
    "win32",
    "arm64",
    false,
  );
  assert.equal(okWinArm.executableName, "agy.exe");

  const okMac = parseAntigravityCliRelease(
    {
      version: "1.5.17",
      url: "https://storage.googleapis.com/antigravity-public/antigravity-cli/1.5.17-4823843970351104/darwin-arm/cli_mac_arm64.tar.gz",
      sha512: fakeSha,
    },
    "darwin",
    "arm64",
    false,
  );
  assert.equal(okMac.executableName, "antigravity");
  assert.equal(okMac.format, "tar.gz");

  assert.equal(
    parseAntigravityCliRelease(
      {
        version: "1.5.17",
        url: "https://evil.example.com/cli_windows_x64.exe",
        sha512: fakeSha,
      },
      "win32",
      "x64",
      false,
    ),
    null,
  );
  assert.equal(
    parseAntigravityCliRelease(
      {
        version: "1.5.17",
        url: "https://storage.googleapis.com/antigravity-public/antigravity-cli/1.5.17-4823843970351104/windows-x64/cli_windows_x64.exe",
        sha512: "deadbeef",
      },
      "win32",
      "x64",
      false,
    ),
    null,
  );
}

// 3. Managed download + SHA-512 verification + isolated resolution
const tmpRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "agy-next-installer-"));
try {
  const payload = Buffer.from("fake-agy-cli-binary-1.5.17");
  const expectedSha = createHash("sha512").update(payload).digest("hex");
  const dshHome = path.join(tmpRoot, "dsh-home");
  const fakeHome = path.join(tmpRoot, "empty-home");
  await fsp.mkdir(fakeHome, { recursive: true });

  const mockFetch = (shaOverride) => async (url) => {
    if (String(url).endsWith("/windows_amd64.json")) {
      return new Response(
        JSON.stringify({
          version: "1.5.17",
          url: "https://storage.googleapis.com/antigravity-public/antigravity-cli/1.5.17-123/windows-x64/cli_windows_x64.exe",
          sha512: shaOverride ?? expectedSha,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    return new Response(payload, {
      status: 200,
      headers: { "content-length": String(payload.length) },
    });
  };

  await assert.rejects(
    installManagedAcpCli({
      env: { DSH_HOME: dshHome },
      platform: "win32",
      arch: "x64",
      homedir: () => fakeHome,
      fetch: mockFetch("0".repeat(128)),
    }),
    /SHA-512 verification failed/,
  );
  assert.equal(getAcpInstallProgress().phase, "error");

  const seenPhases = [];
  const installed = await installManagedAcpCli({
    env: { DSH_HOME: dshHome },
    platform: "win32",
    arch: "x64",
    homedir: () => fakeHome,
    fetch: mockFetch(),
    onProgress: (p) => seenPhases.push({ phase: p.phase, percent: p.percent, totalBytes: p.totalBytes }),
  });
  assert.ok(seenPhases.some((p) => p.phase === "manifest"));
  assert.ok(seenPhases.some((p) => p.phase === "downloading" && p.totalBytes === payload.length && p.percent === 100));
  assert.ok(seenPhases.some((p) => p.phase === "verifying"));
  assert.equal(getAcpInstallProgress().phase, "ready");
  assert.equal(getAcpInstallProgress().active, false);
  assert.equal(getAcpInstallProgress().percent, 100);
  assert.equal(installed.version, "1.5.17");
  assert.ok(fs.existsSync(installed.path));
  assert.deepEqual(await fsp.readFile(installed.path), payload);

  const found = findInstalledManagedAcpCli({
    platform: "win32",
    env: { DSH_HOME: dshHome },
    homedir: () => fakeHome,
  });
  assert.equal(found.path, installed.path);
  assert.equal(found.version, "1.5.17");

  if (process.platform === "win32") {
    const isolatedEnv = {
      PATH: "",
      Path: "",
      HOME: fakeHome,
      USERPROFILE: fakeHome,
      LOCALAPPDATA: path.join(fakeHome, "AppData", "Local"),
      DSH_HOME: dshHome,
    };
    const launch = resolveAcpLaunch(isolatedEnv);
    assert.equal(launch.command, installed.path);
    assert.deepEqual(launch.args, ["acp"]);
    assert.equal(launch.source, "agy-managed");
  }
} finally {
  setManagedAcpRootForCache(null);
  await fsp.rm(tmpRoot, { recursive: true, force: true });
}

// 4. buildStatus exposes canAutoInstall when agy is missing
{
  const status = await buildStatus({
    store: {
      readBook: async () => null,
      readOrImport: async () => null,
    },
    settings: { disabledModels: [] },
    deps: {
      describeAcpStatus: async () => ({
        reachable: false,
        authenticated: false,
        detail: { code: "spawn", message: "Official Antigravity ACP server was not found on PATH." },
      }),
    },
  });
  assert.equal(status.client.configured, false);
  assert.equal(status.client.installed, false);
  assert.equal(status.client.canAutoInstall, true);
}

console.log("acp installer offline: ok");
