// Gọi thẳng endpoint đăng nhập của TVPL (đúng như CheckFullLogin() làm)
// và in response thô, để phân biệt "sai mật khẩu" với "mình gửi sai form".
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORT = 9333
spawn(CHROME, [`--remote-debugging-port=${PORT}`, `--user-data-dir=${join(homedir(), '.tvpl-chrome-cdp')}`, '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore', detached: true }).unref()

let browser
for (let i = 0; i < 40 && !browser; i++) {
  try { browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`) } catch { await new Promise(r => setTimeout(r, 500)) }
}
const page = browser.contexts()[0].pages()[0] ?? (await browser.contexts()[0].newPage())
await page.goto('https://thuvienphapluat.vn/page/tim-van-ban.aspx', { waitUntil: 'domcontentloaded' })
for (let i = 0; i < 90; i++) {
  if (!/just a moment|chờ một chút/i.test(await page.title()) && (await page.locator('#keywordTextBox').count())) break
  await page.waitForTimeout(1000)
}

for (const [label, u, p, action] of [
  ['Login / mật khẩu bạn cho', env.TVPL_USERNAME, env.TVPL_PASSWORD, 'Login'],
  ['Login / sai cố ý (đối chứng)', env.TVPL_USERNAME, 'chac-chan-sai-123', 'Login'],
  ['Login / user bịa (đối chứng)', 'khong_ton_tai_zz99', 'abc12345', 'Login'],
]) {
  const res = await page.evaluate(
    async ([user, pass, act]) => {
      const r = await fetch('/page/ajaxcontroler.aspx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        body: `&l_txtUser=${encodeURIComponent(user)}&l_txtPass=${encodeURIComponent(pass)}&action=${act}`,
      })
      return { status: r.status, text: (await r.text()).slice(0, 400) }
    },
    [u, p, action],
  )
  console.log(`\n[${label}] user=${u}`)
  console.log('  HTTP', res.status, '| body:', JSON.stringify(res.text))
}

await browser.close()
process.exit(0)
