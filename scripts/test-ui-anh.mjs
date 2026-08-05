import { chromium } from 'playwright-core'
const b = await chromium.connectOverCDP('http://127.0.0.1:9344')
const page = b.contexts()[0].pages()[0]
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)

const diem = page.locator('button[title="Chèn một bước vào đây"]').nth(1)
await diem.scrollIntoViewIfNeeded()
await page.waitForTimeout(300)
await diem.hover()
await page.waitForTimeout(400)
let bb = await diem.boundingBox()
await page.screenshot({ path: 'scripts/out/33-diem-chen-hover.png',
  clip: { x: bb.x, y: bb.y - 60, width: 780, height: 130 } })
console.log('đã chụp điểm chèn khi rê chuột')

await diem.click()
await page.waitForTimeout(500)
bb = await diem.boundingBox()
await page.screenshot({ path: 'scripts/out/34-menu.png',
  clip: { x: bb.x, y: bb.y - 20, width: 780, height: 340 } })
console.log('đã chụp menu chọn loại')
await b.close(); process.exit(0)
