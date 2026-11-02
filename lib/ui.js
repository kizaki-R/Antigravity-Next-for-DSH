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
        subtitle: "Local AGY installation, Google sign-in, scopes and available models.",
        refresh: "Refresh",
        refreshing: "Refreshing…",
        login: "Sign in",
        loggingIn: "Waiting for approval…",
        reauth: "Sign in again",
        addAccount: "Add account",
        logout: "Sign out current account",
        chipReady: "Local client ready",
        chipNoClient: "AGY installation required",
        chipClientError: "Local client unavailable",
        clientSection: "Local AGY installation",
        clientOk: "Ready",
        clientMissing: "Not found",
        clientError: "Cannot resolve client",
        srcConfig: "plugin config",
        srcEnv: "environment",
        srcFile: "file",
        hintMissing: "Install the official AGY app first. If detection fails, set AGY_NEXT_INSTALL_PATH to its installation path and refresh. You do not need to start AGY or create an OAuth client.",
        srcIde: "IDE",
        srcDesktop: "desktop",
        codeIdeUnreadable: "Antigravity IDE was found, but its OAuth client could not be read. Install the desktop build instead, or report this problem.",
        codeIdeIdentity: "An Antigravity IDE folder was found, but it is not the expected Antigravity IDE build.",
        codeIdeAmbiguous: "Antigravity IDE exposes several OAuth clients and none could be chosen safely. Install the desktop build instead.",
        diagnostics: "Copy diagnostics",
        diagnosticsCopied: "Diagnostics copied",
        diagnosticsFailed: "Could not copy diagnostics",
        diagnosticsHint: "Attach this report when filing an issue. It contains no account, token, or personal path.",
        accountMissing: "Not signed in",
        accountMissingHint: "Sign in with Google to start using these models.",
        hintImported: "Existing tokens remain separate from client discovery. If a token was issued to a different client, sign in again through Google consent.",
        refreshReauth: "Google rejected this account's refresh token. Sign in to this account again.",
        refreshClientMismatch: "This account token is not accepted by the installed AGY client. Sign in to this account again.",
        refreshAccessDenied: "Google denied refresh for this account. Check account access and sign in again if needed.",
        refreshTemporary: "Google could not refresh this account right now. It will be retried later.",
        refreshFailed: "This account could not be refreshed. Check the connection and retry; sign-in may be required.",
        refreshClientUnavailable: "The installed AGY OAuth client could not be resolved.",
        refreshRemoved: "This account was removed before its refresh completed.",
        quotaUnreported: "Google has not reported quota for this account.",
        projectLabel: "Project: {id}",
        tokenLeft: "Access token: {time} left",
        tokenStale: "Access token expired (refreshes on next request)",
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
        modelUnavailable: "This account cannot use this model",
        chipJump: "Jump to local AGY installation status",
        kvSource: "Source",
        kvPath: "Installation path",
        kvScopes: "Scopes",
        modelsOther: "Other",
        modelsAll: "All models",
        groupCollapse: "Collapse {name}",
        groupExpand: "Expand {name}",
        groupNoModels: "No models available in this group",
        groupUsageUnreported: "Google has not reported quota for this group.",
        noneVisible: "No model is shown in chat. Tick at least one.",
        copy: "Copy",
        copied: "Copied",
        unknown: "unknown",
        waiting: "A browser window should have opened. Approve access there; this page updates by itself.",
        openAgain: "Open the sign-in page again",
        errorGeneric: "Something went wrong: {message}",
        loginNoClient: "Install AGY and resolve its local client first.",
        needsClient: "A readable local AGY installation is required",
        needsClientBelow: "Check the local AGY installation below",
        tierUnknown: "Plan unknown",
        tierUnknownHint: "Google has not reported a recognizable subscription plan.",
        tierSource: "Source: {field}",
        tierEvidence: "Subscription ID: {paid}; Code Assist tier: {codeAssist}",
        tierIndependent: "Subscription plan and model availability are separate; promotional origin is not reported.",
        familyExhaustedAlert: "Notice: {family} is 0% on this account, but other model quotas remain healthy.",
        switchStandby: "Switch to standby",
        srcInstalled: "official AGY installation (local)",
        kvVersion: "App version",
        downloadAgy: "Download official AGY",
        hintParseError: "AGY was found, but its local OAuth client could not be resolved. Check AGY_NEXT_INSTALL_PATH or update/reinstall AGY, then refresh. Custom client settings are ignored.",
        hintLocalIntegration: "Unofficial local integration; not endorsed or officially supported by Google. Reads client settings from installed app resources without starting AGY or reading its accounts. Account tokens are obtained separately through Google browser consent.",
        maintainer: "Maintainer:",
        repoSite: "GitHub Repository",
        reportIssue: "Report an Issue",
      },
      "zh-Hant": {
        nav: "AGY-Next",
        title: "Antigravity Next",
        subtitle: "本機 AGY 安裝、Google 登入、權限範圍與可用模型。",
        refresh: "重新整理",
        refreshing: "整理中…",
        login: "登入",
        loggingIn: "等待授權中…",
        reauth: "重新登入",
        addAccount: "新增帳號",
        logout: "登出目前帳號",
        chipReady: "本機用戶端就緒",
        chipNoClient: "需要安裝 AGY",
        chipClientError: "本機用戶端無法使用",
        clientSection: "本機 AGY 安裝",
        clientOk: "已就緒",
        clientMissing: "未找到",
        clientError: "無法解析用戶端",
        srcConfig: "外掛設定",
        srcEnv: "環境變數",
        srcFile: "檔案",
        hintMissing: "請先安裝官方 AGY。若未自動找到，請將 AGY_NEXT_INSTALL_PATH 設為安裝路徑後重新整理。不需要啟動 AGY，也不需要自行建立 OAuth 用戶端。",
        srcIde: "IDE",
        srcDesktop: "桌面版",
        codeIdeUnreadable: "偵測到 Antigravity IDE，但無法讀取其用戶端設定。建議改安裝桌面版，或回報此問題。",
        codeIdeIdentity: "找到 Antigravity IDE 資料夾，但它不是預期的 Antigravity IDE 版本。",
        codeIdeAmbiguous: "Antigravity IDE 提供多組用戶端，無法安全地選擇其中一組。建議改安裝桌面版。",
        diagnostics: "複製診斷報告",
        diagnosticsCopied: "診斷報告已複製",
        diagnosticsFailed: "無法複製診斷報告",
        diagnosticsHint: "回報問題時請附上這份報告。內容不含帳號、憑証或個人路徑。",
        accountMissing: "尚未登入",
        accountMissingHint: "用 Google 帳號登入後就能使用這些模型。",
        hintImported: "既有 token 與用戶端探索分開處理。若 token 是由不同用戶端核發，請透過 Google 同意畫面重新登入。",
        projectLabel: "專案：{id}",
        tokenLeft: "存取權杖有效剩餘：{time}",
        tokenStale: "存取權杖已過期（將於下次請求時自動更新）",
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
        modelUnavailable: "目前帳號無法使用此模型",
        chipJump: "前往本機 AGY 安裝狀態",
        kvSource: "來源",
        kvPath: "安裝路徑",
        kvScopes: "Scopes",
        modelsOther: "其他",
        modelsAll: "所有模型",
        groupCollapse: "收合 {name}",
        groupExpand: "展開 {name}",
        groupNoModels: "這組目前沒有可用模型",
        groupUsageUnreported: "Google 尚未回報這組額度。",
        noneVisible: "目前沒有任何模型會顯示在聊天視窗，至少勾選一個。",
        copy: "複製",
        copied: "已複製",
        unknown: "未知",
        waiting: "瀏覽器應該已經開啟。在那裡按下同意，這一頁會自己更新。",
        openAgain: "再開一次登入頁",
        errorGeneric: "發生錯誤：{message}",
        refreshReauth: "Google 已拒絕此帳號的更新權杖，請重新登入這個帳號。",
        refreshClientMismatch: "此帳號權杖與目前安裝的 AGY 用戶端不相容，請重新登入這個帳號。",
        refreshAccessDenied: "Google 拒絕更新此帳號。請確認帳號權限，必要時重新登入。",
        refreshTemporary: "目前無法連上 Google 更新此帳號，稍後會再試。",
        refreshFailed: "此帳號更新失敗。請檢查網路並重試；可能需要重新登入。",
        refreshClientUnavailable: "無法解析本機 AGY OAuth 用戶端。",
        refreshRemoved: "更新完成前，此帳號已被移除。",
        quotaUnreported: "Google 尚未回報此帳號的額度。",
        loginNoClient: "請先安裝 AGY，並確認本機用戶端可解析。",
        needsClient: "需要可讀取的本機 AGY 安裝",
        needsClientBelow: "請檢查下方本機 AGY 安裝狀態",
        tierUnknown: "方案未知",
        tierUnknownHint: "Google 尚未回報可辨識的訂閱方案，不代表免費或標準方案。",
        tierSource: "來源：{field}",
        tierEvidence: "訂閱 ID：{paid}；Code Assist 資格：{codeAssist}",
        tierIndependent: "訂閱方案與模型開放資格分開判斷；此 API 未提供贈送來源。",
        familyExhaustedAlert: "提醒：此帳號的 {family} 已達配額上限 (0%)，但其他模型額度充裕。",
        switchStandby: "切換至備用號",
        srcInstalled: "官方 AGY 安裝（本機）",
        kvVersion: "應用程式版本",
        downloadAgy: "下載官方 AGY",
        hintParseError: "已找到 AGY，但無法解析本機 OAuth 用戶端。請檢查 AGY_NEXT_INSTALL_PATH，或更新／重新安裝 AGY 後重新整理。自訂用戶端設定不會生效。",
        hintLocalIntegration: "這是非官方本機整合，未獲 Google 背書或正式支援。僅讀取已安裝程式資源中的用戶端設定，不啟動 AGY，也不讀取其帳號。帳號 token 仍另行透過 Google 瀏覽器同意畫面取得。",
        maintainer: "維護者：",
        repoSite: "GitHub 專案",
        reportIssue: "問題回報",
      },
      // Simplified Chinese lives in the `zh` slot because that is the one locale
      // id dsh ships for it (`LOCALE_IDS = ["zh", "en"]`); a dictionary that
      // omits `zh` makes every Simplified reader fall through to English.
      zh: {
        nav: "AGY-Next",
        title: "Antigravity Next",
        subtitle: "本機 AGY 安裝、Google 登入、權限範圍與可用模型。",
        refresh: "刷新",
        refreshing: "刷新中…",
        login: "登录",
        loggingIn: "等待授权中…",
        reauth: "重新登录",
        addAccount: "添加账号",
        logout: "登出当前账号",
        chipReady: "本機用戶端就緒",
        chipNoClient: "需要安裝 AGY",
        chipClientError: "本機用戶端無法使用",
        clientSection: "本機 AGY 安裝",
        clientOk: "已就緒",
        clientMissing: "未找到",
        clientError: "無法解析用戶端",
        srcConfig: "插件设置",
        srcEnv: "环境变量",
        srcFile: "文件",
        hintMissing: "請先安裝官方 AGY。若未自動找到，請將 AGY_NEXT_INSTALL_PATH 設為安裝路徑後重新整理。不需要啟動 AGY，也不需要自行建立 OAuth 用戶端。",
        srcIde: "IDE",
        srcDesktop: "桌面版",
        codeIdeUnreadable: "偵測到 Antigravity IDE，但無法讀取其用戶端設定。建議改安裝桌面版，或回報此問題。",
        codeIdeIdentity: "找到 Antigravity IDE 資料夾，但它不是預期的 Antigravity IDE 版本。",
        codeIdeAmbiguous: "Antigravity IDE 提供多組用戶端，無法安全地選擇其中一組。建議改安裝桌面版。",
        diagnostics: "複製診斷報告",
        diagnosticsCopied: "診斷報告已複製",
        diagnosticsFailed: "無法複製診斷報告",
        diagnosticsHint: "回報問題時請附上這份報告。內容不含帳號、憑證或個人路徑。",
        accountMissing: "尚未登录",
        accountMissingHint: "用 Google 账号登录后就能使用这些模型。",
        hintImported: "既有 token 與用戶端探索分開處理。若 token 是由不同用戶端核發，請透過 Google 同意畫面重新登入。",
        refreshReauth: "Google 拒绝了此账号的刷新令牌，请重新登录此账号。",
        refreshClientMismatch: "此账号令牌与已安装的 AGY 客户端不兼容，请重新登录此账号。",
        refreshAccessDenied: "Google 拒绝刷新此账号，请检查账号权限，必要时重新登录。",
        refreshTemporary: "目前无法连接 Google 刷新此账号，稍后会重试。",
        refreshFailed: "此账号刷新失败，请检查网络并重试；可能需要重新登录。",
        refreshClientUnavailable: "无法解析本机 AGY OAuth 客户端。",
        refreshRemoved: "此账号在刷新完成前已被移除。",
        quotaUnreported: "Google 尚未回报此账号的额度。",
        projectLabel: "项目：{id}",
        tokenLeft: "访问令牌有效剩余：{time}",
        tokenStale: "访问令牌已过期（将在下次请求时自动更新）",
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
        modelUnavailable: "当前账号无法使用此模型",
        chipJump: "前往本機 AGY 安裝狀態",
        kvSource: "来源",
        kvPath: "安裝路徑",
        kvScopes: "Scopes",
        modelsOther: "其他",
        modelsAll: "所有模型",
        groupCollapse: "收起 {name}",
        groupExpand: "展开 {name}",
        groupNoModels: "这组目前没有可用模型",
        groupUsageUnreported: "Google 尚未回報這組額度。",
        noneVisible: "目前没有任何模型会显示在聊天窗口，至少勾选一个。",
        copy: "复制",
        copied: "已复制",
        unknown: "未知",
        waiting: "浏览器应该已经打开。在那里点击同意，这一页会自己更新。",
        openAgain: "再打开一次登录页",
        errorGeneric: "发生错误：{message}",
        loginNoClient: "請先安裝 AGY，並確認本機用戶端可解析。",
        needsClient: "需要可讀取的本機 AGY 安裝",
        needsClientBelow: "請檢查下方本機 AGY 安裝狀態",
        tierUnknown: "方案未知",
        tierUnknownHint: "Google 尚未回報可辨識的訂閱方案，不代表免費或標準方案。",
        tierSource: "來源：{field}",
        tierEvidence: "訂閱 ID：{paid}；Code Assist 資格：{codeAssist}",
        tierIndependent: "訂閱方案與模型開放資格分開判斷；此 API 未提供贈送來源。",
        familyExhaustedAlert: "提醒：此账号的 {family} 已达配额上限 (0%)，但其他模型额度充裕。",
        switchStandby: "切换至备用号",
        srcInstalled: "官方 AGY 安裝（本機）",
        kvVersion: "應用程式版本",
        downloadAgy: "下載官方 AGY",
        hintParseError: "已找到 AGY，但無法解析本機 OAuth 用戶端。請檢查 AGY_NEXT_INSTALL_PATH，或更新／重新安裝 AGY 後重新整理。自訂用戶端設定不會生效。",
        hintLocalIntegration: "這是非官方本機整合，未獲 Google 背書或正式支援。僅讀取已安裝程式資源中的用戶端設定，不啟動 AGY，也不讀取其帳號。帳號 token 仍另行透過 Google 瀏覽器同意畫面取得。",
        maintainer: "维护者：",
        repoSite: "GitHub 仓库",
        reportIssue: "反馈问题",
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
        .agyn-book { --agyn-n: 2; display: flex; flex-direction: column; width: 100%; box-sizing: border-box; }
        .agyn-book * { box-sizing: border-box; }
        .agyn-cols, .agyn-line { box-sizing: border-box; }
        .agyn-cols { display: none; }
        .agyn-cols > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
        .agyn-cols > .agyn-col-acc { grid-column: 1 / 3; padding-left: 28px; }
        .agyn-cols > .agyn-col-g { grid-column: calc(var(--agyn-gi) + 2); }
        .agyn-col-g, .agyn-q { --agyn-gi: 1; }
        .agyn-col-off { color: var(--agyn-fg3); }
        .agyn-ledger { display: flex; flex-direction: column; margin: 0; padding: 0; list-style: none; width: 100%; }
        .agyn-acc { margin-bottom: 8px; border: 1px solid var(--agyn-line2); border-radius: 12px; background: color-mix(in srgb, var(--agyn-fg) 2%, var(--agyn-surface)); transition: border-color .15s, box-shadow .15s; }
        .agyn-acc:hover { border-color: var(--agyn-line); }
        .agyn-acc-active { border-color: color-mix(in srgb, var(--agyn-accent) 65%, transparent); box-shadow: 0 0 0 1px color-mix(in srgb, var(--agyn-accent) 25%, transparent), 0 4px 14px -4px rgba(0,0,0,0.25); }
        .agyn-acc-open { margin: 8px 0; border-radius: 12px; background: color-mix(in srgb, var(--agyn-fg) 3.5%, var(--agyn-surface)); }
        .agyn-summary { grid-row: 2; grid-column: 1 / -1; display: grid; grid-template-columns: repeat(var(--agyn-n, 2), minmax(0, 1fr)); gap: 8px; min-width: 0; }
        .agyn-line { display: grid; grid-template-columns: minmax(0, 1fr) auto; row-gap: 8px; column-gap: 8px; align-items: center; padding: 10px 12px; border-radius: 10px; transition: background-color .15s; width: 100%; }
        .agyn-acc:not(.agyn-acc-open) > .agyn-line:hover { background: var(--agyn-hover); }
        .agyn-who { grid-row: 1; grid-column: 1; display: flex; align-items: center; gap: 8px; min-width: 0; min-height: 32px; padding: 0; border: 0; border-radius: 8px; background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; }
        .agyn-st { display: grid; place-items: center; flex: 0 0 20px; width: 20px; height: 20px; color: var(--agyn-fg2); }
        .agyn-st-on::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--agyn-accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--agyn-accent) 25%, transparent); }
        .agyn-st-idle::before { content: ""; box-sizing: border-box; width: 8px; height: 8px; border-radius: 50%; border: 1.5px solid var(--agyn-fg3); }
        .agyn-st-next { color: var(--agyn-accent); }
        .agyn-st-full { color: var(--agyn-off); }
        .agyn-who-text { display: flex; align-items: center; min-width: 0; flex: 1 1 auto; overflow: hidden; }
        .agyn-who-head { display: inline-flex; flex-wrap: nowrap; align-items: center; gap: 8px; min-width: 0; max-width: 100%; }
        .agyn-email { flex: 0 1 auto; min-width: 0; font-size: 13px; font-weight: 600; line-height: 20px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .agyn-tier-pro { display: inline-flex; align-items: center; flex: 0 0 auto; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; line-height: 14px; background: color-mix(in srgb, #1a73e8 18%, transparent); border: 1px solid color-mix(in srgb, #4285f4 50%, transparent); color: #4285f4; white-space: nowrap; }
        .agyn-tier-ultra { display: inline-flex; align-items: center; flex: 0 0 auto; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; line-height: 14px; background: color-mix(in srgb, #9333ea 16%, transparent); border: 1px solid color-mix(in srgb, #a855f7 45%, transparent); color: #c084fc; white-space: nowrap; }
        .agyn-tier-plus { display: inline-flex; align-items: center; flex: 0 0 auto; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; line-height: 14px; background: color-mix(in srgb, #0d9488 16%, transparent); border: 1px solid color-mix(in srgb, #14b8a6 45%, transparent); color: #2dd4bf; white-space: nowrap; }
        .agyn-tier-std { display: inline-flex; align-items: center; flex: 0 0 auto; padding: 1px 5px; border-radius: 4px; font-size: 10px; font-weight: 600; line-height: 14px; background: color-mix(in srgb, var(--agyn-fg) 7%, transparent); color: var(--agyn-fg2); white-space: nowrap; }
        .agyn-acc-active .agyn-email { font-weight: 700; }
        .agyn-acc-full .agyn-email { color: var(--agyn-fg2); }
        .agyn-chev { color: var(--agyn-fg2); flex: 0 0 auto; transition: transform .15s; }
        .agyn-acc-open .agyn-who .agyn-chev { transform: rotate(180deg); }
        .agyn-q { grid-column: var(--agyn-gi); display: flex; flex-direction: column; justify-content: center; gap: 3px; min-width: 0; padding: 5px 8px; border-radius: 7px; background: color-mix(in srgb, var(--agyn-fg) 3%, transparent); border: 1px solid color-mix(in srgb, var(--agyn-line) 60%, transparent); transition: background-color .15s, border-color .15s, box-shadow .15s; }
        .agyn-q:hover { background: color-mix(in srgb, var(--agyn-fg) 6%, transparent); }
        .agyn-q-label { font-size: 12px; font-weight: 700; line-height: 18px; color: var(--agyn-fg2); white-space: normal; overflow-wrap: anywhere; }
        .agyn-q-empty { background: color-mix(in srgb, var(--agyn-off) 14%, transparent) !important; border-color: color-mix(in srgb, var(--agyn-off) 50%, transparent) !important; box-shadow: 0 0 8px color-mix(in srgb, var(--agyn-off) 25%, transparent); }
        .agyn-q-empty .agyn-q-label { color: var(--agyn-off); font-weight: 800; }
        .agyn-q-row { display: flex; align-items: center; gap: 4px; min-width: 0; }
        .agyn-bar { position: relative; display: block; flex: 1 1 auto; min-width: 0; height: 5px; border-radius: 2.5px; background: var(--agyn-line2); overflow: hidden; }
        .agyn-bar > i { position: absolute; top: 0; bottom: 0; left: 0; border-radius: 2.5px; background: var(--agyn-fg3); transition: width .5s cubic-bezier(.2,.7,.2,1); }
        .agyn-bar-gemini > i { background: linear-gradient(90deg, #38bdf8, #818cf8); }
        .agyn-bar-claude > i { background: linear-gradient(90deg, #fb923c, #ea580c); }
        .agyn-bar-argon > i { background: linear-gradient(90deg, #2dd4bf, #06b6d4); }
        .agyn-acc .agyn-bar-low > i { background: var(--agyn-warn); }
        .agyn-bar-empty { background: color-mix(in srgb, var(--agyn-off) 40%, transparent) !important; }
        .agyn-num { flex: 0 0 28px; text-align: right; font-family: var(--agyn-mono); font-size: 12px; font-weight: 700; line-height: 16px; font-variant-numeric: tabular-nums; }
        .agyn-num-off { color: var(--agyn-off); font-weight: 800; }
        .agyn-q-off { opacity: .65; }
        .agyn-q-off .agyn-bar { opacity: .4; }
        .agyn-q-off .agyn-num, .agyn-q-off .agyn-q-label { color: var(--agyn-fg3); font-weight: 500; }
        .agyn-row-alert { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 0 10px 10px; padding: 8px 12px; border-radius: 8px; font-size: 12px; line-height: 18px; background: color-mix(in srgb, var(--agyn-off) 12%, transparent); border: 1px solid color-mix(in srgb, var(--agyn-off) 35%, transparent); color: var(--agyn-fg); }
        .agyn-row-alert .agyn-ico { color: var(--agyn-off); flex: 0 0 auto; }
        .agyn-alert-msg { display: flex; align-items: flex-start; gap: 6px; min-width: 0; white-space: normal; overflow-wrap: anywhere; }
        .agyn-alert-act { flex: 0 0 auto; appearance: none; border: 0; border-radius: 5px; padding: 3px 10px; font-size: 11.5px; font-weight: 700; background: var(--agyn-off); color: #fff; cursor: pointer; transition: opacity .15s; }
        .agyn-alert-act:hover { opacity: .9; }
        .agyn-act { grid-row: 1; grid-column: -2 / -1; display: flex; justify-content: flex-end; align-items: center; min-height: 32px; }
        .agyn-act .agyn-btn { padding: 0 10px; }
        .agyn-now { font-size: 12px; font-weight: 600; line-height: 18px; color: var(--agyn-fg2); white-space: nowrap; }
        .agyn-acc-noted > .agyn-line, .agyn-acc-noted > .agyn-line .agyn-who { min-height: 42px; }
        .agyn-note { display: flex; align-items: flex-start; gap: 6px; margin: 0; padding: 0 8px 10px 36px; font-size: 12px; line-height: 18px; color: var(--agyn-fg2); }
        .agyn-note .agyn-ico { margin-top: 2px; }
        .agyn-note-warn .agyn-ico { color: var(--agyn-warn); }
        .agyn-note-off .agyn-ico { color: var(--agyn-off); }
        /* Summary and details share identical tracks, gaps and side padding. */
        .agyn-detail { display: flex; flex-direction: column; gap: 16px; padding: 4px 12px 12px; }
        .agyn-detail-groups { display: grid; grid-template-columns: repeat(var(--agyn-n, 2), minmax(0, 1fr)); gap: 8px; align-items: stretch; }
        .agyn-detail-col { display: flex; flex-direction: column; gap: 14px; min-width: 0; padding: 12px 10px; border-radius: 9px; background: var(--agyn-surface); border: 1px solid var(--agyn-line2); }
        .agyn-detail-col-h { display: flex; align-items: baseline; gap: 6px; font-size: 12px; font-weight: 700; line-height: 18px; color: var(--agyn-fg); overflow-wrap: anywhere; padding-bottom: 8px; border-bottom: 1px solid var(--agyn-line2); }
        .agyn-detail-col-h::before { content: ""; flex: 0 0 6px; width: 6px; height: 6px; border-radius: 50%; background: var(--agyn-family-fill, var(--agyn-fg3)); }
        .agyn-detail-note { margin: 0; font-size: 12px; line-height: 20px; color: var(--agyn-fg2); overflow-wrap: anywhere; }
        .agyn-group-off { color: var(--agyn-fg3); font-weight: 500; }
        .agyn-family-gemini { --agyn-family-fill: linear-gradient(90deg, #38bdf8, #818cf8); }
        .agyn-family-claude { --agyn-family-fill: linear-gradient(90deg, #fb923c, #ea580c); }
        .agyn-family-argon { --agyn-family-fill: linear-gradient(90deg, #2dd4bf, #06b6d4); }
        .agyn-cell { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
        .agyn-cell + .agyn-cell { padding-top: 12px; border-top: 1px solid var(--agyn-line2); }
        .agyn-cell-top { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 2px 8px; font-size: 12px; line-height: 19px; color: var(--agyn-fg2); }
        .agyn-cell-top b { font-family: var(--agyn-mono); font-size: 20px; font-weight: 700; line-height: 26px; color: var(--agyn-fg); }
        .agyn-cell-top span { min-width: 0; overflow-wrap: anywhere; }
        .agyn-cell-reset { font-size: 11.5px; line-height: 19px; color: var(--agyn-fg2); overflow-wrap: anywhere; white-space: normal; }
        .agyn-cell-empty .agyn-cell-top b { color: var(--agyn-off); }
        .agyn-cell .agyn-bar { flex: none; height: 5px; }
        .agyn-detail-col .agyn-bar > i { background: var(--agyn-family-fill, var(--agyn-fg3)); }
        .agyn-detail-col .agyn-bar-low > i { background: var(--agyn-warn); }
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
        .agyn-mrow-unavail { opacity: .55; }
        .agyn-mrow-unavail .agyn-mmain, .agyn-mrow-unavail .agyn-cb { cursor: not-allowed; }
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
        .agyn-diag { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
        .agyn-diag-hint { font-size: 11px; line-height: 16px; color: var(--agyn-fg2); }
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

        /* footer & brand links */
        .agyn-footer { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 16px; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--agyn-line2); font-size: 12px; color: var(--agyn-fg2); }
        .agyn-footer-left, .agyn-footer-right { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .agyn-footer-link { display: inline-flex; align-items: center; gap: 4px; color: var(--agyn-fg2); text-decoration: none; transition: color .15s; }
        .agyn-footer-link:hover { color: var(--agyn-accent); text-decoration: underline; }
        .agyn-footer-author { font-weight: 600; color: var(--agyn-fg); }
        .agyn-footer-dot { color: var(--agyn-fg3); }
        .agyn-top-actions a.agyn-iconbtn { display: inline-grid; place-items: center; text-decoration: none; }

        /* Stack BOTH grids together instead of shrinking fonts or hiding text. */
        @container agyn (max-width: 479px) {
          .agyn-summary, .agyn-detail-groups { grid-template-columns: minmax(0, 1fr); }
          .agyn-q { grid-column: 1; }
          .agyn-note { padding-left: 12px; }
          .agyn-row-alert { flex-wrap: wrap; }
          .agyn-tip { grid-template-columns: 16px minmax(0, 1fr); }
          .agyn-tip > .agyn-btn { grid-column: 2; justify-self: start; }
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
      github: [
        "M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22",
      ],
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
      const familyClass = group?.id === "argon" ? "agyn-bar-argon" : group?.id === "3p" ? "agyn-bar-claude" : "agyn-bar-gemini";
      return h(
        "span",
        { className: `agyn-q${off ? " agyn-q-off" : ""}${empty ? " agyn-q-empty" : ""}`, style: { "--agyn-gi": String(index + 1) } },
        h("span", { className: `agyn-q-label${empty ? " agyn-q-label-empty" : ""}`, title: label }, label),
        h(
          "span",
          { className: "agyn-q-row" },
          h(
            "span",
            {
              className: `agyn-bar ${familyClass}${empty ? " agyn-bar-empty" : low ? " agyn-bar-low" : ""}`,
              role: "img",
              "aria-label": `${label} ${pct === null ? "–" : `${text}%`}`,
            },
            h("i", { style: { width: `${pct ?? 0}%` } }),
          ),
          h("span", { className: `agyn-num${empty ? " agyn-num-off" : ""}`, "aria-hidden": true }, text),
        ),
      );
    }

    // One window of one family in an expanded account: percentage, reset, bar.
    function QuotaCell({ windowLabel, label, win, remainMark, now, localeId, t }) {
      const pct = pctOf(win);
      const empty = pct !== null && pct <= 0;
      const low = pct !== null && !empty && pct <= remainMark;
      const text = pct === null ? "–" : `${fmtPct(pct)}%`;
      const reset = resetLine(win, now, localeId, t);
      // Keep reset information on its own wrapping line; never ellipsize it.
      return h(
        "span",
        { className: `agyn-cell${empty ? " agyn-cell-empty" : ""}` },
        h("span", { className: "agyn-cell-top" }, h("b", null, text), h("span", null, windowLabel)),
        reset ? h("span", { className: "agyn-cell-reset" }, reset) : null,
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
    function AccountDetail({ id, row, cols, isNext, remainMark, now, localeId, t, busy, onLogout }) {
      const { account, groups } = row;
      const token = account.stale ? t("tokenStale") : t("tokenLeft", { time: shortDuration(account.expiresInMs) });
      const refreshHint = account.refreshStatus?.reason && account.refreshStatus.reason !== "ok"
        ? t(({ reauth_required: "refreshReauth", client_mismatch: "refreshClientMismatch", access_denied: "refreshAccessDenied", temporary_failure: "refreshTemporary", client_unavailable: "refreshClientUnavailable", account_removed: "refreshRemoved" })[account.refreshStatus.reason] ?? "refreshFailed")
        : null;
      const quotaHint = account.quotaStatus?.reason === "unreported" ? t("quotaUnreported") : null;
      return h(
        "div",
        { className: "agyn-detail", id },
        refreshHint ? h("p", { className: "agyn-detail-note" }, refreshHint) : null,
        quotaHint ? h("p", { className: "agyn-detail-note" }, quotaHint) : null,
        !groups.length && cols.length ? h("p", { className: "agyn-detail-note" }, t("usageUnavailable")) : null,
        cols.length
          ? h(
              "div",
              { className: "agyn-detail-groups" },
              cols.map((col) => {
                const group = groups.find((item) => item.id === col.id);
                const name = groupLabel(col, t);
                const family = col.id === "3p" ? "claude" : col.id === "argon" ? "argon" : "gemini";
                return h(
                  "div",
                  { key: col.id, "data-quota-group": col.id, className: `agyn-detail-col agyn-family-${family}${group?.available ? "" : " agyn-group-off"}` },
                  h("div", { className: "agyn-detail-col-h" }, name),
                  group?.available
                    ? [
                        ["fiveHour", t("fiveHour"), group.fiveHour],
                        ["weekly", t("weekly"), group.weekly],
                      ]
                        .filter(([, , win]) => win)
                        .map(([key, label, win]) =>
                          h(QuotaCell, { key, windowLabel: label, label: `${name} ${label}`, win, remainMark, now, localeId, t }),
                        )
                    : h("span", { className: "agyn-detail-note" }, t(group ? "groupNoModels" : "groupUsageUnreported")),
                );
              }),
            )
          : h("p", { className: "agyn-sub" }, t("usageUnavailable")),
        h(
          "div",
          { className: "agyn-detail-foot" },
          h("span", null, [
            isNext ? t("nextUp") : null,
            token,
            account.projectId ? t("projectLabel", { id: account.projectId }) : null
          ].filter(Boolean).join(" · ")),
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
      const loadSeq = React.useRef(0);

      const load = React.useCallback(async () => {
        const seq = ++loadSeq.current;
        try {
          const value = await callApi("status");
          if (seq !== loadSeq.current) return;
          rememberStatus(value);
          setStatus(value);
          setLive(true);
        } catch (error) {
          if (seq !== loadSeq.current) return;
          setMessage({ kind: "error", text: t("errorGeneric", { message: error.message }) });
        }
      }, [t]);

      const pendingAuthUrl = status?.pending?.authUrl ?? null;

      // Poll faster while an approval is outstanding so the page reflects it
      // without the user pressing anything.
      React.useEffect(() => {
        let alive = true;
        let inFlight = false;
        load();
        const timer = window.setInterval(() => {
          if (!alive || inFlight) return;
          inFlight = true;
          Promise.resolve(load()).finally(() => {
            inFlight = false;
          });
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
      // The plugin's own version comes from /status, which reads package.json on
      // the host side. Hardcoding it here is how the footer once drifted a whole
      // release behind the tarball it was shipped in.
      const pluginVersion = typeof status.version === "string" && status.version ? status.version : null;
      const cred = status.credential ?? {};
      const scopes = status.scopes ?? [];
      const models = status.models ?? [];
      const sourceLabel = client.source === "installed-app"
        ? `${t("srcInstalled")}${client.kind === "ide" ? ` · ${t("srcIde")}` : client.kind === "desktop" ? ` · ${t("srcDesktop")}` : ""}`
        : t("unknown");
      const clientState = client.configured ? "ok" : client.installed ? "warn" : "off";

      // An IDE failure is not the same as "nothing installed": the user has a
      // build, and the next step is either the desktop build or a bug report.
      // Map the reported code to copy so the page explains which one applies.
      const ideCodeKey = client.code === "IDE_CLIENT_UNREADABLE" ? "codeIdeUnreadable"
        : client.code === "IDE_IDENTITY_MISMATCH" ? "codeIdeIdentity"
          : client.code === "IDE_CLIENT_AMBIGUOUS" ? "codeIdeAmbiguous" : null;

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
      // Only "confirmed served" may be ticked. Unknown (null) is not a licence
      // to pre-select something this account may not have.
      const canSelect = (model) => model.served === true;
      const setGroupVisible = (list, value) =>
        saveVisibility({ ...visOverride, ...Object.fromEntries(list.filter(canSelect).map((model) => [model.id, value])) });

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
      const chipText = client.configured ? t("chipReady") : client.installed ? t("chipClientError") : t("chipNoClient");
      const header = h(
        "header",
        { className: "agyn-top" },
        h(
          "div",
          { className: "agyn-brand" },
          h("h2", { className: "agyn-title" }, t("title")),
        ),
        h(
          "div",
          { className: "agyn-top-actions" },
          h(
            "a",
            {
              className: "agyn-iconbtn",
              href: "https://github.com/kizaki-R/Antigravity-Next-for-DSH",
              target: "_blank",
              rel: "noopener noreferrer",
              title: t("repoSite"),
              "aria-label": t("repoSite"),
            },
            h(Icon, { name: "github", size: 16 }),
          ),
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
        const plan = account.plan;
        const hasReportedPlan = plan?.status === "reported" && typeof plan.label === "string" && Boolean(plan.label);
        const badgeText = hasReportedPlan ? plan.label : t("tierUnknown");
        const badgePaid = hasReportedPlan && ["plus", "pro", "ultra"].includes(plan.tier);
        const badgeTitle = [
          hasReportedPlan ? t("tierSource", { field: plan.source }) : t("tierUnknownHint"),
          t("tierEvidence", { paid: plan?.paidTier?.id ?? "—", codeAssist: plan?.codeAssistTier?.id ?? "—" }),
          t("tierIndependent"),
        ].join("\n");
        const exhaustedGroup = row.isActive
          ? row.groups.find((g) => g.available && ((pctOf(g.fiveHour) !== null && pctOf(g.fiveHour) <= 0) || (pctOf(g.weekly) !== null && pctOf(g.weekly) <= 0)))
          : null;
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
              h(
                "span",
                { className: "agyn-who-text" },
                h(
                  "span",
                  { className: "agyn-who-head" },
                  h("span", { className: "agyn-email", title: account.email ?? "" }, email),
                  h("span", {
                    className: badgePaid
                      ? (plan?.tier === "ultra" ? "agyn-tier-ultra" : plan?.tier === "plus" ? "agyn-tier-plus" : "agyn-tier-pro")
                      : "agyn-tier-std",
                    title: badgeTitle,
                    "data-plan-status": hasReportedPlan ? "reported" : "unknown",
                    "data-plan-tier": hasReportedPlan ? plan.tier : "unknown",
                  }, badgeText),
                ),
              ),
              h(Icon, { name: "chevron", size: 14, className: "agyn-chev" }),
            ),
            h("div", { className: "agyn-summary" }, cols.map((col, i) =>
              h(LedgerCell, {
                key: col.id,
                index: i,
                group: row.groups.find((group) => group.id === col.id) ?? null,
                label: groupLabel(col, t),
                remainMark,
              }),
            )),
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
                        disabled: Boolean(busy),
                        "aria-label": `${t("switchTo")} ${account.email ?? ""}`.trim(),
                      },
                      t("switchTo"),
                    )
                  : null,
            ),
          ),
          exhaustedGroup
            ? h(
                "div",
                { className: "agyn-row-alert" },
                h(
                  "div",
                  { className: "agyn-alert-msg" },
                  h(Icon, { name: "alert", size: 14 }),
                  h("span", null, t("familyExhaustedAlert", { family: groupLabel(exhaustedGroup, t) })),
                ),
                next &&
                  h(
                    "button",
                    {
                      type: "button",
                      className: "agyn-alert-act",
                      onClick: () => act("switch", "accounts/switch", { id: next.id }),
                      disabled: Boolean(busy),
                    },
                    t("switchStandby"),
                  ),
              )
            : null,
          row.note && !open
            ? h("p", { className: `agyn-note agyn-note-${row.note.tone}` }, h(Icon, { name: "clock", size: 14 }), h("span", null, row.note.text))
            : null,
          open
            ? h(AccountDetail, {
                id: detailId,
                row,
                cols,
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
                  const unavailable = model.served !== true;
                  const modelOn = isVisible(model);
                  const name = h("span", { className: "agyn-mname", title: unavailable ? t("modelUnavailable") : model.id }, model.name);
                  return h(
                    "li",
                    { key: model.id, className: `agyn-mrow${modelOn ? "" : " agyn-mrow-off"}${unavailable ? " agyn-mrow-unavail" : ""}` },
                    visSupported
                      ? h(
                          "label",
                          { className: "agyn-mmain" },
                          h("input", {
                            className: "agyn-cb",
                            type: "checkbox",
                            checked: modelOn,
                            disabled: unavailable,
                            onChange: () => {
                              if (unavailable) return;
                              saveVisibility({ ...visOverride, [model.id]: !modelOn });
                            },
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
            client.configured ? `${t("clientOk")} · ${sourceLabel}` : client.installed ? t("clientError") : t("clientMissing"),
          ),
          client.configured && client.version ? h("span", { className: "agyn-oauth-id" }, client.version) : null,
          h("span", { className: "agyn-oauth-chev" }, h(Icon, { name: "chevron", size: 14, className: "agyn-chev" })),
        ),
        h(
          "div",
          { className: "agyn-oauth-body" },
          h(Callout, { kind: "info" }, t("hintLocalIntegration")),
            !client.configured && h(Callout, { kind: "warn" },
              // An IDE-specific failure names the build the user actually has,
              // instead of the generic "not found" that reads as "you installed
              // nothing" and sends them looking for a missing install.
              ideCodeKey ? t(ideCodeKey) : t(client.installed ? "hintParseError" : "hintMissing"), " ",
              h("a", { href: "https://antigravity.google/product/antigravity-2", target: "_blank", rel: "noopener noreferrer" }, t("downloadAgy")),
            ),
            !client.configured && h(
              "div",
              { className: "agyn-diag" },
              h("button", {
                type: "button",
                className: "agyn-btn",
                onClick: async () => {
                  // Copy a report the user can paste into an issue. It carries
                  // OS, versions, which candidate folders exist, and the error
                  // code: enough to diagnose, nothing that identifies the user.
                  try {
                    const response = await fetch(`${API}/diagnostics`);
                    const payload = await response.json();
                    copy(JSON.stringify(payload.value ?? payload, null, 2), "diagnostics");
                  } catch {
                    copy(t("diagnosticsFailed"), "diagnostics");
                  }
                },
              }, copied === "diagnostics" ? t("diagnosticsCopied") : t("diagnostics")),
              h("span", { className: "agyn-diag-hint" }, t("diagnosticsHint")),
            ),
          h(
            "dl",
            { className: "agyn-kv" },
            client.configured && [
              h("dt", { key: "src-k" }, t("kvSource")),
              h("dd", { key: "src-v", className: "agyn-plain" }, sourceLabel),
            ],
            client.version && [
              h("dt", { key: "version-k" }, t("kvVersion")),
              h("dd", { key: "version-v" }, client.version),
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

      const footer = h(
        "footer",
        { className: "agyn-footer" },
        h(
          "div",
          { className: "agyn-footer-left" },
          t("maintainer"),
          " ",
          h(
            "a",
            {
              href: "https://github.com/kizaki-R",
              target: "_blank",
              rel: "noopener noreferrer",
              className: "agyn-footer-link agyn-footer-author",
            },
            h(Icon, { name: "user", size: 13 }),
            "@kizaki-R",
          ),
        ),
        h(
          "div",
          { className: "agyn-footer-right" },
          h(
            "a",
            {
              href: "https://github.com/kizaki-R/Antigravity-Next-for-DSH",
              target: "_blank",
              rel: "noopener noreferrer",
              className: "agyn-footer-link",
            },
            h(Icon, { name: "github", size: 13 }),
            t("repoSite"),
          ),
          h("span", { className: "agyn-footer-dot" }, "·"),
          h(
            "a",
            {
              href: "https://github.com/kizaki-R/Antigravity-Next-for-DSH/issues",
              target: "_blank",
              rel: "noopener noreferrer",
              className: "agyn-footer-link",
            },
            t("reportIssue"),
          ),
          h("span", { className: "agyn-footer-dot" }, "·"),
          h(
            "a",
            {
              href: "https://www.npmjs.com/package/agy-next",
              target: "_blank",
              rel: "noopener noreferrer",
              className: "agyn-footer-link",
            },
            pluginVersion ? `npm v${pluginVersion}` : "npm",
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
        footer,
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

        // Settings navigation sidebar icon decorator (Option B: Antigravity Next mark).
        // Replaces the shell's generic fallback gear with our brand logo.
        const NAV_ICON_SVG =
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" data-agyn-nav="1" style="flex:none;vertical-align:middle;">' +
          '<defs>' +
          '<linearGradient id="agyn-nav-grad" x1="0%" y1="0%" x2="100%" y2="100%">' +
          '<stop offset="0%" stop-color="#4ca0f8"/>' +
          '<stop offset="50%" stop-color="#f3b357"/>' +
          '<stop offset="100%" stop-color="#9272f6"/>' +
          '</linearGradient>' +
          '<radialGradient id="agyn-nav-orb" cx="35%" cy="30%" r="70%">' +
          '<stop offset="0%" stop-color="#ffffff"/>' +
          '<stop offset="60%" stop-color="#8FEFFA"/>' +
          '<stop offset="100%" stop-color="#7B61FF"/>' +
          '</radialGradient>' +
          '</defs>' +
          '<path d="M 16.5 7.5 A 7 7 0 1 1 7.5 7.5" stroke="url(#agyn-nav-grad)" stroke-width="2.5" stroke-linecap="round"/>' +
          '<path d="M 14.5 10.5 A 3.8 3.8 0 1 1 9.5 10.5" stroke="#31dcf1" stroke-width="1.3" stroke-linecap="round" opacity="0.85"/>' +
          '<circle cx="12" cy="3.5" r="2" fill="url(#agyn-nav-orb)"/>' +
          '</svg>';

        function patchNavIcon() {
          if (typeof document === "undefined") return;
          if (!document.querySelector('[role="dialog"]')) return;
          const labels = new Set(["AGY-Next", "Antigravity Next", "Antigravity"]);
          for (const span of document.querySelectorAll("span")) {
            if (span.textContent && labels.has(span.textContent.trim())) {
              const btn = span.closest("button");
              if (btn) {
                const svg = btn.querySelector("svg");
                if (svg && svg.dataset.agynNav !== "1") {
                  svg.outerHTML = NAV_ICON_SVG;
                }
              }
            }
          }
        }

        if (typeof window !== "undefined") {
          const timer = window.setInterval(patchNavIcon, 400);
          if (typeof document !== "undefined") {
            document.addEventListener("click", () => queueMicrotask(patchNavIcon), true);
          }
          if (typeof ctx.effect === "function") {
            ctx.effect(() => () => window.clearInterval(timer), "agy-next: nav icon timer");
          }
        }

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
