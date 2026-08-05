// Mô phỏng cú bấm của người dùng để test /api/chon-phan-tu tự động.
import { chromium } from 'playwright-core'
const b = await chromium.connectOverCDP('http://127.0.0.1:9333')
const page = b.contexts()[0].pages().find((p) => p.url().includes('thuvienphapluat'))
console.log('overlay đang chọn:', await page.locator('.__kb_pick').count(), 'phần tử')
console.log('nhãn overlay:', await page.locator('.__kb_pick').nth(2).textContent().catch(() => '(không có)'))
await page.locator('p.nqTitle a').first().click({ force: true })
console.log('→ đã bấm vào p.nqTitle a')
await b.close()
process.exit(0)
