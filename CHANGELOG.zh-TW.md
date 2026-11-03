# 變更紀錄 (CHANGELOG)

本專案遵循 [Semantic Versioning (語意化版本)](https://semver.org/lang/zh-TW/) 規範。

[English](CHANGELOG.md) | 繁體中文

---

## [1.1.0] - 2026-11-03

### 新增功能 (Added)
- **支援官方 Antigravity IDE**：新增對 Antigravity IDE（VS Code 架構，無 `resources/app.asar`）的本機 OAuth 用戶端解析。未偵測到桌面版時，自動讀取 `resources/app/out/main.js` 的 `cloudCode/common/oauthClient` 模組，以相鄰賦值語法提取個人版用戶端憑證（與桌面版為同一組 Client ID）。兩組以上候選時強制 fail closed（`IDE_CLIENT_AMBIGUOUS`），不作順序猜測。
- **自訂安裝路徑與智慧根目錄推導**：設定頁新增自訂安裝路徑輸入欄位，支援貼上主目錄、可執行檔（`Antigravity.exe` / `Antigravity IDE.exe`）或內部子目錄（`resources`、`resources/app`、`out/main.js`），後端自動向上收斂至正規安裝根目錄。
- **Windows 開始功能表捷徑穿透（LNK Shortcut Piercing）**：支援貼上開始功能表捷徑目錄或 `.lnk` 檔案，後端以純二進位緩衝區解析 Windows Shell Link，自動導向真實執行檔所在目錄。
- **佈局來源偏好與 auto 容錯降級（`clientSource`）**：新增 `clientSource` 設定（`auto` / `desktop` / `ide`，可透過 `cordis.yml` 或 `AGY_NEXT_CLIENT_SOURCE` 指定）。預設 `auto` 優先採用桌面版；若桌面版檔案損壞或無法讀取，自動降級切換至 IDE 版。
- **環境診斷報告一鍵複製**：新增 `GET /agy-next/api/diagnostics` 端點與設定頁複製按鈕。報告包含作業系統、執行階段版本、候選目錄存在狀態（僅布林值，不含絕對路徑）與安裝判定代碼，零憑證與個資外洩。
- **IDE 錯誤狀態碼細分**：新增 `IDE_CLIENT_UNREADABLE`、`IDE_IDENTITY_MISMATCH` 與 `IDE_CLIENT_AMBIGUOUS` 代碼與三語系說明文案。

### 問題修正 (Fixed)
- **安裝規格標籤斷行**：`.agyn-kv` 左欄改採 `max-content` 搭配 `white-space: nowrap`，修正繁體中文「應用程式版本」被擠壓成兩行的排版缺陷。
- **頁尾版本號動態化**：頁尾改自 `/status` 端點讀取實際執行版本，修正硬編碼為 `npm v1.0.0` 導致的顯示漂移；新增 `bin/check-ui-versions.mjs` 靜態防護，阻止硬編碼版本字串再次進入介面模組。
- **發布內容與 Git 歷史版本同步**：清除 `lib/ui.js` 中殘留的 `UI_BUILD = "u29"` 常數與 `.agyn-build` 樣式規則，確保 npm 發布產物與 Git 標籤一致。

### 工程維護與安全性 (Maintenance & Security)
- **發布安全前置檢查（`publish-guard`）**：`prepublishOnly` 掛載 `bin/publish-guard.mjs`。發布前自動驗證工作區無未提交變更、本地分支無領先遠端未推送的 Commit，且 HEAD 標籤與 `package.json` 版本完全相符。
- **公開程式碼邊界自動掃描**：CI 新增獨立 `safety` 作業，全面掃描已追蹤檔案，防範 Windows 使用者路徑、私有 Junction 名稱、對話備份路徑、Gmail 地址與私鑰區塊外流。
- **npm 套件中繼資料校正**：移除 `package.json` 中多餘的 `repository.directory` 欄位，確保 npm 頁面的原始碼倉庫連結正確指向公開倉庫根目錄。
- **宿主契約測試本地驗證**：新增 `bin/verify-peers.mjs` 與 `npm run verify:peers` 腳本，透過 `AGY_PEER_ROOT` 於本地環境完整執行主機契約斷言。模組語法檢查擴充至 43 個模組。

---

## [1.0.1] - 2026-11-02

### 介面與品牌視覺 (UI & Branding)
- **設定頁專屬圖示**：將 DSH 設定頁側邊欄預設的灰色齒輪替換為 Antigravity Next 向量品牌圖示。
- **頂部操作列排版**：GitHub 捷徑按鈕移至語言切換按鈕左側，右上角保留重新整理按鈕，並以 `inline-grid` 達成絕對居中；退場 `u29` 測試標記。
- **頁尾社群指引列**：在設定頁底端新增維護者個人主頁（`@kizaki-R`）、GitHub 專案、問題回報與 npm 連結，完整支援三語系切換。

### 文檔與模型支援矩陣 (Documentation & Supported Models)
- **支援模型矩陣校正**：修正文檔模型清單，列出 Claude Sonnet 5.5、Claude Opus 5.5、Gemini 3.8 Flash 與 GPT-OSS 120B。
- **上下文視窗與思考調節**：標明 Gemini 與 Claude 系列具備 1M tokens 上下文視窗；說明 Argon、Flash 3.8 與 Claude 的思考強度調節機制。
- **DSH 版本相容指引**：明確相容範圍為 `0.1.5` ~ `0.2.x`（已實測驗證至 `0.2.1`）。

### 測試與持續整合 (Testing & CI)
- **macOS 暫存路徑斷言修復**：路徑比對前以 `realpath` 正規化暫存目錄，解決 macOS 上 `/var` 與 `/private/var` 符號連結差異導致的測試失敗。
- **語法檢查覆蓋**：將 `bin/peer-resolve.mjs` 與 `bin/test-peers.mjs` 納入 `npm run check`。

### 社群規範 (Community Governance)
- **開源貢獻指南**：新增 `CONTRIBUTING.md`，規範 Issue 先行原則、本地驗證標準與安全回報管道。

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
- **根因**：原先 `package.json` 中的測試腳本寫死開發環境絕對路徑；缺少主機 peers 時測試靜默跳過卻回報通過。
- **解決方案**：新增 `bin/peer-resolve.mjs` 與 `bin/test-peers.mjs`，支援透過 `AGY_PEER_ROOT` 靈活指定主機 peers 位置；引入 `AGY_TESTS_STRICT=1` 嚴格模式，在 peers 測試通道中任何略過皆視為失敗。

### 2. 憑證清冊生命週期與墓碑機制
- **根因**：登出刪除最後帳號時若刪除檔案，會誤觸初次使用判定，自動重新自舊版外掛匯入舊帳號。
- **解決方案**：引入 Tombstone 墓碑機制，登出時持久化寫入標記為 `loggedOut: true` 的空清冊；`syncLegacyAccounts()` 偵測到墓碑時不再自動回補。

### 3. 權杖刷新並行競爭保護 (CAS)
- **根因**：多請求並行刷新同帳號權杖時，較早發起但較晚返回的請求會覆蓋較新權杖（Token Rollback）。
- **解決方案**：引入 CAS (Compare-And-Swap) 機制，寫盤前比對既有權杖，若發現已被其他請求推進則放棄寫盤。

### 4. 狀態快照與模型家族額度獨立
- **根因**：非同步查詢配額後沿用過期快照；將單一模型家族耗盡誤判為全帳號鎖死。
- **解決方案**：以非同步操作後的最新清冊為準；獨立保留 `exhaustedFamilies` 陣列，不把單一模型耗盡擴大為整帳號鎖死。

### 5. 介面輪詢防亂序與防堆疊
- **根因**：計時器定時輪詢未防重疊，網路延遲時舊請求可能覆蓋新請求。
- **解決方案**：引入 `loadSeq` 序號守衛捨棄陳舊請求，並以 `inFlight` 旗標阻止重疊發送。

### 6. 網路請求逾時防護
- **根因**：OAuth 換票、刷新與 UserInfo 查詢未設逾時保護。
- **解決方案**：全面引入 `AbortSignal.timeout`（換票與刷新 30 秒、UserInfo 10 秒）。

### 7. 廢棄舊版 Google Cloud 手動引導
- **根因**：手動引導前往 GCP Console 申請憑證的流程造成混淆。
- **解決方案**：`runSetupGuide()` 改為輸出已廢棄提示並推薦使用本機自動解析，不再開啟瀏覽器要求輸入金鑰。

### 8. 二進位解析器邊界條件補強
- **解決方案**：在 `bin/test-installed-agy.mjs` 中新增配對缺失與索引混淆時的安全防護驗證，確保在任何不確定結構下皆能 fail closed（拋出 `AMBIGUOUS_CLIENT`）。

---

## [0.4.1] - 2026-10-20
- 支援本機 Antigravity 官方應用程式用戶端自動解析（免手動申請 GCP OAuth Client）。
- 支援多帳號管理、手動切換與配額閾值自動換號。
- 支援 Gemini 4 Argon（包含 low/medium/high 思維檔位）與 Claude 5.5 系列模型。
- 新增配額可視化面板（Gemini、Claude、Argon 5 小時與每週配額條）。
- 支援繁體中文（台灣用語）、簡體中文與英文介面切換。
