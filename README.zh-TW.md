# Antigravity Next for DSH

[![Version](https://img.shields.io/badge/version-0.5.0-blue.svg)](package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![DeepSeek Harness](https://img.shields.io/badge/DSH-%3E%3D0.1.5--rc.1%20%3C0.3.0-orange.svg)](https://deepseek.com/harness/)

[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md)

非官方的 [DeepSeek Harness](https://deepseek.com/harness/)（DSH）模型供應商外掛。將本機安裝的官方 Google Antigravity / Cloud Code Assist 整合至 DSH 的 Agent 核心架構中，註冊提供者識別碼為 `agy-next`。

> **免責聲明：** 本專案為非官方本地整合，與 Google 或 DeepSeek 均無任何隸屬、認可或官方支援關係。使用者須具備合法 Google 帳號授權，並於本機安裝官方 Antigravity 應用程式。

---

## 功能亮點

- **免手動配置 GCP：** 自動由本機已安裝的官方 Antigravity 應用程式解析 OAuth 客戶端資訊，無需自行建立 Google Cloud 專案或金鑰。
- **多帳號輪替池：** 支援登入多組 Google 帳號，設定額度安全水位，當單一帳號額度耗盡時自動無縫容錯移轉至備用帳號。
- **即時視覺化額度面板：** 設定頁面提供 Gemini、Claude 3p 與 Gemini 4 Argon 每週／5 小時配額監控條。
- **思考強度檔位控制：** 原生支援 Gemini 4 Argon 推理強度調節（Low / Medium / High）。
- **隱私與本機優先：** 客戶端解析全程唯讀。憑證嚴格儲存於本機 `<DSH_HOME>/storages/agy-next-oauth.json`，絕不上傳金鑰或外掛資料庫。

---

## 系統需求

1. **DeepSeek Harness：** 版本 `>=0.1.5-rc.1 <0.3.0`，Node.js 執行環境 `>=20`。
2. **官方 Antigravity 桌面程式：** 安裝於本機 Windows 系統（macOS / Linux 探索支援進行中）。請至[官方網站](https://antigravity.google/product/antigravity-2)下載。*執行時不需常駐啟動該應用程式。*
3. **Google 帳號：** 具備瀏覽器 OAuth 授權權限並能正常存取 Gemini / Cloud Code Assist 相關服務。

---

## 安裝指南

### 方式一：於 DSH 桌面端或 Web GUI 介面安裝（推薦）

1. 開啟 DSH 側邊導覽列的 **「插件」→「+ 添加插件」**。
2. 在輸入框中貼入 GitHub 倉庫位址：
   ```text
   https://github.com/kizaki-R/Antigravity-Next-for-DSH
   ```
   *（待 npm 發布後，亦可直接輸入套件名稱 `agy-next`）。*
3. 點選 **「安裝」**，DSH 將自動掛載外掛並載入設定頁面。
4. 重新啟動 DSH。

### 方式二：本機開發模式（CLI / Developer Link）

若從本地原始碼進行開發測試：

```bash
# 於 DSH profile 註冊本機連結
dsh plugin --profile <profile> add link:/absolute/path/to/agy-next
```

確認該 profile 的 `dsh.profile.bundles` 清單已納入 `agy-next`，隨後重新啟動 DSH。

---

## 快速上手

### 1. 驗證與登入

在 DSH 中點選 **「設定」→「AGY-Next」**：

1. **安裝偵測狀態：** 確認畫面正確識別出本機的 Antigravity 安裝路徑。
2. **新增帳號：** 點選 **「登入 / 新增帳號」**，系統將自動開啟瀏覽器進行標準 Google OAuth 授權。
3. 授權完成後，帳號即納入「帳號池」，並即時顯示各模型家族配額條。

*命令列（CLI）備用操作：*

```bash
npm run login           # 新增或登入帳號
npm run login -- --status  # 檢視作用中帳號狀態與配額
npm run login -- --force   # 強制重新授權
npm run login -- --logout  # 清除已儲存憑證
```

### 2. 自訂非標準安裝路徑

若您的 Antigravity 應用程式安裝於自訂目錄，請於啟動 DSH 前指定環境變數：

```powershell
# PowerShell
$env:AGY_NEXT_INSTALL_PATH = 'C:\Custom\Path\To\Antigravity'
```

---

## 進階設定

若需調整底層連線參數，可編輯 profile 目錄下的 `cordis.yml`：

```yaml
- id: agy-next
  name: agy-next
  config:
    credentialPath: ""               # 預設為 <DSH_HOME>/storages/agy-next-oauth.json
    streamIdleTimeoutMs: 300000      # 串流閒置保護（預設 5 分鐘）
    discoveryTimeoutMs: 8000         # 二進制客戶端探索超時時間
    projectCacheTtlMs: 1800000       # 專案中繼資料快取存活時間（30 分鐘）
    runtimeModel: ""                 # 選填：強制指定單一後端模型 ID
```

---

## 支援模型矩陣

| 模型家族 | 代表型號 | 特性支援 |
|---|---|---|
| **Gemini 4 Argon** | `gemini-4-argon` | Low / Medium / High 思考檔位、5 小時與每週額度獨立監控 |
| **Gemini Pro / Flash** | `gemini-2.5-pro`、`gemini-2.5-flash` | 多模態串流輸出、結構化工具呼叫 |
| **Claude (3p)** | `claude-3-7-sonnet`、`claude-3-5-sonnet` | 整合 Cloud Code Assist 之 Claude 執行環境 |

---

## 開發與測試規範

於 `agy-next/` 目錄下執行完整離線測試套件：

```bash
npm run check        # 檢查全數 39 支原始碼模組之語法
npm test             # 執行離線回歸測試（21 項假資料隔離驗證）
npm run test:peers   # 嚴格主機 peers 契約測試（不允許任何 skip）
```

執行 peers 契約測試時，需指向主機依賴路徑：

```powershell
$env:AGY_PEER_ROOT = 'C:\path\to\dsh\node_modules'
npm run test:peers
```

---

## 安全性與架構原則

- **不寫死任何密鑰：** 程式庫完全不內嵌任何 Google Client ID 或 Client Secret，所有設定皆於執行期由本機二進制資源解析。
- **儲存隔離：** 憑證儲存於 DSH 專屬目錄下的 `agy-next-oauth.json`，絕不讀取或更動官方 Antigravity 應用的內部資料庫。
- **墓碑安全機制（Tombstone）：** 登出所有帳號時會寫入標記為 `loggedOut: true` 的空清冊，防止舊版設定無預警自動倒灌舊帳號。

---

## 授權條款

本專案採用 [MIT](LICENSE) 條款開源 © [Kizaki](https://github.com/kizaki-R)
