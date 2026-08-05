import { chromium } from 'playwright-core'
const b = await chromium.connectOverCDP('http://127.0.0.1:9344')
const page = b.contexts()[0].pages()[0]
await page.addInitScript(() => localStorage.removeItem('kich-ban-dang-soan'))
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)

// bước cuối của mẫu là "Lấy bảng" với 9 cột
const chenCot = page.locator('button[title="Chèn một cột vào đây"]')
const soDiem = await chenCot.count()
const soCot = await page.locator('input[placeholder="tên_cột"]').count()
console.log(`cột: ${soCot} · điểm chèn cột: ${soDiem} (kỳ vọng = số cột + 1)`)

// tên các cột trước khi đổi
const ten = () => page.locator('input[placeholder="tên_cột"]').evaluateAll(els => els.map(e => e.value))
console.log('trước :', (await ten()).join(', '))

// chèn một cột vào giữa (sau cột 1)
await chenCot.nth(1).scrollIntoViewIfNeeded()
await chenCot.nth(1).click()
await page.waitForTimeout(400)
console.log('sau khi chèn ở vị trí 2:', (await ten()).join(', '))

// đổi thứ tự: đẩy cột 1 xuống
await page.locator('button[title="Đưa cột xuống"]').first().click()
await page.waitForTimeout(400)
console.log('sau khi đẩy cột 1 xuống  :', (await ten()).join(', '))

// nhân bản cột đầu
await page.locator('button[title="Nhân bản cột"]').first().click()
await page.waitForTimeout(400)
console.log('sau khi nhân bản cột 1   :', (await ten()).join(', '))
await b.close(); process.exit(0)
