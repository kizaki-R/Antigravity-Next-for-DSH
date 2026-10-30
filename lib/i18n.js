/**
 * Three-language copy for the setup walkthrough.
 *
 * The audience for this plugin reads English, Traditional Chinese, or Simplified
 * Chinese, and the walkthrough is the one place where a wrong word costs the
 * user twenty minutes of guessing at Google's UI. So the copy lives here as data
 * rather than as inline strings: one key per idea, three complete versions, no
 * reuse of one variant's wording in another.
 *
 * Language is chosen from, in order: an explicit `AGY_NEXT_LANG`, the system
 * locale (`LC_ALL` / `LANG` / `LANGUAGE`), or the locale Windows reports through
 * `Intl`. Chinese resolves by script: `Hant`/`TW`/`HK`/`MO` or the `zh-TW` style
 * of tag gives Traditional; anything else Chinese gives Simplified.
 */

/**
 * Canonical locale ids for the terminal walkthrough.
 *
 * Deliberately not the same vocabulary the browser settings page uses. That page
 * is bound by dsh's own registry, which ships exactly `zh` (Simplified) and `en`
 * and needs a separately declared `zh-Hant` language pack (see lib/ui.js). This
 * file only feeds the terminal walkthrough, where nothing is bound to dsh and
 * the explicit script subtags read better. Both keep `zh-Hant`; the difference
 * is that Simplified is `zh-Hans` here and plain `zh` there.
 */
export const LOCALES = ["en", "zh-Hant", "zh-Hans"];

/**
 * Resolve the walkthrough language.
 *
 * @param {string} [raw] explicit override (`en`, `zh`, `zh-TW`, `zh-CN`, ...)
 * @returns {"en" | "zh-Hant" | "zh-Hans"}
 */
export function pickLocale(raw = process.env.AGY_NEXT_LANG || "") {
  const value = String(raw || "").trim();
  if (value) return normalize(value);

  const env = process.env.LC_ALL || process.env.LC_MESSAGES || process.env.LANG || process.env.LANGUAGE || "";
  if (env.trim()) return normalize(env);

  try {
    return normalize(Intl.DateTimeFormat().resolvedOptions().locale || "");
  } catch {
    return "en";
  }
}

function normalize(tag) {
  const low = tag.toLowerCase().replace(/_/g, "-");
  if (!low.startsWith("zh")) return "en";
  // Traditional: explicit script, or the regions that use it.
  if (/hant|-tw|-hk|-mo/.test(low)) return "zh-Hant";
  if (/hans|-cn|-sg/.test(low)) return "zh-Hans";
  return "zh-Hant"; // bare `zh` — lean to the script the author writes in
}

/**
 * Look up a key. Returns an array when the value is an array of lines.
 *
 * @param {string} locale
 * @param {string} key dot-path, e.g. `guide.api.lines`
 * @param {Record<string, string | number>} [vars] `{n}`, `{total}`, ...
 */
export function t(locale, key, vars) {
  const table = COPY[locale] ?? COPY.en;
  const value = key.split(".").reduce((node, part) => (node == null ? undefined : node[part]), table);

  const fallback = key.split(".").reduce((node, part) => (node == null ? undefined : node[part]), COPY.en);
  const resolved = value === undefined ? fallback : value;
  if (resolved === undefined) return key;

  const fill = (text) =>
    vars ? String(text).replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m)) : String(text);

  return Array.isArray(resolved) ? resolved.map(fill) : fill(resolved);
}

const COPY = {
  en: {
    guide: {
      title: "agy-next  ·  setup",
      intro: [
        "This plugin does not bundle Google's OAuth client credentials. You need a client registered for this app.",
        "The requested scopes include undocumented Google internal scopes; Google may reject third-party clients.",
        "Do not reuse another application's OAuth client. No supported public login route is confirmed yet.",
      ],
      openPage: "Open this page:",
      continue: "Press Enter to continue, or q then Enter to quit",
      prompt: "Type a letter, then press Enter:    (nothing) continue    o open this page    q quit",
      opened: "Opened in your browser.",
      stepLabel: "Step {n}/{total}",
      optionalStep: "If this page says the consent screen is already configured, press Enter.",
      resumed: "Resuming: {n} step(s) already done and skipped below.",
      stepSkipped: "Step {n} already done — skipping: {title}",
      project: {
        title: "Create a Google Cloud project",
        lines: [
          "Name it anything; agy-next works.",
          "Leave Location as No organization.",
          "Press Create and wait about ten seconds.",
          "",
          "THEN CHECK THE PROJECT SELECTOR AT THE TOP OF THE PAGE.",
          "If you already had other projects, the selector still shows the old one.",
          "Click it and choose agy-next, or every following step lands in the wrong project.",
        ],
      },
      api: {
        title: "Enable the Gemini for Google Cloud API",
        lines: [
          "Check the project selector at the top says agy-next, then press the blue Enable button.",
          "Wait about twenty seconds; it turns into Manage and you are done.",
          "",
          "You are looking for 'Gemini for Google Cloud'. That is the API you can",
          "enable. Do NOT search for 'Cloud Code Assist': that is Google's internal",
          "backend, it has no entry in the API library, and searching for it finds nothing.",
          "",
          "This is the step people skip. Login will still succeed without it,",
          "and every model call will then fail with 403.",
          "",
          "If the page says 'Could not load', press Retry. If it still fails, open",
          "Enabled APIs and services, search Gemini for Google Cloud, and select it",
          "from there.",
        ],
      },
      consent: {
        title: "Configure the OAuth consent screen",
        lines: [
          "This is a multi-step wizard. The steps are listed down the left side.",
          "",
          "Step 1 App information: App name agy-next, your own support email.",
          "Step 2 Audience: choose External. Internal only works for organization",
          "  accounts, and a personal Gmail has no organization.",
          "Step 3 Contact information: your own email in both fields.",
          "Step 4 Finish: accept the summary.",
          "",
          "THEN, back on the consent screen page, find Test users and press",
          "ADD USERS, then enter the Google address you will sign in with.",
          "",
          "Why test users? The app stays in Testing status, and only addresses on",
          "that list can sign in. Skipping this makes the browser answer",
          "'Access blocked' at the very end of setup.",
        ],
      },
      client: {
        title: "Create the OAuth client ID",
        lines: [
          "Google moved this under Google Auth Platform. Either path works:",
          "  left menu Clients, then Create client; or APIs and Services,",
          "  Credentials, then Create credentials and OAuth client ID.",
          "",
          "Application type: Desktop app. Web and Android will not work.",
          "Name: agy-next   (use exactly this; it only labels the credential)",
          "Leave 'Use this client for an AI-powered agent' unchecked.",
          "",
          "Press Create. A dialog then shows two strings; keep it open for the",
          "next step, because the secret is not shown again.",
        ],
      },
      paste: {
        title: "Paste the two strings",
        lines: [
          "Client ID     1234567890-abc.apps.googleusercontent.com",
          "Secret        GOCSPX-xxxxxxxxxxxx",
        ],
        clientId: "Client ID:",
        clientSecret: "Client secret:",
        required: "Both fields are required.",
        badClientId: "That does not look like an OAuth client ID. An API key is a different thing.",
        badClientSecret: "Client secrets start with GOCSPX-. Check you copied the right string.",
        ok: "Both look right.",
      },
      probe: {
        running: "Checking that the API answers for this project...",
        ok: "The API answers. You are ready to sign in.",
        enableApi: [
          "The API answered 403: it is not enabled for this project, or for this account.",
          "Go back to the API page, check the project selector names the project your",
          "OAuth client belongs to, press Enable, wait until the button reads Manage,",
          "then run setup again.",
        ],
        checkTestUser: [
          "Your account is probably not on the consent screen's test-user list, which",
          "answers 403 as well. Open the consent screen page, press ADD USERS and add",
          "the Google address you are signing in with.",
        ],
        loginAgain: "The access token was rejected. Run login again to get a fresh one.",
        retry: "Could not reach Google. Check your network and run setup again.",
        unknown: "The API answered with an unexpected status. See the message above.",
      },
    },
  },

  "zh-Hant": {
    guide: {
      title: "agy-next  ·  初次設定",
      intro: [
        "這個外掛不內含 Google OAuth client 憑證，必須提供註冊給本外掛使用的 client。",
        "它要求的 scope 包含未公開文件的 Google 內部 scope；Google 可能拒絕第三方 client。",
        "請勿重用其他應用程式的 OAuth client；目前尚未確認可公開支援的登入方式。",
      ],
      openPage: "開啟這個頁面：",
      continue: "按 Enter 繼續，或打 q 再按 Enter 離開",
      prompt: "打一個字母再按 Enter：（直接 Enter）繼續    o 開啟這一頁    q 離開",
      opened: "已在瀏覽器開啟。",
      stepLabel: "步驟 {n}/{total}",
      optionalStep: "這一頁若顯示同意畫面已設定完成，直接按 Enter。",
      resumed: "接續上次進度：已完成 {n} 個步驟，以下會自動跳過。",
      stepSkipped: "步驟 {n} 已完成 — 跳過：{title}",
      project: {
        title: "建立 Google Cloud 專案",
        lines: [
          "名稱隨意填，叫 agy-next 就好。",
          "位置留「無機構」。",
          "按「建立」，等約十秒。",
          "",
          "建好後，請檢查畫面最上方的專案選單是不是 agy-next。",
          "如果你的帳號原本就有其他專案，選單會停在舊的那個——",
          "點它，切換到 agy-next，否則後面每一步都會啟用到錯的專案。",
        ],
      },
      api: {
        title: "啟用 Gemini for Google Cloud API",
        lines: [
          "確認上方的專案選擇器指到 agy-next，按藍色的「啟用」。",
          "等約二十秒，按鈕變成「管理」就完成了。",
          "",
          "你要找的 API 叫「Gemini for Google Cloud」，這個才啟用得到。",
          "不要搜尋「Cloud Code Assist」——那是 Google 的內部後端，",
          "API 程式庫裡沒有這一項，搜也搜不到。",
          "",
          "這一步最常被跳過。少了它，登入照樣會成功，",
          "但之後每次呼叫模型都會回 403。",
          "",
          "這一頁若顯示「無法載入」，先按右上角「重試」。還是不行，",
          "就從左側「已啟用的 API 和服務」搜尋 Gemini for Google Cloud。",
        ],
      },
      consent: {
        title: "設定 OAuth 同意畫面",
        lines: [
          "這是一個多步驟精靈，步驟列在畫面左側，總共 4 步。",
          "",
          "第 1 步 應用程式資訊：名稱填 agy-next，支援電子郵件填你自己的。",
          "第 2 步 目標對象：選「外部」。個人 Gmail 沒有組織，",
          "  選「內部」會不能用。",
          "第 3 步 聯絡資訊：兩個欄位都填你自己的信箱。",
          "第 4 步 完成：確認摘要後按建立。",
          "",
          "建好之後，回到「OAuth 同意畫面」頁面，找到「測試使用者」，",
          "按「新增使用者」，填你等一下要登入的那個 Google 信箱。",
          "",
          "為什麼要加測試使用者？因為應用程式還在「測試中」狀態，",
          "只有名單上的帳號能登入。漏掉這步，最後登入時瀏覽器會顯示",
          "「存取遭封鎖」，而你不會知道是這裡的問題。",
        ],
      },
      client: {
        title: "建立 OAuth 用戶端 ID",
        lines: [
          "Google 把這一區移到「Google Auth Platform」了。兩條路都可以：",
          "  左側選單「用戶端」→「建立用戶端」；或",
          "  「API 和服務」→「憑證」→「建立憑證」→「OAuth 用戶端 ID」。",
          "",
          "應用程式類型選「電腦版應用程式」，選網頁或 Android 都不能用。",
          "名稱填：agy-next（照這個填就好，它只是讓你辨識用）",
          "「Use this client for an AI-powered agent」那個勾不要勾。",
          "",
          "按「建立」。接著會跳出一個視窗，裡面有兩串字。",
          "留著那個視窗，下一步要貼——secret 之後不會再顯示。",
        ],
      },
      paste: {
        title: "貼上剛剛拿到的兩串",
        lines: [
          "用戶端 ID     1234567890-abc.apps.googleusercontent.com",
          "用戶端密鑰    GOCSPX-xxxxxxxxxxxx",
        ],
        clientId: "用戶端 ID：",
        clientSecret: "用戶端密鑰：",
        required: "兩欄都必填。",
        badClientId: "這看起來不像 OAuth 用戶端 ID。API 金鑰是別的東西。",
        badClientSecret: "用戶端密鑰以 GOCSPX- 開頭，檢查一下是不是複製錯了。",
        ok: "兩串都正確。",
      },
      probe: {
        running: "正在確認這個專案的 API 是否可用…",
        ok: "API 回應正常，可以登入了。",
        enableApi: [
          "API 回應 403：這個專案（或這個帳號）沒有啟用 API。",
          "回到 API 那一頁，確認上方專案選單是你 OAuth 用戶端所屬的專案，",
          "按「啟用」，等按鈕變成「管理」後再執行一次設定。",
        ],
        checkTestUser: [
          "也可能是你的帳號不在同意畫面的測試使用者名單裡——那同樣會回 403。",
          "開啟同意畫面那一頁，按「新增使用者」，把你登入用的 Google 帳號加進去。",
        ],
        loginAgain: "存取權杖被拒絕，請重新登入取得新的權杖。",
        retry: "連不上 Google。請檢查網路後再執行一次設定。",
        unknown: "API 回應了非預期的狀態碼，請看上方訊息。",
      },
    },
  },

  "zh-Hans": {
    guide: {
      title: "agy-next  ·  初始设置",
      intro: [
        "这个插件不内含 Google OAuth client 凭据，必须提供注册给本插件使用的 client。",
        "它请求的 scope 包含未公开文档的 Google 内部 scope；Google 可能拒绝第三方 client。",
        "请勿重用其他应用程序的 OAuth client；目前尚未确认可公开支持的登录方式。",
      ],
      openPage: "打开这个页面：",
      continue: "按 Enter 继续，或输入 q 再按 Enter 退出",
      prompt: "输入一个字母再按 Enter：（直接 Enter）继续    o 打开这一页    q 退出",
      opened: "已在浏览器打开。",
      stepLabel: "步骤 {n}/{total}",
      optionalStep: "这一页若显示同意屏幕已设置完成，直接按 Enter。",
      resumed: "接续上次进度：已完成 {n} 个步骤，以下会自动跳过。",
      stepSkipped: "步骤 {n} 已完成 — 跳过：{title}",
      project: {
        title: "创建 Google Cloud 项目",
        lines: [
          "名称随意填，叫 agy-next 就行。",
          "位置留「无机构」。",
          "按「创建」，等约十秒。",
          "",
          "创建好后，请检查画面最上方的项目选单是不是 agy-next。",
          "如果你的账号原本就有其他项目，选单会停在旧的那个——",
          "点它，切换到 agy-next，否则后面每一步都会启用到错的项目。",
        ],
      },
      api: {
        title: "启用 Gemini for Google Cloud API",
        lines: [
          "确认上方的项目选择器指向 agy-next，按蓝色的“启用”。",
          "等约二十秒，按钮变成“管理”就完成了。",
          "",
          "你要找的 API 叫“Gemini for Google Cloud”，这个才启用得到。",
          "不要搜索“Cloud Code Assist”——那是 Google 的内部后端，",
          "API 库裡没有这一项，搜也搜不到。",
          "",
          "这一步最常被跳过。少了它，登录照样会成功，",
          "但之后每次调用模型都会返回 403。",
          "",
          "这一页若显示“无法载入”，先按右上角“重试”。还是不行，",
          "就从左侧“已启用的 API 和服务”搜索 Gemini for Google Cloud。",
        ],
      },
      consent: {
        title: "设置 OAuth 同意屏幕",
        lines: [
          "这是一个多步骤向导，步骤列在画面左侧，总共 4 步。",
          "",
          "第 1 步 应用信息：名称填 agy-next，支持邮箱填你自己的。",
          "第 2 步 目标对象：选“外部”。个人 Gmail 没有组织，",
          "  选“内部”会不能用。",
          "第 3 步 联系信息：两个字段都填你自己的邮箱。",
          "第 4 步 完成：确认摘要后按创建。",
          "",
          "创建好之后，回到“OAuth 同意屏幕”页面，找到“测试用户”，",
          "按“添加用户”，填你等一下要登录的那个 Google 邮箱。",
          "",
          "为什么要加测试用户？因为应用还在“测试中”状态，",
          "只有名单上的账号能登录。漏掉这步，最后登录时浏览器会显示",
          "“存取遭封锁”，而你不会知道是这里的问题。",
        ],
      },
      client: {
        title: "创建 OAuth 客户端 ID",
        lines: [
          "Google 把这一区移到“Google Auth Platform”了。两条路都可以：",
          "  左侧选单“客户端”→“创建客户端”；或",
          "  “API 和服务”→“凭据”→“创建凭据”→“OAuth 客户端 ID”。",
          "",
          "应用类型选“桌面应用”，选网页或 Android 都不能用。",
          "名称填：agy-next（照这个填就好，它只是让你辨识用）",
          "“Use this client for an AI-powered agent”那个勾不要勾。",
          "",
          "按“创建”。接着会弹出一个窗口，裡面有两串字符。",
          "留着那个窗口，下一步要粘贴——secret 之后不会再显示。",
        ],
      },
      paste: {
        title: "粘贴刚刚拿到的两串",
        lines: [
          "客户端 ID     1234567890-abc.apps.googleusercontent.com",
          "客户端密钥    GOCSPX-xxxxxxxxxxxx",
        ],
        clientId: "客户端 ID：",
        clientSecret: "客户端密钥：",
        required: "两栏都必填。",
        badClientId: "这看起来不像 OAuth 客户端 ID。API 密钥是另一个东西。",
        badClientSecret: "客户端密钥以 GOCSPX- 开头，检查一下是不是复制错了。",
        ok: "两串都正确。",
      },
      probe: {
        running: "正在确认这个项目的 API 是否可用…",
        ok: "API 响应正常，可以登录了。",
        enableApi: [
          "API 回应 403：这个项目（或这个账号）没有启用 API。",
          "回到 API 那一页，确认上方项目选单是你 OAuth 客户端所属的项目，",
          "按「启用」，等按钮变成「管理」后再执行一次设置。",
        ],
        checkTestUser: [
          "也可能是你的账号不在同意屏幕的测试使用者名单里——那同样会回 403。",
          "打开同意屏幕那一页，按「新增使用者」，把你登入用的 Google 账号加进去。",
        ],
        loginAgain: "存取令牌被拒绝，请重新登录取得新的令牌。",
        retry: "连不上 Google。请检查网络后再执行一次设置。",
        unknown: "API 回应了非预期的状态码，请看上方讯息。",
      },
    },
  },
};

export { COPY };
