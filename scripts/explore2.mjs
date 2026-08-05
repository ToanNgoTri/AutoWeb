// Chạy full flow: click "+ Thêm điều kiện" → chọn Nghị định → sort mới nhất → tìm
// rồi dump cấu trúc một dòng kết quả để viết parser.
import { chromium } from 'playwright-core'
import { mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const PROFILE = join(homedir(), '.tvpl-playwright-profile')
mkdirSync('scripts/out', { recursive: true })

const ctx = await chromium.launchPersistentContext(PROFILE, {
  channel: 'chrome',
  headless: false,
  viewport: { width: 1440, height: 900 },
  locale: 'vi-VN',
  timezoneId: 'Asia/Ho_Chi_Minh',
  args: ['--disable-blink-features=AutomationControlled'],
})
const page = ctx.pages()[0] ?? (await ctx.newPage())
const CHALLENGE = /just a moment|chờ một chút|checking|attention required/i

async function waitReady(label) {
  for (let i = 0; i < 90; i++) {
    const t = await page.title()
    const n = await page.locator('#keywordTextBox, .nqTitle').count()
    if (!CHALLENGE.test(t) && n > 0) return console.log(`  ✓ ${label} ready (${i}s)`)
    await page.waitForTimeout(1000)
  }
  console.log(`  ✗ ${label} timeout, title=${await page.title()}`)
}

console.log('→ mở form')
await page.goto('https://thuvienphapluat.vn/page/tim-van-ban.aspx', { waitUntil: 'domcontentloaded' })
await waitReady('form')

console.log('→ click "+ Thêm điều kiện"')
await page.locator('.autohideClick').first().click()
await page.waitForTimeout(1200)
await page.screenshot({ path: 'scripts/out/10-adv-open.png' })
console.log('   loại VB visible =', await page.locator('#documentTypeDropDownList').isVisible())

console.log('→ chọn Nghị định + sort mới nhất')
await page.selectOption('#documentTypeDropDownList', '11')
await page.selectOption('#sortDropDownList', '2')
await page.waitForTimeout(600)
await page.screenshot({ path: 'scripts/out/11-filled.png' })

console.log('→ bấm Tìm kiếm')
await Promise.all([
  page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => {}),
  page.locator('#btnKeyWord').click(),
])
await waitReady('results')
await page.waitForTimeout(2000)
console.log('   URL kết quả:', page.url())
await page.screenshot({ path: 'scripts/out/12-results.png', fullPage: false })
writeFileSync('scripts/out/results.html', await page.content())

// dò cấu trúc dòng kết quả
const probe = await page.evaluate(() => {
  const out = {}
  for (const sel of ['.nqTitle', '.left-col .nqTitle', 'p.nqTitle', '.content-3', '#h1_title']) {
    out[sel] = document.querySelectorAll(sel).length
  }
  const first = document.querySelector('.nqTitle')
  out.firstTitleHTML = first?.outerHTML?.slice(0, 600)
  // leo lên tìm container 1 record
  let node = first, chain = []
  for (let i = 0; i < 6 && node; i++) {
    node = node.parentElement
    if (node) chain.push({ tag: node.tagName, cls: node.className?.toString?.().slice(0, 70), id: node.id })
  }
  out.ancestorChain = chain
  out.recordOuterHTML = node?.outerHTML?.slice(0, 2500)
  out.totalText = document.body.innerText.match(/(?:Tìm thấy|Kết quả)[^\n]{0,80}/g)?.slice(0, 3)
  return out
})
writeFileSync('scripts/out/probe.json', JSON.stringify(probe, null, 2))
console.log('\n=== PROBE ===')
console.log(JSON.stringify(probe, null, 2).slice(0, 4000))

console.log('\n✓ xong (browser mở 45s)')
await page.waitForTimeout(45_000)
await ctx.close()
