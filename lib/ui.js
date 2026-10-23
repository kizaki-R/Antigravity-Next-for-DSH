window.__ModuleLoader__.load({
  id: "agy-next",
  factory(require) {
    const React = require("react");
    const h = React.createElement;

    const API = "/agy-next/api";
    const NS = "agy-next";
    const STYLE_ID = "agy-next-settings-style";
    // Bump this whenever lib/ui.js changes in a way the user should be able to
    // confirm on screen. It is rendered next to the page title, so a page that
    // still shows the old stamp is a page that has not loaded the new file yet.
    const UI_BUILD = "u19";

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
        reauth: "Sign in again",
        addAccount: "Add account",
        logout: "Sign out current account",
        chipReady: "OAuth OK",
        chipNoClient: "No OAuth client",
        chipClientError: "OAuth client unreadable",
        clientSection: "OAuth client",
        clientOk: "Configured",
        clientMissing: "Not configured",
        clientError: "Unreadable",
        srcConfig: "plugin config",
        srcEnv: "environment",
        srcFile: "file",
        hintMissing: "No OAuth client yet. In a terminal, cd into the agy-next package directory and run npm run login — or see SETUP.md for the three minutes in Google Cloud Console.",
        accountMissing: "Not signed in",
        accountMissingHint: "Sign in with Google to start using these models.",
        hintImported: "This login was imported from the official plugin and only carries a refresh token. Add your own OAuth client (npm run login in the agy-next directory, or see SETUP.md) to refresh it and see usage.",
        tokenLeft: "token {time}",
        tokenStale: "token refreshes on the next request",
        active: "Active",
        standby: "Standby",
        nextUp: "Standby · next",
        exhausted: "Quota full",
        fiveHour: "5-hour window",
        weekly: "Weekly",
        resetsIn: "Resets in {time}",
        resetsAt: "Resets {when}",
        usageUnavailable: "Usage data isn't reported yet.",
        switchNow: "Switch now",
        switchTo: "Switch",
        noStandbyHint: "Add another account so work can carry on when this one runs out.",
        poolTitle: "Account pool",
        poolCount: "{n} authorized",
        autoSwitch: "Auto-switch",
        colAccount: "Account",
        colUsage: "Quota",
        ledgerFoot: "Number = quota left (%), the lower of the 5-hour and weekly windows. Orange = {pct}% left or less, red = used up. Click an account to see both windows and reset times.",
        autoOn: "On · switches to {name} when a group has {pct}% or less left",
        autoOff: "Off · the account won't change when quota runs out",
        usedUp: "used up",
        leftPct: "{pct}% left",
        allUsedUp: "All quota groups used up",
        fullShort: "Full",
        tipNextHas: "has {pct}% left",
        modelsSection: "Models",
        modelsCount: "{n} models",
        modelsShown: "shown in chat",
        chipJump: "Jump to OAuth client settings",
        kvSource: "Source",
        kvPath: "Path",
        kvScopes: "Scopes",
        modelsOther: "Other",
        modelsAll: "All models",
        groupCollapse: "Collapse {name}",
        groupExpand: "Expand {name}",
        groupNoModels: "No models available in this group",
        noneVisible: "No model is shown in chat. Tick at least one.",
        copy: "Copy",
        copied: "Copied",
        unknown: "unknown",
        waiting: "A browser window should have opened. Approve access there; this page updates by itself.",
        openAgain: "Open the sign-in page again",
        errorGeneric: "Something went wrong: {message}",
        loginNoClient: "Add an OAuth client first.",
        needsClient: "Set up an OAuth client first",
        needsClientBelow: "Set up the OAuth client below",
      },
      "zh-Hant": {
        nav: "AGY-Next",
        title: "Antigravity Next",
        subtitle: "OAuth 用戶端、登入狀態、權限範圍，以及這個 provider 提供的模型。",
        refresh: "重新整理",
        refreshing: "整理中…",
        login: "登入",
        loggingIn: "等待授權中…",
        reauth: "重新登入",
        addAccount: "新增帳號",
        logout: "登出目前帳號",
        chipReady: "OAuth 正常",
        chipNoClient: "尚未設定 OAuth",
        chipClientError: "OAuth 設定無法讀取",
        clientSection: "OAuth 用戶端",
        clientOk: "已設定",
        clientMissing: "尚未設定",
        clientError: "無法讀取",
        srcConfig: "外掛設定",
        srcEnv: "環境變數",
        srcFile: "檔案",
        hintMissing: "還沒有 OAuth 用戶端。在終端機切到 agy-next 套件目錄執行 npm run login，或看 SETUP.md——它會帶你走完 Google Cloud Console 那三分鐘。",
        accountMissing: "尚未登入",
        accountMissingHint: "用 Google 帳號登入後就能使用這些模型。",
        hintImported: "這個登入是從官方外掛匯入的，只帶有 refresh token、沒有 OAuth 用戶端。請自行建立用戶端（在 agy-next 目錄執行 npm run login，或看 SETUP.md），才能更新授權並顯示用量。",
        tokenLeft: "token {time}",
        tokenStale: "token 會在下次請求時更新",
        active: "使用中",
        standby: "待命",
        nextUp: "待命 · 下一個",
        exhausted: "額度已滿",
        fiveHour: "5 小時視窗",
        weekly: "每週",
        resetsIn: "{time} 後重置",
        resetsAt: "{when} 重置",
        usageUnavailable: "目前還沒有回報用量資料。",
        switchNow: "立即切換",
        switchTo: "切換",
        noStandbyHint: "再加一個帳號，這個額度用完時就能接著用。",
        poolTitle: "帳號池",
        poolCount: "{n} 個已授權",
        autoSwitch: "自動切換",
        colAccount: "帳號",
        colUsage: "額度",
        ledgerFoot: "數字＝剩餘額度 %，取 5 小時與每週較低者。橘＝剩 {pct}% 以下，紅＝已用完。點帳號可看兩個視窗與重置時間。",
        autoOn: "已開啟 · 任一組剩 {pct}% 以下時，自動改用 {name}",
        autoOff: "已關閉 · 額度用完也不會自動換帳號",
        usedUp: "已用完",
        leftPct: "剩 {pct}%",
        allUsedUp: "所有額度組都已用完",
        fullShort: "已滿",
        tipNextHas: "還有 {pct}%",
        modelsSection: "模型",
        modelsCount: "{n} 個模型",
        modelsShown: "顯示在聊天視窗",
        chipJump: "前往 OAuth 用戶端設定",
        kvSource: "來源",
        kvPath: "路徑",
        kvScopes: "Scopes",
        modelsOther: "其他",
        modelsAll: "所有模型",
        groupCollapse: "收合 {name}",
        groupExpand: "展開 {name}",
        groupNoModels: "這組目前沒有可用模型",
        noneVisible: "目前沒有任何模型會顯示在聊天視窗，至少勾選一個。",
        copy: "複製",
        copied: "已複製",
        unknown: "未知",
        waiting: "瀏覽器應該已經開啟。在那裡按下同意，這一頁會自己更新。",
        openAgain: "再開一次登入頁",
        errorGeneric: "發生錯誤：{message}",
        loginNoClient: "請先設定 OAuth 用戶端。",
        needsClient: "需要先設定 OAuth 用戶端",
        needsClientBelow: "需要先設定 OAuth 用戶端（見下方）",
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
        reauth: "重新登录",
        addAccount: "添加账号",
        logout: "登出当前账号",
        chipReady: "OAuth 正常",
        chipNoClient: "尚未设置 OAuth",
        chipClientError: "OAuth 配置无法读取",
        clientSection: "OAuth 客户端",
        clientOk: "已设置",
        clientMissing: "尚未设置",
        clientError: "无法读取",
        srcConfig: "插件设置",
        srcEnv: "环境变量",
        srcFile: "文件",
        hintMissing: "还没有 OAuth 客户端。在终端切到 agy-next 套件目录运行 npm run login，或看 SETUP.md——它会带你走完 Google Cloud Console 那三分钟。",
        accountMissing: "尚未登录",
        accountMissingHint: "用 Google 账号登录后就能使用这些模型。",
        hintImported: "这个登录是从官方插件导入的，只带有 refresh token、没有 OAuth 客户端。请自行创建客户端（在 agy-next 目录运行 npm run login，或看 SETUP.md），才能刷新授权并显示用量。",
        tokenLeft: "token {time}",
        tokenStale: "token 会在下次请求时更新",
        active: "使用中",
        standby: "待命",
        nextUp: "待命 · 下一个",
        exhausted: "额度已满",
        fiveHour: "5 小时窗口",
        weekly: "每周",
        resetsIn: "{time} 后重置",
        resetsAt: "{when} 重置",
        usageUnavailable: "目前还没有上报用量数据。",
        switchNow: "立即切换",
        switchTo: "切换",
        noStandbyHint: "再加一个账号，这个额度用完时就能接着用。",
        poolTitle: "账号池",
        poolCount: "{n} 个已授权",
        autoSwitch: "自动切换",
        colAccount: "账号",
        colUsage: "额度",
        ledgerFoot: "数字＝剩余额度 %，取 5 小时与每周较低者。橙＝剩 {pct}% 以下，红＝已用完。点账号可查看两个窗口与重置时间。",
        autoOn: "已开启 · 任一组剩 {pct}% 以下时，自动改用 {name}",
        autoOff: "已关闭 · 额度用完也不会自动换账号",
        usedUp: "已用完",
        leftPct: "剩 {pct}%",
        allUsedUp: "所有额度组都已用完",
        fullShort: "已满",
        tipNextHas: "还有 {pct}%",
        modelsSection: "模型",
        modelsCount: "{n} 个模型",
        modelsShown: "显示在聊天窗口",
        chipJump: "前往 OAuth 客户端设置",
        kvSource: "来源",
        kvPath: "路径",
        kvScopes: "Scopes",
        modelsOther: "其他",
        modelsAll: "所有模型",
        groupCollapse: "收起 {name}",
        groupExpand: "展开 {name}",
        groupNoModels: "这组目前没有可用模型",
        noneVisible: "目前没有任何模型会显示在聊天窗口，至少勾选一个。",
        copy: "复制",
        copied: "已复制",
        unknown: "未知",
        waiting: "浏览器应该已经打开。在那里点击同意，这一页会自己更新。",
        openAgain: "再打开一次登录页",
        errorGeneric: "发生错误：{message}",
        loginNoClient: "请先设置 OAuth 客户端。",
        needsClient: "需要先设置 OAuth 客户端",
        needsClientBelow: "需要先设置 OAuth 客户端（见下方）",
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

    // A reader can pin the page to one language with the switch in the header.
    // The choice is only a per-viewer convenience, so storage may be missing or
    // throw (private window, blocked site data) and the page then just follows
    // the host.
    const LANG_KEY = "agy-next:lang";
    const LANGS = [
      { id: "zh-Hant", short: "繁", name: "繁體中文" },
      { id: "zh", short: "简", name: "简体中文" },
      { id: "en", short: "EN", name: "English" },
    ];
    function readLangPref() {
      try {
        const saved = window.localStorage.getItem(LANG_KEY);
        return LANGS.some((lang) => lang.id === saved) ? saved : "";
      } catch {
        return "";
      }
    }
    function writeLangPref(id) {
      try {
        if (id) window.localStorage.setItem(LANG_KEY, id);
        else window.localStorage.removeItem(LANG_KEY);
      } catch {
        /* the choice still holds until the page is closed */
      }
    }

    // Which accounts and model groups the reader opened or folded. Like the
    // language pick this is a per-viewer convenience: storage may be absent or
    // hold something unreadable, and the page then starts from its defaults.
    const EXPANDED_KEY = "agy-next:ui:account-expanded";
    const CLOSED_KEY = "agy-next:ui:model-closed";
    // The account that was in use when the open/closed marks were saved. Marks
    // belong to that arrangement: once another account takes over they are
    // dropped, so the new active account opens instead of inheriting a "closed".
    const ACTIVE_KEY = "agy-next:ui:account-active";
    function readText(key) {
      try {
        return window.localStorage.getItem(key) ?? "";
      } catch {
        return "";
      }
    }
    function readFlags(key) {
      try {
        const saved = JSON.parse(window.localStorage.getItem(key) ?? "null");
        if (!saved || typeof saved !== "object" || Array.isArray(saved)) return {};
        return Object.fromEntries(Object.entries(saved).filter(([, value]) => typeof value === "boolean"));
      } catch {
        return {};
      }
    }
    function writeFlags(key, value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* the choice still holds until the page is closed */
      }
    }

    // The last status the page received. Opening the settings page mounts it
    // from scratch, so without this every visit starts on a blank "loading"
    // screen; with it the page paints the previous numbers at once and swaps in
    // the live ones when the fetch lands. It is kept in memory for this session
    // and mirrored to storage (when allowed) so a restart is covered as well.
    // Anything about an in-flight sign-in is left out: that must come live.
    const STATUS_KEY = "agy-next:status";
    let lastStatus = null;
    function readCachedStatus() {
      if (lastStatus) return lastStatus;
      try {
        const saved = JSON.parse(window.localStorage.getItem(STATUS_KEY) ?? "null");
        if (saved && typeof saved === "object" && saved.client) lastStatus = saved;
      } catch {
        /* no usable cache: the page shows its loading state instead */
      }
      return lastStatus;
    }
    function rememberStatus(value) {
      if (!value || typeof value !== "object") return;
      lastStatus = { ...value, pending: null };
      try {
        window.localStorage.setItem(STATUS_KEY, JSON.stringify(lastStatus));
      } catch {
        /* memory copy still serves this session */
      }
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
      // Reuse and refresh an existing style element instead of returning early.
      // The settings view can remount while its host document survives a plugin
      // hot reload; in that case the module code is new but the old style tag is
      // still present. Returning here leaves stale layout rules in place (for
      // example, one-column bento CSS) even though the page shows the new build.
      const style = document.getElementById(STYLE_ID) ?? document.createElement("style");
      style.id = STYLE_ID;
      // Theme alias tokens only, so light/dark switching is inherited rather than
      // hard-coded. These are the names the host stylesheet actually defines
      // (label-*, bg-layer-*, border-l*, state-*, interactive-bg-hover); an
      // undefined alias resolves to nothing, which is how the cards once lost
      // their border and fill. The literal fallbacks after the three state
      // tokens are status tints only. Every wash and hover is mixed from those
      // tokens so it follows the theme too.
      style.textContent = `
        .agyn-page {
          --agyn-fg: var(--dsw-alias-label-primary);
          --agyn-fg2: var(--dsw-alias-label-secondary);
          --agyn-fg3: var(--dsw-alias-label-tertiary);
          --agyn-surface: var(--dsw-alias-bg-layer-1);
          --agyn-line: var(--dsw-alias-border-l1);
          --agyn-line2: var(--dsw-alias-border-l2);
          --agyn-hover: var(--dsw-alias-interactive-bg-hover, var(--dsw-alias-bg-layer-2));
          /* A wash of the label colour: it follows the theme in both directions.
             The layer tokens cannot do this job, because in the light theme all
             three of them are plain white. */
          --agyn-tint: color-mix(in srgb, var(--agyn-fg) 5%, transparent);
          /* DSH has no accent alias of its own (brand-primary is a monochrome
             neutral), so the accent is the host's business blue, pulled toward
             the label colour. That keeps white-on-accent text readable in the
             light theme and, in the dark theme, gives a pale blue that dark
             text sits on. Nothing here is a literal colour. */
          --agyn-accent: color-mix(in srgb, var(--dsw-alias-state-business-primary, var(--dsw-alias-label-primary)) 80%, var(--agyn-fg));
          --agyn-on-accent: var(--dsw-alias-bg-layer-1);
          /* Colour is reserved for exceptions: accent = the account in use,
             warn = at or under the auto-switch line, off = used up. The literal
             fallbacks only apply if the host drops a state token. */
          --agyn-ok: var(--dsw-alias-state-success-primary, #1e8a63);
          --agyn-off: var(--dsw-alias-state-error-primary, #b23b4b);
          --agyn-warn: var(--dsw-alias-state-warn-primary, #c2410c);
          --agyn-mono: ui-monospace, "JetBrains Mono", SFMono-Regular, Menlo, Consolas, monospace;
          container: agyn / inline-size;
          display: flex; flex-direction: column; padding: 20px 24px 24px; color: var(--agyn-fg); font-size: 13px; line-height: 20px;
        }
        .agyn-page > * { animation: agyn-in .32s cubic-bezier(.2,.7,.2,1) both; }
        .agyn-page > :nth-child(2) { animation-delay: .04s; }
        .agyn-page > :nth-child(3) { animation-delay: .08s; }
        .agyn-page > :nth-child(4) { animation-delay: .12s; }
        @keyframes agyn-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        @keyframes agyn-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          .agyn-page *, .agyn-page > * { animation: none !important; transition: none !important; }
        }
        .agyn-ico { flex: 0 0 auto; display: block; }
        .agyn-spin { animation: agyn-spin .8s linear infinite; }

        /* header */
        .agyn-top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 12px; min-height: 40px; }
        .agyn-brand { display: flex; align-items: center; gap: 8px; min-width: 0; }
        .agyn-title { margin: 0; min-width: 0; font-size: 18px; font-weight: 700; line-height: 24px; letter-spacing: -.01em; color: var(--agyn-fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .agyn-build { flex: 0 0 auto; padding: 0 5px; border: 1px solid var(--agyn-line2); border-radius: 4px; font-family: var(--agyn-mono); font-size: 11px; line-height: 16px; color: var(--agyn-fg2); }
        .agyn-top-actions { display: flex; align-items: center; gap: 4px; flex: 0 0 auto; }
        .agyn-conn { display: inline-flex; align-items: center; gap: 7px; box-sizing: border-box; height: 32px; padding: 0 12px; border: 1px solid var(--agyn-line2); border-radius: 16px; background: transparent; color: var(--agyn-fg2); font: inherit; font-size: 12px; font-weight: 500; line-height: 18px; white-space: nowrap; cursor: pointer; transition: background-color .15s, color .15s; }
        .agyn-conn:hover { background: var(--agyn-hover); color: var(--agyn-fg); }
        .agyn-dot { flex: 0 0 auto; width: 7px; height: 7px; border-radius: 50%; background: var(--agyn-tone, var(--agyn-ok)); }
        .agyn-tone-ok { --agyn-tone: var(--agyn-ok); }
        .agyn-tone-warn { --agyn-tone: var(--agyn-warn); }
        .agyn-tone-off { --agyn-tone: var(--agyn-off); }
        .agyn-lang { display: inline-flex; flex: 0 0 auto; padding: 2px; border-radius: 9px; background: var(--agyn-hover); }
        .agyn-lang-btn { appearance: none; min-width: 30px; height: 28px; padding: 0 7px; border: 0; border-radius: 7px; background: transparent; color: var(--agyn-fg2); font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; transition: background-color .15s, color .15s; }
        .agyn-lang-btn:hover { color: var(--agyn-fg); }
        .agyn-lang-on, .agyn-lang-on:hover { background: var(--dsw-alias-bg-layer-1); color: var(--agyn-fg); box-shadow: 0 0 0 1px var(--agyn-line); }
        .agyn-lang-btn:focus-visible { outline: 2px solid var(--agyn-accent); outline-offset: 1px; }
        .agyn-iconbtn { appearance: none; display: inline-grid; place-items: center; flex: 0 0 auto; width: 32px; height: 32px; padding: 0; border: 0; border-radius: 8px; background: transparent; color: var(--agyn-fg2); cursor: pointer; transition: background-color .15s, color .15s; }
        .agyn-iconbtn:hover:not(:disabled) { background: var(--agyn-hover); color: var(--agyn-fg); }
        .agyn-iconbtn:disabled { opacity: .5; cursor: default; }
        .agyn-iconbtn-done, .agyn-iconbtn-done:hover:not(:disabled) { color: var(--agyn-ok); }
        .agyn-btn:focus-visible, .agyn-iconbtn:focus-visible, .agyn-conn:focus-visible, .agyn-linkbtn:focus-visible, .agyn-who:focus-visible, .agyn-oauth > summary:focus-visible, .agyn-sw:focus-visible, .agyn-cb:focus-visible { outline: 2px solid var(--agyn-accent); outline-offset: 2px; }

        /* sections */
        .agyn-sec { display: flex; flex-direction: column; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--agyn-line2); }
        .agyn-sec-head { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 4px 12px; min-height: 32px; }
        .agyn-sec-title { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 8px; min-width: 0; min-height: 32px; }
        .agyn-h3 { margin: 0; font-size: 15px; font-weight: 700; line-height: 22px; white-space: nowrap; color: var(--agyn-fg); }
        .agyn-count { padding: 0 7px; border-radius: 9px; background: var(--agyn-tint); font-family: var(--agyn-mono); font-size: 12px; font-weight: 500; line-height: 18px; color: var(--agyn-fg2); white-space: nowrap; }
        .agyn-meta { font-size: 12px; line-height: 18px; color: var(--agyn-fg2); }
        .agyn-tools { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: flex-end; gap: 4px 12px; }
        .agyn-sub { margin: 2px 0 0; font-size: 12px; line-height: 18px; color: var(--agyn-fg2); }
        .agyn-sub b, .agyn-tip b { font-weight: 700; color: var(--agyn-fg); }

        /* controls */
        .agyn-switch { display: inline-flex; align-items: center; gap: 8px; min-height: 32px; font-size: 13px; line-height: 18px; color: var(--agyn-fg); white-space: nowrap; cursor: pointer; }
        .agyn-sw { appearance: none; -webkit-appearance: none; position: relative; flex: 0 0 auto; width: 36px; height: 20px; margin: 0; border-radius: 10px; background: var(--agyn-line2); cursor: pointer; transition: background-color .15s; }
        .agyn-sw::after { content: ""; position: absolute; top: 3px; left: 3px; width: 14px; height: 14px; border-radius: 50%; background: var(--agyn-fg2); transition: transform .15s, background-color .15s; }
        .agyn-sw:checked { background: var(--agyn-accent); }
        .agyn-sw:checked::after { background: var(--agyn-on-accent); transform: translateX(16px); }
        .agyn-sw:disabled { opacity: .5; cursor: default; }
        .agyn-btn { appearance: none; display: inline-flex; align-items: center; justify-content: center; gap: 6px; box-sizing: border-box; height: 32px; padding: 0 12px; border: 1px solid var(--agyn-line2); border-radius: 8px; background: transparent; color: var(--agyn-fg); font: inherit; font-size: 13px; font-weight: 600; line-height: 18px; white-space: nowrap; cursor: pointer; transition: background-color .15s, opacity .15s; }
        .agyn-btn:hover:not(:disabled) { background: var(--agyn-hover); }
        .agyn-btn-primary { border-color: var(--agyn-accent); background: var(--agyn-accent); color: var(--agyn-on-accent); }
        .agyn-btn-primary:hover:not(:disabled) { background: color-mix(in srgb, var(--agyn-accent) 86%, var(--agyn-fg)); }
        .agyn-btn-danger { border-color: color-mix(in srgb, var(--agyn-off) 40%, transparent); color: var(--agyn-off); }
        .agyn-btn-danger:hover:not(:disabled) { background: color-mix(in srgb, var(--agyn-off) 8%, transparent); }
        .agyn-btn:disabled, .agyn-btn-primary:disabled { border-style: dashed; border-color: var(--agyn-line2); background: transparent; color: var(--agyn-fg3); cursor: default; }
        .agyn-linkbtn { appearance: none; display: inline-flex; align-items: center; min-height: 32px; padding: 0; border: 0; background: none; color: var(--agyn-accent); font: inherit; font-size: 13px; font-weight: 500; cursor: pointer; }
        .agyn-linkbtn:hover { text-decoration: underline; }
        .agyn-cb { appearance: none; -webkit-appearance: none; display: grid; place-items: center; flex: 0 0 auto; box-sizing: border-box; width: 16px; height: 16px; margin: 0; border: 1.5px solid var(--agyn-fg3); border-radius: 4px; background: transparent; cursor: pointer; }
        .agyn-cb:checked, .agyn-cb:indeterminate { border-color: var(--agyn-accent); background: var(--agyn-accent); }
        .agyn-cb:checked::after { content: ""; width: 8px; height: 4px; margin-top: -2px; border-left: 2px solid var(--agyn-on-accent); border-bottom: 2px solid var(--agyn-on-accent); transform: rotate(-45deg); }
        .agyn-cb:indeterminate::after { content: ""; width: 8px; height: 2px; margin: 0; border: 0; border-radius: 1px; background: var(--agyn-on-accent); transform: none; }
        /* A button that can be disabled, plus the reason it is. */
        .agyn-action { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; min-width: 0; }
        .agyn-reason { display: inline-flex; align-items: flex-start; gap: 5px; max-width: 26ch; font-size: 12px; line-height: 16px; color: var(--agyn-fg2); }
        .agyn-reason .agyn-ico { margin-top: 1px; color: var(--agyn-warn); }
        .agyn-empty .agyn-action { align-items: flex-start; }
        .agyn-empty .agyn-reason { max-width: none; }

        /* ledger */
        .agyn-book { --agyn-n: 2; display: flex; flex-direction: column; }
        .agyn-cols, .agyn-line { display: grid; grid-template-columns: 20px minmax(0, 1fr) repeat(var(--agyn-n), 86px) 64px; column-gap: 8px; align-items: center; }
        .agyn-cols { margin-top: 12px; padding: 0 8px 6px; border-bottom: 1px solid var(--agyn-line2); font-size: 11px; line-height: 16px; color: var(--agyn-fg2); white-space: nowrap; }
        .agyn-cols > span { grid-row: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
        .agyn-cols > .agyn-col-acc { grid-column: 1 / 3; padding-left: 28px; }
        .agyn-cols > .agyn-col-g { grid-column: calc(var(--agyn-gi) + 2); }
        .agyn-col-g, .agyn-q { --agyn-gi: 1; }
        .agyn-col-off { color: var(--agyn-fg3); }
        .agyn-ledger { display: flex; flex-direction: column; margin: 0; padding: 0; list-style: none; }
        .agyn-acc { border-bottom: 1px solid var(--agyn-line2); }
        .agyn-acc-open { margin: 4px 0; border-bottom-color: transparent; border-radius: 10px; background: var(--agyn-tint); }
        .agyn-line { min-height: 44px; padding: 0 8px; border-radius: 10px; transition: background-color .15s; }
        .agyn-acc:not(.agyn-acc-open) > .agyn-line:hover { background: var(--agyn-hover); }
        .agyn-line > * { grid-row: 1; }
        .agyn-who { grid-column: 1 / 3; display: flex; align-items: center; gap: 8px; min-width: 0; min-height: 44px; padding: 0; border: 0; border-radius: 8px; background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; }
        .agyn-st { display: grid; place-items: center; flex: 0 0 20px; width: 20px; height: 20px; color: var(--agyn-fg2); }
        .agyn-st-on::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--agyn-accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--agyn-accent) 25%, transparent); }
        .agyn-st-idle::before { content: ""; box-sizing: border-box; width: 8px; height: 8px; border-radius: 50%; border: 1.5px solid var(--agyn-fg3); }
        .agyn-st-next { color: var(--agyn-accent); }
        .agyn-st-full { color: var(--agyn-off); }
        .agyn-email { min-width: 0; font-size: 13px; font-weight: 500; line-height: 20px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .agyn-acc-active .agyn-email { font-weight: 700; }
        .agyn-acc-full .agyn-email { color: var(--agyn-fg2); }
        .agyn-chev { color: var(--agyn-fg2); transition: transform .15s; }
        .agyn-acc-open .agyn-who .agyn-chev { transform: rotate(180deg); }
        .agyn-q { grid-column: calc(var(--agyn-gi) + 2); display: flex; align-items: center; gap: 6px; min-width: 0; }
        .agyn-bar { position: relative; display: block; flex: 1 1 auto; min-width: 0; height: 6px; border-radius: 3px; background: var(--agyn-line2); overflow: hidden; }
        .agyn-bar > i { position: absolute; top: 0; bottom: 0; left: 0; border-radius: 3px; background: var(--agyn-fg3); transition: width .5s cubic-bezier(.2,.7,.2,1); }
        .agyn-acc-active .agyn-bar > i { background: var(--agyn-accent); }
        .agyn-acc .agyn-bar-low > i { background: var(--agyn-warn); }
        .agyn-bar-empty { background: color-mix(in srgb, var(--agyn-off) 35%, transparent); }
        .agyn-num { flex: 0 0 26px; text-align: right; font-family: var(--agyn-mono); font-size: 13px; font-weight: 700; line-height: 18px; font-variant-numeric: tabular-nums; }
        .agyn-num-off { color: var(--agyn-off); }
        .agyn-q-off .agyn-bar { opacity: .5; }
        .agyn-q-off .agyn-num { color: var(--agyn-fg3); font-weight: 500; }
        .agyn-act { grid-column: -2 / -1; display: flex; justify-content: flex-end; align-items: center; }
        .agyn-act .agyn-btn { padding: 0 10px; }
        .agyn-now { font-size: 12px; font-weight: 600; line-height: 18px; color: var(--agyn-fg2); white-space: nowrap; }
        .agyn-acc-noted > .agyn-line, .agyn-acc-noted > .agyn-line .agyn-who { min-height: 38px; }
        .agyn-note { display: flex; align-items: flex-start; gap: 6px; margin: 0; padding: 0 8px 10px 36px; font-size: 12px; line-height: 18px; color: var(--agyn-fg2); }
        .agyn-note .agyn-ico { margin-top: 2px; }
        .agyn-note-warn .agyn-ico { color: var(--agyn-warn); }
        .agyn-note-off .agyn-ico { color: var(--agyn-off); }
        .agyn-detail { display: flex; flex-direction: column; gap: 10px; padding: 0 8px 10px 36px; }
        .agyn-detail-groups { display: grid; grid-template-columns: repeat(var(--agyn-n, 2), minmax(0, 1fr)); gap: 12px; margin-top: 4px; }
        .agyn-detail-col { display: flex; flex-direction: column; gap: 8px; min-width: 0; padding: 10px 12px; border-radius: 8px; background: color-mix(in srgb, var(--agyn-fg) 3%, var(--agyn-surface)); border: 1px solid var(--agyn-line); }
        .agyn-detail-col-h { font-size: 12px; font-weight: 700; line-height: 18px; color: var(--agyn-fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-bottom: 4px; border-bottom: 1px solid var(--agyn-line2); }
        .agyn-detail-note { font-size: 12px; line-height: 18px; color: var(--agyn-fg2); }
        .agyn-group-off { color: var(--agyn-fg3); font-weight: 500; }
        .agyn-cell { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
        .agyn-cell-top { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; font-size: 11px; line-height: 16px; color: var(--agyn-fg2); white-space: nowrap; }
        .agyn-cell-top b { font-family: var(--agyn-mono); font-size: 13px; font-weight: 700; color: var(--agyn-fg); }
        .agyn-cell-top span { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
        .agyn-cell .agyn-bar { flex: none; height: 4px; }
        .agyn-detail-foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px 12px; padding-top: 8px; border-top: 1px solid var(--agyn-line2); font-size: 12px; line-height: 18px; color: var(--agyn-fg2); }
        .agyn-detail-foot > span { min-width: 0; overflow-wrap: anywhere; }
        .agyn-foot { margin: 10px 0 0; font-size: 12px; line-height: 18px; color: var(--agyn-fg2); }
        .agyn-tip { display: grid; grid-template-columns: 16px minmax(0, 1fr) auto; align-items: center; gap: 10px; margin-top: 12px; padding: 10px 10px 10px 12px; border: 1px solid color-mix(in srgb, var(--agyn-warn) 40%, transparent); border-radius: 10px; background: color-mix(in srgb, var(--agyn-warn) 10%, var(--agyn-surface)); }
        .agyn-tip > .agyn-ico { align-self: start; margin-top: 2px; color: var(--agyn-warn); }
        .agyn-tip p { margin: 0; font-size: 13px; line-height: 20px; color: var(--agyn-fg); }
        .agyn-empty { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; margin-top: 12px; padding: 16px; border: 1px dashed var(--agyn-line2); border-radius: 10px; }
        .agyn-empty-title { margin: 0; font-size: 15px; font-weight: 700; line-height: 22px; }
        .agyn-empty .agyn-sub { margin: 0 0 6px; }

        /* models */
        .agyn-mgroup { display: flex; flex-direction: column; margin-top: 8px; }
        .agyn-mg-head { display: flex; align-items: center; gap: 8px; min-height: 36px; padding-left: 8px; border-bottom: 1px solid var(--agyn-line2); }
        .agyn-mg-fold { cursor: pointer; }
        .agyn-mg-fold:hover { background: var(--agyn-hover); }
        .agyn-mg-label { display: flex; align-items: center; gap: 10px; flex: 1 1 auto; min-width: 0; min-height: 36px; font-size: 13px; font-weight: 700; line-height: 18px; }
        .agyn-mg-label > span:first-of-type { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .agyn-mg-pad { width: 16px; height: 16px; flex: 0 0 auto; }
        .agyn-mg-n { font-family: var(--agyn-mono); font-size: 12px; font-weight: 500; color: var(--agyn-fg2); white-space: nowrap; }
        .agyn-mg-closed .agyn-mg-head .agyn-chev { transform: rotate(-90deg); }
        .agyn-mg-off .agyn-mg-label { color: var(--agyn-fg3); }
        .agyn-mg-note { margin: 0; padding: 6px 8px 6px 34px; border-bottom: 1px solid var(--agyn-line2); font-size: 12px; line-height: 18px; color: var(--agyn-fg2); }
        .agyn-mlist { margin: 0; padding: 0; list-style: none; }
        .agyn-mrow { display: grid; grid-template-columns: minmax(0, 1fr) 48px 32px; align-items: center; column-gap: 4px; min-height: 34px; padding-left: 34px; border-bottom: 1px solid var(--agyn-line); }
        .agyn-mmain { display: flex; align-items: center; gap: 10px; min-width: 0; min-height: 34px; cursor: pointer; }
        .agyn-mmain-plain { cursor: default; }
        .agyn-mname { min-width: 0; font-size: 13px; line-height: 18px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .agyn-mrow-off .agyn-mname { color: var(--agyn-fg3); }
        .agyn-ctx { font-family: var(--agyn-mono); font-size: 12px; line-height: 18px; color: var(--agyn-fg2); text-align: right; }

        /* oauth footer */
        .agyn-oauth { margin-top: 16px; border-top: 1px solid var(--agyn-line2); }
        .agyn-oauth > summary { display: flex; align-items: center; gap: 10px; min-height: 48px; list-style: none; border-radius: 8px; cursor: pointer; }
        .agyn-oauth > summary::-webkit-details-marker { display: none; }
        .agyn-oauth-k { font-size: 13px; font-weight: 700; line-height: 18px; white-space: nowrap; }
        .agyn-oauth-id { flex: 1 1 auto; min-width: 0; font-family: var(--agyn-mono); font-size: 12px; line-height: 18px; color: var(--agyn-fg2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .agyn-oauth-chev { display: grid; place-items: center; flex: 0 0 auto; width: 32px; height: 32px; margin-left: auto; }
        .agyn-oauth[open] .agyn-oauth-chev .agyn-chev { transform: rotate(180deg); }
        .agyn-oauth-body { display: flex; flex-direction: column; gap: 10px; padding: 0 0 12px; }
        .agyn-kv { display: grid; grid-template-columns: 68px minmax(0, 1fr); align-items: start; gap: 8px 12px; margin: 0; font-size: 12px; line-height: 18px; }
        .agyn-kv dt { padding-top: 1px; color: var(--agyn-fg2); }
        .agyn-kv dd { min-width: 0; margin: 0; font-family: var(--agyn-mono); color: var(--agyn-fg); overflow-wrap: anywhere; }
        .agyn-kv dd.agyn-plain { font-family: inherit; }
        .agyn-path { display: flex; align-items: flex-start; gap: 4px; }
        .agyn-path > span { min-width: 0; padding-top: 7px; }
        .agyn-scopes { display: flex; flex-wrap: wrap; gap: 6px; }
        .agyn-scope { padding: 1px 8px; border-radius: 6px; background: var(--agyn-tint); font-size: 11px; line-height: 18px; color: var(--agyn-fg2); }

        .agyn-badge { display: inline-flex; align-items: center; gap: 6px; flex: 0 0 auto; font-size: 12px; line-height: 18px; color: var(--agyn-fg2); white-space: nowrap; }
        .agyn-badge::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: var(--agyn-tone, var(--agyn-ok)); }
        .agyn-badge.agyn-ok { --agyn-tone: var(--agyn-ok); }
        .agyn-badge.agyn-warn { --agyn-tone: var(--agyn-warn); }
        .agyn-badge.agyn-off { --agyn-tone: var(--agyn-off); }

        .agyn-callout { display: flex; gap: 10px; align-items: flex-start; margin: 12px 0 0; padding: 10px 12px; border-radius: 10px; font-size: 12.5px; line-height: 19px; color: var(--agyn-fg); background: var(--agyn-surface); border: 1px solid var(--agyn-line2); }
        .agyn-sec .agyn-callout { margin-top: 8px; }
        .agyn-oauth-body .agyn-callout { margin-top: 0; }
        .agyn-callout .agyn-ico { margin-top: 1px; }
        .agyn-callout-warn { background: color-mix(in srgb, var(--agyn-warn) 8%, var(--agyn-surface)); border-color: color-mix(in srgb, var(--agyn-warn) 30%, transparent); }
        .agyn-callout-warn .agyn-ico { color: var(--agyn-warn); }
        .agyn-callout-error { background: color-mix(in srgb, var(--agyn-off) 8%, var(--agyn-surface)); border-color: color-mix(in srgb, var(--agyn-off) 30%, transparent); }
        .agyn-callout-error .agyn-ico { color: var(--agyn-off); }
        .agyn-callout-info { background: color-mix(in srgb, var(--agyn-accent) 8%, var(--agyn-surface)); border-color: color-mix(in srgb, var(--agyn-accent) 30%, transparent); }
        .agyn-callout-info .agyn-ico { color: var(--agyn-accent); }
        .agyn-callout a { color: var(--agyn-accent); font-weight: 500; }

        .agyn-loading { display: flex; align-items: center; gap: 8px; margin: 0; padding: 24px 4px; font-size: 13px; color: var(--agyn-fg2); }

        /* Wider pane: only the ledger's column gap and widths relax. It stays a
           single column of rows; there is no multi-column layout to switch to. */
        @container agyn (min-width: 720px) {
          .agyn-cols, .agyn-line { grid-template-columns: 20px minmax(0, 1fr) repeat(var(--agyn-n), 120px) 72px; column-gap: 14px; }
          .agyn-detail-groups { gap: 16px; }
        }
        /* Narrow pane. The settings dialog is 559px wide, so the real container
           is 511px and the default rules above are drawn for it. Under 480px
           every account becomes two lines: identity and action on the first,
           the quota bars on the second, and the header row keeps naming the
           columns above those bars. */
        @container agyn (max-width: 479px) {
          .agyn-cols, .agyn-line { grid-template-columns: 20px repeat(var(--agyn-n), minmax(0, 1fr)) 64px; }
          .agyn-cols > .agyn-col-acc { display: none; }
          .agyn-cols > .agyn-col-g { grid-column: calc(var(--agyn-gi) + 1); }
          .agyn-who { grid-column: 1 / -2; min-height: 38px; }
          .agyn-q { grid-column: calc(var(--agyn-gi) + 1); grid-row: 2; }
          .agyn-act { grid-row: 1 / span 2; align-self: start; min-height: 38px; }
          .agyn-line { padding-bottom: 10px; }
          .agyn-acc-noted > .agyn-line { min-height: 0; }
          .agyn-detail-groups { grid-template-columns: minmax(0, 1fr); row-gap: 8px; }
          .agyn-detail, .agyn-note { padding-left: 28px; }
          .agyn-tip { grid-template-columns: 16px minmax(0, 1fr); }
          .agyn-tip > .agyn-btn { grid-column: 2; justify-self: start; }
          .agyn-oauth-id { display: none; }
          .agyn-kv { grid-template-columns: 60px minmax(0, 1fr); }
        }
      `;
      document.head.appendChild(style);
    }

    /* ------------------------------------------------------------------- api */

    async function callApi(pathname, method = "GET", body) {
      const res = await fetch(`${API}/${pathname}`, {
        method,
        headers: method === "POST" ? { "content-type": "application/json" } : undefined,
        body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
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

    // "41m", "2h 14m", "3d 4h". Unit letters read the same in every locale.
    function shortDuration(ms) {
      if (ms === null || ms === undefined || !Number.isFinite(ms)) return "–";
      const minutes = Math.floor(ms / 60000);
      if (minutes < 1) return "<1m";
      if (minutes < 60) return `${minutes}m`;
      const hours = Math.floor(minutes / 60);
      if (hours < 48) return minutes % 60 ? `${hours}h ${minutes % 60}m` : `${hours}h`;
      const days = Math.floor(hours / 24);
      return hours % 24 ? `${days}d ${hours % 24}h` : `${days}d`;
    }

    const INTL_LOCALE = { en: "en", "zh-Hant": "zh-TW", zh: "zh-CN" };

    function formatWhen(ms, localeId) {
      try {
        return new Intl.DateTimeFormat(INTL_LOCALE[localeId] ?? "en", {
          weekday: "short",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(new Date(ms));
      } catch {
        return new Date(ms).toLocaleString();
      }
    }

    // Epoch milliseconds, or the ISO 8601 `resetTime` the quota API reports.
    function resetAtOf(win) {
      const raw = win?.resetAt ?? win?.resetTime ?? null;
      const at = typeof raw === "string" ? Date.parse(raw) : raw === null ? NaN : Number(raw);
      return Number.isFinite(at) ? at : null;
    }

    // A reset under a day away reads as a countdown; further out, as a day and time.
    function resetOf(win, now, localeId) {
      const at = resetAtOf(win);
      if (at === null) return null;
      const left = at - now;
      return left < 86400000
        ? { kind: "in", text: shortDuration(Math.max(left, 0)) }
        : { kind: "at", text: formatWhen(at, localeId) };
    }

    // Share remaining, 0–100. The quota API reports the share *remaining*
    // (`remainingFraction`). We display the remaining percentage (e.g. 100% full,
    // dropping down as quota is consumed).
    function pctOf(win) {
      if (!win) return null;
      const remaining = win.remainingFraction !== undefined && win.remainingFraction !== null
        ? Number(win.remainingFraction)
        : win.usedPct !== undefined && win.usedPct !== null
          ? 1 - Number(win.usedPct) / 100
          : null;
      const value = remaining !== null ? remaining * 100 : NaN;
      return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : null;
    }

    // Quota groups for one account. The API reports one group per model family
    // ("Gemini Models", "Claude and GPT models"), each with its own 5-hour and
    // weekly window; the older single-window shape reads as one unnamed group.
    // Whether one id from the quota API names a model this build knows about.
    //
    // The two sides do not spell models the same way. The catalog the user
    // picks from carries tier names (`gemini-3.8-flash`), while the quota API
    // reports the runtime ids it actually serves (`gemini-3.8-flash-tiered`,
    // `claude-opus-4-6-thinking`, `gpt-oss-120b-medium`). In every case the
    // catalog name is the runtime name minus a trailing variant, so accept a
    // shared prefix at a dash boundary.
    //
    // Without this, a backend that forwards the raw API ids makes every group
    // look retired: the ids match nothing, the family is greyed out, and the
    // panel claims there are no usable models while quota is still available.
    // The dash boundary is what keeps `gemini-3.6-flash-low` (a dead id, and
    // not in the catalog) from being read as `gemini-3-flash`.
    function knownModel(roster, id) {
      if (roster.has(id)) return true;
      const own = `${id}-`;
      for (const candidate of roster) {
        if (id.startsWith(`${candidate}-`) || candidate.startsWith(own)) return true;
      }
      return false;
    }

    // A group with no window at all is dropped, so a missing family leaves no
    // empty block behind.
    function groupsOf(usage, roster) {
      if (!usage) return [];
      const raw = Array.isArray(usage.groups)
        ? usage.groups
        : usage.fiveHour || usage.weekly
          ? [{ id: "default", fiveHour: usage.fiveHour, weekly: usage.weekly }]
          : [];
      return raw
        .filter((group) => group && (group.fiveHour || group.weekly))
        .map((group, index) => {
          const ids = Array.isArray(group.modelIds) ? group.modelIds : null;
          // A family whose models have all left the roster still reports a
          // bucket (always 0%); it is greyed out rather than read as free quota.
          const available = group.available === false ? false : ids ? ids.some((id) => knownModel(roster, id)) : true;
          return {
            id: String(group.id ?? index),
            name: group.name ?? null,
            fiveHour: group.fiveHour,
            weekly: group.weekly,
            primary: Boolean(group.primary),
            // Kept so the model list can be grouped by quota family.
            modelIds: ids,
            available,
          };
        });
    }

    // The group to fall back on when a single family has to stand in for an
    // account (the "next account still has N%" line): the one the host marks
    // primary, else the Gemini family, else the first usable one.
    function primaryOf(groups) {
      const usable = groups.filter((group) => group.available);
      return (
        usable.find((group) => group.primary) ??
        usable.find((group) => /gemini/i.test(`${group.id} ${group.name ?? ""}`)) ??
        usable[0] ??
        null
      );
    }

    // Spent when the host says so, or when every usable group has run out of
    // either window: one family at 0% remaining still leaves the other to work with.
    function isFull(account, roster) {
      if (account?.exhausted) return true;
      const usable = groupsOf(account?.usage, roster).filter((group) => group.available);
      return (
        usable.length > 0 &&
        usable.every((group) => {
          const f = pctOf(group.fiveHour);
          const w = pctOf(group.weekly);
          return (f !== null && f <= 0) || (w !== null && w <= 0);
        })
      );
    }

    // Inline stroke icons; no icon library, since nothing may be imported.
    const ICONS = {
      check: ["M5 12.5l4.5 4.5L19 7.5"],
      alert: ["M12 4.5l8.5 15h-17z", "M12 10.5v4", "M12 17.2v.1"],
      info: ["M12 21a9 9 0 1 0 0-18a9 9 0 0 0 0 18z", "M12 11v5", "M12 7.8v.1"],
      user: ["M12 12a4 4 0 1 0 0-8a4 4 0 0 0 0 8z", "M4.5 20c1.4-3.3 4.2-5 7.5-5s6.1 1.7 7.5 5"],
      refresh: ["M19.5 12a7.5 7.5 0 1 1-2.2-5.3", "M19.5 4.5v4.5H15"],
      copy: ["M9 9h10.5v10.5H9z", "M15 9V4.5H4.5V15H9"],
      login: ["M10 4.5H5v15h5", "M14 8l4 4l-4 4", "M18 12H8"],
      plus: ["M12 5v14", "M5 12h14"],
      chevron: ["M6 9l6 6l6-6"],
      arrow: ["M5 12h13", "M13 6l6 6l-6 6"],
      ban: ["M12 21a9 9 0 1 0 0-18a9 9 0 0 0 0 18z", "M5.6 5.6l12.8 12.8"],
      clock: ["M12 21a9 9 0 1 0 0-18a9 9 0 0 0 0 18z", "M12 7.5V12l3 2"],
    };

    function Icon({ name, size = 16, className }) {
      return h(
        "svg",
        {
          className: `agyn-ico${className ? ` ${className}` : ""}`,
          width: size,
          height: size,
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: 1.9,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          "aria-hidden": true,
        },
        (ICONS[name] ?? []).map((d) => h("path", { key: d, d })),
      );
    }

    // `subject` is optional: in a long list it says which row's id is copied.
    function CopyButton({ text, id, copied, onCopy, t, subject }) {
      const done = copied === id;
      const label = `${done ? t("copied") : t("copy")}${subject ? ` ${subject}` : ""}`;
      return h(
        "button",
        {
          type: "button",
          className: `agyn-iconbtn${done ? " agyn-iconbtn-done" : ""}`,
          title: label,
          "aria-label": label,
          onClick: () => onCopy(text, id),
        },
        h(Icon, { name: done ? "check" : "copy", size: 14 }),
      );
    }

    function Callout({ kind, children }) {
      return h(
        "div",
        { className: `agyn-callout agyn-callout-${kind}` },
        h(Icon, { name: kind === "info" ? "info" : "alert", size: 15 }),
        h("div", null, children),
      );
    }

    function Badge({ state, children }) {
      return h("span", { className: `agyn-badge agyn-${state}` }, children);
    }

    /* ---------------------------------------------------------------- ledger */

    // The one number a ledger row shows per quota family: the share remaining
    // in whichever of its two windows is lower.
    function lowOf(group) {
      const values = [pctOf(group.fiveHour), pctOf(group.weekly)].filter((value) => value !== null);
      return values.length ? Math.min(...values) : null;
    }

    // Whole percent for display; anything above zero never reads as "0".
    function fmtPct(pct) {
      return pct > 0 && pct < 1 ? 1 : Math.round(pct);
    }

    function accountName(email) {
      const text = String(email ?? "");
      const at = text.indexOf("@");
      return at > 0 ? text.slice(0, at) : text;
    }

    // "Gemini Models" -> "Gemini", "Claude and GPT models" -> "Claude/GPT": the
    // quota columns are under a hundred pixels wide. Each place that shows the
    // short name keeps the full one in its title attribute.
    function shortGroup(name) {
      const text = String(name ?? "").trim();
      // "Gemini 4 Argon" is a weekly-only family. The column is ~86px, so the
      // header is the codename; the full name stays on the title attribute.
      if (/argon/i.test(text)) return "Argon";
      const short = text
        .replace(/\s+models?$/i, "")
        .replace(/\s+and\s+/gi, "/")
        .replace(/\s*\/\s*/g, "/");
      return short || text;
    }

    function groupLabel(group, t) {
      if (!group.name && (group.id === "default" || group.placeholder)) return t("colUsage");
      return shortGroup(group.name) || String(group.id);
    }

    function resetLine(win, now, localeId, t) {
      const reset = resetOf(win, now, localeId);
      if (!reset) return "";
      return reset.kind === "in" ? t("resetsIn", { time: reset.text }) : t("resetsAt", { when: reset.text });
    }

    // The one-line explanation under a row whose bar is orange or red, built
    // from the same numbers the bars use: a fully spent account says so and when
    // a family comes back; otherwise the single window that is furthest down.
    // `remainMark` is the share remaining at which auto-switch fires. A
    // threshold of 80 (percent used) is 20 here, and a window at or under it is
    // "low". `group` is the family the line is about (null when it is all of them).
    function ledgerNote({ groups, full, remainMark, now, localeId, t }) {
      const usable = groups.filter((group) => group.available);
      if (full) {
        let recoverAt = null;
        for (const group of usable) {
          const spent = [group.fiveHour, group.weekly].filter((win) => {
            const pct = pctOf(win);
            return pct !== null && pct <= 0;
          });
          const times = spent.map(resetAtOf);
          if (!spent.length || times.some((at) => at === null)) continue;
          const at = Math.max(...times);
          recoverAt = recoverAt === null ? at : Math.min(recoverAt, at);
        }
        const parts = [t("allUsedUp")];
        if (recoverAt !== null) parts.push(resetLine({ resetAt: recoverAt }, now, localeId, t));
        return { tone: "off", group: null, text: parts.filter(Boolean).join(" · ") };
      }
      let worst = null;
      for (const group of usable) {
        for (const [key, win] of [
          ["fiveHour", group.fiveHour],
          ["weekly", group.weekly],
        ]) {
          const pct = pctOf(win);
          if (pct === null || pct > remainMark) continue;
          const at = resetAtOf(win);
          const better =
            !worst || pct < worst.pct || (pct === worst.pct && at !== null && (worst.at === null || at < worst.at));
          if (better) worst = { group, win, pct, at, label: t(key === "fiveHour" ? "fiveHour" : "weekly") };
        }
      }
      if (!worst) return null;
      const parts = [
        `${groupLabel(worst.group, t)} ${worst.label}`,
        worst.pct <= 0 ? t("usedUp") : t("leftPct", { pct: fmtPct(worst.pct) }),
        resetLine(worst.win, now, localeId, t),
      ];
      return { tone: worst.pct <= 0 ? "off" : "warn", group: worst.group, text: parts.filter(Boolean).join(" · ") };
    }

    // One quota family on a ledger line: a short bar and the remaining %.
    // Grey for healthy, orange at the auto-switch line, red when spent; a family
    // the account does not report, or one with no models left, shows a dash.
    function LedgerCell({ index, group, label, remainMark }) {
      const off = !group || !group.available;
      const pct = off ? null : lowOf(group);
      const empty = pct !== null && pct <= 0;
      const low = pct !== null && !empty && pct <= remainMark;
      const text = pct === null ? "–" : String(fmtPct(pct));
      return h(
        "span",
        { className: `agyn-q${off ? " agyn-q-off" : ""}`, style: { "--agyn-gi": String(index + 1) } },
        h(
          "span",
          {
            className: `agyn-bar${empty ? " agyn-bar-empty" : low ? " agyn-bar-low" : ""}`,
            role: "img",
            "aria-label": `${label} ${pct === null ? "–" : `${text}%`}`,
          },
          h("i", { style: { width: `${pct ?? 0}%` } }),
        ),
        h("span", { className: `agyn-num${empty ? " agyn-num-off" : ""}`, "aria-hidden": true }, text),
      );
    }

    // One window of one family in an expanded account: percentage, reset, bar.
    function QuotaCell({ windowLabel, label, win, remainMark, now, localeId, t }) {
      const pct = pctOf(win);
      const empty = pct !== null && pct <= 0;
      const low = pct !== null && !empty && pct <= remainMark;
      const text = pct === null ? "–" : `${fmtPct(pct)}%`;
      const reset = resetLine(win, now, localeId, t);
      const rightText = windowLabel && reset ? `${windowLabel} · ${reset}` : windowLabel || reset || "";
      return h(
        "span",
        { className: "agyn-cell" },
        h("span", { className: "agyn-cell-top" }, h("b", null, text), h("span", { title: rightText }, rightText)),
        h(
          "span",
          {
            className: `agyn-bar${empty ? " agyn-bar-empty" : low ? " agyn-bar-low" : ""}`,
            role: "img",
            "aria-label": `${label} ${text}`,
          },
          h("i", { style: { width: `${pct ?? 0}%` } }),
        ),
      );
    }

    // What opens under a ledger row: both windows of every family with their
    // reset times, the token state, and (for the account in use) sign-out.
    // Arranged in side-by-side columns matching the ledger's quota columns above.
    function AccountDetail({ id, row, isNext, remainMark, now, localeId, t, busy, onLogout }) {
      const { account, groups } = row;
      const token = account.stale ? t("tokenStale") : t("tokenLeft", { time: shortDuration(account.expiresInMs) });
      return h(
        "div",
        { className: "agyn-detail", id },
        groups.length
          ? h(
              "div",
              { className: "agyn-detail-groups" },
              groups.map((group) => {
                const name = groupLabel(group, t);
                return h(
                  "div",
                  { key: group.id, className: `agyn-detail-col${group.available ? "" : " agyn-group-off"}` },
                  h("div", { className: "agyn-detail-col-h", title: group.name ?? name }, name),
                  group.available
                    ? [
                        ["fiveHour", t("fiveHour"), group.fiveHour],
                        ["weekly", t("weekly"), group.weekly],
                      ]
                        .filter(([, , win]) => win)
                        .map(([key, label, win]) =>
                          h(QuotaCell, { key, windowLabel: label, label: `${name} ${label}`, win, remainMark, now, localeId, t }),
                        )
                    : h("span", { className: "agyn-detail-note" }, t("groupNoModels")),
                );
              }),
            )
          : h("p", { className: "agyn-sub" }, t("usageUnavailable")),
        h(
          "div",
          { className: "agyn-detail-foot" },
          h("span", null, [isNext ? t("nextUp") : null, token, account.projectId].filter(Boolean).join(" · ")),
          row.isActive
            ? h("button", { type: "button", className: "agyn-btn agyn-btn-danger", onClick: onLogout, disabled: Boolean(busy) }, t("logout"))
            : null,
        ),
      );
    }

    // Quota ids and catalog ids spell a model differently (`-tiered`, `-thinking`
    // suffixes), so a family owns a model when one id is the other plus a
    // dash-separated tail; the same rule knownModel() uses.
    function familyHasModel(family, id) {
      return Boolean(family.modelIds?.some((own) => own === id || own.startsWith(`${id}-`) || id.startsWith(`${own}-`)));
    }

    function ctxLabel(ctx) {
      if (!ctx) return "–";
      return ctx >= 1048576 ? `${Math.round(ctx / 1048576)}M` : `${Math.round(ctx / 1024)}K`;
    }

    function SettingsPage({ ctx, t: hostT }) {
      const [langPref, setLangPref] = React.useState(readLangPref);
      const localeId = langPref || pickLocale(ctx);
      const localT = React.useMemo(() => translator(localeId), [localeId, hostT]);
      // The host's bound translator is authoritative (it re-renders on a locale
      // switch); the local one covers a kernel that does not bind one, and a
      // language the reader pinned with the header switch.
      const t = !langPref && typeof hostT === "function" ? hostT : localT;
      const pickLang = (id) => {
        // Choosing the language already pinned lets go of it, back to the host.
        const next = id === langPref ? "" : id;
        writeLangPref(next);
        setLangPref(next);
      };
      const [status, setStatus] = React.useState(readCachedStatus);
      // false while what is on screen came from the cache and the live answer
      // has not landed yet.
      const [live, setLive] = React.useState(false);
      const [busy, setBusy] = React.useState("");
      const [message, setMessage] = React.useState(null);
      const [copied, setCopied] = React.useState("");
      const [visOverride, setVisOverride] = React.useState({});
      // account id -> opened by hand (true) or closed by hand (false); an account
      // nobody touched is open only while it is the one in use.
      const [expanded, setExpanded] = React.useState(() => readFlags(EXPANDED_KEY));
      const [closedGroups, setClosedGroups] = React.useState(() => readFlags(CLOSED_KEY));
      React.useEffect(() => writeFlags(EXPANDED_KEY, expanded), [expanded]);
      const activeAccountId = Array.isArray(status?.accounts) ? (status.accounts.find((a) => a.active) ?? status.accounts[0])?.id ?? "" : "";
      React.useEffect(() => {
        if (!activeAccountId) return;
        const before = readText(ACTIVE_KEY);
        try {
          window.localStorage.setItem(ACTIVE_KEY, activeAccountId);
        } catch {
          /* only the reset below matters */
        }
        // Nothing saved yet counts as a change too, which clears marks left by a
        // build that did not track this.
        if (before !== activeAccountId) setExpanded({});
      }, [activeAccountId]);
      React.useEffect(() => writeFlags(CLOSED_KEY, closedGroups), [closedGroups]);
      // null = nobody touched it: open exactly when the OAuth client needs setup.
      const [oauthOpen, setOauthOpen] = React.useState(null);
      const oauthRef = React.useRef(null);

      const load = React.useCallback(async () => {
        try {
          const value = await callApi("status");
          rememberStatus(value);
          setStatus(value);
          setLive(true);
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

      // The "copied" tick clears itself; the timer dies with the page.
      React.useEffect(() => {
        if (!copied) return undefined;
        const timer = window.setTimeout(() => setCopied(""), 1400);
        return () => window.clearTimeout(timer);
      }, [copied]);

      const copy = (text, id) => {
        const write = navigator.clipboard?.writeText?.(String(text));
        Promise.resolve(write).then(
          () => setCopied(id),
          () => {},
        );
      };

      const refresh = async () => {
        setBusy("refresh");
        try {
          await load();
        } finally {
          setBusy("");
        }
      };

      const act = async (name, pathname, body) => {
        setBusy(name);
        setMessage(null);
        try {
          const value = await callApi(pathname, "POST", body);
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
        return h(
          "div",
          { className: "agyn-page" },
          h("p", { className: "agyn-loading" }, h(Icon, { name: "refresh", className: "agyn-spin" }), t("refreshing")),
        );
      }

      const now = Date.now();
      const client = status.client ?? {};
      const cred = status.credential ?? {};
      const scopes = status.scopes ?? [];
      const models = status.models ?? [];
      const sourceLabel =
        client.source === "config" ? t("srcConfig") : client.source === "env" ? t("srcEnv") : t("srcFile");
      const clientState = client.configured ? "ok" : client.error ? "warn" : "off";

      // Multi-account, usage, auto-switch and model visibility are optional
      // fields of /status. A host that does not send them gets today's
      // single-account page; nothing below assumes they exist.
      const multi = Array.isArray(status.accounts);
      const accounts = multi
        ? status.accounts
        : cred.present
          ? [
              {
                id: "current",
                email: cred.email ?? null,
                projectId: cred.projectId ?? null,
                active: true,
                expiresInMs: cred.expiresInMs ?? null,
                stale: Boolean(cred.stale),
                usage: status.usage ?? null,
              },
            ]
          : [];
      const roster = new Set(models.map((model) => model.id));
      const active = accounts.find((account) => account.active) ?? accounts[0] ?? null;
      const next = multi
        ? (accounts.find((account) => account.id === status.nextAccountId) ??
          accounts.find((account) => account !== active && !isFull(account, roster)) ??
          null)
        : null;

      // `thresholdPct` is the share USED at which auto-switch fires (the backend
      // default is 80), so the share REMAINING at that point is 100 minus it.
      // A bar at or under that mark is "low" (orange); at zero it is "spent" (red).
      const auto = status.autoSwitch && typeof status.autoSwitch.enabled === "boolean" ? status.autoSwitch : null;
      const threshold = auto && Number.isFinite(auto.thresholdPct) ? auto.thresholdPct : 80;
      const remainMark = Math.max(0, Math.min(100, 100 - threshold));

      // The account in use is always the first line of the ledger.
      const byAvailable = (a, b) => Number(b.available) - Number(a.available);
      const ordered = active ? [active, ...accounts.filter((account) => account !== active)] : accounts;
      const rows = ordered.map((account) => {
        // Usable families first, so one that has lost its models sinks to the end.
        const groups = groupsOf(account.usage, roster).sort(byAvailable);
        const full = isFull(account, roster);
        const isActive = account === active;
        const state = isActive ? "active" : full ? "full" : account === next ? "next" : "standby";
        return { account, groups, full, isActive, state, note: ledgerNote({ groups, full, remainMark, now, localeId, t }) };
      });

      // One ledger column per quota family across all accounts, retired ones last.
      const familyMap = new Map();
      for (const row of rows) {
        for (const group of row.groups) {
          const known = familyMap.get(group.id);
          if (!known) {
            familyMap.set(group.id, {
              id: group.id,
              name: group.name,
              available: group.available,
              modelIds: group.modelIds ? [...group.modelIds] : null,
            });
          } else {
            known.available = known.available || group.available;
            known.name = known.name ?? group.name;
            if (group.modelIds) known.modelIds = [...new Set([...(known.modelIds ?? []), ...group.modelIds])];
          }
        }
      }
      const families = [...familyMap.values()].sort(byAvailable);
      const cols = families.length ? families : [{ id: "_usage", name: null, available: true, placeholder: true }];

      // The "Switch now" prompt only appears when nothing will switch by itself:
      // auto-switch is off, the account in use is low or spent, and a standby
      // account that still has quota is waiting.
      const activeRow = rows.find((row) => row.isActive) ?? null;
      const nextRow = rows.find((row) => row.account === next && row.state === "next") ?? null;
      const tip = activeRow?.note && nextRow && !auto?.enabled ? activeRow.note : null;
      let nextPct = null;
      if (tip && nextRow) {
        const nextGroup = nextRow.groups.find((group) => tip.group && group.id === tip.group.id && group.available) ?? primaryOf(nextRow.groups);
        nextPct = nextGroup ? lowOf(nextGroup) : null;
      }

      const autoLine = auto
        ? auto.enabled
          ? next
            ? t("autoOn", { name: accountName(next.email) || t("unknown"), pct: Math.round(remainMark) })
            : t("noStandbyHint")
          : t("autoOff")
        : null;

      const visSupported = models.some((model) => typeof model.visible === "boolean");
      const isVisible = (model) => visOverride[model.id] ?? model.visible ?? true;
      const visibleCount = models.filter(isVisible).length;

      const saveVisibility = async (override) => {
        const previous = visOverride;
        setVisOverride(override);
        try {
          const visible = models.filter((model) => override[model.id] ?? model.visible ?? true).map((model) => model.id);
          await callApi("models/visibility", "POST", { visible });
          await load();
          setVisOverride({});
        } catch (error) {
          setVisOverride(previous);
          setMessage({ kind: "error", text: t("errorGeneric", { message: error.message }) });
        }
      };
      const setGroupVisible = (list, value) =>
        saveVisibility({ ...visOverride, ...Object.fromEntries(list.map((model) => [model.id, value])) });

      const jumpToOauth = () => {
        setOauthOpen(true);
        window.setTimeout(() => {
          const el = oauthRef.current;
          if (!el || typeof el.scrollIntoView !== "function") return;
          const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
          el.scrollIntoView({ block: "nearest", behavior: calm ? "auto" : "smooth" });
        }, 30);
      };

      // A greyed-out button on its own never says why. When the OAuth client is
      // missing, the reason sits right under it; while merely busy the button is
      // disabled for a moment and needs no explanation. `reasonKey` picks the
      // wording: next to the pool header the setup details are further down.
      const signInButton = (className, reasonKey = "needsClient") =>
        h(
          "span",
          { className: "agyn-action" },
          h(
            "button",
            {
              type: "button",
              className,
              onClick: () => act("login", "login", multi ? { addAccount: true } : undefined),
              disabled: Boolean(busy) || !client.configured,
            },
            h(Icon, { name: multi ? "plus" : "login", size: 14 }),
            busy === "login" ? t("loggingIn") : multi ? t("addAccount") : active ? t("reauth") : t("login"),
          ),
          !client.configured && h("span", { className: "agyn-reason" }, h(Icon, { name: "alert", size: 13 }), t(reasonKey)),
        );

      /* ---- header ---- */
      const chipText = client.configured ? t("chipReady") : client.error ? t("chipClientError") : t("chipNoClient");
      const header = h(
        "header",
        { className: "agyn-top" },
        h(
          "div",
          { className: "agyn-brand" },
          h("h2", { className: "agyn-title" }, t("title")),
          // A build stamp on screen, so "did the new code load?" stops being
          // a guess. The plugin is installed as a link to the source tree, so
          // editing lib/ui.js changes the file instantly, but the page still
          // has to fetch it. Without a visible marker, a stale bundle looks
          // exactly like a broken fix.
          h("span", { className: "agyn-build" }, UI_BUILD),
        ),
        h(
          "div",
          { className: "agyn-top-actions" },
          h(
            "div",
            { className: "agyn-lang", role: "group", "aria-label": "Language" },
            LANGS.map((lang) =>
              h(
                "button",
                {
                  key: lang.id,
                  type: "button",
                  className: `agyn-lang-btn${lang.id === localeId ? " agyn-lang-on" : ""}`,
                  onClick: () => pickLang(lang.id),
                  title: lang.name,
                  "aria-label": lang.name,
                  "aria-pressed": lang.id === localeId,
                },
                lang.short,
              ),
            ),
          ),
          h(
            "button",
            { type: "button", className: "agyn-conn", onClick: jumpToOauth, title: t("chipJump"), "aria-label": `${chipText}, ${t("chipJump")}` },
            h("span", { className: `agyn-dot agyn-tone-${clientState}`, "aria-hidden": true }),
            chipText,
          ),
          h(
            "button",
            {
              type: "button",
              className: "agyn-iconbtn",
              onClick: refresh,
              disabled: Boolean(busy),
              title: t("refresh"),
              "aria-label": t("refresh"),
            },
            h(Icon, { name: "refresh", size: 16, className: busy === "refresh" || !live ? "agyn-spin" : "" }),
          ),
        ),
      );

      /* ---- account ledger ---- */
      const stMark = {
        active: ["on", t("active"), null],
        full: ["full", t("exhausted"), "ban"],
        next: ["next", t("nextUp"), "arrow"],
        standby: ["idle", t("standby"), null],
      };
      const ledgerRows = rows.map((row, index) => {
        const { account } = row;
        const open = expanded[account.id] ?? row.isActive;
        const detailId = `agyn-acc-${index}`;
        const [stKind, stText, stIcon] = stMark[row.state];
        const email = account.email ?? t("unknown");
        return h(
          "li",
          {
            key: account.id,
            className: `agyn-acc agyn-acc-${row.state}${open ? " agyn-acc-open" : ""}${row.note && !open ? " agyn-acc-noted" : ""}`,
          },
          h(
            "div",
            { className: "agyn-line" },
            h(
              "button",
              {
                type: "button",
                className: "agyn-who",
                "aria-expanded": open,
                "aria-controls": detailId,
                onClick: () => setExpanded((prev) => ({ ...prev, [account.id]: !open })),
              },
              h("span", { className: `agyn-st agyn-st-${stKind}`, role: "img", "aria-label": stText }, stIcon ? h(Icon, { name: stIcon, size: 14 }) : null),
              h("span", { className: "agyn-email", title: account.email ?? "" }, email),
              h(Icon, { name: "chevron", size: 14, className: "agyn-chev" }),
            ),
            cols.map((col, i) =>
              h(LedgerCell, {
                key: col.id,
                index: i,
                group: row.groups.find((group) => group.id === col.id) ?? null,
                label: groupLabel(col, t),
                remainMark,
              }),
            ),
            h(
              "span",
              { className: "agyn-act" },
              row.isActive
                ? h("span", { className: "agyn-now" }, t("active"))
                : multi
                  ? h(
                      "button",
                      {
                        type: "button",
                        className: `agyn-btn${row.state === "next" ? " agyn-btn-primary" : ""}`,
                        onClick: () => act("switch", "accounts/switch", { id: account.id }),
                        disabled: Boolean(busy) || row.full,
                        "aria-label": `${row.full ? t("exhausted") : t("switchTo")} ${account.email ?? ""}`.trim(),
                      },
                      row.full ? t("fullShort") : t("switchTo"),
                    )
                  : null,
            ),
          ),
          row.note && !open
            ? h("p", { className: `agyn-note agyn-note-${row.note.tone}` }, h(Icon, { name: "clock", size: 14 }), h("span", null, row.note.text))
            : null,
          open
            ? h(AccountDetail, {
                id: detailId,
                row,
                isNext: row.state === "next",
                remainMark,
                now,
                localeId,
                t,
                busy,
                onLogout: () => act("logout", "logout"),
              })
            : null,
        );
      });

      const pool = h(
        "section",
        { className: "agyn-sec", "aria-labelledby": "agyn-pool-h" },
        h(
          "div",
          { className: "agyn-sec-head" },
          h(
            "div",
            { className: "agyn-sec-title" },
            h("h3", { className: "agyn-h3", id: "agyn-pool-h" }, t("poolTitle")),
            rows.length > 0 && h("span", { className: "agyn-count", title: t("poolCount", { n: rows.length }) }, String(rows.length)),
          ),
          rows.length > 0 &&
            h(
              "div",
              { className: "agyn-tools" },
              auto &&
                h(
                  "label",
                  { className: "agyn-switch" },
                  t("autoSwitch"),
                  h("input", {
                    className: "agyn-sw",
                    type: "checkbox",
                    checked: Boolean(auto.enabled),
                    disabled: Boolean(busy),
                    onChange: (event) => act("auto", "auto-switch", { enabled: event.target.checked }),
                  }),
                ),
              signInButton("agyn-btn", "needsClientBelow"),
            ),
        ),
        autoLine && h("p", { className: "agyn-sub" }, autoLine),
        tip &&
          h(
            "div",
            { className: "agyn-tip", role: "status" },
            h(Icon, { name: "alert", size: 16 }),
            h(
              "p",
              null,
              tip.text,
              nextPct !== null
                ? [" · ", h("b", { key: "who" }, accountName(next.email) || t("unknown")), " ", t("tipNextHas", { pct: fmtPct(nextPct) })]
                : null,
            ),
            h(
              "button",
              {
                type: "button",
                className: "agyn-btn agyn-btn-primary",
                onClick: () => act("switch", "accounts/switch", { id: next.id }),
                disabled: Boolean(busy),
              },
              t("switchNow"),
            ),
          ),
        rows.length > 0
          ? [
              h(
                "div",
                { key: "book", className: "agyn-book", style: { "--agyn-n": String(cols.length) } },
                h(
                  "div",
                  { className: "agyn-cols", "aria-hidden": true },
                  h("span", { className: "agyn-col-acc" }, t("colAccount")),
                  cols.map((col, i) =>
                    h("span", { key: col.id, className: `agyn-col-g${col.available ? "" : " agyn-col-off"}`, style: { "--agyn-gi": String(i + 1) }, title: col.name ?? undefined }, groupLabel(col, t)),
                  ),
                ),
                h("ul", { className: "agyn-ledger" }, ledgerRows),
              ),
              families.length > 0 && h("p", { key: "foot", className: "agyn-foot" }, t("ledgerFoot", { pct: Math.round(remainMark) })),
            ]
          : h(
              "div",
              { className: "agyn-empty" },
              h("p", { className: "agyn-empty-title" }, t("accountMissing")),
              h("p", { className: "agyn-sub" }, t("accountMissingHint")),
              signInButton("agyn-btn agyn-btn-primary"),
            ),
      );

      /* ---- models, grouped by quota family ---- */
      // A model belongs to the first family whose quota ids name it; the rest go
      // under "Other". A family with no models left (or one the host marks
      // unavailable) stays in the list, greyed and noted, after everything else.
      const claimed = new Set();
      const familyGroups = families.map((family) => {
        const own = models.filter((model) => !claimed.has(model.id) && familyHasModel(family, model.id));
        own.forEach((model) => claimed.add(model.id));
        const label = groupLabel(family, t);
        return { key: family.id, label, title: family.name ?? label, available: family.available, models: own };
      });
      const rest = models.filter((model) => !claimed.has(model.id));
      const liveGroups = familyGroups.filter((group) => group.available && group.models.length > 0);
      const retiredGroups = familyGroups.filter((group) => !group.available);
      const otherLabel = liveGroups.length || retiredGroups.length ? t("modelsOther") : t("modelsAll");
      const modelGroups = [
        ...liveGroups,
        ...(rest.length ? [{ key: "__other", label: otherLabel, title: otherLabel, available: true, models: rest }] : []),
        ...retiredGroups,
      ];

      // Every group can be folded on its own, so rows are never truncated.
      const groupViews = modelGroups.map((group) => {
        const open = !closedGroups[group.key];
        const total = group.models.length;
        const on = group.models.filter(isVisible).length;
        const mixed = on > 0 && on < total;
        const listed = open ? group.models : [];
        const toggleGroup = () => setClosedGroups((prev) => ({ ...prev, [group.key]: open }));
        return h(
          "div",
          { key: group.key, className: `agyn-mgroup${open ? "" : " agyn-mg-closed"}${group.available ? "" : " agyn-mg-off"}` },
          h(
            "div",
            {
              className: `agyn-mg-head${total > 0 ? " agyn-mg-fold" : ""}`,
              // The whole bar folds the group; only the tick box inside it
              // (which stops the click) means "select all / none".
              onClick: total > 0 ? toggleGroup : undefined,
            },
            visSupported && total > 0
              ? h(
                  "span",
                  { className: "agyn-mg-label", title: group.title },
                  h("input", {
                    className: "agyn-cb",
                    type: "checkbox",
                    checked: on > 0,
                    // "Some of them" has no HTML attribute, only a DOM property.
                    ref: (el) => {
                      if (el) el.indeterminate = mixed;
                    },
                    "aria-label": group.title,
                    onClick: (event) => event.stopPropagation(),
                    onChange: () => setGroupVisible(group.models, on !== total),
                  }),
                  h("span", null, group.label),
                  h("span", { className: "agyn-mg-n" }, `${on}/${total}`),
                )
              : h(
                  "span",
                  { className: "agyn-mg-label agyn-mg-plain", title: group.title },
                  h("i", { className: "agyn-mg-pad", "aria-hidden": true }),
                  h("span", null, group.label),
                  total > 0 ? h("span", { className: "agyn-mg-n" }, String(total)) : null,
                ),
            total > 0
              ? h(
                  "button",
                  {
                    type: "button",
                    className: "agyn-iconbtn",
                    "aria-expanded": open,
                    "aria-label": open ? t("groupCollapse", { name: group.label }) : t("groupExpand", { name: group.label }),
                    onClick: (event) => {
                      event.stopPropagation();
                      toggleGroup();
                    },
                  },
                  h(Icon, { name: "chevron", size: 14, className: "agyn-chev" }),
                )
              : null,
          ),
          group.available ? null : h("p", { className: "agyn-mg-note" }, t("groupNoModels")),
          listed.length
            ? h(
                "ul",
                { className: "agyn-mlist" },
                listed.map((model) => {
                  const modelOn = isVisible(model);
                  const name = h("span", { className: "agyn-mname", title: model.id }, model.name);
                  return h(
                    "li",
                    { key: model.id, className: `agyn-mrow${modelOn ? "" : " agyn-mrow-off"}` },
                    visSupported
                      ? h(
                          "label",
                          { className: "agyn-mmain" },
                          h("input", {
                            className: "agyn-cb",
                            type: "checkbox",
                            checked: modelOn,
                            onChange: () => saveVisibility({ ...visOverride, [model.id]: !modelOn }),
                          }),
                          name,
                        )
                      : h("span", { className: "agyn-mmain agyn-mmain-plain" }, name),
                    h("span", { className: "agyn-ctx" }, ctxLabel(model.ctx)),
                    h(CopyButton, { text: model.id, id: `model:${model.id}`, copied, onCopy: copy, t, subject: model.id }),
                  );
                }),
              )
            : null,
        );
      });

      const modelsPanel = h(
        "section",
        { className: "agyn-sec", "aria-labelledby": "agyn-models-h" },
        h(
          "div",
          { className: "agyn-sec-head" },
          h(
            "div",
            { className: "agyn-sec-title" },
            h("h3", { className: "agyn-h3", id: "agyn-models-h" }, t("modelsSection")),
            visSupported
              ? [
                  h("span", { key: "count", className: "agyn-count" }, `${visibleCount}/${models.length}`),
                  h("span", { key: "label", className: "agyn-meta" }, t("modelsShown")),
                ]
              : h("span", { className: "agyn-meta" }, t("modelsCount", { n: models.length })),
          ),
        ),
        // The roster comes from the host on every load, so a model that was
        // retired simply drops out of this list and the count; only an empty
        // chat picker is worth calling out.
        visSupported && models.length > 0 && visibleCount === 0 && h(Callout, { kind: "warn" }, t("noneVisible")),
        groupViews,
      );

      /* ---- OAuth client, folded into one footer line ---- */
      const oauthIsOpen = oauthOpen ?? !client.configured;
      const oauth = h(
        "details",
        {
          className: "agyn-oauth",
          id: "agyn-oauth",
          ref: oauthRef,
          open: oauthIsOpen,
          onToggle: (event) => setOauthOpen(event.currentTarget.open),
        },
        h(
          "summary",
          null,
          h("span", { className: "agyn-oauth-k" }, t("clientSection")),
          h(
            Badge,
            { state: clientState },
            client.configured ? `${t("clientOk")} · ${sourceLabel}` : client.error ? t("clientError") : t("clientMissing"),
          ),
          client.configured && client.clientIdPreview ? h("span", { className: "agyn-oauth-id" }, client.clientIdPreview) : null,
          h("span", { className: "agyn-oauth-chev" }, h(Icon, { name: "chevron", size: 14, className: "agyn-chev" })),
        ),
        h(
          "div",
          { className: "agyn-oauth-body" },
          !client.configured && h(Callout, { kind: "warn" }, t(cred.importedFrom ? "hintImported" : "hintMissing")),
          h(
            "dl",
            { className: "agyn-kv" },
            client.configured && [
              h("dt", { key: "src-k" }, t("kvSource")),
              h("dd", { key: "src-v", className: "agyn-plain" }, sourceLabel),
            ],
            client.clientIdPreview && [
              h("dt", { key: "id-k" }, "Client ID"),
              h("dd", { key: "id-v" }, client.clientIdPreview),
            ],
            client.path && [
              h("dt", { key: "path-k" }, t("kvPath")),
              h(
                "dd",
                { key: "path-v" },
                h("div", { className: "agyn-path" }, h("span", null, client.path), h(CopyButton, { text: client.path, id: "path", copied, onCopy: copy, t, subject: t("kvPath") })),
              ),
            ],
            scopes.length > 0 && [
              h("dt", { key: "scope-k" }, t("kvScopes")),
              h(
                "dd",
                { key: "scope-v", className: "agyn-plain" },
                h(
                  "div",
                  { className: "agyn-scopes" },
                  scopes.map((scope) => h("span", { key: scope, className: "agyn-scope", title: scope }, scope.split("/auth/")[1] ?? scope)),
                ),
              ),
            ],
          ),
        ),
      );

      return h(
        "div",
        { className: "agyn-page" },
        header,
        message &&
          h(
            Callout,
            { kind: message.kind === "error" ? "error" : "info" },
            message.text,
            message.authUrl ? " " : "",
            message.authUrl
              ? h("a", { href: message.authUrl, target: "_blank", rel: "noopener noreferrer" }, t("openAgain"))
              : null,
          ),
        pool,
        modelsPanel,
        oauth,
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
