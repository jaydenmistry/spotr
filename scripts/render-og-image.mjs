// Renders src/app/opengraph-image.png (the link-preview card) in SF Pro.
//
// SF Pro can't be shipped with the app, so the card is rasterized locally from
// an installed copy and only the PNG is committed. Re-run after changing the
// tagline or SITE_DESCRIPTION:  node scripts/render-og-image.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const root = new URL("..", import.meta.url);
const site = readFileSync(new URL("src/lib/site.ts", root), "utf8");
const description = site.match(/SITE_DESCRIPTION =\s*"([^"]+)"/)?.[1];
if (!description) throw new Error("Couldn't read SITE_DESCRIPTION from src/lib/site.ts");

const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px; padding: 80px;
    display: flex; flex-direction: column; justify-content: center;
    background: radial-gradient(circle at 25% 20%, #2a2170 0%, #09090c 55%), #09090c;
    font-family: "SF Pro", sans-serif; -webkit-font-smoothing: antialiased;
  }
  .brand { display: flex; align-items: center; gap: 26px; }
  .wordmark { font-size: 84px; font-weight: 700; letter-spacing: -3px; color: #f5f5f7; }
  .tagline { margin-top: 52px; font-size: 64px; font-weight: 700; letter-spacing: -2px; line-height: 1.05; }
  .tagline span { display: block; }
  .description { margin-top: 28px; font-size: 26px; line-height: 1.35; color: #a3a3ad; max-width: 940px; }
</style></head><body>
  <div class="brand">
    <svg width="92" height="92" viewBox="0 0 32 32">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#8a6bff" />
          <stop offset="0.55" stop-color="#5b7bff" />
          <stop offset="1" stop-color="#3ea6ff" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#g)" />
      <path d="M22.6 11.2A8 8 0 1 0 24 16" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" />
      <circle cx="16" cy="16" r="3.1" fill="#fff" />
    </svg>
    <div class="wordmark">spotr</div>
  </div>
  <div class="tagline">
    <span style="color: #f5f5f7">Spot it first.</span>
    <span style="color: #8f80ff">Buy it right.</span>
  </div>
  <div class="description">${escape(description)}</div>
</body></html>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(html);

  // A missing font falls back silently, so compare against the fallback's width.
  const installed = await page.evaluate(() => {
    const ctx = document.createElement("canvas").getContext("2d");
    const width = (font) => ((ctx.font = font), ctx.measureText("Spot it first. Buy it right.").width);
    return width('64px "SF Pro", monospace') !== width("64px monospace");
  });
  if (!installed) throw new Error("SF Pro isn't installed on this machine, so the card would render in a fallback font.");

  writeFileSync(new URL("src/app/opengraph-image.png", root), await page.screenshot({ type: "png" }));
  console.log("Wrote src/app/opengraph-image.png");
} finally {
  await browser.close();
}
