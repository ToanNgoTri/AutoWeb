// So sánh 2 cách khởi động: Playwright launch vs nối CDP vào Chrome tự bật.
// Mục tiêu: xem cách nào không lộ navigator.webdriver và vượt Cloudflare nhanh hơn.
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { homedir } from 'node:os'
import { join } from 'node:path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORT = 9333
const PROFILE = join(homedir(), '.tvpl-chrome-cdp')

const probe = async (page, label) => {
  const flags = await page.evaluate(() => ({
    webdriver: navigator.webdriver,
    plugins: navigator.plugins.length,
    langs: navigator.languages,
    ua: navigator.userAgent.slice(0, 70),
  }))
  console.log(`[${label}] flags:`, JSON.stringify(flags))
}

// ── Cách A: Playwright launchPersistentContext (đang dùng) ─────────────────
console.log('\n=== A) playwright launchPersistentContext ===')
{
  const ctx = await chromium.launchPersistentContext(join(homedir(), '.tvpl-test-a'), {
    channel: 'chrome',
    headless: false,
    args: ['--disable-blink-features=AutomationControlled'],
  })
  const page = ctx.pages()[0] ?? (await ctx.newPage())
  await page.goto('about:blank')
  await probe(page, 'A')
  await ctx.close()
}

// ── Cách B: tự spawn Chrome + connectOverCDP ────────────────────────────────
console.log('\n=== B) spawn Chrome + connectOverCDP ===')
const proc = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFILE}`,
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
  ],
  { stdio: 'ignore', detached: true },
)
proc.unref()

// chờ debug endpoint sẵn sàng
let browser
for (let i = 0; i < 40; i++) {
  try {
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`)
    break
  } catch {
    await new Promise((r) => setTimeout(r, 500))
  }
}
if (!browser) throw new Error('không nối được CDP')
console.log('  ✓ nối CDP OK')

const ctx = browser.contexts()[0]
const page = ctx.pages()[0] ?? (await ctx.newPage())
await page.goto('about:blank')
await probe(page, 'B')

console.log('\n→ B thử vào TVPL, đo thời gian vượt Cloudflare...')
const t0 = Date.now()
await page.goto('https://thuvienphapluat.vn/page/tim-van-ban.aspx', { waitUntil: 'domcontentloaded' })
let passed = false
for (let i = 0; i < 90; i++) {
  const title = await page.title().catch(() => '')
  const n = await page.locator('#keywordTextBox').count().catch(() => 0)
  if (!/just a moment|chờ một chút/i.test(title) && n > 0) {
    passed = true
    break
  }
  await new Promise((r) => setTimeout(r, 1000))
}
console.log(passed ? `  ✓ VƯỢT sau ${Math.round((Date.now() - t0) / 1000)}s` : '  ✗ KHÔNG vượt trong 90s')
console.log('  title:', await page.title())

await browser.close() // chỉ ngắt CDP, Chrome vẫn chạy
console.log('\n(Chrome vẫn mở — tự đóng tay. Profile:', PROFILE, ')')
process.exit(0)
