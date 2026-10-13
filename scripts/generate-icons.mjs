import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const source = await readFile(new URL('../public/icons/source.svg', import.meta.url), 'utf8');
const browser = await chromium.launch({ channel: 'chromium', headless: true });
try {
  const page = await browser.newPage();
  for (const size of [16, 32, 48, 128]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<style>html,body{margin:0;width:100%;height:100%;overflow:hidden}svg{display:block;width:100%;height:100%}</style>${source}`);
    await page.screenshot({ path: fileURLToPath(new URL(`../public/icons/${size}.png`, import.meta.url)), omitBackground: true });
  }
  console.log('Generated extension icons: 16, 32, 48, 128 px');
} finally { await browser.close(); }
