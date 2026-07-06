# HuePort Color SEO Site — 實作規格書

> **專案代號**：`hueport-color-site`
> **目的**：透過程式化 SEO（Programmatic SEO）建立數萬個色彩相關頁面，長期為 HuePort 的 Google Play / App Store 商店頁導流
> **交付對象**：Claude Code
> **開發環境**：WSL2 Ubuntu（主要開發）→ Cloudflare Pages（部署）
> **參考先例**：本 spec 格式沿用 `yt-shorts-finance-spec` 慣例

---

## 1. 專案目標與成功指標

### 1.1 核心目標
建立一個純靜態的色彩工具網站，作為 HuePort App 的長期自然流量入口。

### 1.2 成功指標（KPI）
| 指標 | 3 個月 | 6 個月 |
|------|--------|--------|
| Google 索引頁面數 | 5,000+ | 20,000+ |
| 月自然流量（Search Console 點擊） | 500+ | 3,000+ |
| 導向商店的點擊（UTM 追蹤） | 50+ | 300+ |
| 反向連結（工具頁被引用） | 5+ | 20+ |

### 1.3 非目標（明確不做）
- 不做用戶帳號系統、留言、任何後端
- 不做需要付費 API 的功能
- 不做部落格／文章維運（先不加內容負擔）
- 不做多語系（Phase 1–2 英文 only，理由見 §7.1）

---

## 2. 技術棧

| 項目 | 選擇 | 理由 |
|------|------|------|
| 框架 | **Astro**（SSG 模式） | 零 JS 預設、極快、對程式化 SEO 友善、支援部分頁面 island 互動 |
| 樣式 | Tailwind CSS | 快速、與 Astro 整合成熟 |
| 互動工具 | Vanilla JS / Astro islands | 轉換器等小工具不需要框架 |
| 託管 | Cloudflare Pages | 已有帳號（pixeldog13vibe 同帳號）、免費、全球 CDN |
| 色彩資料 | [color-names](https://github.com/meodai/color-names)（MIT） | ~30,000 個命名顏色，無 API 成本 |
| 色彩運算 | culori（npm） | HEX/RGB/HSL/CMYK/LAB/OKLCH 轉換、色彩和諧計算 |
| 分析 | Cloudflare Web Analytics + Google Search Console | 免費、無 cookie banner 負擔 |

> **注意**：Cloudflare Pages 單次部署上限 20,000 個檔案。3 萬頁需拆分策略，見 §6.3。

---

## 3. 網站架構（Site Map）

```
{domain}/
├── /                          首頁：色彩搜尋框 + 熱門顏色 + 工具入口
├── /app/                      HuePort 一頁式介紹（所有 CTA 的匯集點）
├── /color/{slug}/             顏色詳細頁 × ~30,000
│    例：/color/sienna-b3460f/
├── /palette/{slug}/           主題調色盤頁 × ~300（Phase 2）
│    例：/palette/autumn-warmth/
├── /tools/                    工具總覽頁
│    ├── /tools/hex-to-rgb/
│    ├── /tools/rgb-to-hex/
│    ├── /tools/hex-to-hsl/
│    ├── /tools/color-picker/
│    ├── /tools/contrast-checker/
│    ├── /tools/palette-generator/
│    └── /tools/random-color/
├── /colors/{letter}/          A–Z 索引頁（內部連結 hub，SEO 爬蟲入口）
├── /sitemap-index.xml         分片 sitemap
└── /robots.txt
```

---

## 4. 頁面規格

### 4.1 顏色詳細頁 `/color/{name}-{hex}/`（核心頁型）

每頁由模板 + 資料生成，包含以下區塊（由上而下）：

1. **Hero 區**：大面積色塊展示該顏色 + 顏色名稱（H1）+ HEX 值
2. **色彩數值表**：HEX、RGB、HSL、CMYK、LAB、OKLCH，每項附一鍵複製按鈕
3. **色彩和諧**：互補色（complementary）、類似色（analogous）、三等分（triadic）、分裂互補（split-complementary），每個和諧色可點擊連到該色頁面（重要：這是內部連結網的骨架）
4. **深淺變化**：該色的 tints（+白）與 shades（+黑）各 5 階
5. **CSS / 程式碼片段**：`color`、`background-color`、Tailwind 近似 class、Swift/Flutter Color 程式碼
6. **相近命名顏色**：色彩空間距離最近的 6 個顏色（內部連結）
7. **App CTA 區**（固定模板）：
   > "Spotted this color in the real world? Capture it instantly with HuePort."
   > [Get it on Google Play] [Download on the App Store]
   > 連結格式見 §5

**SEO 要求**：
- `<title>`：`{Name} Color — {HEX} | HEX, RGB, HSL & Palettes`
- meta description：包含 name、hex、主要用途詞
- JSON-LD：`WebPage` + `BreadcrumbList`
- OG image：Phase 1 用單一模板圖；Phase 2 考慮按顏色動態生成（Satori 或 build-time canvas）
- canonical 自指

### 4.2 工具頁 `/tools/*`

七個互動工具，全部 client-side 運算、零後端：

| 工具 | 功能 | 搜尋意圖 |
|------|------|----------|
| hex-to-rgb | 雙向即時轉換 | "hex to rgb" 高流量 |
| rgb-to-hex | 同上反向（獨立頁，各吃各的關鍵字） | |
| hex-to-hsl | 轉換 + 滑桿視覺化 | |
| color-picker | 網頁取色器 + 上傳圖片取色 | 與 App 功能最相關 |
| contrast-checker | WCAG AA/AAA 對比檢查 | 設計師/前端剛需，最易獲反向連結 |
| palette-generator | 隨機/規則調色盤生成 | |
| random-color | 一鍵隨機色（好玩、易分享） | |

每個工具頁底部同樣掛 App CTA，文案針對工具情境微調（例：color-picker 頁 → "Need to pick colors from the real world, not just the screen? → HuePort"）。

### 4.3 `/app/` — HuePort 一頁式介紹頁

這一頁就是你問的「一頁式網站」，作為品牌匯集點：

- Hero：App 名稱 + 一句話價值主張 + 兩個商店按鈕
- 三個核心功能區塊（沿用 Play Store 截圖素材：擷取瞬間 / 色彩數值 / Color Gallery）
- 買斷制說明（No subscription）
- FAQ 3–5 題（含 JSON-LD `FAQPage`，有機會吃 Google 富摘要）

### 4.4 首頁 `/`

- 搜尋框：輸入色名或 HEX，即時過濾跳轉（client-side，搜 30k 資料需預建輕量索引，見 §6.4）
- 熱門顏色 grid（人工挑 24 個高搜尋量顏色）
- 工具入口卡片
- App CTA

---

## 5. UTM 與轉換追蹤規範

所有導向商店的連結**必須**帶 UTM，格式統一：

```
Google Play：
https://play.google.com/store/apps/details?id=com.truehue.studio
  &utm_source=colorsite
  &utm_medium=referral
  &utm_campaign={page_type}        # color / tool / app / home
  &utm_content={page_slug}         # 例 sienna-b3460f

App Store（上架後）：
用 Apple Search Ads 歸因參數或 App Store Connect 提供的 campaign link
```

> 注意 bundle ID 仍是 `com.truehue.studio`（HuePort 改名後保留），連結中的 id 參數以實際商店頁為準。

CTA 按鈕點擊同時打一個 Cloudflare Analytics 自訂事件（beacon），讓站內也能看到每個頁型的導出率。

---

## 6. 資料與建置管線

### 6.1 資料準備腳本 `scripts/prepare-data.mjs`
1. 下載 color-names 資料集（build time，不進 repo 原始檔）
2. 對每個顏色計算：RGB/HSL/CMYK/LAB/OKLCH、和諧色 4 組、tints/shades 各 5、最近鄰 6 色（用 OKLCH 空間距離，預先算好存 JSON）
3. 產出 `data/colors/{shard}.json`（分片，每片 ~1,000 色，避免單檔過大）
4. slug 規則：`{kebab-case-name}-{hex-without-#}`，重名時 hex 保證唯一

### 6.2 Astro 建置
- `getStaticPaths()` 讀取分片 JSON 生成所有 `/color/` 頁
- 顏色頁模板一個檔案，禁止逐頁硬編碼

### 6.3 Cloudflare Pages 20k 檔案上限對策
Phase 1 只生成 **前 5,000 個顏色**（按資料集熱門度／常見度排序），遠低於上限。Phase 2 擴量時二選一：
- **方案 A（推薦）**：改用 Cloudflare Workers Static Assets（上限 100k 檔案）
- 方案 B：顏色頁改為單一動態路由 + `_worker.js` 邊緣渲染（仍免費額度內）

### 6.4 站內搜尋索引
build time 產出 `search-index.json`（僅 name + hex + slug，30k 筆約 1.5MB，gzip 後 ~300KB），首頁 lazy load。

---

## 7. SEO 技術規範

### 7.1 語言策略
Phase 1–2 **純英文**。理由：色彩搜尋量英文市場 >> 繁中市場一個數量級，且 HuePort 商店本來就面向全球。繁中版列入 Phase 3 觀察後再決策（屆時用 `/zh-tw/` 子目錄 + hreflang）。

### 7.2 必要項目
- 分片 sitemap（每片 ≤ 5,000 URL）+ sitemap index，部署後提交 Search Console
- robots.txt 開放全站
- 全站 HTML 語意化（單一 H1、正確 heading 階層）
- 內部連結密度：每個顏色頁至少 10 個對外（站內）連結（和諧色 + 相近色 + 字母索引 + 麵包屑）
- Core Web Vitals：Astro 靜態頁預設達標，工具頁 JS 控制在 <30KB
- 部署後用 Search Console URL 檢查工具驗證 3 個樣本頁可正常索引

### 7.3 防重複內容
30k 頁模板相同是程式化 SEO 常態，但每頁需有**實質差異化資料**（數值、和諧色、鄰近色都不同），並在文案模板中避免大段完全相同的句子（準備 3–4 組句式輪替，按 hex 值 hash 決定用哪組）。

---

## 8. 開發階段劃分

### Phase 1 — MVP（目標：一個週末）
- [ ] Astro 專案初始化 + Tailwind + 基本 layout
- [ ] 資料管線腳本（§6.1），先出 5,000 熱門色
- [ ] 顏色頁模板（§4.1 全區塊）
- [ ] 工具頁 × 2：hex-to-rgb、color-picker
- [ ] `/app/` 頁 + 首頁
- [ ] UTM 連結系統（§5）
- [ ] sitemap + robots + JSON-LD
- [ ] 部署 Cloudflare Pages + 提交 Search Console
- **驗收標準**：`npm run build` 一次成功產出 5,000+ 頁；Lighthouse SEO 分數 ≥ 95；隨機抽 3 個顏色頁數值正確；CTA 連結 UTM 完整

### Phase 2 — 擴量（第 2–4 週）
- [ ] 遷移 Workers Static Assets 或動態路由（§6.3）
- [ ] 全量 30,000 顏色頁
- [ ] 剩餘 5 個工具頁
- [ ] `/palette/` 主題調色盤 ~300 頁（資料人工 curate + Claude 批次生成主題）
- [ ] 按色動態 OG image
- [ ] A–Z 索引頁

### Phase 3 — 觀察迭代（第 2–3 個月）
- [ ] Mac mini 排程腳本：每週抓 Search Console API 數據 → 產生 Markdown 報告（可併入 claude-bible playbook）
- [ ] 針對開始有曝光的關鍵字群加深該頁內容
- [ ] 評估繁中版、評估加 palette 圖片下載功能（.ase / .png swatch）

---

## 9. 專案結構

```
hueport-color-site/
├── CLAUDE.md                  # 引用 ~/claude-bible 規範
├── astro.config.mjs
├── scripts/
│   └── prepare-data.mjs
├── data/                      # build 產物，gitignore
├── src/
│   ├── layouts/Base.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── app.astro
│   │   ├── color/[slug].astro
│   │   ├── tools/…
│   │   └── colors/[letter].astro
│   ├── components/
│   │   ├── ColorSwatch.astro
│   │   ├── ValueTable.astro
│   │   ├── HarmonyGrid.astro
│   │   ├── AppCTA.astro       # 唯一的 CTA 元件，UTM 邏輯集中此處
│   │   └── CopyButton.astro
│   └── lib/color-math.ts
└── public/robots.txt
```

---

## 10. 風險與注意事項

1. **SEO 時程**：新域名 3–6 個月才有明顯流量，屬預期內，不是失敗訊號。短期流量仍靠 Reels / LinkedIn 並行。
2. **域名決策**：建議買一個獨立域名（如 `colorport.app` 之類，$10–15/年），比 `*.pages.dev` 子域名在 SEO 信任度和品牌上都更好。**命名前依既有規則先 web_search 確認無同名服務。**
3. **Google 對程式化 SEO 的態度**：只要每頁有真實差異化價值（我們有：獨特數值＋和諧計算），就不屬於 spam；避免生成空洞頁面。
4. **不要一次提交 30k 頁**：Phase 1 先 5k，讓 Google 建立對站點的信任後再擴量，降低被判定為低品質量產站的風險。

---

*Spec v1.0 — 2026-07-05*
