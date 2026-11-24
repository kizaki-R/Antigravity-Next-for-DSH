/**
 * DSH LlmAdapter skeleton for the official ACP route.
 *
 * Not registered in `lib/index.js` yet. The standalone login test does not
 * import this file, because `@deepseek-ai/dsh-llm` exists only inside DSH.
 *
 * This route does not read `~/.gemini/antigravity-acp/` and does not carry
 * an OAuth client id. Login is `authenticate` against the official server.
 */

import { LlmAdapter, LlmError } from "@deepseek-ai/dsh-llm";

import { AcpConnection, AcpError, DshTextMapper, pickAuthMethod, type DshChunk } from "./connection.ts";
import { AcpRuntime, antigravityAcpDirectory } from "./runtime.ts";

export const ACP_PROVIDER_ID = "agy-next-acp";
export const ACP_PROVIDER_NAME = "Antigravity Next (ACP)";

interface StreamOptions {
  provider?: string;
  model?: string;
  messages?: unknown;
  system?: unknown;
  signal?: AbortSignal;
}

export class AntigravityAcpAdapter extends LlmAdapter {
  providerInfo(provider: string) {
    return { id: provider, name: ACP_PROVIDER_NAME };
  }

  async listModels(provider: string) {
    return this.#withSession(async (connection, session) =>
      session.models.map((model) => ({
        provider,
        id: model.id,
        name: model.name,
        inputModalities: ["text"],
        context: {},
      })),
    );
  }

  async resolveModel(provider: string, modelId: string) {
    return {
      provider,
      id: modelId,
      name: modelId,
      inputModalities: ["text"],
      context: {},
    };
  }

  async *stream(options: StreamOptions): AsyncGenerator<DshChunk> {
    const model = options.model || "acp-current";
    const prompt = transcriptText(options);
    if (!prompt.trim()) {
      throw new LlmError("ACP prompt is empty", "INVALID_REQUEST");
    }

    const { connection, session } = await this.#open(process.cwd());
    const mapper = new DshTextMapper();
    const queue: DshChunk[] = [];
    let wake: (() => void) | undefined;
    const unsubscribe = connection.subscribeUpdates((params) => {
      queue.push(...mapper.push(params));
      wake?.();
      wake = undefined;
    });

    try {
      const pending = connection.prompt(session.sessionId, prompt, 10 * 60_000, options.signal);
      let result: Awaited<ReturnType<AcpConnection["prompt"]>> | undefined;
      while (result === undefined || queue.length > 0) {
        if (queue.length > 0) {
          yield queue.shift() as DshChunk;
          continue;
        }
        result = await Promise.race([
          pending,
          new Promise<undefined>((resolve) => {
            wake = () => resolve(undefined);
          }),
        ]);
      }
      if (result.usage) {
        yield { type: "usage", usage: result.usage };
      }
      yield* mapper.finish(result.stopReason, { provider: options.provider || ACP_PROVIDER_ID, model });
    } catch (error) {
      throw toLlmError(error);
    } finally {
      unsubscribe();
      await connection.close().catch(() => undefined);
    }
  }

  async #withSession<T>(use: (connection: AcpConnection, session: Awaited<ReturnType<AcpConnection["newSession"]>>) => T | Promise<T>): Promise<T> {
    const opened = await this.#open(process.cwd());
    try {
      return await use(opened.connection, opened.session);
    } catch (error) {
      throw toLlmError(error);
    } finally {
      await opened.connection.close().catch(() => undefined);
    }
  }

  /** initialize → authenticate (if the server advertised a method) → session/new. */
  async #open(cwd: string) {
    const connection = new AcpConnection(new AcpRuntime({ cwd }));
    try {
      const initialized = await connection.initialize();
      const method = pickAuthMethod(initialized.authMethods);
      if (method) await connection.authenticate(method.id);
      const session = await connection.newSession(cwd);
      return { connection, session };
    } catch (error) {
      await connection.close().catch(() => undefined);
      throw error;
    }
  }
}

function transcriptText(options: StreamOptions): string {
  const parts: string[] = [];
  const system = textOf(options.system);
  if (system) parts.push(system);
  if (Array.isArray(options.messages)) {
    for (const message of options.messages) {
      if (!message || typeof message !== "object") continue;
      const role = "role" in message && typeof message.role === "string" ? message.role : "user";
      if (role === "tool") continue;
      const text = textOf("content" in message ? message.content : undefined);
      if (text) parts.push(text);
    }
  }
  return parts.join("\n\n");
}

function textOf(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((block) => {
      if (typeof block === "string") return block;
      if (!block || typeof block !== "object" || !("type" in block)) return "";
      if (block.type === "text" && "text" in block && typeof block.text === "string") return block.text;
      return "";
    })
    .filter(Boolean)
    .join("");
}

function toLlmError(error: unknown): LlmError {
  if (error instanceof LlmError) return error;
  if (error instanceof AcpError) {
    const code = error.phase === "timeout"
      ? "TIMEOUT"
      : error.phase === "aborted"
        ? "ABORTED"
        : error.phase === "auth"
          ? "UNAUTHENTICATED"
          : "UPSTREAM_ERROR";
    const hint = error.phase === "auth"
      ? ` Sign in with the official ACP server. Tokens stay in ${antigravityAcpDirectory()} and are not read by agy-next.`
      : "";
    return new LlmError(`${error.message}${hint}`, code, { cause: error });
  }
  const message = error instanceof Error ? error.message : String(error);
  return new LlmError(message, "UPSTREAM_ERROR", { cause: error });
}
