# agy-next

A from-scratch Google Antigravity / Cloud Code Assist model provider for
[DeepSeek Harness](https://deepseek.com/harness/) (DSH).

It registers the `agy-next` provider id, so it can live alongside other
Antigravity providers in the same profile without colliding.

## What it does

- Streams Gemini, Claude, and GPT-OSS models served by Google's Cloud Code Assist
  backend, with thinking/reasoning surfaced as `reasoning-delta` chunks.
- Maps thinking budget to each model's effort levels (`low` / `medium` / `high`,
  plus `off` to suppress thought output).
- Honest token accounting: thinking tokens are counted in `outputTokens` when
  they are streamed, so the host's tokens/second readout covers the same span it
  timed instead of silently under-reporting.
- Keeps its credential file separate from other Antigravity plugins and never
  writes to theirs.

## Requirements

- DSH `>=0.1.5-rc.1 <0.3.0`
- Node `>=20`
- **Your own Google OAuth client** — this plugin does not ship one.
  See [SETUP.md](SETUP.md); it takes about three minutes.

## Install

```bash
dsh plugin --profile <profile> add agy-next
```

Then add it to the plugin list in `<profile>/package.json`:

```json
{
  "dsh": {
    "profile": {
      "bundles": ["...", "agy-next"]
    }
  }
}
```

Restart DSH (or reload the host) so the provider registers.

From a checkout instead of the registry:

```bash
dsh plugin --profile <profile> add github:USER/agy-next
# or
dsh plugin --profile <profile> add link:/absolute/path/to/agy-next
```

## Settings page

After the restart, **Settings → AGY-Next** shows what the plugin is actually
doing:

| Section | What it tells you |
|---|---|
| OAuth client | whether one is configured, and where it was found (file, env, plugin config) |
| Sign-in | account email, Cloud Code Assist project, and how long the access token has left |
| Requested scopes | the six scopes this provider asks Google for |
| Models | the twelve model ids the picker exposes, with context size |

It also carries the operations: **Sign in** starts the OAuth flow and opens your
browser, **Sign in again** replaces the current credential, and **Sign out**
deletes it. The page re-reads itself every two seconds while an approval is
outstanding, so it flips to "signed in" without a reload.

Everything the page shows comes from `/agy-next/api/*` on the host. The page
never receives a token or a secret — only whether they exist and when they
expire.

## Log in

Run these from the `agy-next` package directory (the one with `package.json`).
This checkout is not published to npm, so `npx agy-next-login` would hit the
public registry and 404.

```bash
npm run login
```

The first run walks you through supplying your OAuth client, then opens your
browser for Google sign-in. The credential is written to
`<DSH_HOME>/storages/agy-next-oauth.json`.

```bash
npm run login -- --status    # account, project, expiry, OAuth client status
npm run login -- --force     # replace the existing login
npm run login -- --logout    # delete the stored credential
```

If you already use the official `dsh-antigravity` plugin, `agy-next` will import
its login on first use — read-only; it never writes to that file.

## Models

| id | context | max output | efforts |
|---|---|---|---|
| `gemini-3.8-flash` | 1,048,576 | 65,536 | low, medium, high |
| `gemini-3-flash` | 1,048,576 | 65,536 | low, medium, high |
| `gemini-3.1-flash-image` | 1,048,576 | 65,536 | low, medium, high |
| `gemini-3.1-flash-lite` | 1,048,576 | 65,536 | low, medium, high |
| `gemini-3.5-flash-lite` | 1,048,576 | 65,536 | low, medium, high |
| `gemini-2.5-pro` | 1,048,576 | 65,536 | low, high |
| `gemini-2.5-flash` | 1,048,576 | 65,536 | low, medium, high |
| `gemini-2.5-flash-lite` | 1,048,576 | 65,536 | low, medium, high |
| `gemini-2.5-flash-thinking` | 1,048,576 | 65,536 | low, high |
| `claude-sonnet-4-6` | 200,000 | 64,000 | high |
| `claude-opus-4-6` | 250,000 | 64,000 | high |
| `gpt-oss-120b` | 128,000 | 32,768 | medium |

The backend's catalog changes without notice. Re-verify with:

```bash
npm run sweep
```

## Configuration

Every value can be set in `cordis.patch.yml` rather than edited in code:

```yaml
- id: agy-next
  name: agy-next
  config:
    clientId: ""                     # your OAuth client; see SETUP.md
    clientSecret: ""
    clientPath: ""                   # default <DSH_HOME>/storages/agy-next-oauth-client.json
    credentialPath: ""               # default <DSH_HOME>/storages/agy-next-oauth.json
    streamIdleTimeoutMs: 300000
    discoveryTimeoutMs: 8000
    projectCacheTtlMs: 1800000
    runtimeModel: ""                 # force one backend model id
    projectId: ""                    # override Cloud Code Assist project
```

## Multiple accounts

Each credential file holds one account. To keep several, point
`credentialPath` at a different file per profile, or swap files before logging
in:

```bash
AGY_NEXT_CREDENTIAL_PATH=~/.dsh/storages/agy-next-oauth-work.json npm run login
```

The login command accepts `--force` so a stored credential never blocks a second
account from being added elsewhere.

## Development

```bash
npm run check    # syntax check every module
npm run verify   # offline checks, no network
npm run smoke    # live: credentials -> project -> models -> stream
npm run sweep    # live: re-verify the model catalog
```

`npm run verify` imports `lib/index.js`, which depends on packages the DSH host
provides (`@deepseek-ai/dsh-llm`, `dsh-timeout`, `schemastery`). Those only
resolve inside an installed application, so run these scripts where the plugin is
actually installed:

```bash
cd <profile>/node_modules/agy-next && npm run verify
```

Run from a bare source checkout they exit with code 2 and explain this rather
than dumping a module-resolution stack. `NODE_PATH` does not help — the ESM
resolver ignores it.

## Scope and limitations

- The scopes this provider requests (`aicode`, `cloud-platform`, `cclog`,
  `experimentsandconfigs`) are Google's internal Cloud Code Assist scopes. Using
  them against a personal OAuth client is not an arrangement Google documents or
  endorses; it works today and may stop working at any time.
- This is an unofficial, community project. It is not affiliated with, endorsed
  by, or supported by Google or DeepSeek.
- Endpoint selection favours the production host and falls back to the sandbox
  host; when the production host is unavailable the first request of a turn pays
  roughly a second of extra latency.

## License

MIT — see [LICENSE](LICENSE).

This plugin was written from scratch, but its protocol knowledge came from
reverse-engineering an existing MIT-licensed DSH Antigravity provider. That debt
is acknowledged here deliberately.
