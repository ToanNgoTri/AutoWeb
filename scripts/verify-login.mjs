// Nối vào Chrome đang mở, kiểm tra bằng chứng cứng là đã đăng nhập.
import { chromium } from 'playwright-core'
const b = await chromium.connectOverCDP('http://127.0.0.1:9333')
const page = b.contexts()[0].pages().find(p => p.url().includes('thuvienphapluat'))
if (!page) { console.log('không thấy tab TVPL'); process.exit(1) }
console.log('URL:', page.url().slice(0, 90))
const ev = await page.evaluate(() => {
  const txt = document.body.innerText
  return {
    coDangXuat: /đăng xuất/i.test(txt),
    coTenUser: /xuanhoang20384/i.test(txt),
    conODangNhap: !!document.querySelector('.txt-account-Home')?.getClientRects().length,
    ddlStatusDisabled: document.querySelector('#ddlStatus')?.disabled,
    // khối tài khoản ở góc phải
    khoiTaiKhoan: [...document.querySelectorAll('a')]
      .filter(a => /đăng xuất|tài khoản|xuanhoang|gói dịch vụ/i.test(a.textContent || ''))
      .slice(0, 8).map(a => `${(a.textContent||'').replace(/\s+/g,' ').trim().slice(0,32)} → ${a.getAttribute('href')}`),
  }
})
console.log(JSON.stringify(ev, null, 2))
// thử mở trang chi tiết 1 Nghị định xem nội dung có mở không
await page.goto('https://thuvienphapluat.vn/van-ban/Linh-vuc-khac/Nghi-dinh-304-2026-ND-CP-huy-dong-tiem-luc-khoa-hoc-cong-nghe-phuc-vu-hoat-dong-Cong-an-nhan-dan-717951.aspx', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4000)
const ct = await page.evaluate(() => {
  const t = document.body.innerText
  return {
    doDaiNoiDung: t.length,
    coChuoiKhoa: /vui lòng đăng nhập|nâng cấp|thành viên|mua gói|chưa có tài khoản/i.test(t),
    trichNgang: t.replace(/\s+/g, ' ').slice(600, 1100),
  }
})
console.log(JSON.stringify(ct, null, 2))
await b.close(); process.exit(0)
