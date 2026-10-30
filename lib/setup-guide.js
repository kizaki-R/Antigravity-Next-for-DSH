/**
 * @deprecated Legacy custom OAuth walkthrough.
 * agy-next now automatically resolves the OAuth client from the locally installed
 * official Antigravity application. Manual Google Cloud OAuth client creation is
 * deprecated and ignored by the plugin runtime.
 *
 * Kept for backward compatibility with external references and exports.
 */

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

import { pickLocale, t } from "./i18n.js";
import { openBrowser } from "./oauth.js";
import { readProgress, markStepDone } from "./setup-state.js";

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
  const rl = createInterface({ input: stdin, output: stdout });
  const prompt = ask ?? ((q) => rl.question(q));

  const finished = resume ? new Set((await readProgress()).done) : new Set();

  try {
    stdout.write(`\n  ${line(L, "guide.title")}\n`);
    stdout.write(`  ${RULE}\n`);
    for (const l of line(L, "guide.intro")) stdout.write(`  ${l}\n`);
    stdout.write(`  ${RULE}\n\n`);
    if (finished.size > 0) {
      stdout.write(`  ${line(L, "guide.resumed", { n: finished.size })}\n\n`);
    }
    stdout.write(`  ${line(L, "guide.continue")}\n`);

    const total = SETUP_STEPS.length + 1;

    // Walk the steps. `o` opens the page, Enter advances, `q` quits.
    for (let i = 0; i < SETUP_STEPS.length; i += 1) {
      const step = SETUP_STEPS[i];
      const n = i + 1;

      if (finished.has(step.key)) {
        stdout.write(`\n  ${line(L, "guide.stepSkipped", { n, title: line(L, `guide.${step.key}.title`) })}\n`);
        continue;
      }

      stdout.write(`\n  ${RULE}\n`);
      stdout.write(`  ${line(L, "guide.stepLabel", { n, total })}  ${line(L, `guide.${step.key}.title`)}\n`);
      stdout.write(`  ${RULE}\n\n`);
      stdout.write(`  ${line(L, "guide.openPage")}\n`);
      stdout.write(`    ${step.url}\n\n`);
      for (const l of line(L, `guide.${step.key}.lines`)) {
        // Empty strings are paragraph breaks, not bullets.
        stdout.write(l.trim() === "" ? "\n" : `  ▸ ${l}\n`);
      }
      if (step.optional) stdout.write(`\n  ${line(L, "guide.optionalStep")}\n`);

      // `o` opens the page and asks again for the same step, so the loop stays
      // on one step until the user actually advances it.
      let action;
      for (;;) {
        action = await prompt(`\n  ${line(L, "guide.prompt")} `);
        const a = action.trim().toLowerCase();
        if (a === "q") return undefined;
        if (a === "o") {
          openBrowser(step.url);
          stdout.write(`  ${line(L, "guide.opened")}\n`);
          continue;
        }
        break;
      }
      await markStepDone(step.key);
    }

    // Final step: collect the pair.
    stdout.write(`\n  ${RULE}\n`);
    stdout.write(`  ${line(L, "guide.stepLabel", { n: total, total })}  ${line(L, "guide.paste.title")}\n`);
    stdout.write(`  ${RULE}\n\n`);
    for (const l of line(L, "guide.paste.lines")) stdout.write(`  ${l}\n`);
    stdout.write("\n");

    for (;;) {
      const clientId = (await prompt(`  ${line(L, "guide.paste.clientId")} `)).trim();
      if (!clientId) {
        stdout.write(`  ${line(L, "guide.paste.required")}\n`);
        continue;
      }
      if (!clientId.endsWith(".apps.googleusercontent.com")) {
        stdout.write(`  ${line(L, "guide.paste.badClientId")}\n`);
        continue;
      }

      const clientSecret = (await prompt(`  ${line(L, "guide.paste.clientSecret")} `)).trim();
      if (!clientSecret) {
        stdout.write(`  ${line(L, "guide.paste.required")}\n`);
        continue;
      }
      if (!clientSecret.startsWith("GOCSPX-")) {
        stdout.write(`  ${line(L, "guide.paste.badClientSecret")}\n`);
        continue;
      }

      stdout.write(`\n  ${line(L, "guide.paste.ok")}\n`);
      return { clientId, clientSecret };
    }
  } finally {
    rl.close();
  }
}
