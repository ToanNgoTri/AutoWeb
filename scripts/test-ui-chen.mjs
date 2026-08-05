// Test UI: điểm chèn giữa các bước có hiện và chèn đúng vị trí không.
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { homedir } from 'node:os'
import { join } from 'node:path'

const PORT = 9344
spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  [`--remote-debugging-port=${PORT}`, `--user-data-dir=${join(homedir(), '.tvpl-ui-test')}`,
   '--no-first-run', '--no-default-browser-check', '--window-size=1500,1000', 'about:blank'],
  { stdio: 'ignore', detached: true }).unref()

let b
for (let i = 0; i < 60 && !b; i++) {
  try { b = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`) } catch { await new Promise(r => setTimeout(r, 500)) }
}
const page = b.contexts()[0].pages()[0] ?? await b.contexts()[0].newPage()
await page.setViewportSize({ width: 1500, height: 1000 })
await page.addInitScript(() => localStorage.removeItem('kich-ban-dang-soan'))
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)

const demBuoc = () => page.locator('select:has(option:text-is("Mở trang"))').count()
console.log('số bước ban đầu:', await demBuoc())

const diemChen = page.locator('button[title="Chèn một bước vào đây"]')
console.log('số điểm chèn "+" giữa các bước:', await diemChen.count(), '(kỳ vọng = số bước + 1)')

// rê vào điểm chèn thứ 3 rồi bấm
await diemChen.nth(2).hover()
await page.waitForTimeout(400)
await page.screenshot({ path: 'scripts/out/30-hover-diem-chen.png', clip: { x: 0, y: 180, width: 760, height: 420 } })
await diemChen.nth(2).click()
await page.waitForTimeout(500)
console.log('menu chọn loại hiện ra:', await page.locator('text=Chèn bước loại nào?').isVisible())
await page.screenshot({ path: 'scripts/out/31-menu-chon-loai.png', clip: { x: 0, y: 180, width: 760, height: 520 } })

await page.locator('button:has-text("Khẳng định")').first().click()
await page.waitForTimeout(600)
console.log('số bước sau khi chèn:', await demBuoc())

// bước thứ 3 phải là "Khẳng định"
const loaiBuoc3 = await page.locator('select:has(option:text-is("Mở trang"))').nth(2).inputValue()
console.log('loại của bước thứ 3 (kỳ vọng khang-dinh):', loaiBuoc3)
await page.screenshot({ path: 'scripts/out/32-da-chen.png', clip: { x: 0, y: 180, width: 760, height: 560 } })

await b.close()
process.exit(0)
