# PROJECT_CONTEXT.md — hueport-color-site

自足式脈絡文件，給沒有本專案背景的人（含 AI agent）看的。目標情境：新增一個工具頁
（例如「漸層產生器」`/tools/gradient-generator/`），要求風格、結構、SEO 慣例都跟現有頁面一致。

這份文件是快照（撰寫於程式碼實際狀態），若與程式碼衝突，以程式碼為準。

---

## 1. 這是什麼

Programmatic SEO 靜態網站（Astro），目的是導流量到 HuePort App（Android，取色 App）的
Google Play 商店頁面。網站本身不是產品，是流量漏斗：色彩百科（4,945 個色彩頁）+ 免費小工具
（HEX↔RGB 轉換器、取色器…）吸引搜尋流量，每個頁面底部都有一個導去 Play 商店的 CTA。

完整規格書：repo 根目錄的 `hueport-color-seo-site-spec.md`（如果需要更深的產品脈絡再讀這份）。

## 2. 技術棧與實際版本

來自 `package.json`（**務必用這裡列出的版本，不要用你記憶中的預設版本**）：

```json
"dependencies": {
  "astro": "7.0.6",
  "culori": "4.0.2",
  "color-name-list": "14.45.0"
},
"devDependencies": {
  "@tailwindcss/vite": "4.3.2",
  "tailwindcss": "4.3.2",
  "vitest": "4.1.9"
}
```

重點：
- **Astro 7**，全站 `output: 'static'`（預設），沒有任何 server-side runtime，deploy 到 Cloudflare
  Pages 是純靜態檔案。
- **Tailwind CSS 4**，用的是 `@tailwindcss/vite` plugin（不是舊版 `@astrojs/tailwind` 或
  PostCSS 設定檔）。**沒有 `tailwind.config.js`** — Tailwind 4 是 CSS-native 設定，整個設定檔就是
  `src/styles/global.css`，內容只有一行：
  ```css
  @import "tailwindcss";
  ```
  沒有自訂 `@theme` token block，代表全站用的是 **Tailwind 預設 palette/spacing/radius**，沒有
  客製化設計系統。看到 `neutral-900`、`rounded-xl` 這類 class，都是 Tailwind 內建值，不是專案自訂的。
- **culori 4.0.2** 做所有色彩數學（HEX/RGB/HSL/OKLCH/Lab 轉換、色彩距離計算）。CMYK 是手刻的
  （culori 沒有 CMYK mode，因為 CMYK 是 device-dependent，不是 colorimetric）。
- Node 版本由 `.nvmrc` 釘住，新開 shell 要先 `nvm use`。
- 套件管理是 npm（有 `package-lock.json`）。
- TypeScript：`tsconfig.json` extends `astro/tsconfigs/strict`。`.astro` 檔案的 frontmatter
  （`---` 圍起來的區塊）和 `<script>` 區塊都是 TypeScript，會做嚴格型別檢查。
- 測試：Vitest。目前只測 `src/lib/*.ts` 裡的純函式（`tests/*.test.ts`），沒有元件測試/E2E。

## 3. 目錄結構 — 新工具頁要碰哪些檔案

```
src/
  components/       # 共用 Astro 元件（見第 4 節）
    AppCTA.astro
    Breadcrumb.astro
    ColorSwatch.astro
    CopyButton.astro
    HarmonyGrid.astro
    Header.astro
    ValueTable.astro
  layouts/
    Base.astro       # 所有頁面共用的 <html>/<head>/<body> 外殼
  lib/                # 純 TypeScript 函式庫（無 Astro 依賴），Vitest 覆蓋
    color-math.ts      # HEX/RGB/HSL/CMYK/Lab/OKLCH 轉換 + 最近鄰色彩距離
    slug.ts
    text-variants.ts
    utm.ts              # Play Store URL + UTM 參數建構（見第 4 節）
  pages/
    index.astro           # 首頁（⚠️ 含 GSC 驗證 meta，見 CLAUDE.md，不可刪）
    app.astro
    color/[slug].astro     # 4,945 個色彩詳情頁（動態路由，資料驅動）
    colors/index.astro     # A–Z 索引
    colors/[letter].astro
    tools/
      index.astro           # 工具總覽頁（要新增工具連結的地方，見第 6 節）
      hex-to-rgb.astro       # 既有工具頁範例（簡單版，純輸入框）
      color-picker.astro     # 既有工具頁範例（複雜版，canvas + dropzone，見第 5 節）
    sitemap-index.xml.ts   # 手刻 sitemap（見第 6 節，*不是* astro-sitemap 套件）
  styles/
    global.css            # 只有 `@import "tailwindcss";`
scripts/
  prepare-data.mjs   # build 前跑，產生 data/ 目錄（gitignored，色彩資料庫）。工具頁通常不需要碰這個。
  validate-build.mjs  # build 後跑，檢查 dist/ 輸出正確性（見第 8 節）
public/               # 靜態資源原封不動複製到 dist/（app icon、robots.txt…）
data/                 # gitignored，由 prepare-data.mjs 全量重新產生，絕對不要手改
```

**新增一個工具頁（例如漸層產生器）要動的檔案，就這些：**

1. **新增** `src/pages/tools/gradient-generator.astro` — 頁面本體（跟著第 5、第 4 節的慣例寫）。
2. **修改** `src/pages/tools/index.astro` — 在 `tools` 陣列加一筆，工具總覽頁才會列出新工具（見第 6 節）。
3. **修改** `src/pages/sitemap-index.xml.ts` — 在 `staticPaths` 陣列加上新頁面的路徑，否則不會進 sitemap（見第 6 節）。
4. **視需要修改** `scripts/validate-build.mjs` — `requiredFiles` 陣列可以（非必要）加上
   `tools/gradient-generator/index.html`，讓 build 驗證涵蓋新頁面（見第 8 節）。這不是強制的，但
   建議加上，跟現有兩個工具頁的驗證方式一致。

不需要碰 `astro.config.mjs`、`prepare-data.mjs`、`data/`（除非工具需要色彩資料庫，目前兩個既有工具都不需要）。

**路由規則**：Astro 檔案路由。`src/pages/tools/gradient-generator.astro` 會自動變成
`/tools/gradient-generator/` （Astro 預設 trailing slash 行為）。頁面內的 `canonicalPath` prop
（見下）要手動填成一樣的路徑字串，Astro 不會自動推導。

## 4. 共用元件 API

### 4.1 `Base.astro`（layout，每個 page 都要包）

```astro
export interface Props {
  title: string;           // <title> 內容，同時用於 og:title / twitter:title
  description: string;     // <meta name="description">，同時用於 og:description
  canonicalPath: string;   // 例如 "/tools/gradient-generator/"，用來組 canonical URL 和 og:url
  ogImagePath?: string;    // 預設 '/og-image.jpg'，全站目前共用一張圖，通常不用傳
}
```

用法（照抄既有頁面的 pattern）：

```astro
---
import Base from '../../layouts/Base.astro';

const title = '...';
const description = '...';
---
<Base title={title} description={description} canonicalPath="/tools/gradient-generator/">
  <main>...</main>
</Base>
```

`Base.astro` 內部固定渲染 `<Header />`，然後 `<slot />` 放頁面內容。有一個 `<slot name="head" />`
可以塞額外的 head 標籤（目前只有首頁用它塞 GSC 驗證 meta，工具頁通常不需要用到）。

### 4.2 `AppCTA.astro`（每個內容頁底部都要放一個）

```astro
export interface Props {
  pageType: 'color' | 'tool' | 'app' | 'home';
  pageSlug: string;
  message?: string;  // 預設 'Spotted this color in the real world? Capture it instantly with HuePort.'
}
```

工具頁一律 `pageType="tool"`，`pageSlug` 用該工具的 URL slug（例如 `"gradient-generator"`）。
`message` 可選，兩個既有工具頁一個有自訂 message（color-picker，呼應「從圖片取色」的情境），
一個沒傳直接用預設（hex-to-rgb）。**寫自訂 message 時盡量跟工具的實際用途掛鉤**，讓 CTA 讀起來
像是自然延伸，而不是硬塞的廣告。

用法：
```astro
<div class="mt-10">
  <AppCTA pageType="tool" pageSlug="gradient-generator" message="喜歡這個漸層？用 HuePort 把現實世界的顏色也收進調色盤。" />
</div>
```

**UTM 是怎麼帶的**：`AppCTA.astro` 呼叫 `src/lib/utm.ts` 的 `buildPlayStoreUrl(pageType, pageSlug)`：

```ts
// src/lib/utm.ts
const PLAY_STORE_BASE = 'https://play.google.com/store/apps/details';
const PLAY_STORE_PACKAGE = 'com.truehue.studio';

export function buildPlayStoreUrl(pageType: PageType, pageSlug: string): string {
  const params = new URLSearchParams({
    id: PLAY_STORE_PACKAGE,
    utm_source: 'colorsite',
    utm_medium: 'referral',
    utm_campaign: pageType,   // = pageType prop
    utm_content: pageSlug,    // = pageSlug prop
  });
  return `${PLAY_STORE_BASE}?${params.toString()}`;
}
```

不要手刻 Play Store 連結或自己組 UTM 參數 — 一律透過 `AppCTA` 元件走這個函式，否則
`validate-build.mjs` 的 UTM 檢查會抓不到（且會產生不一致的 attribution 資料）。

### 4.3 `Header.astro`（自動包在 Base 裡，通常不用手動 import）

固定 3 個 nav link：`/tools/`、`/colors/`、`/app/`。**新增工具頁不需要改 Header** — Header 連去
的是 `/tools/` 總覽頁，不是個別工具頁。

### 4.4 `Breadcrumb.astro`（見第 5 節，工具頁固定用法）

### 4.5 `CopyButton.astro`（如果新工具需要「複製到剪貼簿」按鈕，直接複用）

```astro
export interface Props {
  value: string;  // 要複製的內容
  label: string;  // 按鈕顯示文字，同時當 aria-label 的一部分
}
```
內部用 `navigator.clipboard.writeText`，點擊後短暫顯示 "Copied!" feedback（1.5 秒後消失）。
用法：`<CopyButton value={gradientCss} label="Copy CSS" />`。

### 4.6 `ColorSwatch.astro` / `HarmonyGrid.astro` / `ValueTable.astro`

主要給色彩詳情頁用（`color/[slug].astro`）。`ColorSwatch` 是純色塊（`size="sm"|"lg"`，可選
`href` 讓它變連結），如果漸層產生器需要顯示色塊，可以直接複用它而不是重寫。

## 5. 既有工具頁完整結構解析 — 以 `/tools/color-picker/` 為主

檔案：`src/pages/tools/color-picker.astro`（原始碼見下方逐段說明；完整檔案就在 repo 裡，這裡只挑
新工具頁最需要照抄的慣例）。

### 5.1 Frontmatter + import 慣例

```astro
---
import Base from '../../layouts/Base.astro';
import AppCTA from '../../components/AppCTA.astro';
import Breadcrumb from '../../components/Breadcrumb.astro';

const title = 'Online Color Picker — Pick Colors From an Image | Free Tool';
const description = 'Upload an image and click anywhere to pick its exact color as HEX, RGB, and HSL. Runs entirely in your browser — nothing is uploaded.';
---
```

- import path 是相對路徑 `../../`（因為工具頁在 `src/pages/tools/`，元件在 `src/components/`）。
- `title` 慣例：`{主標題} — {次要賣點} | {品牌/類別}`。含關鍵字 + 賣點（免費、瀏覽器端執行）。
- `description` 慣例：一句話講清楚功能，通常加一句隱私/免費保證（"nothing is uploaded" /
  "No upload, no tracking, no signup"）— 這是全站的信任訊號，新工具頁應該延續。

### 5.2 版面結構（固定骨架，逐行照抄）

```astro
<Base title={title} description={description} canonicalPath="/tools/color-picker/">
  <main class="mx-auto max-w-xl px-4 py-10">
    <Breadcrumb
      items={[
        { name: 'Home', href: '/' },
        { name: 'Tools', href: '/tools/' },
        { name: 'Color Picker' },   <!-- 當前頁不帶 href -->
      ]}
    />
    <h1 class="text-3xl font-semibold">Color Picker</h1>
    <p class="mt-2 text-neutral-600">...一句話說明用法...</p>

    <!-- 工具主體 -->
    <div class="...">...</div>

    <div class="mt-10">
      <AppCTA pageType="tool" pageSlug="color-picker" message="..." />
    </div>
  </main>

  <script>
    // vanilla TS，操作上面的 DOM
  </script>
</Base>
```

固定元素：
- `<main class="mx-auto max-w-xl px-4 py-10">` — 工具頁統一用 `max-w-xl`（比色彩頁窄，適合單欄
  互動工具）。`px-4 py-10` 是全站的頁面內距慣例。
- `Breadcrumb` 永遠是 `Home → Tools → {當前工具名稱}` 三層，最後一層不帶 `href`。
- `<h1 class="text-3xl font-semibold">` — 工具頁 H1 固定用這個 class。
- 說明文字：`<p class="mt-2 text-neutral-600">`。
- `AppCTA` 永遠放在 `<main>` 最底部，外層包一個 `<div class="mt-10">`。

### 5.3 Dropzone（圖片上傳）怎麼做

如果新工具也需要吃圖片輸入，照抄這個 pattern（來自 color-picker）：

```astro
<div
  id="dropzone"
  class="relative mt-6 flex min-h-64 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 p-6 text-center transition-colors hover:border-neutral-400 hover:bg-neutral-100"
>
  <label
    for="image-input"
    id="dropzone-label"
    class="absolute inset-0 z-10 flex cursor-pointer flex-col items-center justify-center gap-2 text-neutral-500"
  >
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-8 w-8">
      <path stroke-linecap="round" stroke-linejoin="round" d="..." />
    </svg>
    <span class="text-sm">Click or drag an image here</span>
  </label>
  <input id="image-input" type="file" accept="image/*" class="sr-only" />
  <canvas id="canvas" class="hidden max-w-full cursor-crosshair rounded-lg"></canvas>
</div>
<p id="change-image" class="mt-2 hidden cursor-pointer text-sm text-neutral-500 underline">
  Choose a different image
</p>
```

重點慣例：
- `<label for="image-input">` 蓋滿整個 dropzone（`absolute inset-0`），這樣點擊任何地方都會觸發
  file picker，不需要額外的 click handler。
- `<input type="file">` 用 `class="sr-only"`（視覺隱藏但保留可及性），不是 `hidden`。
- `<canvas>` 一開始 `hidden`，圖片載入後才 `classList.remove('hidden')`。
- 拖曳視覺回饋：`dragover`/`dragenter` 加 `border-neutral-400 bg-neutral-100`，
  `dragleave`/`dragend` 移除。**不要用 CSS `:hover` 處理拖曳狀態** — Tailwind 的 `hover:` 只對滑鼠
  懸停有效，拖曳中的視覺反饋要用 JS `classList` 操作（如上）。
- 「換一張圖」用一個獨立的 `<p id="change-image">`，點擊時 reset `input.value = ''` 再 `.click()`
  觸發 picker（重要：不 reset value 的話，選同一張圖不會觸發 `change` 事件）。

TS 部分（`loadImageFile` 核心邏輯）：
```ts
function loadImageFile(file: File) {
  const img = new Image();
  img.onload = () => {
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(img.src);   // 用完立刻釋放 object URL，避免記憶體洩漏
    dropzoneLabel.classList.add('hidden');
    canvas.classList.remove('hidden');
    changeImage.classList.remove('hidden');
  };
  img.src = URL.createObjectURL(file);
}
```
`canvas.width`/`canvas.height` 直接設成圖片的**原始像素尺寸**（`naturalWidth`/`naturalHeight`），
不是 CSS 顯示尺寸 — 這點在座標映射時很重要（見下）。

### 5.4 Canvas 取色與座標映射（scaleX/scaleY 的核心邏輯）

因為 canvas 的**繪圖座標系**（`canvas.width`/`height`，也就是實際像素緩衝區大小）跟它在頁面上
**顯示的 CSS 尺寸**（`max-w-full` 讓它被縮放顯示）通常不同，點擊事件的 `clientX/clientY` 是相對
顯示尺寸的，必須換算回繪圖座標系才能用 `getImageData` 取到正確像素：

```ts
canvas.addEventListener('click', (event) => {
  const rect = canvas.getBoundingClientRect();       // 顯示尺寸（CSS px）
  const scaleX = canvas.width / rect.width;           // 繪圖尺寸 / 顯示尺寸
  const scaleY = canvas.height / rect.height;
  const x = Math.floor((event.clientX - rect.left) * scaleX);
  const y = Math.floor((event.clientY - rect.top) * scaleY);
  const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;  // 1x1 像素取樣
  const hex = `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
  // ...更新 UI
});
```

這是任何要在 canvas 上做像素級互動（取色、標記座標等）的工具頁都要照搬的 pattern。**忘記做
scaleX/scaleY 換算是最常見的 bug** — 沒做的話，圖片被 CSS 縮放後點擊座標會完全對不準。

### 5.5 結果顯示區

```astro
<div class="mt-6 flex items-center gap-4">
  <div id="picked-swatch" class="h-16 w-16 rounded-lg border border-neutral-200"></div>
  <div>
    <p id="picked-hex" class="font-mono">—</p>
    <p id="picked-rgb" class="font-mono text-sm text-neutral-500">—</p>
  </div>
</div>
```
未選取前用 `—`（em dash）當 placeholder，不是空字串。色值一律用 `font-mono`。次要數值
（RGB 字串）用 `text-sm text-neutral-500`，主要數值（HEX）不加顏色 class（繼承 body 的
`text-neutral-900`）。

### 5.6 較簡單的參考範例：`hex-to-rgb.astro`

如果新工具是「輸入 → 即時運算 → 顯示」這種簡單雙向轉換（沒有 canvas/圖片），照抄
`hex-to-rgb.astro` 的模式更合適：純文字 input（`<input class="mt-1 w-full rounded border
border-neutral-300 px-3 py-2 font-mono">`），`input` 事件即時更新，一個 `<div style="background-color:...">`
當即時預覽。漸層產生器如果是「調整參數即時看到 CSS 漸層預覽」，這個模式（沒有檔案 I/O，純
JS 狀態 + 即時 DOM 更新）可能比 color-picker 的 dropzone 模式更貼近需求。

### 5.7 `<script>` 標籤慣例

- 一律用 Astro 的原生 `<script>`（頁面內聯，寫在 `</Base>` 前，屬於元件外層但仍在檔案內）—
  不是外部 `.ts` 檔案 import 進來執行邏輯（除非邏輯要被多頁共用或要被 Vitest 測試，那種放
  `src/lib/`）。
- 用 `document.getElementById('xxx') as HTMLXxxElement` 搭配 `as` 斷言拿元素，不用
  `querySelector` 除非要選多個（`CopyButton.astro` 示範了 `querySelectorAll` 的用法）。
- 這段 `<script>` 是 TypeScript，Astro 會處理型別檢查跟編譯，不需要额外設定。

## 6. Sitemap 與 `/tools/` 總覽頁 — 新增頁面時要改的地方

### 6.1 `src/pages/tools/index.astro`（工具總覽頁）

```astro
const tools = [
  { href: '/tools/hex-to-rgb/', name: 'HEX to RGB Converter', blurb: 'Convert between HEX and RGB instantly.' },
  { href: '/tools/color-picker/', name: 'Color Picker', blurb: 'Pick exact colors from any uploaded image.' },
  // 新工具加在這裡：
  { href: '/tools/gradient-generator/', name: 'Gradient Generator', blurb: 'Build CSS gradients and copy the code.' },
];
```
這是一個寫死的陣列（不是自動掃描 `src/pages/tools/` 目錄），**新增工具頁一定要手動加這一筆**，
否則工具總覽頁跟 Header 都不會有任何管道連到新頁面（等於變成孤兒頁，只能靠 sitemap 被 Google 爬到）。

`blurb` 是一句話功能描述，跟 CTA/description 一樣走「講清楚 + 免費/隱私訊號」的調性。

### 6.2 `src/pages/sitemap-index.xml.ts`（手刻 sitemap，不是套件產生的）

```ts
const staticPaths = [
  '/',
  '/app/',
  '/tools/',
  '/tools/hex-to-rgb/',
  '/tools/color-picker/',
  '/colors/',
  // 新工具加在這裡：
  '/tools/gradient-generator/',
];
```
這個檔案是 Astro 的 API route（`export const GET`），在 build 時執行一次，動態組 `sitemap-index.xml`。
**這裡的 `staticPaths` 也是寫死陣列，必須手動加新路徑**，不會自動掃描 pages 目錄。色彩頁
（`colorPaths`）跟字母頁（`letterPaths`）才是從 `data/colors/search-index.json` 動態算出來的，
因為那是資料驅動、數量龐大的頁面。工具頁數量少、是手刻頁面，所以走靜態陣列。

**這兩處（6.1 和 6.2）都忘記加是最常見的疏漏** — 頁面本身能正常訪問，但既不會出現在導覽入口，
也不會進 sitemap，SEO 上等於不存在。

## 7. 設計 Token（實際使用值，非 Tailwind 官方文件）

前面提過沒有自訂 `@theme`，以下是**全站實際在用**的 Tailwind 預設值子集（掃描既有元件/頁面得出，
新頁面應該只從這個子集挑，不要引入沒出現過的顏色色階或圓角值，維持視覺一致）：

**色彩**（一律用 Tailwind `neutral` 灰階，沒有品牌色/彩色 accent；色彩本身的顏色由資料動態決定，
UI chrome 全部是中性灰）：
| Token | 用途 |
|---|---|
| `text-neutral-900` | 主要文字（body 預設，`Base.astro` 的 `<body>` 上設） |
| `text-neutral-600` | 說明/次要段落文字（H1 底下的介紹句） |
| `text-neutral-500` | 更次要的文字（breadcrumb、次要數值、hint 文字） |
| `text-neutral-700` | breadcrumb 當前頁（`aria-current="page"`） |
| `border-neutral-200` | 卡片/色塊的預設邊框 |
| `border-neutral-300` | input 邊框、dropzone 預設邊框 |
| `border-neutral-400` | hover / drag-active 狀態邊框 |
| `bg-neutral-50` | 淺灰底（dropzone 預設、AppCTA 卡片底色） |
| `bg-neutral-100` | hover / drag-active 底色 |
| `bg-neutral-900` | 深色實心按鈕底色（AppCTA 的「Get it on Google Play」按鈕） |
| `bg-white` | 全站頁面底色（`<body>` 上設） |

**字級**：
| Token | 用途 |
|---|---|
| `text-3xl font-semibold` | 頁面 H1（固定搭配） |
| `text-lg font-medium` | 卡片標題（工具總覽頁的工具名稱） |
| `text-lg` | AppCTA 的 message 文字 |
| `text-sm` | 次要說明、breadcrumb、blurb |
| `text-xs` | 更小的 hint（CopyButton 的 "Copied!" feedback） |
| `font-mono` | 所有色彩數值（HEX/RGB/HSL 字串）一律等寬字體 |

**間距／圓角**：
| Token | 用途 |
|---|---|
| `rounded-lg` | 大部分卡片、色塊、canvas、dropzone |
| `rounded-xl` | AppCTA 外層卡片、工具總覽頁卡片、app icon |
| `rounded-full` | CTA 按鈕（藥丸形） |
| `rounded` | 小元素（CopyButton、input 框） |
| `px-4 py-10` | `<main>` 的標準內距（配 `mx-auto max-w-xl` 或 `max-w-3xl`/`max-w-4xl`） |
| `mt-2` / `mt-6` / `mt-8` / `mt-10` | 區塊間垂直間距的常見值，越往下間距越大（`mt-2` 給緊接的說明文字，`mt-10` 給 CTA 這種「新段落」） |

**`<main>` 寬度慣例**：工具頁 `max-w-xl`（窄，單欄互動），首頁 `max-w-4xl`，色彩總覽/工具總覽
`max-w-3xl`。新工具頁預設跟著 `max-w-xl` 走，除非內容明顯需要更寬（例如漸層產生器如果要並排
顯示多組色塊或大範圍的漸層預覽，可以考慮 `max-w-2xl`／`max-w-3xl`，但要跟既有兩個工具頁的觀感
差異保持在合理範圍）。

## 8. `scripts/validate-build.mjs` 檢查什麼

這支腳本在 `npm run build` 的 `astro build` **之後**自動執行（見 `package.json` 的 `build` script：
`prepare-data → astro build → validate-build`），任何一項失敗都會讓 build 以非零狀態碼結束。

檢查項目：
1. `dist/` 目錄存在。
2. `dist/color/` 目錄存在，且底下的色彩頁目錄數 **≥ 4000**（色彩資料庫頁面數的健檢下限）。
3. 抽樣 3 個色彩頁（manifest 第一筆、中間筆、最後一筆）逐一檢查：
   - 頁面 HTML 存在（`dist/color/{slug}/index.html`）。
   - HTML 內含 `play.google.com/store/apps/details`（Play Store CTA 連結存在）。
   - HTML 內含 `utm_source=colorsite`（UTM 參數存在）。
   - HTML 內含 `BreadcrumbList`（breadcrumb JSON-LD 存在）。
4. `dist/colors/` 目錄存在，且字母索引頁（A–Z）數量 **≥ 20**。
5. **一份寫死的必要檔案清單**（`requiredFiles`），逐一檢查存在：
   ```js
   const requiredFiles = [
     'index.html',
     'app/index.html',
     'tools/index.html',
     'tools/hex-to-rgb/index.html',
     'tools/color-picker/index.html',
     'colors/index.html',
     'sitemap-index.xml',
     'robots.txt',
     'search-index.json',
   ];
   ```

**新增工具頁時**：目前這份 `requiredFiles` 陣列 **不會自動涵蓋新頁面** — 如果不手動加
`'tools/gradient-generator/index.html'`，build 驗證依然會通過（因為它只檢查清單裡列出的檔案，
不是「所有 tools/ 底下的頁面」）。建議照現有兩個工具頁的模式加一行，讓驗證涵蓋新頁面，但這不是
build 會失敗的強制要求 — 只是跟既有慣例保持一致、避免日後回歸時漏掉。

驗證項目 1–4 是資料驅動頁面的健檢（色彩頁數量、CTA/UTM/breadcrumb 完整性），跟新增手刻工具頁
**沒有直接關係**，不需要為新工具頁改動。

## 9. 快速檢查清單（新增一個工具頁時）

- [ ] `src/pages/tools/{slug}.astro` 建立，套用第 5 節骨架（Base → Breadcrumb → h1 → 工具主體 → AppCTA）
- [ ] `title`/`description` 遵守第 5.1 節的慣例（含免費/隱私訊號）
- [ ] `canonicalPath` prop 跟實際路由路徑一致（`/tools/{slug}/`，注意結尾斜線）
- [ ] `AppCTA` 的 `pageType="tool"`、`pageSlug="{slug}"` 正確
- [ ] Tailwind class 只用第 7 節列出的既有子集，維持視覺一致
- [ ] Canvas 互動（如果有）記得做 scaleX/scaleY 座標映射（第 5.4 節）
- [ ] `src/pages/tools/index.astro` 的 `tools` 陣列加一筆
- [ ] `src/pages/sitemap-index.xml.ts` 的 `staticPaths` 陣列加一筆
- [ ] （建議）`scripts/validate-build.mjs` 的 `requiredFiles` 加一筆
- [ ] `npm run build` 過（會自動跑 `validate-build.mjs`）
- [ ] 本機 `npm run dev` 手動點過一次新頁面，確認 dropzone/canvas/互動邏輯實際運作（這類 client-side
      JS 邏輯 build 驗證不會測到功能正確性，只測檔案是否存在）
