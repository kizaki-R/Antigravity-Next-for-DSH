/**
 * One-time setup walkthrough: the five steps that produce a personal
 * Google OAuth client.
 *
 * Kept apart from login.mjs so the copy can be edited, translated, or updated
 * when Google moves a page without touching the login flow.
 *
 * Every step carries the direct URL for the page it describes. The point of the
 * walkthrough is not to explain OAuth — it is to remove the search for the next
 * page, which is where people abandon the process.
 */

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

import { pickLocale, t } from "./i18n.js";
import { openBrowser } from "./oauth.js";

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
    url: "https://console.cloud.google.com/apis/library/cloudcode-pa.googleapis.com",
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
 * @param {{ locale?: string, ask?: (prompt: string) => Promise<string> }} options
 * @returns {Promise<{ clientId: string, clientSecret: string } | undefined>}
 *          undefined when the user quits.
 */
export async function runSetupGuide({ locale = pickLocale(), ask } = {}) {
  const L = locale;
  const rl = createInterface({ input: stdin, output: stdout });
  const prompt = ask ?? ((q) => rl.question(q));

  try {
    stdout.write(`\n  ${line(L, "guide.title")}\n`);
    stdout.write(`  ${RULE}\n`);
    for (const l of line(L, "guide.intro")) stdout.write(`  ${l}\n`);
    stdout.write(`  ${RULE}\n\n`);
    stdout.write(`  ${line(L, "guide.continue")}\n`);

    const total = SETUP_STEPS.length + 1;

    // Walk the steps. `o` opens the page, Enter advances, `q` quits.
    for (let i = 0; i < SETUP_STEPS.length; i += 1) {
      const step = SETUP_STEPS[i];
      const n = i + 1;
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

      const action = await prompt(`\n  ${line(L, "guide.prompt")} `);
      const a = action.trim().toLowerCase();
      if (a === "q") return undefined;
      if (a === "o") {
        openBrowser(step.url);
        stdout.write(`  ${line(L, "guide.opened")}\n`);
      }
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
