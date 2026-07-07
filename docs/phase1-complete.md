# HuePort Color SEO Site — Phase 1 完成紀錄

> **完成時間**：2026-07-07
> **狀態**：✅ Phase 1 全部完成，網站已上線並接上 Google Search Console
> **網址**：https://hueport-color-site.pages.dev/

## 這個專案為什麼存在

源頭是 HuePort 的 Google Play 商店數據：月訪客只有 31 人、9 個安裝、流量來源幾乎全是「未指定」。診斷結論：商店頁面沒壞（轉換率 29%，跟同類 App 差不多），真正的問題是沒有流量進來。這個網站是解法——用程式化 SEO 生成幾千個色彩頁面，每頁都是 Google 搜尋入口，底部都有帶 UTM 的 HuePort 商店 CTA。

## Phase 1 成果

- 網站規模：4,978 頁（4,945 顏色頁 + 27 字母索引 + 工具/app/首頁）
- 色彩資料：每色含 HEX/RGB/HSL/CMYK/LAB/OKLCH + 和諧色 + tints/shades + 最近鄰
- 內部連結：64,285 個，全部驗證無失效
- 工具頁：hex-to-rgb、color-picker（含 dropzone 上傳）、tools 總覽
- Lighthouse：七種頁型 Performance + SEO 全 100
- UTM 追蹤：五種頁型全帶 utm_source=colorsite，campaign/content 依頁型區分
- 導覽：全站 Header + 麵包屑（含 BreadcrumbList JSON-LD）
- sitemap + robots：已上線，網址正確
- GSC：已驗證擁有權、已提交 sitemap-index.xml

## ⚠️ 絕對不能做的事

首頁 src/pages/index.astro 的 google-site-verification meta 標籤不可刪除，移除會導致 Google 停止收錄。已在程式碼註解、專案 CLAUDE.md、全域 LESSONS.md 三處設防護。

## 接下來要做的事

**短期（不用等 SEO）**：LinkedIn 文（兩版已寫好）、Reels 影片（腳本已好）、Play Store 新截圖（Figma 英文版已做）。導商店連結都帶 UTM。

**中期（1–2 週）**：買獨立網域（不掛個人網站下），綁定後更新 astro.config.mjs 的 site + robots.txt，重新提交 GSC。命名前先 web_search 確認無撞名。

**早期健康檢查點（第 6–8 週）**：回 GSC 看索引頁數。往 1,000+ 爬 = 技術面健康；< 1,000 = Google 沒在收錄，要檢查 sitemap / 內容品質，不是繼續等。

**放棄條件（6 個月後）**：索引 < 5,000 或月流量 < 500 → 停止擴量，不進 Phase 2/3，但不下架。

## Phase 2 預告（數據健康才做）

遷移 Cloudflare Workers Static Assets、全量 30,000 顏色頁、剩餘 5 個工具頁、/palette/ 主題頁 ~300 頁、按色動態 OG image。
