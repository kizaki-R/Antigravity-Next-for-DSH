/**
 * @deprecated Legacy custom OAuth walkthrough.
 * agy-next now automatically resolves the OAuth client from the locally installed
 * official Antigravity application. Manual Google Cloud OAuth client creation is
 * deprecated and ignored by the plugin runtime.
 *
 * Kept for backward compatibility with external references and exports.
 */

import { stdout } from "node:process";

import { pickLocale, t } from "./i18n.js";

const RULE = "─".repeat(59);

/**
 * The five steps. `url` is the deep link; `note` is the one thing that goes
 * wrong at this step, which is why it is there.
 *
 * Object keys are i18n keys, not user text.
 */
export const SETUP_STEPS = [
  {
    key: "project",
    url: "https://console.cloud.google.com/projectcreate",
    optional: false,
  },
  {
    key: "api",
    /* NOT cloudcode-pa.googleapis.com: that is Google's internal backend and
       does not appear in the API library at all, so a user following a link to
       it lands on a page that says "could not load". The API a user can
       actually enable — and the one Google's own Gemini Code Assist setup
       documentation names — is the companion API below; enabling it is what
       grants access to the cloudcode-pa backend. */
    url: "https://console.cloud.google.com/marketplace/product/google/cloudaicompanion.googleapis.com",
    optional: false,
  },
  {
    key: "consent",
    url: "https://console.cloud.google.com/apis/credentials/consent",
    optional: true, // returns early for anyone who configured a consent screen before
  },
  {
    key: "client",
    url: "https://console.cloud.google.com/apis/credentials",
    optional: false,
  },
];

function line(locale, key, vars) {
  return t(locale, key, vars);
}

/**
 * Run the walkthrough, then prompt for the client id and secret.
 *
 * Steps already recorded as done are skipped, so closing the terminal halfway
 * through does not send the user back to the first Google page. Every finished
 * step is written to `agy-next-setup.json` before the next one is shown.
 *
 * @param {{ locale?: string, ask?: (prompt: string) => Promise<string>,
 *           resume?: boolean }} options
 * @returns {Promise<{ clientId: string, clientSecret: string } | undefined>}
 *          undefined when the user quits.
 */
export async function runSetupGuide({ locale = pickLocale(), ask, resume = true } = {}) {
  const L = locale;
  stdout.write(`\n  ${line(L, "guide.title")}\n`);
  stdout.write(`  ${RULE}\n`);
  stdout.write("  [Deprecated] Manually creating a Google Cloud OAuth client is no longer required.\n");
  stdout.write("  Please install the official Antigravity application and run `npm run login` instead.\n");
  stdout.write(`  ${RULE}\n\n`);
  return undefined;
}
