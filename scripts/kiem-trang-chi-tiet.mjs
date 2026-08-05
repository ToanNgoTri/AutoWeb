import { chromium } from 'playwright-core'
const b = await chromium.connectOverCDP('http://127.0.0.1:9333')
const page = b.contexts()[0].pages()[0]
await page.goto('https://thuvienphapluat.vn/page/tim-van-ban.aspx?keyword=&area=0&type=11&status=0&lan=1&org=0&signer=0&match=True&sort=2&bdate=&edate=', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('p.nqTitle', { timeout: 60000 })
const links = await page.locator('p.nqTitle a').evaluateAll(a => a.slice(0,3).map(x => x.href))
for (const l of links) {
  await page.goto(l, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  const d = await page.evaluate(() => {
    const t = document.body.innerText.replace(/\s+/g, ' ')
    return {
      dai: t.length,
      coSo: /Số:\s*\S+/.test(t),
      khoa: /vui lòng đăng nhập|chưa có bản|đang cập nhật|nâng cấp/i.test(t),
      trich: t.slice(500, 780),
    }
  })
  console.log('\n', l.slice(-46))
  console.log('   dài:', d.dai, '| có "Số:":', d.coSo, '| có chữ khoá/chưa cập nhật:', d.khoa)
  console.log('   trích:', d.trich.slice(0, 210))
}
await b.close(); process.exit(0)
