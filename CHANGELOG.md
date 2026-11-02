# 變更紀錄 (CHANGELOG)

本專案遵循 [Semantic Versioning (語意化版本)](https://semver.org/lang/zh-TW/) 規範。

---

## [Unreleased]

### 維護性
- **npm 中繼資料修正**：移除 `package.json` 中錯誤的 `repository.directory` 欄位。公開倉庫的根目錄即為外掛本體，原值會讓 npm 的 Repository 連結指向不存在的 `agy-next/` 子目錄。
- **模組計數校正**：README（英／繁中）與 `AGENTS.md` 的語法檢查檔數由 39 更新為實際的 40。
- **發布防護**：新增 `prepublishOnly` 腳本，發布前自動執行 `npm run check` 與 `npm test`。
- **公開邊界掃描**：CI 新增獨立 `safety` job，檢查本機 Windows 使用者路徑、私有工作區 junction 名稱、對話備份路徑、Gmail 位址、疑似 Google OAuth client secret 與私鑰區塊。
- **主機契約可驗證化**：新增 `bin/verify-peers.mjs` 與 `verify:peers` 腳本。原本 `npm run verify` 在一般 checkout 會直接以 exit 2 中止，使 `check-offline.mjs` 的主機契約斷言從未真正執行；現在可透過 `AGY_PEER_ROOT` 指向 peer 套件後完整跑完。

---

## [1.0.1] - 2026-11-02

### UI & Branding
- **Custom Settings Nav Icon**: Decorate the settings sidebar navigation button with the Antigravity Next vector mark, replacing DSH's generic fallback gear.
- **Header Actions Layout**: Move GitHub shortcut button to the left of the language switcher; preserve the refresh button at the far right.
- **Center Action Icons**: Fix button centering in the top header via `inline-grid`.
- **Remove Build Stamp**: Retire internal `u29` debug badge from the header title.
- **Footer Community Links**: Add footer bar linking to maintainer profile (@kizaki-R), GitHub repository, issue tracker, and npm package.

### Documentation & Supported Models
- **Accurate Model Roster**: Correct model matrix to list upstream Antigravity Claude models (`claude-sonnet-5-5`, `claude-opus-5-5`, `claude-opus-4-6`, `claude-sonnet-4-6`), `gemini-3.8-flash`, `gemini-3-flash`, and `gpt-oss-120b`.
- **Context Windows & Reasoning**: Document 1M token context windows for Gemini and Claude models; clarify reasoning effort support across Argon, Flash 3.8, and Claude.
- **DSH Version Guidance**: Clarify compatibility as `0.1.5` ~ `0.2.x` (verified through `0.2.1`).

### Testing & CI
- **macOS Temp Directory Assertions**: Canonicalise temp directories using `realpath` before prefix assertions, resolving test failures on macOS where `/var` symlinks to `/private/var`.
- **Syntax Coverage**: Include `bin/peer-resolve.mjs` and `bin/test-peers.mjs` in `npm run check`, bringing coverage to all 40 modules.

### Community Governance
- **Contributing Guidelines**: Add `CONTRIBUTING.md` outlining the issue-first proposal workflow, local verification checklist, and confidential security disclosure channels.

---

## [1.0.0] - 2026-11-02

正式首發開源版本。具備完整的跨平台支援、三語系文檔、自動化測試矩陣與官方品牌視覺資產。

### 核心特性
- **動態本地解析**：直接從本機安裝的官方 Antigravity 應用程式解析 OAuth client，免去手動建立 Google Cloud 專案。
- **多帳號輪替池**：支援多組 Google 帳號管理、安全閾值自動切換與額度進度條即時監控。
- **完整模型支援**：涵蓋 Gemini 4 Argon（思考強度調節）、Gemini 3.8 Flash、Gemini 2.5 系列、Claude 系列（Sonnet 5.5 / Opus 5.5，具備 1M 上下文）與開源大模型 GPT-OSS 120B。
- **跨平台自動化 CI**：通過 Windows、macOS (Apple Silicon) 與 Ubuntu Linux 上的 Node 20 / 22 矩陣測試。
- **視覺資產齊全**：內建官方 512px 點陣圖示、三語系高解析橫幅與真實介面截圖。

---

## [0.5.0] - 2026-10-30

本版本為開源發布前的關鍵重構版，重點在於解決並行競爭危害、憑證生命週期漏洞、測試套件可攜性與非同步輪詢防護。

### 1. 測試套件可攜性與開源環境支援
- **遇到啥坑**：
  原先 `package.json` 中的 `"test:peers"` 腳本寫死了個人開發環境的絕對檔案路徑（`file:///C:/Users/<username>/...`），導致任何外部開發者或乾淨環境執行測試時直接報錯；且在缺少主機 peers 時測試會被直接 `skip`，卻依然輸出 `ALL REGRESSIONS PASSED`，造成綠燈假象。
- **怎解決**：
  - 新增 `bin/peer-resolve.mjs`，實作符合 Node.js ESM 規範的自訂解析器，透過環境變數 `AGY_PEER_ROOT` 靈活指定主機 peers 位置。
  - 新增 `bin/test-peers.mjs` 測試入口，並引入 `AGY_TESTS_STRICT=1` 嚴格模式。在 peers lane 中，任何略過 (skipped) 的測試皆強制視為失敗 (exit 1)，確保發布前驗證具備絕對誠信度。
  - 補齊 `package.json` 裡的 `check` 腳本，將未納入語法檢查的 7 個 `bin/*.mjs` 腳本全數加入 `node --check`。

### 2. 登出與憑證清冊生命週期（徹底解決「殭屍帳號復活」）
- **遇到啥坑**：
  當使用者在 Web UI 或 CLI 執行登出（刪除最後一個帳號）時，原邏輯會直接呼叫 `unlink` 刪除 `agy-next-oauth.json`。但在沒有該檔案時，`readBook()` 會判定為「初次使用」，自動從舊版外掛路徑（`antigravity-oauth.json`）重新匯入舊帳號。結果造成「剛剛手動登出，重整後舊帳號又自動復活」的嚴重行為矛盾。
- **怎解決**：
  - **Tombstone（墓碑機制）**：清空帳號或登出時，不再刪除磁碟檔案，而是持久化寫入標記為 `loggedOut: true` 的空清冊（`accounts: []`）。
  - `syncLegacyAccounts()` 增加守衛：若偵測到清冊已持久化且為空，明確視為使用者主動登出的合法狀態，不再自動回補 legacy 帳號。
  - `CredentialStore` 構造函式加入 `allowLegacy: false` 與 `legacyPath` 選項，讓單元測試與容器環境能徹底與系統宿主環境隔離。

### 3. Token Refresh 並行競態保護（CAS 與回滾防護）
- **遇到啥坑**：
  當多個請求同時觸發同一個帳號的 Token 刷新時，如果較早發起但較晚返回的刷新寫回清冊，會將較新刷出的 Token 覆蓋回舊值（Token Rollback）。另外，`modifyAccount` 原先回傳「值是否有實質修改」，導致並行時已是最新值的情境被誤判為帳號已被刪除 (`account_removed`)。
- **怎解決**：
  - 在 `lib/credential.js` 與 `lib/web-api.js` 的 Token 更新路徑引入 **CAS (Compare-And-Swap)**：在寫回磁碟前比對捕捉的 `capturedAccess` 與 `capturedExpires`，若發現清冊已被更新的請求推進，當前請求自動放棄寫盤，避免憑證回滾。
  - 將 `modifyAccount` 的回傳語意重構為 `applied`（帳號是否存在），清楚區分「帳號已不存在」與「帳號健在但無需更新」。
  - 移除 Token 刷新前檢查中對 `!account.access` 的錯誤限制，確保有合法 `refresh_token` 的狀態皆能正常換發。

### 4. Web API 狀態快照與多帳號家族配額一致性
- **遇到啥坑**：
  `buildStatus` 執行完非同步 Quota 查詢後，`credential` 物件仍沿用請求開頭時的過期快照，導致登出完成後畫面上仍短暫顯示舊帳號；且先前的代碼將全域耗盡 (`exhausted`) 與單一模型家族耗盡 (`exhaustedFamilies`) 混為一談，單一模型家族額度用完會導致整個帳號被誤判為滿額。
- **怎解決**：
  - 統一狀態權威：以非同步操作結束後重新讀取的 `responseBook` 與 `responseActive` 為準，空清冊明確回傳 `{ present: false }`。
  - 修正家族耗盡判斷：獨立保留 `exhaustedFamilies` 陣列，不把單一模型用完擴大為整帳號鎖死。
  - 增加 `modelsAccountId` 與 `modelsStale` 指標，在切換帳號時正確指示模型探索狀態是否需重新獲取。

### 5. Web UI 狀態輪詢防亂序與防堆疊
- **遇到啥坑**：
  設定頁面的 `setInterval` 定時輪詢沒有防重疊機制；且如果較早發出的請求被網路延遲卡住、較晚發出的請求先返回，較早的舊回傳隨後落地時會覆蓋掉較新的即時畫面。
- **怎解決**：
  - 引入 `loadSeq` 序號守衛：每次發起請求遞增序號，回傳時比對序號，陳舊請求的結果直接被捨棄。
  - 引入 `inFlight` 鎖：確保同一個計時器週期內若前一輪輪詢尚未結案，絕不疊加發出新請求。

### 6. 網路請求懸掛與超時處理
- **遇到啥坑**：
  OAuth Token 兌換、刷新與 UserInfo 查詢未設任何超時保護。在網路斷線或 Google 端點卡死時，請求會永久處於 pending 狀態。
- **怎解決**：
  - `exchangeCode` 與 `refreshAccessToken` 增加 `AbortSignal.timeout(30_000)`（30 秒超時）。
  - `fetchUserEmail` 增加 `AbortSignal.timeout(10_000)`（10 秒超時）。

### 7. 廢棄舊版 Google Cloud 手動引導流程
- **遇到啥坑**：
  外掛已經能自動從本機官方 Antigravity 提取 Client ID 與 Secret，但保留的 `setup-guide.js` 還在引導使用者手動去 Google Cloud Console 申請 OAuth，造成極大混淆。
- **怎解決**：
  - 保留模組匯出以維持外部引用相容性，`runSetupGuide()` 改為直接輸出已廢棄提示並推薦使用 `npm run login`，直接返回，不再擅自打開瀏覽器或要求輸入金鑰。

### 8. 二進制客戶端解析器邊界條件補強
- **遇到啥坑**：
  原先本機 ASAR 與 PE 二進制解析器缺乏多重 Consumer Client ID 候選或配對不合時的負向單元測試。
- **怎解決**：
  - 在 `bin/test-installed-agy.mjs` 中新增配對缺失與索引混淆時的安全防護驗證，確保在任何不確定結構下皆能 fail closed（安全拋出 `AMBIGUOUS_CLIENT`），絕不隨機湊配。

---

## [0.4.1] - 2026-10-20
- 支援本機 Antigravity 官方應用程式客戶端自動解析（免手動申請 GCP OAuth Client）。
- 支援多帳號管理、手動切換與配額閾值自動換號。
- 支援 Gemini 4 Argon（包含 low/medium/high 思維檔位）與 Claude 5.5 系列模型。
- 新增配額可視化面板（Gemini、Claude 3p、Argon 5 小時與每週配額條）。
- 支援繁體中文（台灣用語）、簡體中文與英文介面切換。
