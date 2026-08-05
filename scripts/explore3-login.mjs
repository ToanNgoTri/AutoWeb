// Dò luồng đăng nhập TVPL qua CDP: điền form, tìm dấu hiệu đã đăng nhập,
// và kiểm tra xem cột Hiệu lực/Tình trạng có mở ra hay không.
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORT = 9333
const PROFILE = join(homedir(), '.tvpl-chrome-cdp')
mkdirSync('scripts/out', { recursive: true })

spawn(CHROME, [`--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore', detached: true }).unref()

let browser
for (let i = 0; i < 40 && !browser; i++) {
  try { browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`) } catch { await new Promise(r => setTimeout(r, 500)) }
}
const ctx = browser.contexts()[0]
const page = ctx.pages()[0] ?? (await ctx.newPage())

console.log('→ mở trang tìm văn bản')
await page.goto('https://thuvienphapluat.vn/page/tim-van-ban.aspx', { waitUntil: 'domcontentloaded' })
for (let i = 0; i < 90; i++) {
  const t = await page.title()
  if (!/just a moment|chờ một chút/i.test(t) && (await page.locator('#keywordTextBox').count())) break
  await page.waitForTimeout(1000)
}
console.log('✓', await page.title())

// dấu hiệu trước khi đăng nhập
const before = await page.evaluate(() => ({
  hasUserBox: !!document.querySelector('#usernameTextBox'),
  userBoxVisible: !!document.querySelector('#usernameTextBox')?.getClientRects().length,
  ddlStatusDisabled: document.querySelector('#ddlStatus')?.disabled,
  bodyHasDangXuat: /đăng xuất/i.test(document.body.innerText),
  topRight: document.body.innerText.slice(0, 400).replace(/\n+/g, ' | '),
}))
console.log('TRƯỚC:', JSON.stringify(before, null, 2))
await page.screenshot({ path: 'scripts/out/20-before-login.png' })

console.log('\n→ điền form đăng nhập')
await page.fill('#usernameTextBox', env.TVPL_USERNAME)
await page.fill('#passwordTextBox', env.TVPL_PASSWORD)
await page.screenshot({ path: 'scripts/out/21-filled-login.png' })

await Promise.all([
  page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 45_000 }).catch((e) => console.log('  (không navigate:', e.message.slice(0, 50), ')')),
  page.click('#loginButton'),
])
await page.waitForTimeout(4000)
console.log('  URL sau login:', page.url())
await page.screenshot({ path: 'scripts/out/22-after-login.png' })

const after = await page.evaluate(() => ({
  hasUserBox: !!document.querySelector('#usernameTextBox'),
  userBoxVisible: !!document.querySelector('#usernameTextBox')?.getClientRects().length,
  ddlStatusDisabled: document.querySelector('#ddlStatus')?.disabled,
  bodyHasDangXuat: /đăng xuất/i.test(document.body.innerText),
  // các ứng viên hiển thị tên user
  userHints: [...document.querySelectorAll('a,span,div')]
    .filter(el => el.children.length === 0 && /xuanhoang|đăng xuất|tài khoản/i.test(el.textContent || ''))
    .slice(0, 10)
    .map(el => ({ tag: el.tagName, id: el.id, cls: el.className?.toString?.().slice(0,60), text: (el.textContent||'').trim().slice(0,50), href: el.getAttribute('href') })),
  errorMsgs: [...document.querySelectorAll('[class*="error"],[id*="error"],[class*="alert"]')].map(e => (e.textContent||'').trim().slice(0,120)).filter(Boolean).slice(0,5),
}))
console.log('SAU:', JSON.stringify(after, null, 2))
writeFileSync('scripts/out/login.json', JSON.stringify({ before, after }, null, 2))

// thử luôn một lần tìm kiếm để xem Tình trạng có mở
console.log('\n→ tìm Nghị định mới nhất (sau đăng nhập)')
await page.goto('https://thuvienphapluat.vn/page/tim-van-ban.aspx?keyword=&area=0&type=11&status=0&lan=1&org=0&signer=0&match=True&sort=2&bdate=&edate=', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('.nqTitle', { timeout: 45_000 })
await page.waitForTimeout(1500)
await page.screenshot({ path: 'scripts/out/23-results-logged-in.png' })
const rows = await page.evaluate(() =>
  [...document.querySelectorAll('p.nqTitle')].slice(0, 4).map((t) => {
    const rec = t.closest('[class^="content-"]')
    return {
      title: (t.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60),
      right: (rec?.querySelector('.right-col')?.textContent || '').replace(/\s+/g, ' ').trim(),
    }
  }),
)
console.log(JSON.stringify(rows, null, 2))
writeFileSync('scripts/out/rows-logged-in.json', JSON.stringify(rows, null, 2))

await browser.close()
console.log('\n✓ xong (Chrome vẫn mở)')
process.exit(0)
