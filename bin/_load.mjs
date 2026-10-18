/**
 * Shared loader for scripts that need `lib/index.js`.
 *
 * `lib/index.js` is a DSH host module: it imports `@deepseek-ai/dsh-llm`,
 * `dsh-timeout`, `schemastery` and friends, which only resolve inside an
 * installed application (or a checkout that has them in node_modules). When one
 * of these scripts is run straight from a source tree, a static import would
 * abort with a bare `ERR_MODULE_NOT_FOUND` stack that says nothing about why or
 * what to do instead.
 *
 * So every such script imports this instead and gets a short, accurate
 * explanation with the right exit code. The peers genuinely cannot be faked --
 * the adapter extends the host's real base class -- so failing loudly is the
 * correct behaviour; the fix is only in how it is reported.
 */

const HINT = [
  "Cannot run this from here: lib/index.js imports the host-provided peers",
  "(@deepseek-ai/dsh-llm, dsh-timeout, schemastery, ...) and none of them",
  "resolves from this directory.",
  "",
  "Run it where the plugin actually lives -- from an installed DSH profile:",
  "",
  "    cd <profile>/node_modules/agy-next && npm run <script>",
  "",
  "NODE_PATH does not help; the ESM resolver ignores it.",
].join("\n");

/** Import `../lib/index.js`, or explain the environment problem and exit(2). */
export async function loadPlugin() {
  try {
    return await import("../lib/index.js");
  } catch (error) {
    if (String(error?.code) !== "ERR_MODULE_NOT_FOUND") throw error;
    console.error(`${HINT}\n\nUnderlying error: ${error.message}`);
    process.exit(2);
  }
}
