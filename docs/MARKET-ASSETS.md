# 市場截圖清單

`screenshots.json` 列出 dsh-market 詳情頁要顯示的圖，路徑相對於 `agy-next/`。

檔案還沒放進去之前，`screenshots.json` 指向的 4 個路徑都是空的。市場會去找檔案，找不到就是破圖。**所以上架前必須先補圖。**

## 規範（來自 awesome-dsh-plugin）

| 項目 | 限制 |
|---|---|
| 數量 | 1 到 8 張 |
| 路徑 | 相對路徑，不可開頭 `/`，不可含 `..` |
| 絕對 URL | 只接受 GitHub 託管的 https |
| 第三方圖床 | 不接受 |
| 沒宣告 | 市場會自動從 README 抽圖 |

## 要拍的 4 張

| 檔名 | 內容 | 備註 |
|---|---|---|
| `assets/screenshot-1.png` | 設定頁 → AGY-Next，帳號池（5 個帳號、三條配額條） | 最重要，放第一張 |
| `assets/screenshot-2.png` | 模型清單（Gemini / Claude 系列） | 展示支援哪些模型 |
| `assets/screenshot-3.png` | 自動切換設定與配額面板 | 展示多帳號能力 |
| `assets/screenshot-4.png` | 登入流程或帳號切換 | 展示安裝後的第一步 |

## 拍攝要求

- **必須是真實的 DSH 介面**。市場規範要求描述與截圖屬實，合成圖會被拒。
- 建議 1600 × 1000（16:10）或 1920 × 1080（16:9）。
- **遮蔽真實 email**。帳號池會顯示信箱，上架前要處理。
- 單張小於 500 KB。

## icon

| 項目 | 內容 |
|---|---|
| 路徑 | `assets/icon-512.png`（另存，不改 `icon.svg`） |
| 格式 | PNG（**SVG 會被市場拒絕**） |
| 尺寸 | 512 × 512，正方形，透明背景優先 |
| 顯示環境 | 市場縮到約 96px，必須仍可辨識 |

`icon.svg` 目前是佔位圖（檔案註解寫著 PLACEHOLDER）。市場要的是 PNG，所以另外放一張 `assets/icon-512.png`。

## 補圖之後

1. 把圖放進 `agy-next/assets/`
2. 確認 `screenshots.json` 的路徑與檔名一致
3. 確認 `package.json` 的 `files` 含 `assets` 與 `screenshots.json`（已加入）
4. 跑 `npm pack --dry-run` 確認圖片有進 tarball
5. 再上架
