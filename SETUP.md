# Antigravity ACP Setup (`v2.0.0`)

`agy-next` is an **unofficial community integration**, not affiliated with, endorsed by, or officially supported by Google or DeepSeek. Starting with `v2.0.0`, it communicates exclusively through Google's official Antigravity ACP server (`agy acp` or `agy_acp_server`).

You do **not** need to install the Antigravity desktop app or IDE, bundle OAuth client IDs/secrets, or create a Google Cloud Console project.

## 1. Install or detect the official `agy` CLI

When DSH loads `agy-next`, `resolveAcpLaunch()` checks for the official ACP binary in this order:

1. `AGY_NEXT_ACP_BIN` (if set to a valid executable path)
2. `agy` on `PATH` (invoked as `agy acp`)
3. `agy_acp_server` on `PATH`
4. Per-user default install locations:
   - Windows: `%LOCALAPPDATA%\agy\bin\agy.exe`
   - macOS / Linux: `~/.local/bin/agy`, `~/.local/bin/antigravity`, `~/.agy/bin/agy`
5. Plugin-managed CLI under `<DSH_HOME>/runtimes/agy-next`

If none of these exist, open **Settings → AGY-Next** and click **Install official CLI**. The plugin fetches Google's official CLI release manifest, validates that the download originates from `storage.googleapis.com`, verifies the SHA-512 checksum, and installs `agy` under `<DSH_HOME>/runtimes/agy-next` (Windows, macOS, and Linux `x64` / `arm64`, including musl detection).

## 2. Sign in with Google

After the CLI is ready:

- **In DSH UI:** Open **Settings → AGY-Next** and click **Sign in** (or `+ Add account`).
- **From CLI (inside the `agy-next` package directory):**

```bash
npm run login -- --check-install
npm run login
npm run login -- --status
npm run login -- --force
npm run login -- --logout
```

Sign-in launches the browser OAuth consent flow inside Google's official `agy` binary.

## 3. Credential storage and quota telemetry

`agy-next` reads the active ACP OAuth token directly from official storage without parsing desktop app binaries:

| Item | Behavior |
|---|---|
| OAuth tokens | Stored by `agy` in your OS native keyring (`gemini:antigravity` via Windows Credential Manager, macOS Keychain, Linux `secret-tool`) or `<GEMINI_HOME>/antigravity-{acp,cli}/antigravity-oauth-token` / `acp_token.json` |
| Plugin account book | Stored under `<DSH_HOME>/storages/agy-next-oauth.json` (`credentialPath` or `AGY_NEXT_CREDENTIAL_PATH`); holds account metadata, model visibility, and quota snapshots |
| Quota & tier telemetry | Queries `v1internal:retrieveUserQuotaSummary` and `_meta.antigravity.tier` using the active access token; refreshes silently on expiry via `refreshAcpAuth()` |
| Legacy `v1.x` tokens | Tokens issued under `v1.1.0` or earlier are bound to the retired REST/ASAR client and cannot refresh under ACP; sign in again after upgrading |

## 4. Retired `v1.x` configuration

The following fields and environment variables from `v1.x` remain harmless if left in `cordis.yml`, but no longer drive authentication or requests:

- `clientSource`, `discoveryTimeoutMs`, `projectCacheTtlMs`, `projectId`
- `clientId`, `clientSecret`, `clientPath`
- `AGY_NEXT_INSTALL_PATH`, `AGY_NEXT_CLIENT_SOURCE`, `AGY_NEXT_CLIENT_ID`, `AGY_NEXT_CLIENT_SECRET`, `AGY_NEXT_CLIENT_PATH`

Use `AGY_NEXT_ACP_BIN` instead if you need to point DSH at a custom `agy` executable.

## 5. Troubleshooting

| Symptom | What to check |
|---|---|
| Settings shows "Official Antigravity CLI not installed" | Click **Install official CLI** in Settings, or verify `agy` is on DSH's `PATH` / `AGY_NEXT_ACP_BIN` |
| Upgrade from `v1.x` fails to refresh quota or chat | Sign out of the legacy entry and complete a fresh Google sign-in under `v2.0.0` ACP |
| Quota or email stays blank after CLI login | Verify the OS keyring entry (`gemini:antigravity`) or `<GEMINI_HOME>` token file is readable by DSH's user account |
| `agy` works in a terminal but DSH cannot see it | GUI processes often use a trimmed `PATH`; restart DSH after updating `PATH` or set `AGY_NEXT_ACP_BIN` in DSH's launch environment |
