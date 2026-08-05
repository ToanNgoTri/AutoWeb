// Test tự động cho bộ chọn phần tử: gọi API rồi mô phỏng cú bấm của người dùng.
import { chromium } from 'playwright-core'

const sel = process.argv[2] ?? 'p.nqTitle a'
const chờ = fetch('http://localhost:3000/api/chon-phan-tu', { method: 'POST' }).then((r) => r.json())

await new Promise((r) => setTimeout(r, 6000))
const b = await chromium.connectOverCDP('http://127.0.0.1:9333')
const page = b.contexts()[0].pages().find((p) => p.url().includes('thuvienphapluat'))
console.log('overlay đang bật:', (await page.locator('.__kb_pick').count()) > 0)
await page.locator(sel).first().click({ force: true })
console.log(`→ đã bấm vào "${sel}"`)
await b.close()

const d = await chờ
const p = d.phanTu
if (!p) { console.log('API trả:', JSON.stringify(d)); process.exit(1) }
console.log('\nselector mặc định:', p.selector)
console.log('gợi ý:')
for (const g of p.goiY) console.log(`   ${g.sel.padEnd(54)} khớp ${g.soKhop} phần tử`)
console.log('thuộc tính bóc được:', Object.keys(p.thuocTinh).join(', '))
process.exit(0)
