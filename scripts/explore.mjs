// Dò cấu trúc DOM thật của form "Tìm kiếm nâng cao" trên thuvienphapluat.vn.
// Chạy: node scripts/explore.mjs
import { chromium } from 'playwright-core'
import { mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const PROFILE = join(homedir(), '.tvpl-playwright-profile')
mkdirSync(PROFILE, { recursive: true })
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

console.log('→ mở trang tìm văn bản...')
await page.goto('https://thuvienphapluat.vn/page/tim-van-ban.aspx', {
  waitUntil: 'domcontentloaded',
  timeout: 60_000,
})

// chờ vượt Cloudflare (bản tiếng Anh "Just a moment" hoặc tiếng Việt "Chờ một chút")
const CHALLENGE = /just a moment|chờ một chút|checking|attention required|xác minh/i
for (let i = 0; i < 90; i++) {
  const t = await page.title()
  const hasForm = await page.locator('select, input[type="text"]').count()
  if (!CHALLENGE.test(t) && hasForm > 0) {
    console.log(`✓ vượt Cloudflare sau ${i}s`)
    break
  }
  await page.waitForTimeout(1000)
  if (i % 5 === 0) console.log(`   ...chờ (${i}s) title="${t}" fields=${hasForm}`)
}
console.log('✓ title:', await page.title())

await page.waitForTimeout(2500)
await page.screenshot({ path: 'scripts/out/01-landing.png', fullPage: false })

// Liệt kê mọi thứ trông giống "tìm kiếm nâng cao"
const advCandidates = await page.evaluate(() =>
  [...document.querySelectorAll('a,button,span,div,label')]
    .filter((el) => /nâng cao/i.test(el.textContent || '') && (el.textContent || '').length < 60)
    .map((el) => ({
      tag: el.tagName,
      text: (el.textContent || '').trim(),
      id: el.id,
      cls: el.className?.toString?.().slice(0, 90),
      href: el.getAttribute('href'),
      onclick: el.getAttribute('onclick')?.slice(0, 120),
    })),
)
console.log('\n=== ứng viên "nâng cao" ===')
console.log(JSON.stringify(advCandidates, null, 2))

const dump = async (tagLabel) => {
  const data = await page.evaluate(() => ({
    url: location.href,
    forms: [...document.forms].map((f) => ({ id: f.id, action: f.action, method: f.method })),
    selects: [...document.querySelectorAll('select')].map((s) => ({
      id: s.id,
      name: s.name,
      cls: s.className?.toString?.().slice(0, 80),
      visible: !!(s.offsetParent || s.getClientRects().length),
      options: [...s.options].slice(0, 40).map((o) => `${o.value}|${o.text.trim()}`),
    })),
    inputs: [...document.querySelectorAll('input')]
      .filter((i) => i.type !== 'hidden')
      .map((i) => ({
        id: i.id,
        name: i.name,
        type: i.type,
        placeholder: i.placeholder,
        value: i.value?.slice(0, 40),
        visible: !!(i.offsetParent || i.getClientRects().length),
      })),
    // các khối dropdown custom (TVPL hay dùng div thay vì select)
    customDropdowns: [...document.querySelectorAll('[class*="select"],[class*="dropdown"],[class*="combo"]')]
      .filter((el) => el.getClientRects().length)
      .slice(0, 25)
      .map((el) => ({
        tag: el.tagName,
        id: el.id,
        cls: el.className?.toString?.().slice(0, 90),
        text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 70),
      })),
  }))
  writeFileSync(`scripts/out/${tagLabel}.json`, JSON.stringify(data, null, 2))
  console.log(`\n=== DUMP ${tagLabel} (${data.url}) ===`)
  console.log('forms:', JSON.stringify(data.forms))
  console.log('selects:', JSON.stringify(data.selects, null, 2))
  console.log('inputs:', JSON.stringify(data.inputs, null, 2))
  console.log('customDropdowns:', JSON.stringify(data.customDropdowns, null, 2))
  return data
}

await dump('02-before-adv')

// thử click ứng viên đầu tiên
if (advCandidates.length) {
  console.log('\n→ click "tìm kiếm nâng cao"...')
  try {
    await page.getByText(/tìm kiếm nâng cao/i).first().click({ timeout: 10_000 })
    await page.waitForTimeout(3000)
    await page.screenshot({ path: 'scripts/out/03-after-adv.png' })
    await dump('04-after-adv')
  } catch (e) {
    console.log('✗ click lỗi:', e.message)
  }
}

writeFileSync('scripts/out/page.html', await page.content())
console.log('\n✓ xong. Xem scripts/out/. Browser để mở 60s cho bạn nhìn.')
await page.waitForTimeout(60_000)
await ctx.close()
