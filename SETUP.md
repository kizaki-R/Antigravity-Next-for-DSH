# Setup — supplying your own OAuth client

`agy-next` does **not** ship Google's OAuth client credentials. You bring your
own. It takes about three minutes and costs nothing.

## Why you must supply your own

Google's Antigravity IDE contains an OAuth client id/secret pair, and older
versions of this plugin (and of the reference implementation it was written
against) copied those strings into the source. They were never a secret in the
cryptographic sense — anyone who unpacks the IDE can read them — but they belong
to Google's client, not to this plugin.

Shipping them has a concrete cost: every user's traffic would be attributed to
one shared `client_id`. If Google ever deactivated it, every installation would
break simultaneously, including accounts whose owners never did anything
unusual. Supplying your own client means your traffic is yours alone.

## 1. Create a Google Cloud project

Open <https://console.cloud.google.com/projectcreate>, give it a name, create it.

## 2. Enable the Cloud Code Assist API

Open <https://console.cloud.google.com/apis/library/cloudcode-pa.googleapis.com>
and press **Enable** for the project you just created.

## 3. Create an OAuth client

1. Go to **APIs & Services → Credentials**
2. **Create credentials → OAuth client ID**
3. If asked, configure the consent screen first (External, add yourself as a
   test user — you do not need to publish the app)
4. Application type: **Desktop app**
5. Press **Create**

Copy the **Client ID** and **Client secret** it shows you.

## 4. Give them to the plugin

Pick **one** of these. Precedence is: config → file → environment.

### a) Let the login command save them (easiest)

```bash
npx agy-next-login
```

On first run it prints the walkthrough and asks for the pair, then saves them to
`<DSH_HOME>/storages/agy-next-oauth-client.json` with owner-only permissions.

### b) Write the file yourself

`<DSH_HOME>/storages/agy-next-oauth-client.json` — `DSH_HOME` is `~/.dsh`
unless you set it:

```json
{
  "clientId": "YOUR-CLIENT-ID.apps.googleusercontent.com",
  "clientSecret": "YOUR-CLIENT-SECRET-HERE"
}
```

Both the camelCase names above and the labels the Google console shows
(`"Client ID"` / `"Client secret"`) are accepted.

### c) Environment variables

```bash
AGY_NEXT_CLIENT_ID=YOUR-CLIENT-ID.apps.googleusercontent.com
AGY_NEXT_CLIENT_SECRET=YOUR-CLIENT-SECRET-HERE
```

### d) Plugin config

In your profile's `cordis.patch.yml`:

```yaml
- id: agy-next
  name: agy-next
  config:
    clientId: YOUR-CLIENT-ID.apps.googleusercontent.com
    clientSecret: YOUR-CLIENT-SECRET-HERE
```

## 5. Log in

```bash
npx agy-next-login          # first login
npx agy-next-login --status # what is configured right now
npx agy-next-login --force  # replace an existing login
npx agy-next-login --logout # delete the stored credential
```

## Where your secrets live

Nothing is written inside the package directory, so cloning or upgrading the
plugin can never leak or clobber a token.

| File | Contents | Permissions |
|---|---|---|
| `<DSH_HOME>/storages/agy-next-oauth-client.json` | your OAuth client id + secret | `0600` |
| `<DSH_HOME>/storages/agy-next-oauth.json` | your refresh/access token | `0600` |

The plugin also **reads** the official `dsh-antigravity` file
(`<DSH_HOME>/storages/antigravity-oauth.json`) to import an existing login, but
it never writes there.

## Switching OAuth clients

A refresh token is bound to the client that issued it. If you change
`clientId`, the stored refresh token stops working and you must log in again:

```bash
npx agy-next-login --force
```

## Troubleshooting

| Symptom | Cause |
|---|---|
| `no OAuth client configured` | None of the four places above is set. |
| `Token exchange failed (400): invalid_client` | The id/secret pair is wrong or from a different project. |
| `Token exchange failed (403): access_denied` | Cloud Code Assist API not enabled, or your account is not a test user on the consent screen. |
| `no refresh_token` | You previously granted access; revoke it at <https://myaccount.google.com/permissions> and log in again. |
| Login works but requests 403 | The API is enabled on a different project than the client belongs to. |
