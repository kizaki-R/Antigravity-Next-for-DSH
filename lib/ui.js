window.__ModuleLoader__.load({
  id: "agy-next",
  factory(require) {
    const React = require("react");
    const h = React.createElement;

    const API = "/agy-next/api";
    const NS = "agy-next";
    const STYLE_ID = "agy-next-settings-style";

    /* ------------------------------------------------------------------ copy */

    const COPY = {
      en: {
        nav: "AGY-Next",
        title: "Antigravity Next",
        subtitle: "OAuth client, sign-in state, scopes and the model roster this provider exposes.",
        refresh: "Refresh",
        refreshing: "Refreshing…",
        login: "Sign in",
        loggingIn: "Waiting for approval…",
        logout: "Sign out",
        reauth: "Sign in again",
        clientSection: "OAuth client",
        accountSection: "Sign-in",
        scopesSection: "Requested scopes",
        modelsSection: "Models",
        clientOk: "Configured",
        clientMissing: "Not configured",
        clientError: "Unreadable",
        srcConfig: "plugin config",
        srcEnv: "environment",
        srcFile: "file",
        hintMissing:
          "No OAuth client yet. Run npx agy-next-login in a terminal, or see SETUP.md — it walks you through the three minutes in Google Cloud Console.",
        accountOk: "Signed in",
        accountMissing: "Not signed in",
        accountExpired: "Access token expired; it refreshes on the next request.",
        expiresIn: "Expires in {time}",
        expiresSoon: "Expires in under a minute",
        project: "Project",
        unknown: "unknown",
        scopesCount: "{n} scopes",
        modelsCount: "{n} models",
        waiting: "A browser window should have opened. Approve access there; this page updates by itself.",
        openAgain: "Open the sign-in page again",
        errorGeneric: "Something went wrong: {message}",
        loginNoClient: "Add an OAuth client first.",
        accountPath: "Credential",
        clientPath: "Client file",
      },
      "zh-Hant": {
        nav: "AGY-Next",
        title: "Antigravity Next",
        subtitle: "OAuth 用戶端、登入狀態、權限範圍，以及這個 provider 提供的模型。",
        refresh: "重新整理",
        refreshing: "整理中…",
        login: "登入",
        loggingIn: "等待授權中…",
        logout: "登出",
        reauth: "重新登入",
        clientSection: "OAuth 用戶端",
        accountSection: "登入狀態",
        scopesSection: "要求的權限",
        modelsSection: "模型",
        clientOk: "已設定",
        clientMissing: "尚未設定",
        clientError: "無法讀取",
        srcConfig: "外掛設定",
        srcEnv: "環境變數",
        srcFile: "檔案",
        hintMissing:
          "還沒有 OAuth 用戶端。在終端機執行 npx agy-next-login，或看 SETUP.md——它會帶你走完 Google Cloud Console 那三分鐘。",
        accountOk: "已登入",
        accountMissing: "尚未登入",
        accountExpired: "存取權杖已過期，下次請求時會自動更新。",
        expiresIn: "{time} 後到期",
        expiresSoon: "不到一分鐘後到期",
        project: "專案",
        unknown: "未知",
        scopesCount: "{n} 項權限",
        modelsCount: "{n} 個模型",
        waiting: "瀏覽器應該已經開啟。在那裡按下同意，這一頁會自己更新。",
        openAgain: "再開一次登入頁",
        errorGeneric: "發生錯誤：{message}",
        loginNoClient: "請先設定 OAuth 用戶端。",
        accountPath: "憑證",
        clientPath: "用戶端設定檔",
      },
      // Simplified Chinese lives in the `zh` slot because that is the one locale
      // id dsh ships for it (`LOCALE_IDS = ["zh", "en"]`); a dictionary that
      // omits `zh` makes every Simplified reader fall through to English.
      zh: {
        nav: "AGY-Next",
        title: "Antigravity Next",
        subtitle: "OAuth 客户端、登录状态、权限范围，以及这个 provider 提供的模型。",
        refresh: "刷新",
        refreshing: "刷新中…",
        login: "登录",
        loggingIn: "等待授权中…",
        logout: "登出",
        reauth: "重新登录",
        clientSection: "OAuth 客户端",
        accountSection: "登录状态",
        scopesSection: "请求的权限",
        modelsSection: "模型",
        clientOk: "已设置",
        clientMissing: "尚未设置",
        clientError: "无法读取",
        srcConfig: "插件设置",
        srcEnv: "环境变量",
        srcFile: "文件",
        hintMissing:
          "还没有 OAuth 客户端。在终端运行 npx agy-next-login，或看 SETUP.md——它会带你走完 Google Cloud Console 那三分钟。",
        accountOk: "已登录",
        accountMissing: "尚未登录",
        accountExpired: "访问令牌已过期，下次请求时会自动更新。",
        expiresIn: "{time} 后到期",
        expiresSoon: "不到一分钟后到期",
        project: "项目",
        unknown: "未知",
        scopesCount: "{n} 项权限",
        modelsCount: "{n} 个模型",
        waiting: "浏览器应该已经打开。在那里点击同意，这一页会自己更新。",
        openAgain: "再打开一次登录页",
        errorGeneric: "发生错误：{message}",
        loginNoClient: "请先设置 OAuth 客户端。",
        accountPath: "凭据",
        clientPath: "客户端配置文件",
      },
    };

    // The active language id, as the host reports it. `getLocale()` is the real
    // read (`LocaleRuntime.getLocale` returns `{ active, locales, revision }`);
    // there is no `current()`/`get()`/`tag` member, so guessing at those names
    // silently yields "" and the page falls back to the browser language.
    function activeLocale(ctx) {
      try {
        const snapshot = ctx?.locale?.getLocale?.();
        if (snapshot && typeof snapshot.active === "string") return snapshot.active;
      } catch {
        /* fall through to the browser language */
      }
      return "";
    }

    // Map whatever the host is running to one of the dictionaries below. Both
    // `zh` and `en` are dsh's own ids; `zh-Hant` is a language pack this plugin
    // registers, so a Traditional reader only gets it once `zh` is also present
    // to serve as its fallback.
    function pickLocale(ctx) {
      let tag = activeLocale(ctx);
      if (!tag && typeof navigator !== "undefined") tag = navigator.language || "";
      const low = String(tag).toLowerCase();
      if (!low.startsWith("zh")) return "en";
      if (/hant|-tw|-hk|-mo/.test(low)) return "zh-Hant";
      return "zh";
    }

    function translator(locale) {
      const table = COPY[locale] ?? COPY.en;
      const lookup = (obj, key) =>
        key.split(".").reduce((node, part) => (node == null ? undefined : node[part]), obj);
      return (key, vars) => {
        const text = String(lookup(table, key) ?? lookup(COPY.en, key) ?? key);
        return vars
          ? text.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m))
          : text;
      };
    }

    /* ----------------------------------------------------------------- style */

    function installStyle() {
      if (document.getElementById(STYLE_ID)) return;
      const style = document.createElement("style");
      style.id = STYLE_ID;
      // Theme alias tokens only, so light/dark switching is inherited rather than
      // hard-coded. The two literal colours are status tints, not layout colours.
      style.textContent = `
        .agyn-page { display: flex; flex-direction: column; gap: 16px; padding: 4px 2px 8px; }
        .agyn-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
        .agyn-h2 { margin: 0; font-size: 20px; font-weight: 700; line-height: 28px; color: var(--dsw-alias-text-primary); }
        .agyn-sub { margin: 4px 0 0; font-size: 13px; line-height: 20px; color: var(--dsw-alias-text-secondary); }
        .agyn-card { border: 1px solid var(--dsw-alias-border-secondary); border-radius: 12px; padding: 14px 16px; background: var(--dsw-alias-bg-elevated); }
        .agyn-card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
        .agyn-card-title { margin: 0; font-size: 14px; font-weight: 700; color: var(--dsw-alias-text-primary); }
        .agyn-row { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; padding: 5px 0; font-size: 13px; line-height: 20px; }
        .agyn-k { color: var(--dsw-alias-text-secondary); flex: 0 0 auto; }
        .agyn-v { color: var(--dsw-alias-text-primary); text-align: right; word-break: break-all; }
        .agyn-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; }
        .agyn-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
        .agyn-ok { background: #2f9e44; }
        .agyn-off { background: #c92a2a; }
        .agyn-warn { background: #e8590c; }
        .agyn-btn { appearance: none; border: 1px solid var(--dsw-alias-border-secondary); background: var(--dsw-alias-bg-elevated); color: var(--dsw-alias-text-primary); border-radius: 8px; padding: 6px 12px; font-size: 13px; line-height: 18px; cursor: pointer; }
        .agyn-btn:hover:not(:disabled) { background: var(--dsw-alias-bg-secondary); }
        .agyn-btn:disabled { opacity: .55; cursor: default; }
        .agyn-btn-primary { background: var(--dsw-alias-fill-primary, #111827); color: var(--dsw-alias-text-inverse, #ffffff); border-color: transparent; }
        .agyn-note { margin: 8px 0 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-text-secondary); }
        .agyn-warnnote { color: #e8590c; }
        .agyn-tag { display: inline-block; padding: 0 6px; border-radius: 6px; border: 1px solid var(--dsw-alias-border-secondary); font-size: 11px; line-height: 18px; color: var(--dsw-alias-text-secondary); }
        .agyn-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
        .agyn-empty { font-size: 13px; color: var(--dsw-alias-text-secondary); }
        .agyn-actions { display: flex; gap: 8px; }
      `;
      document.head.appendChild(style);
    }

    /* ------------------------------------------------------------------- api */

    async function callApi(pathname, method = "GET") {
      const res = await fetch(`${API}/${pathname}`, {
        method,
        headers: method === "POST" ? { "content-type": "application/json" } : undefined,
        body: method === "POST" ? "{}" : undefined,
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`HTTP ${res.status}`);
      }
      if (!data.ok) {
        const error = new Error(data.message || data.error || `HTTP ${res.status}`);
        error.code = data.error;
        throw error;
      }
      return data.value;
    }

    /* ------------------------------------------------------------------ view */

    function formatExpiry(ms, t) {
      if (ms === null || ms === undefined) return t("unknown");
      if (ms <= 0) return t("expiresSoon");
      const totalMinutes = Math.floor(ms / 60000);
      if (totalMinutes < 1) return t("expiresSoon");
      const days = Math.floor(totalMinutes / 1440);
      const hours = Math.floor((totalMinutes % 1440) / 60);
      const minutes = totalMinutes % 60;
      const parts = [];
      if (days) parts.push(`${days}d`);
      if (hours) parts.push(`${hours}h`);
      if (!days && minutes) parts.push(`${minutes}m`);
      return t("expiresIn", { time: parts.join(" ") });
    }

    function Row({ label, value, mono }) {
      return h(
        "div",
        { className: "agyn-row" },
        h("span", { className: "agyn-k" }, label),
        h("span", { className: `agyn-v${mono ? " agyn-mono" : ""}` }, value),
      );
    }

    function Dot({ state }) {
      return h("span", { className: `agyn-dot agyn-${state}` });
    }

    function SettingsPage({ ctx, t: hostT }) {
      const localT = React.useMemo(() => translator(pickLocale(ctx)), [ctx, hostT]);
      // The host's bound translator is authoritative (it re-renders on a locale
      // switch); the local one only covers a kernel that does not bind one.
      const t = typeof hostT === "function" ? hostT : localT;
      const [status, setStatus] = React.useState(null);
      const [busy, setBusy] = React.useState("");
      const [message, setMessage] = React.useState(null);

      const load = React.useCallback(async () => {
        try {
          setStatus(await callApi("status"));
        } catch (error) {
          setMessage({ kind: "error", text: t("errorGeneric", { message: error.message }) });
        }
      }, [t]);

      const pendingAuthUrl = status?.pending?.authUrl ?? null;

      // Poll faster while an approval is outstanding so the page reflects it
      // without the user pressing anything.
      React.useEffect(() => {
        let alive = true;
        load();
        const timer = window.setInterval(() => {
          if (alive) load();
        }, pendingAuthUrl ? 2000 : 15000);
        return () => {
          alive = false;
          window.clearInterval(timer);
        };
      }, [load, pendingAuthUrl]);

      const act = async (name, pathname) => {
        setBusy(name);
        setMessage(null);
        try {
          const value = await callApi(pathname, "POST");
          if (pathname === "login" && value?.authUrl) {
            setMessage({ kind: "info", text: t("waiting"), authUrl: value.authUrl });
            window.open(value.authUrl, "_blank", "noopener");
          }
          await load();
        } catch (error) {
          setMessage({
            kind: "error",
            text:
              error.code === "client_not_configured"
                ? t("loginNoClient")
                : t("errorGeneric", { message: error.message }),
          });
        } finally {
          setBusy("");
        }
      };

      if (!status) {
        return h("div", { className: "agyn-page" }, h("p", { className: "agyn-empty" }, t("refreshing")));
      }

      const client = status.client ?? {};
      const cred = status.credential ?? {};
      const clientState = client.configured ? "ok" : client.error ? "warn" : "off";
      const accountState = cred.present ? (cred.stale ? "warn" : "ok") : "off";
      const sourceLabel =
        client.source === "config" ? t("srcConfig") : client.source === "env" ? t("srcEnv") : t("srcFile");

      return h(
        "div",
        { className: "agyn-page" },

        h(
          "div",
          { className: "agyn-head" },
          h(
            "div",
            null,
            h("h2", { className: "agyn-h2" }, t("title")),
            h("p", { className: "agyn-sub" }, t("subtitle")),
          ),
          h(
            "div",
            { className: "agyn-actions" },
            h(
              "button",
              { className: "agyn-btn", onClick: () => load(), disabled: Boolean(busy) },
              t("refresh"),
            ),
            cred.present
              ? h(
                  "button",
                  { className: "agyn-btn", onClick: () => act("reauth", "login"), disabled: Boolean(busy) },
                  busy === "reauth" ? t("loggingIn") : t("reauth"),
                )
              : h(
                  "button",
                  {
                    className: "agyn-btn agyn-btn-primary",
                    onClick: () => act("login", "login"),
                    disabled: Boolean(busy) || !client.configured,
                  },
                  busy === "login" ? t("loggingIn") : t("login"),
                ),
          ),
        ),

        message &&
          h(
            "p",
            { className: `agyn-note${message.kind === "error" ? " agyn-warnnote" : ""}` },
            message.text,
            message.authUrl ? " " : "",
            message.authUrl
              ? h("a", { href: message.authUrl, target: "_blank", rel: "noopener noreferrer" }, t("openAgain"))
              : null,
          ),

        h(
          "section",
          { className: "agyn-card" },
          h(
            "div",
            { className: "agyn-card-head" },
            h("h3", { className: "agyn-card-title" }, t("clientSection")),
            h(
              "span",
              { className: "agyn-v" },
              h(Dot, { state: clientState }),
              client.configured ? t("clientOk") : client.error ? t("clientError") : t("clientMissing"),
            ),
          ),
          client.configured && h(Row, { label: t("clientPath"), value: sourceLabel }),
          client.clientIdPreview &&
            h(Row, { label: "Client ID", value: client.clientIdPreview, mono: true }),
          h(Row, { label: "Path", value: client.path, mono: true }),
          !client.configured && h("p", { className: "agyn-note agyn-warnnote" }, t("hintMissing")),
        ),

        h(
          "section",
          { className: "agyn-card" },
          h(
            "div",
            { className: "agyn-card-head" },
            h("h3", { className: "agyn-card-title" }, t("accountSection")),
            h(
              "span",
              { className: "agyn-v" },
              h(Dot, { state: accountState }),
              cred.present ? t("accountOk") : t("accountMissing"),
            ),
          ),
          cred.present && h(Row, { label: "Email", value: cred.email ?? t("unknown") }),
          cred.present && h(Row, { label: t("project"), value: cred.projectId ?? t("unknown"), mono: true }),
          cred.present && h(Row, { label: "Token", value: formatExpiry(cred.expiresInMs, t) }),
          cred.present && cred.stale && h("p", { className: "agyn-note agyn-warnnote" }, t("accountExpired")),
          cred.present &&
            h(
              "div",
              { style: { marginTop: 10 } },
              h(
                "button",
                { className: "agyn-btn", onClick: () => act("logout", "logout"), disabled: Boolean(busy) },
                t("logout"),
              ),
            ),
          !cred.present && h("p", { className: "agyn-note" }, t("accountMissing")),
        ),

        h(
          "section",
          { className: "agyn-card" },
          h(
            "div",
            { className: "agyn-card-head" },
            h("h3", { className: "agyn-card-title" }, t("scopesSection")),
            h("span", { className: "agyn-v" }, t("scopesCount", { n: status.scopes.length })),
          ),
          h(
            "div",
            { className: "agyn-list" },
            status.scopes.map((scope) =>
              h("span", { key: scope, className: "agyn-tag agyn-mono" }, scope.split("/auth/")[1] ?? scope),
            ),
          ),
        ),

        h(
          "section",
          { className: "agyn-card" },
          h(
            "div",
            { className: "agyn-card-head" },
            h("h3", { className: "agyn-card-title" }, t("modelsSection")),
            h("span", { className: "agyn-v" }, t("modelsCount", { n: status.models.length })),
          ),
          h(
            "div",
            { className: "agyn-list" },
            status.models.map((model) =>
              h(
                "span",
                { key: model.id, className: "agyn-tag" },
                `${model.name} · ${Math.round(model.ctx / 1024)}K`,
              ),
            ),
          ),
        ),
      );
    }

    /* ----------------------------------------------------------------- apply */

    return {
      // `locale` is required, not optional: apply() registers the copy through it,
      // and touching an uninjected Cordis service fails activation rather than
      // returning undefined.
      inject: ["slots", "locale"],
      apply(ctx) {
        installStyle();
        // The style element is a resource this plugin owns, so its removal is
        // registered as an effect rather than left behind on unload.
        ctx.effect(
          () => () => {
            const style = document.getElementById(STYLE_ID);
            if (style?.parentNode) style.parentNode.removeChild(style);
          },
          "agy-next: settings style",
        );

        // dsh ships exactly two locale ids, `zh` (Simplified) and `en`, so a
        // Traditional dictionary has no id to live under until this plugin
        // declares one. addLanguage puts 繁體中文 into the Settings language
        // list; its fallback is `zh` rather than `en` on purpose, so a key this
        // plugin has not translated yet renders in Simplified instead of
        // dropping to English. Dictionary and definition may arrive in either
        // order.
        //
        // Both calls are guarded: another plugin may already own the id, and a
        // throw here would fail activation for the whole plugin — the same
        // failure mode as touching an uninjected service.
        for (const [label, setup] of [
          [
            "agy-next: zh-Hant language",
            () => ctx.locale?.addLanguage?.({ id: "zh-Hant", label: "繁體中文", fallback: "zh" }),
          ],
          ["agy-next: dictionaries", () => ctx.locale?.register?.(NS, COPY)],
        ]) {
          try {
            const dispose = setup();
            if (typeof dispose === "function") ctx.effect(() => dispose, label);
          } catch (error) {
            console.warn(`agy-next: ${label} skipped —`, error);
          }
        }

        // Host-bound translator for the section label and for the page, so a
        // locale switch re-renders instead of waiting for a reload.
        const t =
          typeof ctx.locale?.bind === "function"
            ? ctx.locale.bind(NS)
            : translator(pickLocale(ctx));

        ctx.slots.inject("settings.section", () =>
          ctx.slots.register(
            {
              name: "settings.section",
              id: "agy-next",
              order: 13,
              label: () => t("nav"),
              locale: NS,
              inject: () => ({ t }),
            },
            (props) => h(SettingsPage, { ...props, ctx }),
          ),
        );
      },
    };
  },
});
