/**
 * agy-next — a from-scratch Antigravity / Cloud Code Assist provider for
 * DeepSeek Harness.
 *
 * Written against the host contracts in `@deepseek-ai/dsh-llm` and the public
 * Cloud Code Assist protocol. No code is copied from the upstream
 * `dsh-antigravity` plugin.
 *
 * Local, personal use only: the OAuth client identifier belongs to Google's own
 * Antigravity desktop app, and Google's Terms of Service forbid third-party
 * software from using it.
 */

import {
  EMPTY_RESPONSE_CODE,
  LlmAdapter,
  LlmError,
  ReasoningEffortId,
  attributionHeaders,
} from "@deepseek-ai/dsh-llm";
import { idleWatchdog, timeoutOf } from "@deepseek-ai/dsh-timeout";

import {
  DEPRECATION_PATTERN,
  ENDPOINTS,
  GONE_RUNTIME_MODELS,
  MODELS,
  PROVIDER,
  PROVIDER_NAME,
  RETRYABLE_STATUS,
  RUNTIME_MAX_TOKENS,
  ROUTING,
  STREAM_IDLE_TIMEOUT_MS,
} from "./constants.js";
import {
  antigravityHeaders,
  classifyError,
  friendlyError,
  loadCodeAssist,
  redactSecrets,
} from "./client.js";
import { buildRequestBody } from "./convert.js";
import { Config, resolveConfig } from "./config.js";
import { CredentialStore, needsRefresh } from "./store.js";
import { refreshAccessToken } from "./oauth.js";
import { createStreamState, streamResponseToChunks } from "./stream.js";
import { resolveOAuthClient, oauthClientStatus } from "./status.js";
import { registerWebApi } from "./web-api.js";

export const name = "agy-next";
export const inject = ["llm"];
export { Config };
export { PROVIDER, PROVIDER_NAME };

const STREAM_IDLE_CODE = "LLM_STREAM_IDLE_TIMEOUT";

/* --------------------------------------------------------------- model plan */

function catalogModel(modelId) {
  return MODELS.find((m) => m.id === modelId);
}

function defaultEffort(model) {
  if (!model?.efforts?.length) return undefined;
  if (model.efforts.includes("medium")) return "medium";
  if (model.efforts.includes("high")) return "high";
  return model.efforts[0];
}

/** catalog id -> concrete backend model id, for one effort level. */
export function runtimeModelFor(modelId, effort) {
  const route = ROUTING[modelId];
  if (!route) return modelId;
  if (effort === undefined || effort === "off") {
    return route.off ?? route.high ?? route.medium ?? route.low ?? modelId;
  }
  return (
    route[effort] ??
    route.high ??
    route.medium ??
    route.low ??
    route.off ??
    modelId
  );
}

/** One lower tier to try when the primary runtime model is unavailable. */
export function fallbackRuntimeModel(runtimeModel, effort) {
  if (GONE_RUNTIME_MODELS.has(runtimeModel)) {
    // The whole 3.7/3.6 family is retired; drop to the current flash tier.
    if (runtimeModel.startsWith("gemini-3.7-flash") || runtimeModel.startsWith("gemini-3.6-flash")) {
      return "gemini-3.8-flash-tiered";
    }
  }
  if (runtimeModel === "gemini-3.8-flash-tiered") {
    return runtimeModelFor("gemini-3-flash", effort);
  }
  if (runtimeModel === "gemini-2.5-pro") {
    return runtimeModelFor("gemini-2.5-flash", effort);
  }
  return undefined;
}

function maxOutputTokens(modelId, runtimeModel) {
  return RUNTIME_MAX_TOKENS[runtimeModel] ?? catalogModel(modelId)?.max ?? 65536;
}

/**
 * Thinking configuration.
 *
 * -tiered models take a discrete `thinkingLevel`; everything else takes a token
 * budget. The budget must stay below maxOutputTokens or the backend rejects the
 * request, so when the caller's ceiling is too low we shrink the budget rather
 * than fail — the alternative is that small maxTokens values are simply unusable
 * for models with a large fixed budget.
 */
export function thinkingConfig(modelId, runtimeModel, effort, maxTokens) {
  if (effort === undefined) return undefined;
  // thinkingBudget: 0 is rejected by the backend (HTTP 400 "Request contains an
  // invalid argument"); omitting the budget is what disables thinking.
  if (effort === "off") return { includeThoughts: false };

  if (runtimeModel.endsWith("-tiered")) {
    return {
      includeThoughts: true,
      thinkingLevel: effort === "high" || effort === "xhigh" ? "HIGH" : effort === "medium" ? "MEDIUM" : "LOW",
    };
  }

  let budget;
  if (modelId.startsWith("claude-")) budget = 1024;
  else if (modelId.startsWith("gpt-oss-")) budget = 8192;
  else if (modelId.startsWith("gemini-3.1-pro") || runtimeModel === "gemini-pro-agent") {
    budget = effort === "high" || effort === "xhigh" ? 10001 : 1001;
  } else if (modelId.startsWith("gemini-3.5-flash") || runtimeModel === "gemini-3-flash-agent") {
    budget = effort === "high" || effort === "xhigh" ? 10000 : effort === "medium" ? 4000 : 1000;
  } else {
    budget = effort === "high" || effort === "xhigh" ? -1 : effort === "medium" ? 4000 : 1000;
  }

  // A negative budget means "dynamic"; it needs no headroom.
  if (budget > 0 && maxTokens !== undefined && maxTokens <= budget) {
    const shrunk = Math.max(1, Math.floor(maxTokens / 2));
    if (shrunk >= maxTokens) {
      throw new LlmError(
        `A maxTokens of ${maxTokens} leaves no room for a thinking budget on ${modelId}/${effort}; ` +
          `raise maxTokens above ${budget} or turn reasoning off.`,
        "INVALID_REQUEST",
      );
    }
    budget = shrunk;
  }

  return { includeThoughts: true, thinkingBudget: budget };
}

/** Loopback-only endpoint iteration. */
export function* endpointCandidates() {
  for (const endpoint of ENDPOINTS) yield endpoint;
}

/* ------------------------------------------------------------ credential use */

// Resolution lives in `status.js` so the web API can read it without importing
// this module (this one statically needs `@deepseek-ai/dsh-llm`).
export { resolveOAuthClient, oauthClientStatus } from "./status.js";

export async function resolveCredential(store, { signal, config } = {}) {
  const settings = config ?? resolveConfig();
  let credential = await store.readOrImport();
  if (!credential) {
    throw new LlmError(
      `No Antigravity credentials found. Run: npx agy-next-login\n` +
        `(expected ${await store.path()})`,
      "AUTH",
    );
  }

  if (needsRefresh(credential)) {
    if (!credential.refresh) {
      throw new LlmError("Stored Antigravity credential has no refresh token; log in again.", "AUTH");
    }
    // Resolve the user's own OAuth client here, once, so a missing client
    // produces this plugin's setup message rather than a bare 4xx from Google.
    const client = await resolveOAuthClient(settings);
    const tokens = await refreshAccessToken(credential.refresh, { client });
    credential = {
      ...credential,
      access: tokens.access_token,
      refresh: tokens.refresh_token || credential.refresh,
      expires: Date.now() + tokens.expires_in * 1000 - 5 * 60 * 1000,
    };
    await store.write(credential);
  }

  if (!credential.projectId) {
    const projectId = await loadCodeAssist(credential.access, {
      signal,
      discoveryTimeoutMs: settings.discoveryTimeoutMs,
      projectCacheTtlMs: settings.projectCacheTtlMs,
    });
    if (projectId) {
      credential = { ...credential, projectId };
      await store.write(credential);
    }
  }

  return credential;
}

/* -------------------------------------------------------------- adapter ---- */

export class AntigravityAdapter extends LlmAdapter {
  #store;
  #config;

  constructor(store = new CredentialStore(), config = resolveConfig()) {
    super();
    this.#store = store;
    this.#config = config;
  }

  /** The resolved config this adapter was built with. */
  get config() {
    return this.#config;
  }

  providerInfo(provider) {
    return { id: provider, name: PROVIDER_NAME };
  }

  async listModels(provider) {
    return MODELS.map((model) => this.#describe(provider, model));
  }

  async resolveModel(provider, modelId) {
    const model = catalogModel(modelId);
    if (!model) {
      // The host accepts unlisted ids; describe it generically rather than fail.
      return { provider, id: modelId, name: modelId, context: {}, inputModalities: ["text"] };
    }
    return this.#describe(provider, model);
  }

  #describe(provider, model) {
    const effort = defaultEffort(model);
    return {
      provider,
      id: model.id,
      name: model.name,
      inputModalities: model.inputModalities,
      context: { contextWindow: model.ctx },
      defaultMaxTokens: model.max,
      ...(model.efforts.length
        ? {
            reasoning: {
              efforts: model.efforts.map((level) => ({
                id: ReasoningEffortId(level),
                name: level.charAt(0).toUpperCase() + level.slice(1),
              })),
              ...(effort ? { defaultEffort: ReasoningEffortId(effort) } : {}),
            },
          }
        : {}),
    };
  }

  async *stream(options) {
    const model = catalogModel(options.model);
    if (!model) throw new LlmError(`Unknown Antigravity model "${options.model}"`, "INVALID_REQUEST");

    const consumer = new AbortController();
    const upstream =
      options.signal === undefined
        ? consumer.signal
        : AbortSignal.any([options.signal, consumer.signal]);

    const idleMs = this.#config.streamIdleTimeoutMs;
    const watchdog = idleWatchdog(upstream, idleMs, STREAM_IDLE_CODE);
    const iterator = this.#request(options, model, watchdog.signal)[Symbol.asyncIterator]();

    let exhausted = false;
    try {
      while (true) {
        const result = await watchdog.next(iterator);
        if (timeoutOf(watchdog.signal, STREAM_IDLE_CODE) !== undefined) {
          throw new LlmError(`Antigravity stream idle for ${idleMs}ms`, "TIMEOUT");
        }
        if (result.done) {
          exhausted = true;
          return;
        }
        yield result.value;
      }
    } catch (error) {
      if (timeoutOf(watchdog.signal, STREAM_IDLE_CODE) !== undefined) {
        throw new LlmError(`Antigravity stream idle for ${idleMs}ms`, "TIMEOUT", {
          cause: error,
        });
      }
      if (options.signal?.aborted) {
        throw new LlmError("Antigravity request aborted by caller", "ABORTED", { cause: error });
      }
      throw error;
    } finally {
      consumer.abort("agy-next stream consumer stopped");
      if (!exhausted) {
        try {
          await iterator.return(undefined);
        } catch {
          // Cleanup after cancellation is best-effort.
        }
      }
      watchdog[Symbol.dispose]();
    }
  }

  async *#request(options, model, signal) {
    const credential = await resolveCredential(this.#store, { signal, config: this.#config });
    const effort = this.#resolveEffort(model, options.reasoningEffort);

    const baseRuntime =
      this.#config.runtimeModel?.trim() || runtimeModelFor(model.id, effort);
    const candidates = [baseRuntime];
    const fallback = fallbackRuntimeModel(baseRuntime, effort);
    if (fallback && fallback !== baseRuntime) candidates.push(fallback);

    const headers = {
      ...(await antigravityHeaders(credential.access)),
      ...(model.id.startsWith("claude-") ? { "anthropic-beta": "interleaved-thinking-2025-05-14" } : {}),
    };

    let response;
    let lastText = "";
    let runtimeModel = candidates[0];
    let deprecated = false;

    for (let emptyAttempt = 0; emptyAttempt <= 2; emptyAttempt++) {
      if (signal?.aborted) throw new LlmError("Antigravity request aborted", "ABORTED");
      if (deprecated) break;
      if (emptyAttempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** (emptyAttempt - 1)));
      }

      let response;
      let streamed = false;

      for (let i = 0; i < candidates.length; i++) {
        runtimeModel = candidates[i];
        // The ceiling belongs to the candidate actually being sent.
        const limit = maxOutputTokens(model.id, runtimeModel);
        const requestedMax =
          options.maxTokens !== undefined ? Math.min(options.maxTokens, limit) : Math.min(limit, model.max);
        const thinking = thinkingConfig(model.id, runtimeModel, effort, requestedMax);
        const body = JSON.stringify(
          buildRequestBody(
            { ...options, modelId: model.id, maxTokens: requestedMax },
            credential.projectId,
            runtimeModel,
            thinking,
          ),
        );

        for (const endpoint of endpointCandidates()) {
          response = await this.#post(endpoint, headers, body, signal);
          if (response.ok) break;
          lastText = await response.text();
          // A hard per-account quota is not worth retrying anywhere.
          if (response.status === 429 && /Individual quota reached/i.test(lastText)) break;
          if (!RETRYABLE_STATUS.has(response.status)) break;
        }

        if (response?.ok) {
          // A retired model still answers 200, but with a plain-text notice
          // instead of an event stream. The stream parser must never see it,
          // because it would parse as an empty response.
          const contentType = response.headers.get("content-type") ?? "";
          if (!contentType.includes("text/event-stream")) {
            const bodyText = await response.text();
            lastText = bodyText;
            if (DEPRECATION_PATTERN.test(bodyText)) {
              if (i + 1 < candidates.length) continue;
              deprecated = true;
              break;
            }
            // Not a stream and not a known notice: surface it verbatim.
            break;
          }

          const state = createStreamState();
          for await (const chunk of streamResponseToChunks(response, state, {
            modelId: model.id,
            runtimeModel,
          })) {
            yield chunk;
          }
          if (state.hasContent) return;
          streamed = true;
          break;
        }

        // A retryable failure should drop a tier when a fallback remains.
        const hardQuota = response?.status === 429 && /Individual quota reached/i.test(lastText);
        if (!hardQuota && RETRYABLE_STATUS.has(response?.status) && i + 1 < candidates.length) continue;
        break;
      }

      if (deprecated) break;

      // A response we could not use, with no candidate left, is a hard failure.
      if (!streamed && !response?.ok) {
        const friendly = friendlyError(response?.status, lastText);
        throw new LlmError(
          `Antigravity API error (${response?.status ?? "no response"}): ${redactSecrets(friendly)}`,
          classifyError(friendly),
        );
      }
      if (!streamed && response?.ok && !DEPRECATION_PATTERN.test(lastText)) {
        throw new LlmError(
          `Antigravity returned an unusable response: ${redactSecrets(lastText.trim().slice(0, 200))}`,
          "TRANSPORT",
        );
      }
    }

    if (deprecated) {
      throw new LlmError(
        `Antigravity model "${model.id}" is no longer served (backend reports: ${redactSecrets(
          lastText.trim().slice(0, 200),
        )}). Pick a different model.`,
        "INVALID_REQUEST",
      );
    }

    throw new LlmError("Antigravity returned an empty response", EMPTY_RESPONSE_CODE);
  }

  #resolveEffort(model, requested) {
    if (requested === undefined) return defaultEffort(model);
    if (requested === "off") return "off";
    if (model.efforts.includes(requested)) return requested;
    if (model.efforts.includes("high")) return "high";
    return defaultEffort(model);
  }

  async #post(endpoint, headers, body, signal) {
    try {
      return await fetch(`${endpoint}/v1internal:streamGenerateContent?alt=sse`, {
        method: "POST",
        headers,
        body,
        signal,
      });
    } catch (error) {
      // Represent a transport failure as a synthetic response so the retry loop
      // can move to the next endpoint.
      return new Response(`transport error: ${error?.message ?? error}`, { status: 503 });
    }
  }
}

/* ------------------------------------------------------------------- apply */

/**
 * Register the Antigravity provider.
 *
 * Note the export *shape*: `name`, `inject` and `Config` are named exports and
 * there is deliberately NO `export default`. The loader's `unwrapExports`
 * collapses a module namespace to `exports.default ?? exports`, so a default
 * export would replace the whole namespace with that one value — hiding `name`
 * (Cordis then discards the literal `"apply"` as a display name) and hiding
 * `Config` (Cordis skips validation entirely, because `resolveConfig` returns
 * the raw object when `runtime.Config` is falsy). Named-only is the shape the
 * official provider plugins use.
 */
export function apply(ctx, config) {
  const resolved = resolveConfig(config);
  const store = new CredentialStore(resolved.credentialPath || undefined);
  const adapter = new AntigravityAdapter(store, resolved);

  ctx.llm.registerAdapter([PROVIDER], adapter);
  ctx.logger?.info?.(
    `agy-next: registered provider "${PROVIDER}" (${MODELS.length} models, idle ${resolved.streamIdleTimeoutMs}ms)`,
  );

  // Warn (do not fail) when no OAuth client is configured. Registration must
  // still succeed so the plugin loads and the model list appears; the failure is
  // raised only when a login/refresh is actually attempted, where it can carry
  // the setup instructions.
  void oauthClientStatus(resolved).then((status) => {
    if (status.configured) return;
    ctx.logger?.warn?.(
      `agy-next: no OAuth client configured (${status.path}). ` +
        `Login and token refresh will fail until you supply your own — see SETUP.md.`,
    );
  });

  // The settings page reads and drives everything through these same-origin
  // routes; see web-api.js for the contract.
  registerWebApi(ctx, { store, settings: resolved, provider: PROVIDER });

  // Nothing is returned on purpose. Registration through `ctx.llm` is
  // effect-scoped: the host disposes it when this fiber unloads, so no manual
  // teardown is needed. A returned cleanup would be discarded anyway — for a
  // function-form plugin Cordis calls `new callback(ctx, config)` and keeps only
  // `instance[symbols.init]()`, so the return value never reaches the collector.
  // This matches the official provider plugins, which return nothing.
}

/** Re-exported for the smoke test and for programmatic use. */
export { CredentialStore, buildRequestBody };
export { antigravityHeaders, loadCodeAssist, extractProjectId } from "./client.js";
