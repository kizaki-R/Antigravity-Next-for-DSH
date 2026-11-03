# Changelog

English | [繁體中文](CHANGELOG.zh-TW.md)

---

## [1.1.0] - 2026-11-03

### Added
- **Official Antigravity IDE Support**: Resolves OAuth credentials directly from local Antigravity IDE installations (VS Code architecture with no `resources/app.asar`). When no desktop build is found, parses `resources/app/out/main.js` within the `cloudCode/common/oauthClient` module to extract personal consumer client credentials using adjacent assignment syntax. Enforces a fail-closed policy (`IDE_CLIENT_AMBIGUOUS`) if candidate pairing is ambiguous.
- **Custom Installation Path & Smart Root Discovery**: Added a custom installation path input in the Settings UI. Automatically normalizes inputs and walks up ancestor directories when pointing to an executable (`Antigravity.exe` / `Antigravity IDE.exe`) or internal folders (`resources`, `resources/app`, `out/main.js`) to locate the canonical installation root.
- **Windows Shortcut (.lnk) Piercing**: Resolves Windows Start Menu shortcut folders or `.lnk` files directly. Uses pure binary buffer parsing to read Windows Shell Links and transparently navigate to the real target executable.
- **Layout Preference & Auto Fallback (`clientSource`)**: Added `clientSource` setting (`auto` / `desktop` / `ide`, configurable via `cordis.yml` or `AGY_NEXT_CLIENT_SOURCE`). Defaults to `auto`, which prefers the desktop build but automatically falls back to the IDE if desktop files are missing or unreadable.
- **One-Click Privacy-Safe Diagnostics Report**: Added `GET /agy-next/api/diagnostics` and a "Copy diagnostics" button in Settings. Outputs environment facts, candidate folder existence (boolean flags only), and install verdict codes with zero token, secret, or absolute personal path leakage.
- **Granular IDE Error Codes**: Added `IDE_CLIENT_UNREADABLE`, `IDE_IDENTITY_MISMATCH`, and `IDE_CLIENT_AMBIGUOUS` with localized descriptions across all three languages.

### Fixed
- **Label Wrapping in Specification List**: Updated `.agyn-kv` key column to `max-content` with `white-space: nowrap`, preventing multi-character non-English labels (e.g. "應用程式版本") from wrapping across lines.
- **Dynamic Footer Version**: Footer now retrieves the active runtime version from `/status` instead of relying on a hardcoded string literal; added `bin/check-ui-versions.mjs` to block static version regressions during syntax checks.
- **Tarball and Repository Sync**: Removed dead `UI_BUILD = "u29"` constant and `.agyn-build` CSS rules from `lib/ui.js` to ensure the published npm tarball strictly mirrors git HEAD.

### Maintenance & Security
- **Pre-Publish Verification Guard (`publish-guard`)**: Added `bin/publish-guard.mjs` to `prepublishOnly`. Automatically blocks publishing if the worktree contains uncommitted changes, if the local branch is ahead of the remote, or if git tags disagree with `package.json`.
- **Public Boundary Scanner**: Added a dedicated `safety` job to CI that scans tracked files for local Windows user paths, private junction names, session backup directories, Gmail addresses, and private key blocks.
- **npm Repository Metadata Correction**: Removed the invalid `repository.directory` field in `package.json` so repository links on npm point directly to the repository root.
- **Host Contract Peer Verification**: Added `bin/verify-peers.mjs` and `npm run verify:peers` to run host peer contract assertions locally against `AGY_PEER_ROOT`. Expanded syntax check coverage across all 43 modules.

---

## [1.0.1] - 2026-11-02

### UI & Branding
- **Custom Settings Nav Icon**: Decorates the settings sidebar navigation button with the Antigravity Next vector mark, replacing DSH's generic fallback gear.
- **Header Actions Layout**: Moved GitHub shortcut button to the left of the language switcher; preserved the refresh button at the far right.
- **Centered Action Icons**: Centered top header buttons via `inline-grid`.
- **Retired Build Stamp**: Removed internal `u29` debug badge from the header title.
- **Footer Community Links**: Added footer bar linking to maintainer profile (`@kizaki-R`), GitHub repository, issue tracker, and npm package.

### Documentation & Supported Models
- **Accurate Model Roster**: Corrected model matrix to list upstream Antigravity Claude models (`claude-sonnet-5-5`, `claude-opus-5-5`, `claude-opus-4-6`, `claude-sonnet-4-6`), `gemini-3.8-flash`, `gemini-3-flash`, and `gpt-oss-120b`.
- **Context Windows & Reasoning**: Documented 1M token context windows for Gemini and Claude models; clarified reasoning effort support across Argon, Flash 3.8, and Claude.
- **DSH Version Guidance**: Clarified compatibility as `0.1.5` ~ `0.2.x` (verified through `0.2.1`).

### Testing & CI
- **macOS Temp Directory Assertions**: Canonicalised temp directories using `realpath` before prefix assertions, resolving test failures on macOS where `/var` symlinks to `/private/var`.
- **Syntax Coverage**: Included `bin/peer-resolve.mjs` and `bin/test-peers.mjs` in `npm run check`.

### Community Governance
- **Contributing Guidelines**: Added `CONTRIBUTING.md` outlining the issue-first proposal workflow, local verification checklist, and security disclosure channels.

---

## [1.0.0] - 2026-11-02

Initial open-source release with cross-platform support, trilingual documentation, automated CI test matrix, and brand assets.

### Features
- **Dynamic Local Discovery**: Resolves OAuth client credentials directly from locally installed official Antigravity applications without requiring manual Google Cloud project configuration.
- **Multi-Account Rotation Pool**: Supports multiple Google accounts, automated threshold-based switching, and real-time quota visualization.
- **Broad Model Support**: Covers Gemini 4 Argon (with reasoning effort adjustment), Gemini 3.8 Flash, Gemini 2.5 series, Claude series (Sonnet 5.5 / Opus 5.5 with 1M context), and GPT-OSS 120B.
- **Automated Cross-Platform CI**: Verified via matrix testing across Windows, macOS (Apple Silicon), and Ubuntu Linux on Node 20 and 22.
- **Branding Assets**: Includes official 512px raster icons, high-resolution trilingual banners, and sanitized interface screenshots.

---

## [0.5.0] - 2026-10-30

Core pre-release refactoring focusing on race condition protection, credential lifecycle boundaries, test portability, and asynchronous polling safety.

### 1. Test Suite Portability & Strict Peer Testing
- **Root Cause**: Scripts in `package.json` hardcoded local absolute file paths; missing host peers caused tests to quietly skip while reporting success.
- **Fix**: Added `bin/peer-resolve.mjs` and `bin/test-peers.mjs` with `AGY_PEER_ROOT` resolution. Introduced strict mode (`AGY_TESTS_STRICT=1`) where any skipped test fails the test run.

### 2. Credential Ledger Lifecycle & Tombstone Mechanism
- **Root Cause**: Deleting `agy-next-oauth.json` on full logout triggered first-run detection, which re-imported legacy accounts from `antigravity-oauth.json`.
- **Fix**: Implemented a tombstone mechanism: complete logout writes an explicit empty ledger marked `loggedOut: true`. `syncLegacyAccounts()` guards against re-importing when a tombstone is present.

### 3. Concurrency Protection for Token Refresh (CAS)
- **Root Cause**: Concurrent token refresh requests risked rolling back newer credentials if an earlier request completed last.
- **Fix**: Added Compare-And-Swap (CAS) validation in `lib/credential.js` and `lib/web-api.js` before disk persistence.

### 4. Status Snapshot Consistency & Family Quota Isolation
- **Root Cause**: Quota queries used stale snapshots; exhaustion of a single model family was mistakenly treated as global account lock.
- **Fix**: Standardized responses on freshly read book state; isolated `exhaustedFamilies` arrays from global account locks.

### 5. UI Polling Race & Overlap Guards
- **Root Cause**: Unthrottled `setInterval` polling allowed overlapping network requests and stale responses to overwrite newer UI states.
- **Fix**: Added `loadSeq` sequence guards to discard stale responses and `inFlight` locks to prevent stacked requests.

### 6. Network Timeouts
- **Root Cause**: Network operations lacked timeout protection and could hang indefinitely on interrupted connections.
- **Fix**: Added `AbortSignal.timeout(30_000)` to token exchange/refresh and `AbortSignal.timeout(10_000)` to user info lookups.

### 7. Deprecated Manual Google Cloud Setup
- **Root Cause**: Legacy interactive setup guide directed users to Google Cloud Console, conflicting with local client auto-discovery.
- **Fix**: Deprecated `runSetupGuide()` in favor of direct CLI login (`npm run login`).

### 8. Binary Parser Safety Bounds
- **Fix**: Added negative tests for index confusion and missing pairs in `bin/test-installed-agy.mjs` to ensure parsers fail closed on ambiguous structures.

---

## [0.4.1] - 2026-10-20

- Added automated OAuth client extraction from local official Antigravity installations.
- Added multi-account management with threshold-based auto-switching.
- Added Gemini 4 Argon and Claude 5.5 model family support.
- Added visual quota progress indicators.
- Added Traditional Chinese (Taiwan), Simplified Chinese, and English localization.
