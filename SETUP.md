# Local AGY setup

`agy-next` is an **unofficial local integration**, not affiliated with, endorsed
by, or officially supported by Google or DeepSeek. It requires the official AGY
application installed on this machine, but does not require AGY to be running.
It does not bundle OAuth client values or ask you to create your own client.
Local parsing does not establish Google authorization or guarantee service access.

## 1. Install the official application

Download and install AGY from:

<https://antigravity.google/product/antigravity-2>

Client discovery only reads installed application resources. It does not execute
the official application or read its accounts, tokens or account database.
You do not have to start AGY for discovery, login or direct quota requests.

Windows is the current local validation target. macOS/Linux detection is planned
and must not be considered verified support until separately confirmed.

## 2. Locate a nonstandard installation

If automatic detection fails, set `AGY_NEXT_INSTALL_PATH` to the official AGY
installation path. In PowerShell, from the `agy-next` package directory:

```powershell
$env:AGY_NEXT_INSTALL_PATH = 'C:\path\to\Antigravity'
npm run login
```

The example path is a placeholder: use the directory where you installed AGY,
not an account-data directory, a client JSON file or a downloaded installer.
For the GUI, set the variable in DSH's launch environment, restart DSH if needed,
then refresh **Settings → AGY-Next**. Setting it in an unrelated terminal does
not update an already-running DSH process.

The settings page reports readiness, installation path, source and version when
available. No client value or secret is displayed. Finding the app is distinct
from successfully resolving its client; a changed resource format can prevent
login even when AGY is installed.

## 3. Obtain account tokens through Google consent

In **Settings → AGY-Next**, select **Sign in / Add account** after local client
resolution succeeds. Alternatively, from the package directory:

```bash
npm run login
npm run login -- --status
npm run login -- --force
npm run login -- --logout
```

Google opens a browser consent flow for the account. Installing the application
does not automatically import an AGY account or grant service access. `--force`
replaces an existing CLI login; `--logout` deletes the plugin's saved credential.

A previous refresh token issued to a different client cannot be converted just
by discovering the installed client. If refresh fails because of a client
binding mismatch, sign in again; the resolver does not rewrite tokens or account
records. Do not delete or manually edit account files as a discovery fix.

## Storage and compatibility

| Item | Behavior |
|---|---|
| Installed AGY resources | Read locally to resolve the client; not modified or executed |
| Resolved OAuth client | Used on the host; not bundled or persisted by discovery, not sent to the settings UI |
| Plugin account tokens | Kept in the existing credential store, default `<DSH_HOME>/storages/agy-next-oauth.json` |
| AGY application accounts/database | Not read or changed by client discovery |
| Legacy `dsh-antigravity` credential import | Separate existing plugin behavior; never writes that plugin's file |

`credentialPath` and `AGY_NEXT_CREDENTIAL_PATH` still select the plugin credential
store. This change does not migrate the account format or alter its account
selection rules.

Old client configuration is no longer a supported input:

- `clientId`, `clientSecret` and `clientPath` schema fields remain for backward
  compatibility but are deprecated and ignored.
- The old OAuth client JSON file is ignored; no replacement copy is written.
- `AGY_NEXT_CLIENT_ID`, `AGY_NEXT_CLIENT_SECRET`, `AGY_NEXT_CLIENT_PATH` and the
  `ANTIGRAVITY_CLIENT_*` aliases do not supply a client or bypass installation.
- Do not follow the old Google Cloud Console custom-client walkthrough. This
  flow does not require a self-created client or API project setup.

Local discovery is read-only, but login, refresh, logout, legacy import and some
status maintenance can write the plugin credential store. Do not use a real
account status command or status API as a no-account-access diagnostic.

## Troubleshooting

| Symptom | What to check |
|---|---|
| No local AGY installation found | Install from the official link above; verify `AGY_NEXT_INSTALL_PATH` in the process environment |
| AGY found but client cannot be resolved | Check the installation path, file permissions and app version; update/reinstall the official app if appropriate |
| Sign-in remains disabled after setting the variable | Restart DSH with the variable in its launch environment, then refresh the settings page |
| Old client settings no longer work | Expected: config, client JSON and client-pair environment inputs are ignored |
| Token refresh fails after changing client source | A refresh token is client-bound; complete Google browser consent again rather than editing saved tokens |
| Google rejects consent, scopes or account access | Keep the error for diagnosis; installing AGY does not guarantee permission, eligibility or a supported third-party flow |
| A model or quota bucket is missing | Account eligibility and upstream reporting differ; absence is not proof of zero quota |

Do not paste client values, tokens or raw application resources into issue
reports. Prefer installation version, safe error code and a redacted path.
Tests should use synthetic installation fixtures, isolated credential storage
and network stubs, not your real account files.
