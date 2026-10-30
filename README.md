# agy-next

An unofficial Google Antigravity / Cloud Code Assist model provider for
[DeepSeek Harness](https://deepseek.com/harness/) (DSH). It registers the
`agy-next` provider id and can coexist with other providers.

**This is an unofficial local integration, not affiliated with, endorsed by,
or officially supported by Google or DeepSeek.** Local client discovery does
not establish permission to use Google's services or guarantee account access.

## Requirements

- DSH `>=0.1.5-rc.1 <0.3.0` and Node `>=20`.
- The official AGY desktop application installed locally. Download it from
  <https://antigravity.google/product/antigravity-2>.
- A Google account that can complete browser consent and access the requested
  services. Model availability and quota depend on the account and upstream API.

The plugin resolves the OAuth client from the installed application's resources
on your machine. It does **not** bundle client values, start AGY, or read AGY's
accounts, tokens, or account database as part of discovery. AGY does not need to
be running. Account tokens are obtained separately through Google's browser
consent flow; installing AGY does not automatically sign you in to this plugin.

Windows is the current local validation target. macOS/Linux detection is planned;
do not treat either as verified support until separately confirmed.

## Install

For a local checkout, add the package to your DSH profile:

```bash
dsh plugin --profile <profile> add link:/absolute/path/to/agy-next
```

Include `agy-next` in the profile's `dsh.profile.bundles` list, then restart DSH
or reload the host. Run CLI commands from the package directory; this checkout
is not a claim that the same version has been published to npm.

See [SETUP.md](SETUP.md) for installation discovery and troubleshooting.

## Local installation discovery

Standard installation locations are checked locally. If detection fails or you
use a nonstandard installation, set `AGY_NEXT_INSTALL_PATH` to your official AGY
installation path in the environment of the process running DSH or the CLI.
For example, in PowerShell before launching the CLI:

```powershell
$env:AGY_NEXT_INSTALL_PATH = 'C:\path\to\Antigravity'
npm run login
```

For the GUI, set the variable before launching DSH, restart DSH if necessary,
then refresh the settings page. Do not point it at an account folder or a JSON
file containing OAuth credentials.

The local resolver is read-only: it does not save the resolved pair to a client
file, rewrite account records, or migrate existing tokens. The obsolete
`clientId`, `clientSecret`, and `clientPath` config fields remain accepted for
compatibility but are **ignored**. Client JSON files and `AGY_NEXT_CLIENT_*` /
`ANTIGRAVITY_CLIENT_*` client-pair environment variables are also ignored. They
cannot bypass the installation requirement. Do not create a custom Google Cloud
OAuth client for this flow.

## Sign in

Use **Settings → AGY-Next → Sign in / Add account**, or run:

```bash
npm run login
npm run login -- --status
npm run login -- --force
npm run login -- --logout
```

After the local client is resolved, Google browser consent obtains the account's
tokens. CLI `--force` replaces the existing login; `--logout` deletes the stored
credential. Those are account operations, not part of client discovery.

Tokens remain in the plugin's own credential store, by default
`<DSH_HOME>/storages/agy-next-oauth.json`; `credentialPath` or
`AGY_NEXT_CREDENTIAL_PATH` can override it. This store is separate from the AGY
application's account storage. Existing legacy `dsh-antigravity` import behavior
is separate from client discovery and does not write to that plugin's file.
A token issued to a different OAuth client may require signing in again. The
plugin does not silently convert it to a new client or edit its binding.

## Settings page

| Section | What it shows |
|---|---|
| Local AGY installation | Resolution readiness, source, installation path and app version when available |
| Account pool | Account identities, current account, quota and switching controls |
| Requested scopes | The permissions requested during Google consent |
| Models | The provider's current model roster and visibility controls |

The OAuth status UI displays safe installation metadata only, never client
values or account tokens. A discovered installation is not necessarily a
readable client: unsupported resource formats or unreadable files keep sign-in
disabled until resolution succeeds. A missing installation links to the official
download and explains `AGY_NEXT_INSTALL_PATH`.

The page uses `/agy-next/api/*`. **The overall status endpoint is not a read-only
audit tool:** existing account import, token refresh and account maintenance may
write the plugin's credential store. Only local client discovery is read-only.

## Configuration

```yaml
- id: agy-next
  name: agy-next
  config:
    credentialPath: ""               # default <DSH_HOME>/storages/agy-next-oauth.json
    streamIdleTimeoutMs: 300000
    discoveryTimeoutMs: 8000
    projectCacheTtlMs: 1800000
    runtimeModel: ""                 # force one backend model id
    projectId: ""                    # override Cloud Code Assist project
```

Use `AGY_NEXT_INSTALL_PATH` for installation discovery. Deprecated client-pair
config fields are intentionally omitted above because their values are ignored.

## Models, accounts and quotas

- Gemini, Claude and GPT-OSS availability follows Google's backend and each
  account's model list; no installation or sign-in guarantees a specific model.
- Reasoning effort maps to backend variants. Thinking tokens are included in
  streamed output accounting.
- Multiple accounts, standby switching and visibility controls use the existing
  plugin credential store; no AGY account-store modification is required.
- Subscription badges use each account's `loadCodeAssist` response, not its model
  roster or quota. Unknown/unavailable results remain unknown. Positive results
  are cached per token in memory for five minutes, not persisted as account-plan
  metadata. The endpoint does not explain billing promotions or staged rollouts.
- Gemini 4 Argon uses its Low/Medium/High runtime variants. Argon weekly quota
  appears separately when Google reports it. An absent bucket means unreported,
  not zero quota or proof of ineligibility. Quota calls use each account's own
  token; AGY does not need to be running.
- Structured tool replies remain paired with their original calls across model
  changes. This does not guarantee compatibility with every incomplete history
  or provider-specific signature.

## Development

```bash
npm run check          # syntax checks
npm run verify         # offline host-contract checks
npm test               # regression suite
npm run smoke          # LIVE account/project/model/stream operations
npm run sweep          # LIVE backend model checks
```

Host-contract checks need the peer dependencies provided by an installed DSH.
For account-independent testing, use synthetic installation resources, isolated
credential storage and stubbed network operations. Do not run live scripts or
use the real status endpoint when a task requires no account reads or writes.

## Limitations

This integration relies on local AGY resource formats and Google's services;
updates can break parsing, consent, refresh or backend access. Requested scopes
include `aicode`, `cclog` and `experimentsandconfigs`, which are not publicly
documented for third-party clients. A successful local test is not evidence of
Google authorization, official third-party support or general compatibility.
Review applicable service terms and
[Google's OAuth policies](https://developers.google.com/identity/protocols/oauth2/policies)
before use or distribution. No public-release approval or verification is claimed.

## License

MIT — see [LICENSE](LICENSE).

Written from scratch, with protocol knowledge informed by an existing
MIT-licensed DSH Antigravity provider.
