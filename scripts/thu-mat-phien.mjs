// Thử các cách làm mất phiên đăng nhập TVPL để test quy trình phục hồi.
import { chromium } from 'playwright-core'
const b = await chromium.connectOverCDP('http://127.0.0.1:9333')
const ctx = b.contexts()[0]
const page = ctx.pages()[0]
await page.goto('https://thuvienphapluat.vn/page/tim-van-ban.aspx', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('#keywordTextBox', { timeout: 60000 })
console.log('đang đăng nhập?', !(await page.locator('.txt-account-Home').isVisible()))

const ck = await ctx.cookies('https://thuvienphapluat.vn')
console.log('cookie:', ck.map(c => `${c.name}${c.httpOnly ? '(httpOnly)' : ''}`).join(', '))

// tìm link đăng xuất
const dx = await page.evaluate(() =>
  [...document.querySelectorAll('a')]
    .filter(a => /logout|dang-xuat|signout/i.test(a.getAttribute('href') || '') || /đăng xuất/i.test(a.textContent || ''))
    .map(a => `${(a.textContent||'').trim().slice(0,24)} → ${a.getAttribute('href')}`))
console.log('link đăng xuất tìm được:', dx.length ? dx : '(không có)')
await b.close(); process.exit(0)
