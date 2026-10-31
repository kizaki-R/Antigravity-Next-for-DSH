# Antigravity Next for DSH

[![Version](https://img.shields.io/badge/version-0.5.0-blue.svg)](package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![DeepSeek Harness](https://img.shields.io/badge/DSH-%3E%3D0.1.5--rc.1%20%3C0.3.0-orange.svg)](https://deepseek.com/harness/)

[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md)

An unofficial model provider plugin for [DeepSeek Harness](https://deepseek.com/harness/) (DSH). It connects locally installed Google Antigravity / Cloud Code Assist models directly to your DSH agent loop under provider id `agy-next`.

> **Disclaimer:** Unofficial integration. Not affiliated with, endorsed by, or officially supported by Google or DeepSeek. Requires an authorized Google account and a local installation of the official Antigravity application.

---

## Highlights

- **Zero Cloud Console Setup:** Automatically resolves OAuth client pairs from your local official Antigravity installation. No need to create a project or credentials in Google Cloud Console.
- **Multi-Account Pooling:** Add multiple Google accounts. Set quota safety thresholds and automatically failover to standby accounts when quotas expire.
- **Visual Quota Dashboard:** Live visual telemetry for Gemini, Claude 3p, and Gemini 4 Argon weekly/5-hour quota buckets in the Settings panel.
- **Thinking Level Control:** Native mapping for Gemini 4 Argon reasoning efforts (Low, Medium, High).
- **Private & Local:** Client discovery is read-only. Tokens remain strictly inside your local `<DSH_HOME>/storages/agy-next-oauth.json`.

---

## Requirements

1. **DeepSeek Harness:** `>=0.1.5-rc.1 <0.3.0` running on Node `>=20`.
2. **Official Antigravity App:** Installed locally on Windows (macOS/Linux detection in progress). Download from [official portal](https://antigravity.google/product/antigravity-2). *The app does not need to be running.*
3. **Google Account:** With browser consent capability and access to Gemini / Cloud Code Assist models.

---

## Installation

### Method 1: In DSH Web or Desktop (Recommended)

1. Open **Plugins → + Add plugin** in the DSH sidebar.
2. Enter the repository URL into the input field:
   ```text
   https://github.com/kizaki-R/Antigravity-Next-for-DSH
   ```
   *(Or enter `agy-next` once published to npm).*
3. Select **Install**. DSH will automatically mount the plugin and register the settings interface.
4. Restart DSH.

### Method 2: Local CLI / Developer Link

If developing from a local checkout:

```bash
# Register the local link in your DSH profile
dsh plugin --profile <profile> add link:/absolute/path/to/agy-next
```

Ensure `agy-next` is included in your profile's `dsh.profile.bundles`, then restart DSH.

---

## Getting Started

### 1. Verification & Login

Open **Settings → AGY-Next** in DSH:

1. **Installation Status:** Verify that DSH detects your local Antigravity installation path.
2. **Sign In:** Click **Sign in / Add account**. A browser window will open for standard Google OAuth consent.
3. Once authenticated, your account appears in the Account Pool with real-time quota indicators.

*Headless / CLI alternative:*

```bash
npm run login           # Add / sign in account
npm run login -- --status  # Check active status & quota
npm run login -- --force   # Force re-authentication
npm run login -- --logout  # Clear stored credentials
```

### 2. Custom Installation Path

If your Antigravity application is installed in a non-standard directory, specify it before launching DSH:

```powershell
# PowerShell
$env:AGY_NEXT_INSTALL_PATH = 'C:\Custom\Path\To\Antigravity'
```

---

## Configuration

Add or edit the plugin section in your profile's `cordis.yml` if custom parameters are needed:

```yaml
- id: agy-next
  name: agy-next
  config:
    credentialPath: ""               # Default: <DSH_HOME>/storages/agy-next-oauth.json
    streamIdleTimeoutMs: 300000      # 5 minutes idle stream protection
    discoveryTimeoutMs: 8000         # Local binary client detection timeout
    projectCacheTtlMs: 1800000       # Project metadata cache TTL (30 mins)
    runtimeModel: ""                 # Optional: pin a specific upstream model id
```

---

## Supported Models

| Model Family | Key Variants | Features |
|---|---|---|
| **Gemini 4 Argon** | `gemini-4-argon` | Low / Medium / High reasoning effort, 5h & weekly quota tracking |
| **Gemini Pro / Flash** | `gemini-2.5-pro`, `gemini-2.5-flash` | Multimodal streaming, tool invocation |
| **Claude (3p)** | `claude-3-7-sonnet`, `claude-3-5-sonnet` | Integrated Cloud Code Assist Claude runtime |

---

## Development & Test Suite

Run strict offline tests inside `agy-next/`:

```bash
npm run check        # Syntax checks across all 39 source modules
npm test             # Offline regression suite (21 fixture tests)
npm run test:peers   # Strict host peer contract test (0 skips tolerated)
```

For peer contract testing, export the DSH runtime dependencies:

```powershell
$env:AGY_PEER_ROOT = 'C:\path\to\dsh\node_modules'
npm run test:peers
```

---

## Security & Storage Architecture

- **No Secret Hardcoding:** This repository contains no bundled Google OAuth Client IDs or Client Secrets. Everything is resolved dynamically at runtime from local binary resources.
- **Isolated Storage:** Credentials are saved to `agy-next-oauth.json` under your DSH home directory. The official Antigravity app's internal database is never modified or read.
- **Tombstone Lifecycle:** Logging out completely writes an empty book with a `loggedOut: true` tombstone to prevent phantom auto-imports from legacy configs.

---

## License

[MIT](LICENSE) © [Kizaki](https://github.com/kizaki-R)
