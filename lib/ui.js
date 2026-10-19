window.__ModuleLoader__.load({
  id: "agy-next",
  factory(require) {
    const React = require("react");
    const h = React.createElement;

    const API = "/agy-next/api";
    const NS = "agy-next";
    const STYLE_ID = "agy-next-settings-style";
    // Bump this whenever lib/ui.js changes in a way the user should be able to
    // confirm on screen. It is rendered next to the "Provider / AGY-Next"
    // eyebrow, so a page that still shows the old stamp is a page that has not
    // loaded the new file yet.
    const UI_BUILD = "u9";

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
        hintMissing:
          "No OAuth client yet. In a terminal, cd into the agy-next package directory and run npm run login — or see SETUP.md for the three minutes in Google Cloud Console.",
        accountMissing: "Not signed in",
        accountMissingHint: "Sign in with Google to start using these models.",
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
        threshold: "Line = auto-switch threshold {pct}%",
        switchNow: "Switch now",
        switchTo: "Switch",
        noStandby: "No standby account",
        noStandbyHint: "Add another account so work can carry on when this one runs out.",
        poolTitle: "Account pool",
        poolCount: "{n} authorized",
        autoSwitch: "Auto-switch when quota runs out",
        colAccount: "Account",
        colFiveHour: "5H · reset",
        colWeekly: "Weekly · reset",
        colStatus: "Status",
        miniWeekly: "Wk",
        modelsSection: "Models",
        modelsCount: "{n} models",
        modelsShown: "shown in chat",
        selectAll: "All",
        selectNone: "None",
        hidden: "hidden",
        showAll: "Show all {n} models",
        showLess: "Show fewer",
        groupNoModels: "No models available in this group",
        poolBasis: "Bars show {name}",
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
        hintMissing:
          "還沒有 OAuth 用戶端。在終端機切到 agy-next 套件目錄執行 npm run login，或看 SETUP.md——它會帶你走完 Google Cloud Console 那三分鐘。",
        accountMissing: "尚未登入",
        accountMissingHint: "用 Google 帳號登入後就能使用這些模型。",
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
        threshold: "橘線 = 自動切換門檻 {pct}%",
        switchNow: "立即切換",
        switchTo: "切換",
        noStandby: "沒有待命帳號",
        noStandbyHint: "再加一個帳號，這個額度用完時就能接著用。",
        poolTitle: "帳號池",
        poolCount: "{n} 個已授權",
        autoSwitch: "額度滿時自動切換",
        colAccount: "帳號",
        colFiveHour: "5H · 重置",
        colWeekly: "每週 · 重置",
        colStatus: "狀態",
        miniWeekly: "週",
        modelsSection: "模型",
        modelsCount: "{n} 個模型",
        modelsShown: "顯示在聊天視窗",
        selectAll: "全選",
        selectNone: "全不選",
        hidden: "已隱藏",
        showAll: "展開全部 {n} 個模型",
        showLess: "收合",
        groupNoModels: "這組目前沒有可用模型",
        poolBasis: "用量條以 {name} 為準",
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
        hintMissing:
          "还没有 OAuth 客户端。在终端切到 agy-next 套件目录运行 npm run login，或看 SETUP.md——它会带你走完 Google Cloud Console 那三分钟。",
        accountMissing: "尚未登录",
        accountMissingHint: "用 Google 账号登录后就能使用这些模型。",
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
        threshold: "橙线 = 自动切换门槛 {pct}%",
        switchNow: "立即切换",
        switchTo: "切换",
        noStandby: "没有待命账号",
        noStandbyHint: "再加一个账号，这个额度用完时就能接着用。",
        poolTitle: "账号池",
        poolCount: "{n} 个已授权",
        autoSwitch: "额度满时自动切换",
        colAccount: "账号",
        colFiveHour: "5H · 重置",
        colWeekly: "每周 · 重置",
        colStatus: "状态",
        miniWeekly: "周",
        modelsSection: "模型",
        modelsCount: "{n} 个模型",
        modelsShown: "显示在聊天窗口",
        selectAll: "全选",
        selectNone: "全不选",
        hidden: "已隐藏",
        showAll: "展开全部 {n} 个模型",
        showLess: "收起",
        groupNoModels: "这组目前没有可用模型",
        poolBasis: "用量条以 {name} 为准",
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
      // (label-*, bg-layer-*, border-l*, state-*); an undefined alias resolves to
      // nothing, which is how the cards once lost their border and fill. The
      // literal fallbacks after the three state tokens are status tints only.
      // Every tint, the inverted "ink" panel and the dot grid are mixed from
      // those tokens so they follow the theme too.
      style.textContent = `
        .agyn-page {
          --agyn-fg: var(--dsw-alias-label-primary);
          --agyn-fg2: var(--dsw-alias-label-secondary);
          --agyn-fg3: var(--dsw-alias-label-tertiary);
          --agyn-surface: var(--dsw-alias-bg-layer-1);
          --agyn-sunk: var(--dsw-alias-bg-layer-2);
          --agyn-line: var(--dsw-alias-border-l1);
          --agyn-line2: var(--dsw-alias-border-l2);
          /* The accent is the design's own blue. DSH has no alias that carries
             it: --dsw-alias-brand-primary is a monochrome neutral
             (neutral-bluish-1000 in the light theme, -50 in the dark one), so
             binding the accent to it painted the "next up" tile, every avatar,
             the 8/13 pill, the switch, the checkboxes and the usage bars
             near-black (#0f1115) instead of blue. The closest alias,
             --dsw-alias-state-business-primary, is #4176e6 light / #7aaaff
             dark: lighter than the design, and in the dark theme white text on
             it drops to 1.9:1. This is a fixed brand colour rather than a
             themed surface, so it is written literally, which practices.md
             allows for artwork. Cross-checked against the mock-up rather than
             eyeballed: 9% of it mixed into the card surface gives exactly
             #eceef5, the pale blue the mock-up uses behind model rows, and 50%
             into white gives #98aae2, which matches the #95a9e0 tick runs
             sampled inside the dark usage panel. */
          --agyn-accent: #3255c6;
          --agyn-on-accent: #fdfcfa;
          /* Text and outline uses need a lighter blue in the dark theme, where
             #3255c6 on a near-black page is only 2.9:1. Fills keep the literal
             so the card and the pills stay identical in both themes. */
          --agyn-accent-text: var(--agyn-accent);
          --agyn-hover: var(--dsw-alias-interactive-bg-hover, var(--dsw-alias-bg-layer-2));
          --agyn-ok: var(--dsw-alias-state-success-primary, #1e8a63);
          --agyn-off: var(--dsw-alias-state-error-primary, #b23b4b);
          --agyn-warn: var(--dsw-alias-state-warn-primary, #c2410c);
          /* The dark panel is the mock-up's charcoal, not a mix of the accent:
             the mock-up's panel carries no blue cast at all (r38 g39 b45), so
             mixing the blue into the foreground darkened it to #121623 and
             shifted it navy. The first declaration is the fallback so an
             unsupported value degrades the panel instead of collapsing it to
             transparent, which is what erased this panel before. */
          --agyn-ink: var(--dsw-alias-label-primary);
          --agyn-ink: #26272d;
          --agyn-on-ink: #fdfcfa;
          --agyn-ink-dim: color-mix(in srgb, var(--agyn-on-ink) 62%, var(--agyn-ink));
          --agyn-ink-line: color-mix(in srgb, var(--agyn-on-ink) 14%, transparent);
          --agyn-mono: ui-monospace, "JetBrains Mono", SFMono-Regular, Menlo, Consolas, monospace;
          container: agyn / inline-size;
          display: flex; flex-direction: column; gap: 14px; padding: 24px; border-radius: 20px; color: var(--agyn-fg);
          background-color: var(--agyn-sunk);
          background-image: radial-gradient(var(--agyn-line2) 1px, transparent 1px);
          background-size: 20px 20px;
        }
        /* The "ink" panel inverts the label colour, which in a dark theme would
           turn it into a light slab. dsh marks its dark theme with
           body[data-ds-dark-theme] (verified in the installed
           @deepseek-ai/dsh-client-ui-theme bundle), so the panel becomes a
           raised dark surface there instead. The earlier :root[data-theme="dark"]
           selector matched nothing — the panel stayed a white slab. */
        body[data-ds-dark-theme] .agyn-page { --agyn-ink: var(--dsw-alias-bg-layer-3); --agyn-on-ink: var(--dsw-alias-label-primary); --agyn-accent-text: var(--dsw-alias-state-business-primary); }
        body[data-ds-dark-theme] .agyn-usage { box-shadow: inset 0 0 0 1px var(--agyn-line2); }
        .agyn-page > * { animation: agyn-in .32s cubic-bezier(.2,.7,.2,1) both; }
        .agyn-page > :nth-child(2) { animation-delay: .04s; }
        .agyn-page > :nth-child(3) { animation-delay: .08s; }
        .agyn-page > :nth-child(4) { animation-delay: .12s; }
        .agyn-page > :nth-child(5) { animation-delay: .16s; }
        .agyn-page > :nth-child(6) { animation-delay: .2s; }
        @keyframes agyn-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        @keyframes agyn-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          .agyn-page *, .agyn-page > * { animation: none !important; transition: none !important; }
        }
        .agyn-ico { flex: 0 0 auto; display: block; }
        .agyn-spin { animation: agyn-spin .8s linear infinite; }
        .agyn-mono { font-family: var(--agyn-mono); }

        /* header */
        .agyn-top { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 16px 24px; padding-bottom: 6px; }
        .agyn-top > div:first-child { min-width: 0; }
        .agyn-eyebrow { font-family: var(--agyn-mono); font-size: 11px; line-height: 16px; letter-spacing: .14em; text-transform: uppercase; color: var(--agyn-fg3); }
        .agyn-build { margin-left: 8px; padding: 1px 5px; border-radius: 4px; background: var(--agyn-sunk); color: var(--agyn-fg3); font-size: 9.5px; letter-spacing: .04em; vertical-align: 1px; }
        .agyn-h2 { margin: 6px 0 0; font-size: 40px; font-weight: 900; line-height: .95; letter-spacing: -.035em; color: var(--agyn-fg); }
        .agyn-sub { margin: 10px 0 0; max-width: 46ch; font-size: 12.5px; line-height: 19px; color: var(--agyn-fg3); }
        .agyn-top-actions { display: flex; align-items: center; gap: 10px; }
        .agyn-live {
          display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 14px; border-radius: 999px;
          background: var(--agyn-ink); color: var(--agyn-on-ink);
          font-family: var(--agyn-mono); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; white-space: nowrap;
        }
        .agyn-live::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: var(--agyn-tone); box-shadow: 0 0 0 3px color-mix(in srgb, var(--agyn-tone) 30%, transparent); }
        .agyn-tone-ok { --agyn-tone: var(--agyn-ok); }
        .agyn-tone-warn { --agyn-tone: var(--agyn-warn); }
        .agyn-tone-off { --agyn-tone: var(--agyn-off); }
        .agyn-round {
          appearance: none; display: grid; place-items: center; width: 36px; height: 36px; padding: 0; flex: 0 0 auto;
          border: 1.5px solid var(--agyn-fg); border-radius: 50%; background: transparent; color: var(--agyn-fg); cursor: pointer;
          transition: background-color .15s;
        }
        .agyn-round:hover:not(:disabled) { background: var(--agyn-hover); }
        .agyn-round:disabled { opacity: .5; cursor: default; }

        /* bento */
        .agyn-bento { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
        .agyn-usage { grid-column: span 2; display: flex; flex-direction: column; gap: 20px; padding: 24px; border-radius: 20px; background: var(--agyn-ink); color: var(--agyn-on-ink); }
        .agyn-usage-full { grid-column: 1 / -1; }
        .agyn-usage-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .agyn-usage .agyn-eyebrow { color: var(--agyn-ink-dim); }
        .agyn-who { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .agyn-who-text { display: flex; flex-direction: column; min-width: 0; }
        .agyn-who-name { font-size: 14px; font-weight: 500; line-height: 20px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .agyn-who-meta { font-family: var(--agyn-mono); font-size: 11px; line-height: 16px; color: var(--agyn-ink-dim); }
        .agyn-avatar { display: grid; place-items: center; width: 32px; height: 32px; flex: 0 0 auto; border-radius: 50%; background: var(--agyn-accent); color: var(--agyn-on-accent); font-size: 14px; font-weight: 700; }
        .agyn-avatar-muted { background: var(--agyn-line); color: var(--agyn-fg); }
        .agyn-avatar-ghost { background: var(--agyn-ink-line); color: var(--agyn-on-ink); }
        .agyn-meter { display: flex; flex-direction: column; gap: 10px; }
        .agyn-meter-label { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; font-size: 13px; color: color-mix(in srgb, var(--agyn-on-ink) 80%, var(--agyn-ink)); }
        .agyn-meter-label .agyn-mono { font-size: 12px; color: var(--agyn-ink-dim); white-space: nowrap; }
        .agyn-meter-row { display: flex; align-items: center; gap: 16px; }
        .agyn-big { flex: 0 0 auto; width: 136px; font-family: var(--agyn-mono); font-size: 50px; font-weight: 800; line-height: 1; letter-spacing: -.04em; font-variant-numeric: tabular-nums; }
        .agyn-big small { font-size: 22px; font-weight: 700; color: var(--agyn-ink-dim); }
        .agyn-ticks {
          --agyn-tick: color-mix(in srgb, var(--agyn-accent) 50%, var(--agyn-on-ink));
          position: relative; flex: 1 1 auto; height: 38px;
          background: repeating-linear-gradient(90deg, var(--agyn-ink-line) 0 5px, transparent 5px 9px);
        }
        .agyn-ticks-hot { --agyn-tick: var(--agyn-warn); }
        .agyn-ticks-full { --agyn-tick: var(--agyn-off); }
        .agyn-ticks-fill { position: absolute; top: 0; bottom: 0; left: 0; background: repeating-linear-gradient(90deg, var(--agyn-tick) 0 5px, transparent 5px 9px); transition: width .6s cubic-bezier(.2,.7,.2,1); }
        .agyn-ticks-mark { position: absolute; top: -4px; bottom: -4px; width: 2px; margin-left: -1px; background: var(--agyn-warn); }
        .agyn-usage-foot { display: flex; align-items: center; gap: 8px; margin: 0; padding-top: 14px; border-top: 1px solid var(--agyn-ink-line); font-size: 12px; color: var(--agyn-ink-dim); }
        .agyn-usage-foot::before { content: ""; width: 10px; height: 2px; background: var(--agyn-warn); }
        .agyn-usage-empty { margin: 0; padding: 14px 0 0; border-top: 1px dashed var(--agyn-ink-line); font-size: 13px; line-height: 20px; color: var(--agyn-ink-dim); }
        .agyn-group { display: flex; flex-direction: column; gap: 14px; }
        .agyn-group + .agyn-group { padding-top: 18px; border-top: 1px solid var(--agyn-ink-line); }
        .agyn-group-name { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; font-family: var(--agyn-mono); font-size: 11px; line-height: 16px; letter-spacing: .1em; text-transform: uppercase; color: var(--agyn-ink-dim); }
        .agyn-group-note { padding: 1px 8px; border-radius: 999px; border: 1px solid var(--agyn-ink-line); font-family: inherit; letter-spacing: 0; text-transform: none; }
        .agyn-group-meters { display: flex; flex-direction: column; gap: 20px; }
        .agyn-group-compact .agyn-group-meters { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
        .agyn-group-off { opacity: .5; }
        .agyn-meter-compact .agyn-meter-row { gap: 12px; }
        .agyn-meter-compact .agyn-big { width: 74px; font-size: 30px; }
        .agyn-meter-compact .agyn-big small { font-size: 14px; }
        .agyn-meter-compact .agyn-ticks { height: 26px; }
        .agyn-signin { display: flex; flex-direction: column; align-items: flex-start; gap: 10px; }
        .agyn-signin-title { margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -.02em; }
        .agyn-signin-hint { margin: 0; font-size: 13px; line-height: 20px; color: var(--agyn-ink-dim); }

        .agyn-next { display: flex; flex-direction: column; gap: 16px; padding: 22px; border-radius: 20px; background: var(--agyn-accent); color: var(--agyn-on-accent); }
        .agyn-next .agyn-eyebrow { color: color-mix(in srgb, var(--agyn-on-accent) 75%, var(--agyn-accent)); }
        .agyn-next-avatar { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; background: var(--agyn-on-accent); color: var(--agyn-accent); font-size: 18px; font-weight: 900; }
        .agyn-next-name { font-size: 16px; font-weight: 700; line-height: 22px; overflow-wrap: anywhere; }
        .agyn-next-bars { display: flex; flex-direction: column; gap: 8px; margin-top: auto; }
        .agyn-next-row { display: flex; justify-content: space-between; gap: 8px; font-family: var(--agyn-mono); font-size: 11px; color: color-mix(in srgb, var(--agyn-on-accent) 85%, var(--agyn-accent)); }
        .agyn-next-track { height: 5px; border-radius: 5px; background: color-mix(in srgb, var(--agyn-on-accent) 22%, transparent); overflow: hidden; }
        .agyn-next-track > i { display: block; height: 100%; border-radius: 5px; background: var(--agyn-on-accent); }
        .agyn-next-empty { background: var(--agyn-surface); color: var(--agyn-fg); border: 1.5px dashed var(--agyn-line2); }
        .agyn-next-empty .agyn-eyebrow { color: var(--agyn-fg3); }
        .agyn-next-empty p { margin: 0; font-size: 13px; line-height: 20px; color: var(--agyn-fg2); }
        .agyn-next-empty strong { font-size: 16px; }

        /* panels */
        .agyn-panel { display: flex; flex-direction: column; padding: 22px 24px; border-radius: 20px; background: var(--agyn-surface); border: 1px solid var(--agyn-line); }
        .agyn-panel-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px 16px; padding-bottom: 14px; }
        .agyn-title-row { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .agyn-h3 { margin: 0; font-size: 18px; font-weight: 900; line-height: 24px; letter-spacing: -.01em; color: var(--agyn-fg); }
        .agyn-meta { font-family: var(--agyn-mono); font-size: 12px; color: var(--agyn-fg3); white-space: nowrap; }
        .agyn-head-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 16px; }

        .agyn-switch { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--agyn-fg); white-space: nowrap; cursor: pointer; }
        .agyn-sw { appearance: none; -webkit-appearance: none; margin: 0; flex: 0 0 auto; position: relative; width: 46px; height: 26px; border-radius: 999px; background: var(--agyn-line2); cursor: pointer; transition: background-color .15s; }
        .agyn-sw::after { content: ""; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: var(--agyn-surface); box-shadow: 0 1px 3px color-mix(in srgb, var(--agyn-fg) 30%, transparent); transition: transform .15s; }
        .agyn-sw:checked { background: var(--agyn-accent); }
        .agyn-sw:checked::after { transform: translateX(20px); }
        .agyn-sw:focus-visible { outline: 2px solid var(--agyn-accent-text); outline-offset: 2px; }
        .agyn-sw:disabled { opacity: .5; cursor: default; }

        /* account pool */
        /* The pool header is a grid so one DOM serves both layouts: a single
           row of four cells when wide, two rows when narrow. Every cell is
           placed by grid-area, so the order of the children never matters. It
           comes after .agyn-panel-head on purpose, to take over its display. */
        .agyn-pool-bar { display: grid; grid-template-columns: auto minmax(0, 1fr) auto auto; align-items: center; gap: 10px 16px; }
        .agyn-pool-bar > .agyn-title-row { grid-area: 1 / 1; }
        .agyn-pool-basis { grid-area: 1 / 2; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
        .agyn-pool-basis::before { content: "· "; }
        .agyn-pool-bar > .agyn-switch { grid-area: 1 / 3; }
        .agyn-pool-bar > .agyn-action { grid-area: 1 / 4; justify-self: end; }
        .agyn-pool-head, .agyn-pool-row { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1.15fr) minmax(0, 1.15fr) 104px 72px; align-items: center; gap: 16px; }
        .agyn-pool-head { padding: 8px 0; border-top: 1.5px solid var(--agyn-fg); font-family: var(--agyn-mono); font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase; color: var(--agyn-fg3); }
        .agyn-pool-row { min-height: 60px; border-top: 1px solid var(--agyn-line); }
        .agyn-pool-row-active { box-shadow: inset 3px 0 0 var(--agyn-accent); margin-left: -12px; padding-left: 12px; }
        /* Wraps the status chip and the action button. Wide, it is transparent to
           the row's five columns; narrow, it becomes one right-aligned cluster. */
        .agyn-pool-end { display: contents; }
        .agyn-acct { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .agyn-acct .agyn-avatar { width: 30px; height: 30px; font-size: 13px; }
        .agyn-acct-text { display: flex; flex-direction: column; min-width: 0; }
        .agyn-acct-name { font-size: 14px; font-weight: 500; line-height: 20px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .agyn-acct-meta { font-family: var(--agyn-mono); font-size: 11px; line-height: 16px; color: var(--agyn-fg3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .agyn-mini { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
        .agyn-mini-track { height: 6px; border-radius: 6px; background: var(--agyn-line); overflow: hidden; }
        .agyn-mini-track > i { display: block; height: 100%; border-radius: 6px; }
        .agyn-fill-accent { background: var(--agyn-accent); }
        .agyn-fill-ok { background: var(--agyn-ok); }
        .agyn-fill-warn { background: var(--agyn-warn); }
        .agyn-fill-off { background: var(--agyn-off); }
        .agyn-mini-label { display: flex; justify-content: space-between; gap: 6px; font-family: var(--agyn-mono); font-size: 11px; line-height: 16px; color: var(--agyn-fg2); white-space: nowrap; }
        /* The window key ("5H" / "週") only shows once the column header is hidden. */
        .agyn-mini-k { display: none; margin-right: 6px; color: var(--agyn-fg3); font-weight: 400; }
        .agyn-mini-reset { color: var(--agyn-fg3); overflow: hidden; text-overflow: ellipsis; }
        .agyn-mini-full, .agyn-mini-full .agyn-mini-reset { color: var(--agyn-off); font-weight: 700; }
        .agyn-state { justify-self: start; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 500; line-height: 18px; white-space: nowrap; }
        .agyn-state-active { background: var(--agyn-ink); color: var(--agyn-on-ink); }
        .agyn-state-next { background: color-mix(in srgb, var(--agyn-ok) 15%, transparent); color: var(--agyn-ok); }
        .agyn-state-standby { background: var(--agyn-sunk); color: var(--agyn-fg2); }
        .agyn-state-full { background: color-mix(in srgb, var(--agyn-off) 13%, transparent); color: var(--agyn-off); }
        .agyn-pool-action { justify-self: end; }

        /* buttons */
        .agyn-btn {
          appearance: none; display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 36px; padding: 0 14px;
          border: 1.5px solid var(--agyn-fg); border-radius: 9px; background: transparent; color: var(--agyn-fg);
          font: inherit; font-size: 13px; font-weight: 700; line-height: 18px; white-space: nowrap; cursor: pointer;
          transition: background-color .15s, transform .1s, opacity .15s;
        }
        .agyn-btn:hover:not(:disabled) { background: var(--agyn-hover); }
        .agyn-btn:active:not(:disabled) { transform: translateY(1px); }
        .agyn-btn:focus-visible, .agyn-round:focus-visible, .agyn-iconbtn:focus-visible, .agyn-linkbtn:focus-visible { outline: 2px solid var(--agyn-accent-text); outline-offset: 2px; }
        .agyn-btn:disabled { opacity: .45; cursor: default; }
        .agyn-btn-ink { background: var(--agyn-fg); border-color: var(--agyn-fg); color: var(--agyn-surface); }
        .agyn-btn-ink:hover:not(:disabled) { background: color-mix(in srgb, var(--agyn-fg) 85%, var(--agyn-surface)); }
        .agyn-btn-oninverse { height: 40px; border: 0; background: var(--agyn-on-ink); color: var(--agyn-ink); }
        .agyn-btn-oninverse:hover:not(:disabled) { background: color-mix(in srgb, var(--agyn-on-ink) 88%, var(--agyn-ink)); }
        .agyn-btn-onaccent { height: 40px; border: 0; background: var(--agyn-on-accent); color: var(--agyn-accent); font-size: 14px; }
        .agyn-btn-onaccent:hover:not(:disabled) { background: color-mix(in srgb, var(--agyn-on-accent) 88%, var(--agyn-accent)); }
        .agyn-btn-danger { border-color: color-mix(in srgb, var(--agyn-off) 35%, transparent); color: var(--agyn-off); }
        .agyn-btn-danger:hover:not(:disabled) { background: color-mix(in srgb, var(--agyn-off) 8%, transparent); }
        .agyn-iconbtn { appearance: none; display: inline-grid; place-items: center; flex: 0 0 auto; width: 30px; height: 30px; padding: 0; border: 0; border-radius: 8px; background: transparent; color: var(--agyn-fg3); cursor: pointer; transition: background-color .15s, color .15s; }
        .agyn-iconbtn:hover { background: var(--agyn-hover); color: var(--agyn-fg); }
        .agyn-iconbtn-done { color: var(--agyn-ok); }
        .agyn-linkbtn { appearance: none; padding: 0; border: 0; background: none; color: var(--agyn-accent-text); font: inherit; font-size: 13px; font-weight: 500; cursor: pointer; }
        .agyn-linkbtn:hover { text-decoration: underline; }
        .agyn-linkbtn:disabled { opacity: .5; cursor: default; text-decoration: none; }
        /* A button that can be disabled, plus the reason it is. */
        .agyn-action { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; min-width: 0; }
        .agyn-reason { display: inline-flex; align-items: flex-start; gap: 5px; font-size: 11.5px; line-height: 16px; color: var(--agyn-fg2); }
        .agyn-reason .agyn-ico { margin-top: 1.5px; color: var(--agyn-warn); }
        .agyn-usage .agyn-reason { color: var(--agyn-ink-dim); }
        .agyn-signin .agyn-action { align-items: flex-start; }
        .agyn-next .agyn-action { align-items: stretch; }

        /* models */
        .agyn-pill { display: inline-flex; align-items: baseline; gap: 1px; padding: 3px 10px; border-radius: 999px; background: var(--agyn-accent); color: var(--agyn-on-accent); font-family: var(--agyn-mono); font-size: 13px; font-weight: 800; line-height: 18px; }
        .agyn-pill small { font-size: 12px; font-weight: 500; opacity: .75; }
        .agyn-models { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; padding-top: 12px; border-top: 1.5px solid var(--agyn-fg); }
        .agyn-model { display: flex; align-items: center; gap: 10px; min-height: 52px; padding: 0 6px 0 12px; border-radius: 12px; border: 1px solid transparent; background: color-mix(in srgb, var(--agyn-accent) 9%, var(--agyn-surface)); }
        .agyn-model-off { background: transparent; border: 1px dashed var(--agyn-line2); }
        .agyn-model-off .agyn-model-name, .agyn-model-off .agyn-model-ctx { color: var(--agyn-fg2); }
        .agyn-model-main { display: flex; align-items: center; gap: 12px; flex: 1 1 auto; min-width: 0; }
        label.agyn-model-main { cursor: pointer; }
        .agyn-model-main input { width: 18px; height: 18px; margin: 0; flex: 0 0 auto; accent-color: var(--agyn-accent); cursor: pointer; }
        .agyn-model-text { display: flex; flex-direction: column; min-width: 0; }
        .agyn-model-name { font-size: 14px; font-weight: 700; line-height: 20px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .agyn-model-id { font-family: var(--agyn-mono); font-size: 11px; line-height: 16px; color: var(--agyn-fg3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .agyn-model-ctx { font-family: var(--agyn-mono); font-size: 12px; font-weight: 700; }
        .agyn-more { align-self: flex-start; margin-top: 12px; }

        /* oauth strip */
        .agyn-oauth { display: flex; flex-wrap: wrap; align-items: center; gap: 16px 20px; padding: 18px 24px; border-radius: 20px; background: var(--agyn-surface); border: 1px solid var(--agyn-line); }
        .agyn-oauth-body { display: flex; flex-direction: column; gap: 6px; flex: 1 1 320px; min-width: 0; }
        .agyn-oauth-line { display: flex; align-items: center; gap: 8px; min-width: 0; font-family: var(--agyn-mono); font-size: 12px; line-height: 18px; color: var(--agyn-fg); }
        .agyn-oauth-line > span { min-width: 0; overflow-wrap: anywhere; }
        .agyn-oauth-line .agyn-k { font-family: inherit; color: var(--agyn-fg3); flex: 0 0 auto; }
        .agyn-scopes { display: flex; flex-wrap: wrap; gap: 6px; padding-top: 4px; }
        .agyn-scope { padding: 2px 8px; border: 1px solid var(--agyn-fg); border-radius: 6px; font-family: var(--agyn-mono); font-size: 11px; line-height: 16px; color: var(--agyn-fg); }

        .agyn-badge { display: inline-flex; align-items: center; gap: 6px; flex: 0 0 auto; padding: 1px 9px 1px 7px; border-radius: 999px; font-family: inherit; font-size: 11px; font-weight: 500; line-height: 18px; letter-spacing: 0; text-transform: none; white-space: nowrap; }
        .agyn-badge::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
        .agyn-ok { color: var(--agyn-ok); background: color-mix(in srgb, var(--agyn-ok) 13%, transparent); }
        .agyn-off { color: var(--agyn-off); background: color-mix(in srgb, var(--agyn-off) 13%, transparent); }
        .agyn-warn { color: var(--agyn-warn); background: color-mix(in srgb, var(--agyn-warn) 13%, transparent); }

        .agyn-callout { display: flex; gap: 10px; align-items: flex-start; margin: 0; padding: 10px 12px; border-radius: 10px; font-size: 12.5px; line-height: 19px; color: var(--agyn-fg); background: var(--agyn-surface); border: 1px solid var(--agyn-line); }
        .agyn-callout .agyn-ico { margin-top: 1px; }
        .agyn-callout-warn { background: color-mix(in srgb, var(--agyn-warn) 8%, var(--agyn-surface)); border-color: color-mix(in srgb, var(--agyn-warn) 26%, transparent); }
        .agyn-callout-warn .agyn-ico { color: var(--agyn-warn); }
        .agyn-callout-error { background: color-mix(in srgb, var(--agyn-off) 8%, var(--agyn-surface)); border-color: color-mix(in srgb, var(--agyn-off) 26%, transparent); }
        .agyn-callout-error .agyn-ico { color: var(--agyn-off); }
        .agyn-callout-info { background: color-mix(in srgb, var(--agyn-accent) 8%, var(--agyn-surface)); border-color: color-mix(in srgb, var(--agyn-accent) 26%, transparent); }
        .agyn-callout-info .agyn-ico { color: var(--agyn-accent-text); }
        .agyn-callout a { color: var(--agyn-accent-text); font-weight: 500; }

        .agyn-loading { display: flex; align-items: center; gap: 8px; margin: 0; padding: 24px 4px; font-size: 13px; color: var(--agyn-fg2); }

        /* narrow settings pane.
           Both breakpoints are container queries on the page's content width,
           which is its own box minus the 24px padding. The settings dialog is a
           fixed 559px wide, so the real pane lands on 511px; that is the width
           the narrow layout is drawn for. From 720px up nothing below applies
           and the three-column bento stays as it is. Between 460px and 719px
           the usage panel takes the full width, "next up" becomes a one-row
           strip, and each account is two lines (identity, status and switch;
           then the two usage bars). Below 460px only the few rules that
           stop that arrangement from being squeezed apply. The first narrow
           version collapsed everything to one column at 580px, which left the
           pane as a tall stack of oversized tiles instead of a compact page. */
        @container agyn (max-width: 719px) {
          .agyn-top { flex-wrap: nowrap; align-items: flex-start; gap: 16px; }
          .agyn-h2 { font-size: 32px; }
          .agyn-sub { max-width: none; }

          .agyn-bento { grid-template-columns: minmax(0, 1fr); gap: 12px; }
          .agyn-usage { grid-column: auto; gap: 18px; padding: 20px; }
          .agyn-big { width: 112px; font-size: 44px; }
          .agyn-big small { font-size: 20px; }
          .agyn-ticks { height: 32px; }
          .agyn-group-compact .agyn-group-meters { gap: 20px; }

          /* "Next up" turns into a horizontal strip with grid areas alone; the
             markup is the same as the wide tile. Without bars (the standby
             account has not reported usage) the bar column is dropped too. */
          .agyn-next { display: grid; grid-template-columns: 40px minmax(0, 1fr) 128px auto; grid-template-areas: "av eb bars btn" "av nm bars btn"; align-items: center; gap: 2px 14px; padding: 14px 16px; border-radius: 16px; }
          .agyn-next:not(.agyn-next-empty):not(:has(.agyn-next-bars)) { grid-template-columns: 40px minmax(0, 1fr) auto; grid-template-areas: "av eb btn" "av nm btn"; }
          .agyn-next > .agyn-eyebrow { grid-area: eb; align-self: end; }
          .agyn-next-avatar { grid-area: av; width: 40px; height: 40px; font-size: 16px; }
          .agyn-next-name { grid-area: nm; align-self: start; font-size: 15px; line-height: 20px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; overflow-wrap: normal; }
          .agyn-next-bars { grid-area: bars; margin: 0; gap: 4px; }
          .agyn-next > .agyn-btn, .agyn-next > .agyn-action { grid-area: btn; }
          .agyn-next > .agyn-btn { height: 36px; font-size: 13px; }
          .agyn-next .agyn-action { align-items: flex-end; }
          .agyn-next-empty { grid-template-columns: auto minmax(0, 1fr) auto; grid-template-areas: "eb st btn" "hint hint btn"; gap: 2px 10px; padding: 12px 16px; border-radius: 14px; }
          .agyn-next-empty > .agyn-eyebrow { align-self: center; }
          .agyn-next-empty > strong { grid-area: st; font-size: 14px; line-height: 20px; }
          .agyn-next-empty > p { grid-area: hint; font-size: 12.5px; line-height: 19px; }

          .agyn-panel { padding: 20px; }
          .agyn-pool-bar { grid-template-columns: minmax(0, 1fr) auto; gap: 8px 16px; }
          .agyn-pool-basis { grid-area: 2 / 1; }
          .agyn-pool-basis::before { content: none; }
          .agyn-pool-bar > .agyn-switch { grid-area: 2 / 2; justify-self: end; }
          .agyn-pool-bar > .agyn-action { grid-area: 1 / 2; }
          .agyn-pool-head { display: none; }
          /* Line one: avatar and email, then chip and button on the right.
             Line two: the two bars start under the email, not under the avatar,
             which is why the first column is exactly the avatar's 30px. */
          .agyn-pool-row { grid-template-columns: 30px repeat(2, minmax(0, 1fr)); grid-template-areas: "acct acct end" ". m5 wk"; gap: 8px 10px; min-height: 0; padding-top: 12px; padding-bottom: 12px; }
          .agyn-pool-row > .agyn-acct { grid-area: acct; }
          .agyn-pool-row > :nth-child(2) { grid-area: m5; }
          .agyn-pool-row > :nth-child(3) { grid-area: wk; }
          .agyn-pool-end { grid-area: end; display: flex; align-items: center; justify-content: flex-end; gap: 8px; min-width: 0; }
          .agyn-pool-action:empty { display: none; }
          .agyn-acct-meta { display: none; }
          .agyn-mini-k { display: inline; }
          .agyn-pool-action .agyn-btn { height: 30px; padding: 0 12px; }

          .agyn-models { grid-template-columns: minmax(0, 1fr); gap: 6px; }
          .agyn-model { min-height: 46px; border-radius: 10px; }

          /* The body's 320px flex-basis would become its height in a column. */
          .agyn-oauth { flex-direction: column; align-items: stretch; gap: 14px; padding: 18px 20px; }
          .agyn-oauth-body { flex: none; }
          .agyn-oauth > .agyn-btn { align-self: flex-end; }
        }
        @container agyn (max-width: 459px) {
          .agyn-top { flex-wrap: wrap; }
          .agyn-group-compact .agyn-group-meters { grid-template-columns: minmax(0, 1fr); gap: 14px; }
          .agyn-next { grid-template-columns: 40px minmax(0, 1fr) auto; grid-template-areas: "av eb btn" "av nm btn" "bars bars bars"; row-gap: 4px; }
          .agyn-next-bars { margin-top: 8px; }
          .agyn-next-empty { grid-template-columns: auto minmax(0, 1fr); grid-template-areas: "eb st" "hint hint" "btn btn"; }
          .agyn-next-empty .agyn-action { align-items: stretch; }
          .agyn-pool-bar { grid-template-columns: minmax(0, 1fr); }
          /* These selectors match the wide rules' specificity on purpose: a bare
             ".agyn-pool-bar > *" would lose to them and leave a second column. */
          .agyn-pool-bar > .agyn-title-row, .agyn-pool-bar > .agyn-pool-basis, .agyn-pool-bar > .agyn-switch, .agyn-pool-bar > .agyn-action { grid-area: auto; justify-self: start; }
          .agyn-pool-bar > .agyn-action { align-items: flex-start; }
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

    // Share used, 0–100. The quota API reports the share *remaining*
    // (`remainingFraction`); reading that as "used" would show every fresh
    // account as full, so a raw bucket is converted here rather than trusted.
    function pctOf(win) {
      if (!win) return null;
      const used = win.usedPct ?? null;
      const remaining = win.remainingFraction ?? null;
      const value = used !== null ? Number(used) : remaining !== null ? (1 - Number(remaining)) * 100 : NaN;
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
            available,
          };
        });
    }

    // The group the account pool and the next-up tile summarise: the one the
    // host marks primary, else the Gemini family, else the first usable one.
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
    // either window: one family at 100% still leaves the other to work with.
    function isFull(account, roster) {
      if (account?.exhausted) return true;
      const usable = groupsOf(account?.usage, roster).filter((group) => group.available);
      return usable.length > 0 && usable.every((group) => pctOf(group.fiveHour) >= 100 || pctOf(group.weekly) >= 100);
    }

    function initialOf(email) {
      return String(email || "?").trim().charAt(0).toUpperCase() || "?";
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

    function CopyButton({ text, id, copied, onCopy, t }) {
      const done = copied === id;
      return h(
        "button",
        {
          type: "button",
          className: `agyn-iconbtn${done ? " agyn-iconbtn-done" : ""}`,
          title: done ? t("copied") : t("copy"),
          "aria-label": done ? t("copied") : t("copy"),
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

    // The big tick meter on the dark usage panel.
    function UsageMeter({ label, win, threshold, now, localeId, t, compact }) {
      const pct = pctOf(win);
      const reset = resetOf(win, now, localeId);
      const heat =
        pct === null ? "" : pct >= 100 ? " agyn-ticks-full" : threshold !== null && pct >= threshold ? " agyn-ticks-hot" : "";
      return h(
        "div",
        { className: `agyn-meter${compact ? " agyn-meter-compact" : ""}` },
        h(
          "div",
          { className: "agyn-meter-label" },
          h("span", null, label),
          reset
            ? h(
                "span",
                { className: "agyn-mono" },
                reset.kind === "in" ? t("resetsIn", { time: reset.text }) : t("resetsAt", { when: reset.text }),
              )
            : null,
        ),
        h(
          "div",
          { className: "agyn-meter-row" },
          h("span", { className: "agyn-big" }, pct === null ? "–" : String(Math.round(pct)), h("small", null, "%")),
          h(
            "span",
            { className: `agyn-ticks${heat}`, role: "img", "aria-label": `${label} ${pct === null ? "–" : Math.round(pct)}%` },
            h("span", { className: "agyn-ticks-fill", style: { width: `${pct ?? 0}%` } }),
            threshold !== null ? h("span", { className: "agyn-ticks-mark", style: { left: `${threshold}%` } }) : null,
          ),
        ),
      );
    }

    // One quota group on the usage panel: its name (when there is more than one
    // group) and a meter per window it reports. Compact when groups share the
    // panel, so four bars still fit; greyed with a note when none of the
    // group's models is on the roster.
    function GroupUsage({ group, showName, compact, threshold, now, localeId, t }) {
      const windows = [
        ["5h", t("fiveHour"), group.fiveHour],
        ["wk", t("weekly"), group.weekly],
      ].filter(([, , win]) => win);
      return h(
        "div",
        { className: `agyn-group${compact ? " agyn-group-compact" : ""}${group.available ? "" : " agyn-group-off"}` },
        showName &&
          h(
            "div",
            { className: "agyn-group-name" },
            h("span", null, group.name ?? group.id),
            group.available ? null : h("span", { className: "agyn-group-note" }, t("groupNoModels")),
          ),
        h(
          "div",
          { className: "agyn-group-meters" },
          windows.map(([key, label, win]) => h(UsageMeter, { key, label, win, threshold, now, localeId, t, compact })),
        ),
      );
    }

    // The small bar in an account-pool row: percentage on the left, reset on the
    // right. The leading window key ("5H" / "週") is hidden by CSS while the
    // column header is on screen and shown once the header is gone.
    function MiniUsage({ label, win, threshold, now, localeId, active }) {
      const pct = pctOf(win);
      const reset = resetOf(win, now, localeId);
      const full = pct !== null && pct >= 100;
      const tone =
        pct === null ? "" : full ? "off" : threshold !== null && pct >= threshold ? "warn" : active ? "accent" : "ok";
      return h(
        "span",
        { className: "agyn-mini" },
        h("span", { className: "agyn-mini-track" }, h("i", { className: tone ? `agyn-fill-${tone}` : "", style: { width: `${pct ?? 0}%` } })),
        h(
          "span",
          { className: `agyn-mini-label${full ? " agyn-mini-full" : ""}` },
          h("span", null, h("span", { className: "agyn-mini-k" }, label), pct === null ? "–" : `${Math.round(pct)}%`),
          reset ? h("span", { className: "agyn-mini-reset" }, `↻ ${reset.text}`) : null,
        ),
      );
    }

    const MODELS_COLLAPSED = 6;

    function SettingsPage({ ctx, t: hostT }) {
      const localeId = pickLocale(ctx);
      const localT = React.useMemo(() => translator(localeId), [localeId, hostT]);
      // The host's bound translator is authoritative (it re-renders on a locale
      // switch); the local one only covers a kernel that does not bind one.
      const t = typeof hostT === "function" ? hostT : localT;
      const [status, setStatus] = React.useState(null);
      const [busy, setBusy] = React.useState("");
      const [message, setMessage] = React.useState(null);
      const [copied, setCopied] = React.useState("");
      const [visOverride, setVisOverride] = React.useState({});
      const [showAllModels, setShowAllModels] = React.useState(false);

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

      // Usable groups first, so a family that has lost its models sinks to the
      // bottom. With one usable group the big two-bar layout stays; with two or
      // more, every group goes compact.
      const activeGroups = active
        ? groupsOf(active.usage, roster).sort((a, b) => Number(b.available) - Number(a.available))
        : [];
      const usableCount = activeGroups.filter((group) => group.available).length;
      const nextPrimary = next ? primaryOf(groupsOf(next.usage, roster)) : null;
      const poolGroups = accounts.map((account) => groupsOf(account.usage, roster));
      const poolBasis = poolGroups.some((groups) => groups.length > 1)
        ? (primaryOf(groupsOf(active?.usage, roster)) ?? primaryOf(poolGroups.find((groups) => groups.length > 1) ?? []))
        : null;
      const auto = status.autoSwitch && typeof status.autoSwitch.enabled === "boolean" ? status.autoSwitch : null;
      const threshold = auto && Number.isFinite(auto.thresholdPct) ? auto.thresholdPct : null;

      const visSupported = models.some((model) => typeof model.visible === "boolean");
      const isVisible = (model) => visOverride[model.id] ?? model.visible ?? true;
      const visibleCount = models.filter(isVisible).length;
      const shownModels = showAllModels ? models : models.slice(0, MODELS_COLLAPSED);

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
      const setAll = (value) => saveVisibility(Object.fromEntries(models.map((model) => [model.id, value])));

      // A greyed-out button on its own never says why. When the OAuth client is
      // missing, the reason sits right under it; while merely busy the button is
      // disabled for a moment and needs no explanation. `reasonKey` picks the
      // wording: in the pool header the setup callout is further down the page.
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
      const header = h(
        "header",
        { className: "agyn-top" },
        h(
          "div",
          null,
          h(
            "span",
            { className: "agyn-eyebrow" },
            "Provider / AGY-Next",
            // A build stamp on screen, so "did the new code load?" stops being
            // a guess. The plugin is installed as a link to the source tree, so
            // editing lib/ui.js changes the file instantly — but the page still
            // has to fetch it. Without a visible marker, a stale bundle looks
            // exactly like a broken fix.
            h("span", { className: "agyn-build" }, UI_BUILD),
          ),
          h("h2", { className: "agyn-h2" }, t("title")),
          h("p", { className: "agyn-sub" }, t("subtitle")),
        ),
        h(
          "div",
          { className: "agyn-top-actions" },
          h(
            "span",
            { className: `agyn-live agyn-tone-${clientState}` },
            client.configured ? t("chipReady") : client.error ? t("chipClientError") : t("chipNoClient"),
          ),
          h(
            "button",
            {
              type: "button",
              className: "agyn-round",
              onClick: refresh,
              disabled: Boolean(busy),
              title: t("refresh"),
              "aria-label": t("refresh"),
            },
            h(Icon, { name: "refresh", size: 16, className: busy === "refresh" ? "agyn-spin" : "" }),
          ),
        ),
      );

      /* ---- usage panel (or sign-in when no account) ---- */
      // The panel used to take .agyn-usage-full (grid-column: 1 / -1) whenever
      // there was only one account, on the theory that a single account should
      // use the whole row. That changed the page's structure with the data:
      // ONE account stacked the usage card across the full width and pushed
      // the "next up" tile onto its own row, so a user with one account never
      // saw the design's two-up bento at all — only users with two or more
      // did. The bento layout is part of the design, not a function of the
      // account count, so the panel keeps its 2-of-3 span either way and only
      // the next-up tile degrades (it already has an empty state).
      const usagePanel = h(
        "section",
        { className: "agyn-usage" },
        active
          ? [
              h(
                "div",
                { key: "head", className: "agyn-usage-head" },
                h(
                  "span",
                  { className: "agyn-who" },
                  h("span", { className: "agyn-avatar", "aria-hidden": true }, initialOf(active.email)),
                  h(
                    "span",
                    { className: "agyn-who-text" },
                    h("span", { className: "agyn-who-name" }, active.email ?? t("unknown")),
                    h(
                      "span",
                      { className: "agyn-who-meta" },
                      `${t("active")} · `,
                      active.stale ? t("tokenStale") : t("tokenLeft", { time: shortDuration(active.expiresInMs) }),
                    ),
                  ),
                ),
                h("span", { className: "agyn-eyebrow" }, "Usage"),
              ),
              activeGroups.length
                ? [
                    ...activeGroups.map((group) =>
                      h(GroupUsage, {
                        key: group.id,
                        group,
                        showName: activeGroups.length > 1,
                        compact: usableCount > 1 || !group.available,
                        threshold,
                        now,
                        localeId,
                        t,
                      }),
                    ),
                    threshold !== null && auto?.enabled
                      ? h("p", { key: "foot", className: "agyn-usage-foot" }, t("threshold", { pct: threshold }))
                      : null,
                  ]
                : h("p", { key: "none", className: "agyn-usage-empty" }, t("usageUnavailable")),
            ]
          : h(
              "div",
              { className: "agyn-signin" },
              h("span", { className: "agyn-eyebrow" }, "Account"),
              h("span", { className: "agyn-avatar agyn-avatar-ghost", "aria-hidden": true }, h(Icon, { name: "user", size: 16 })),
              h("p", { className: "agyn-signin-title" }, t("accountMissing")),
              h("p", { className: "agyn-signin-hint" }, t("accountMissingHint")),
              signInButton("agyn-btn agyn-btn-oninverse"),
            ),
      );

      /* ---- next-up tile ---- */
      // This used to be `!multi ? null : …`, which hid the tile entirely for a
      // single-account host. The bento is two-up in the design (usage 2/3,
      // next-up 1/3), so hiding half of it collapsed the whole layout to one
      // column and made a one-account install look nothing like the design.
      // The empty state below already exists and explains what the tile is
      // for, so it is rendered instead of vanishing.
      const nextPanel = next
        ? h(
            "section",
            { className: "agyn-next" },
            h("span", { className: "agyn-eyebrow" }, "Next up"),
            h("span", { className: "agyn-next-avatar", "aria-hidden": true }, initialOf(next.email)),
            h("span", { className: "agyn-next-name" }, next.email ?? t("unknown")),
            nextPrimary
              ? h(
                  "span",
                  { className: "agyn-next-bars" },
                  [
                    ["5H", nextPrimary.fiveHour],
                    [t("weekly"), nextPrimary.weekly],
                  ].map(([label, win]) =>
                    h(
                      React.Fragment,
                      { key: label },
                      h("span", { className: "agyn-next-row" }, h("span", null, label), h("span", null, pctOf(win) === null ? "–" : `${Math.round(pctOf(win))}%`)),
                      h("span", { className: "agyn-next-track" }, h("i", { style: { width: `${pctOf(win) ?? 0}%` } })),
                    ),
                  ),
                )
              : null,
            h(
              "button",
              {
                type: "button",
                className: "agyn-btn agyn-btn-onaccent",
                onClick: () => act("switch", "accounts/switch", { id: next.id }),
                disabled: Boolean(busy),
              },
              t("switchNow"),
            ),
          )
        : h(
            "section",
            { className: "agyn-next agyn-next-empty" },
            h("span", { className: "agyn-eyebrow" }, "Next up"),
            h("strong", null, t("noStandby")),
            h("p", null, t("noStandbyHint")),
            signInButton("agyn-btn agyn-btn-ink"),
          );

      /* ---- account pool ---- */
      const pool =
        accounts.length > 0 &&
        h(
          "section",
          { className: "agyn-panel" },
          // Flat on purpose: .agyn-pool-bar places each child by grid-area, and
          // the leading "· " of the basis note is drawn by CSS so it can go when
          // the note moves to its own line.
          h(
            "div",
            { className: "agyn-panel-head agyn-pool-bar" },
            h(
              "div",
              { className: "agyn-title-row" },
              h("h3", { className: "agyn-h3" }, t("poolTitle")),
              h("span", { className: "agyn-meta" }, t("poolCount", { n: accounts.length })),
            ),
            signInButton("agyn-btn agyn-btn-ink", "needsClientBelow"),
            poolBasis && h("span", { className: "agyn-meta agyn-pool-basis" }, t("poolBasis", { name: poolBasis.name ?? poolBasis.id })),
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
          ),
          h(
            "div",
            { className: "agyn-pool-head", "aria-hidden": true },
            h("span", null, t("colAccount")),
            h("span", null, t("colFiveHour")),
            h("span", null, t("colWeekly")),
            h("span", null, t("colStatus")),
            h("span", null, ""),
          ),
          accounts.map((account, index) => {
            const isActive = account === active;
            const full = isFull(account, roster);
            const primary = primaryOf(poolGroups[index]);
            const state = isActive ? "active" : full ? "full" : account === next ? "next" : "standby";
            const stateText = { active: t("active"), full: t("exhausted"), next: t("nextUp"), standby: t("standby") }[state];
            return h(
              "div",
              { key: account.id, className: `agyn-pool-row${isActive ? " agyn-pool-row-active" : ""}` },
              h(
                "span",
                { className: "agyn-acct" },
                h("span", { className: `agyn-avatar${isActive ? "" : " agyn-avatar-muted"}`, "aria-hidden": true }, initialOf(account.email)),
                h(
                  "span",
                  { className: "agyn-acct-text" },
                  h("span", { className: "agyn-acct-name", title: account.email ?? "" }, account.email ?? t("unknown")),
                  h("span", { className: "agyn-acct-meta" }, account.projectId ?? "—"),
                ),
              ),
              h(MiniUsage, { label: "5H", win: primary?.fiveHour, threshold, now, localeId, active: isActive }),
              h(MiniUsage, { label: t("miniWeekly"), win: primary?.weekly, threshold, now, localeId, active: isActive }),
              // The row's children stay in this order (account, bar, bar, end):
              // the narrow layout addresses the two bars by position.
              h(
                "span",
                { className: "agyn-pool-end" },
                h("span", { className: `agyn-state agyn-state-${state}` }, stateText),
                h(
                  "span",
                  { className: "agyn-pool-action" },
                  multi && !isActive
                    ? h(
                        "button",
                        {
                          type: "button",
                          className: "agyn-btn",
                          onClick: () => act("switch", "accounts/switch", { id: account.id }),
                          disabled: Boolean(busy) || full,
                        },
                        t("switchTo"),
                      )
                    : null,
                ),
              ),
            );
          }),
        );

      /* ---- models ---- */
      const modelsPanel = h(
        "section",
        { className: "agyn-panel" },
        h(
          "div",
          { className: "agyn-panel-head" },
          h(
            "div",
            { className: "agyn-title-row" },
            h("h3", { className: "agyn-h3" }, t("modelsSection")),
            visSupported
              ? [
                  h("span", { key: "pill", className: "agyn-pill" }, String(visibleCount), h("small", null, `/${models.length}`)),
                  h("span", { key: "label", className: "agyn-meta" }, t("modelsShown")),
                ]
              : h("span", { className: "agyn-meta" }, t("modelsCount", { n: models.length })),
          ),
          visSupported &&
            h(
              "div",
              { className: "agyn-head-actions" },
              h("button", { type: "button", className: "agyn-linkbtn", onClick: () => setAll(true), disabled: visibleCount === models.length }, t("selectAll")),
              h("button", { type: "button", className: "agyn-linkbtn", onClick: () => setAll(false), disabled: visibleCount === 0 }, t("selectNone")),
            ),
        ),
        // The roster comes from the host on every load, so a model that was
        // retired simply drops out of this list and the count; only an empty
        // chat picker is worth calling out.
        visSupported && models.length > 0 && visibleCount === 0 && h(Callout, { kind: "warn" }, t("noneVisible")),
        h(
          "div",
          { className: "agyn-models" },
          shownModels.map((model) => {
            const on = isVisible(model);
            const text = h(
              "span",
              { className: "agyn-model-text" },
              h("span", { className: "agyn-model-name" }, model.name),
              h("span", { className: "agyn-model-id" }, on ? model.id : `${model.id} · ${t("hidden")}`),
            );
            return h(
              "div",
              { key: model.id, className: `agyn-model${on ? "" : " agyn-model-off"}` },
              visSupported
                ? h(
                    "label",
                    { className: "agyn-model-main" },
                    h("input", {
                      type: "checkbox",
                      checked: on,
                      onChange: () => saveVisibility({ ...visOverride, [model.id]: !on }),
                    }),
                    text,
                  )
                : h("span", { className: "agyn-model-main" }, text),
              h("span", { className: "agyn-model-ctx" }, model.ctx >= 1048576 ? `${Math.round(model.ctx / 1048576)}M` : `${Math.round((model.ctx || 0) / 1024)}K`),
              h(CopyButton, { text: model.id, id: `model:${model.id}`, copied, onCopy: copy, t }),
            );
          }),
        ),
        models.length > MODELS_COLLAPSED &&
          h(
            "button",
            { type: "button", className: "agyn-linkbtn agyn-more", onClick: () => setShowAllModels((value) => !value) },
            showAllModels ? t("showLess") : t("showAll", { n: models.length }),
          ),
      );

      /* ---- OAuth strip ---- */
      const oauth = h(
        "section",
        { className: "agyn-oauth" },
        h(
          "div",
          { className: "agyn-oauth-body" },
          h(
            "span",
            { className: "agyn-title-row" },
            h("span", { className: "agyn-eyebrow" }, t("clientSection")),
            h(
              Badge,
              { state: clientState },
              client.configured ? `${t("clientOk")} · ${sourceLabel}` : client.error ? t("clientError") : t("clientMissing"),
            ),
          ),
          client.clientIdPreview &&
            h("span", { className: "agyn-oauth-line" }, h("span", { className: "agyn-k" }, "Client ID"), h("span", null, client.clientIdPreview)),
          client.path &&
            h(
              "span",
              { className: "agyn-oauth-line" },
              h("span", null, client.path),
              h(CopyButton, { text: client.path, id: "path", copied, onCopy: copy, t }),
            ),
          !client.configured && h(Callout, { kind: "warn" }, t("hintMissing")),
          scopes.length > 0 &&
            h(
              "span",
              { className: "agyn-scopes" },
              scopes.map((scope) => h("span", { key: scope, className: "agyn-scope", title: scope }, scope.split("/auth/")[1] ?? scope)),
            ),
        ),
        active &&
          h(
            "button",
            { type: "button", className: "agyn-btn agyn-btn-danger", onClick: () => act("logout", "logout"), disabled: Boolean(busy) },
            t("logout"),
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
        h("div", { className: "agyn-bento" }, usagePanel, nextPanel),
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
