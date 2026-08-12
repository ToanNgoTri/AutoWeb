/**
 * Dò cấu trúc phân trang của một trang danh sách, rồi in ra kịch bản gợi ý.
 *
 *   node scripts/do-phan-trang.mjs <url>
 *   node scripts/do-phan-trang.mjs <url> --luu ten-file.json
 *   node scripts/do-phan-trang.mjs <url> --an          (headless, site dễ)
 *   node scripts/do-phan-trang.mjs <url> --giu         (không tắt Chrome khi xong)
 *
 * Trả lời đúng 5 câu mà lần nào dựng kịch bản cũng phải trả lời:
 *   1. Dòng của bảng là selector nào?
 *   2. Nút "trang sau" là cái nào, và ở trang cuối nó "tắt" bằng cách gì?
 *   3. Bấm sang trang là AJAX hay đổi URL?
 *   4. Dấu hiệu nào chứng minh trang mới ĐÃ về (chứ không phải DOM cũ còn đó)?
 *   5. Có ô "số dòng mỗi trang" không, giá trị lớn nhất là bao nhiêu?
 *
 * Không đoán: mọi kết luận đều từ so DOM trước/sau một cú bấm thật.
 */
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

// ── tham số ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const url = args.find((a) => !a.startsWith('--'))
const co = (t) => args.includes(t)
const giaTriCo = (t) => {
  const i = args.indexOf(t)
  return i >= 0 ? args[i + 1] : null
}

if (!url) {
  console.error('Thiếu URL.\n  node scripts/do-phan-trang.mjs <url> [--luu ten.json] [--an] [--giu]')
  process.exit(1)
}

const LUU = giaTriCo('--luu')
const AN = co('--an')
const GIU = co('--giu')

// ── mở Chrome ────────────────────────────────────────────────────────────────
// Cùng cổng + cùng profile với lib/tvpl/browser.js, nên nếu app đang mở Chrome
// thì script nối thẳng vào phiên đó (giữ được đăng nhập). Chỉ tự spawn khi chưa
// có gì ở cổng đó. KHÔNG dùng chromium.launch cho trường hợp mặc định: Chrome do
// Playwright tự bật mang cờ automation và bị Cloudflare chặn (xem test-cdp.mjs).

const CDP_PORT = Number(process.env.TVPL_CDP_PORT ?? 9333)
const PROFILE_DIR = join(homedir(), '.tvpl-chrome-cdp')
const CHROME_MAC = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

async function moBrowser() {
  if (AN) {
    console.log('· Chrome headless (chromium.launch)')
    return { browser: await chromium.launch({ channel: 'chrome', headless: true }), tuSpawn: true }
  }

  const noi = async () => {
    try {
      return await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`)
    } catch {
      return null
    }
  }

  const dangCo = await noi()
  if (dangCo) {
    console.log(`· Nối vào Chrome đang mở ở cổng ${CDP_PORT} (giữ nguyên phiên đăng nhập)`)
    return { browser: dangCo, tuSpawn: false }
  }

  if (!existsSync(CHROME_MAC)) {
    throw new Error(`Không thấy Chrome ở ${CHROME_MAC}. Chạy lại với --an để dùng bản headless.`)
  }
  mkdirSync(PROFILE_DIR, { recursive: true })
  console.log(`· Bật Chrome mới, cổng debug ${CDP_PORT}`)
  const con = spawn(
    CHROME_MAC,
    [
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${PROFILE_DIR}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--lang=vi-VN',
      '--window-size=1440,960',
      'about:blank',
    ],
    { stdio: 'ignore', detached: true },
  )
  con.unref()
  for (let i = 0; i < 60; i++) {
    const b = await noi()
    if (b) return { browser: b, tuSpawn: true, con }
    await new Promise((r) => setTimeout(r, 500))
  }
  con.kill()
  throw new Error(`Chrome không mở được cổng ${CDP_PORT} sau 30s.`)
}

// ── phần chạy TRONG trang: dò ứng viên ───────────────────────────────────────
// Viết thành một chuỗi hàm độc lập để page.evaluate nào cũng dùng được.

const MA_DO = `
const idHopLe = (id) => /^[A-Za-z][\\w:-]*$/.test(id)
const classOn = (c) =>
  c.length > 1 && c.length < 40 && !/^\\d+$/.test(c) && !/^[a-z]{0,3}[0-9a-f]{6,}$/i.test(c)
const sach = (s) => (s ?? '').replace(/\\s+/g, ' ').trim()

/** Đường dẫn nth-of-type, dùng khi phần tử không có gì để bám. */
const duongDan = (el) => {
  const khuc = []
  let cur = el
  while (cur && cur !== document.body && khuc.length < 6) {
    const cha = cur.parentElement
    if (!cha) break
    const cungThe = [...cha.children].filter((x) => x.tagName === cur.tagName)
    const the = cur.tagName.toLowerCase()
    khuc.unshift(cungThe.length > 1 ? the + ':nth-of-type(' + (cungThe.indexOf(cur) + 1) + ')' : the)
    cur = cha
  }
  return khuc.join(' > ')
}

/** Selector ngắn nhất còn trỏ đúng vào el (hoặc vào nhóm của nó). */
const neo = (el) => {
  if (!el) return null
  const the = el.tagName.toLowerCase()
  if (el.id && idHopLe(el.id)) return '#' + CSS.escape(el.id)
  const cls = [...el.classList].filter(classOn)
  if (cls.length) {
    const s = the + cls.map((c) => '.' + CSS.escape(c)).join('')
    if (document.querySelectorAll(s).length <= 4) return s
    const cha = el.parentElement
    if (cha?.id && idHopLe(cha.id)) return '#' + CSS.escape(cha.id) + ' ' + s
    return s
  }
  for (const a of ['aria-label', 'name', 'rel', 'data-dt-idx', 'title', 'data-testid']) {
    const v = el.getAttribute(a)
    if (v) return the + '[' + a + '="' + v.replace(/"/g, '\\\\"') + '"]'
  }
  return duongDan(el)
}

const hien = (el) => {
  if (!el) return false
  const s = getComputedStyle(el)
  if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0
}

/** Ứng viên "dòng của danh sách": bảng thật trước, rồi tới nhóm con lặp lại. */
const ungVienDong = () => {
  const ra = []
  for (const tb of document.querySelectorAll('table')) {
    const tr = [...tb.querySelectorAll('tbody tr')].filter((r) => r.querySelector('td'))
    if (tr.length >= 3) {
      ra.push({
        sel: (neo(tb) || 'table') + ' tbody tr',
        so: tr.length,
        kieu: 'table',
        soO: tr[0].querySelectorAll('td').length,
        tieuDe: [...tb.querySelectorAll('thead th')].map((t) => sach(t.textContent)).filter(Boolean),
        mau: sach(tr[0].textContent).slice(0, 70),
      })
    }
  }
  // nhóm phần tử con cùng cha, cùng tag + class, ít nhất 3 cái, có chữ
  const daXet = new Set()
  for (const cha of document.querySelectorAll('body *')) {
    if (cha.children.length < 3) continue
    // Footer/nav/header cũng là "nhóm phần tử lặp lại" và hay đông hơn cả danh
    // sách thật — loại ra, không thì ứng viên số 1 là mấy cột ở chân trang.
    if (cha.closest('footer, nav, header, aside, [role="navigation"], [role="contentinfo"]')) continue
    const nhom = new Map()
    for (const con of cha.children) {
      const cls = [...con.classList].filter(classOn).sort().join('.')
      const ky = con.tagName.toLowerCase() + (cls ? '.' + cls : '')
      if (!nhom.has(ky)) nhom.set(ky, [])
      nhom.get(ky).push(con)
    }
    for (const [ky, ds] of nhom) {
      if (ds.length < 3) continue
      if (ds.filter((e) => sach(e.textContent).length > 20).length < 3) continue
      const selCha = neo(cha)
      const sel = (selCha ? selCha + ' > ' : '') + ky
      if (daXet.has(sel)) continue
      daXet.add(sel)
      let so = 0
      try {
        so = document.querySelectorAll(sel).length
      } catch {
        continue
      }
      if (so < 3) continue
      // Xếp hạng theo số lượng NHÂN độ dài chữ trung bình: danh sách thật thì
      // mỗi dòng nhiều chữ, còn mấy dải nav/tag/số trang thì đông mà chữ ngắn.
      const trungBinh = ds.reduce((n, e) => n + sach(e.textContent).length, 0) / ds.length
      ra.push({
        sel,
        so,
        kieu: 'nhóm lặp',
        chuTb: Math.round(trungBinh),
        diem: so * Math.min(trungBinh, 300),
        mau: sach(ds[0].textContent).slice(0, 70),
      })
    }
  }
  return ra
    .sort((a, b) =>
      a.kieu === 'table' ? -1 : b.kieu === 'table' ? 1 : (b.diem ?? 0) - (a.diem ?? 0),
    )
    .slice(0, 8)
}

/**
 * Phân trang chỉ có LINK SỐ TRANG, không có nút "sau" — kiểu 1 2 3 4 › hoặc
 * 1 2 3 4 trơn. Cần biết vì lúc đó điều kiện dừng phải làm kiểu khác.
 */
const ungVienSoTrangLink = () => {
  const ra = []
  for (const cha of document.querySelectorAll('body *')) {
    if (cha.children.length < 3 || cha.children.length > 30) continue
    const con = [...cha.children].filter((c) => /^(a|button|li|span)$/i.test(c.tagName))
    if (con.length < 3) continue
    const so = con.map((c) => sach(c.textContent)).filter((t) => /^\\d{1,4}$/.test(t))
    if (so.length < 3) continue
    // phải là dãy liên tiếp 1,2,3… mới coi là số trang
    const n = so.map(Number).sort((a, b) => a - b)
    if (!n.every((x, i) => i === 0 || x === n[i - 1] + 1)) continue
    const mauCon = con.find((c) => /^\\d{1,4}$/.test(sach(c.textContent)))
    ra.push({
      selKhung: neo(cha),
      selItem: neo(mauCon),
      cacSo: so,
      caoNhatThay: Math.max(...n),
    })
  }
  return ra.slice(0, 3)
}

const CHU_SAU = /^(next|next page|tiếp|tiep|sau|trang sau|kế|ke tiep|›|»|>|>>|→)$/i
const CHU_TRUOC = /(prev|previous|trước|truoc|‹|«|<|<<|←)/i
const DAU_SAU = /next|tiep|tiếp|sau|forward/i

/** Ứng viên nút "trang sau". */
const ungVienSau = () => {
  const ra = []
  const ds = document.querySelectorAll('a, button, li, span[role], input[type=button], input[type=submit]')
  for (const el of ds) {
    const chu = sach(el.textContent) || sach(el.value)
    const moTa = [
      el.className,
      el.id,
      el.getAttribute('rel') || '',
      el.getAttribute('aria-label') || '',
      el.getAttribute('title') || '',
      el.getAttribute('data-dt-idx') || '',
    ].join(' ')
    const khopChu = CHU_SAU.test(chu)
    const khopDau = DAU_SAU.test(moTa)
    if (!khopChu && !khopDau) continue
    if (CHU_TRUOC.test(chu) || /prev|previous|truoc|trước/i.test(moTa)) continue
    if (chu.length > 20) continue

    // BẪY: nút Previous và Next thường dùng CHUNG bộ class (demoqa là ví dụ), nên
    // selector class trỏ vào cả hai — mà engine luôn lấy .first(), tức là bấm
    // Previous mãi mãi. Phải kiểm phần tử đầu có đúng là nó không, không thì
    // chuyển sang selector Playwright thu hẹp được.
    const sel = neo(el)
    let soKhop = 0
    let viTri = -1
    try {
      const khop = [...document.querySelectorAll(sel)]
      soKhop = khop.length
      viTri = khop.indexOf(el)
    } catch {}
    const selAnToan =
      soKhop <= 1
        ? sel
        : /^[\\p{L}\\d ]{1,20}$/u.test(chu)
          ? 'text="' + chu + '"'
          : sel + ' >> nth=' + Math.max(viTri, 0)

    ra.push({
      sel,
      selAnToan,
      soKhop,
      viTri,
      the: el.tagName.toLowerCase(),
      chu: chu.slice(0, 20),
      cls: el.className || null,
      hien: hien(el),
      // ba kiểu "tắt nút" mà site hay dùng
      classDisabled: /\\b(disabled|inactive|off|is-disabled)\\b/i.test(el.className || ''),
      attrDisabled: el.disabled === true || el.hasAttribute('disabled'),
      ariaDisabled: el.getAttribute('aria-disabled'),
      href: el.getAttribute('href'),
      diem: (khopChu ? 2 : 0) + (khopDau ? 1 : 0) + (hien(el) ? 2 : 0),
    })
  }
  return ra.sort((a, b) => b.diem - a.diem).slice(0, 6)
}

const SO_TRANG_QUEN = [5, 10, 15, 20, 25, 30, 40, 50, 100, 200, 250, 500, 1000]

/** Ứng viên ô "số dòng mỗi trang". */
const ungVienSoDong = () => {
  const ra = []
  for (const sl of document.querySelectorAll('select')) {
    const op = [...sl.options].map((o) => ({ giaTri: o.value, chu: sach(o.textContent) }))
    if (op.length < 2) continue
    const soHoacTatCa = op.filter(
      (o) => /^\\d+$/.test(o.giaTri.trim()) || /^(-1|all|tất cả|tat ca)$/i.test(o.giaTri.trim()),
    )
    if (soHoacTatCa.length !== op.length) continue
    const so = op.map((o) => Number(o.giaTri)).filter((n) => Number.isFinite(n) && n > 0)
    if (!so.some((n) => SO_TRANG_QUEN.includes(n))) continue
    ra.push({
      kieu: 'select',
      sel: neo(sl),
      dangChon: sl.value,
      cacGiaTri: op.map((o) => o.giaTri),
      nhan: op.map((o) => o.chu),
      caoNhat: so.length ? String(Math.max(...so)) : null,
      // -1 / "All" nghĩa là lấy hết trong một lần
      coTatCa: op.find((o) => /^(-1|all|tất cả|tat ca)$/i.test(o.giaTri.trim()))?.giaTri ?? null,
      quanh: sach(sl.closest('label, div, span, form')?.textContent ?? '').slice(0, 60),
    })
  }
  // kiểu nút/link "10 | 50 | 100"
  for (const cha of document.querySelectorAll('body *')) {
    if (cha.children.length < 2 || cha.children.length > 8) continue
    const con = [...cha.children].filter((c) => /^(a|button|li|span)$/i.test(c.tagName))
    if (con.length < 2) continue
    const so = con.map((c) => sach(c.textContent)).filter((t) => /^\\d+$/.test(t))
    if (so.length !== con.length) continue
    const n = so.map(Number)
    if (!n.some((x) => SO_TRANG_QUEN.includes(x)) || Math.max(...n) < 20) continue
    ra.push({
      kieu: 'nút',
      sel: neo(cha),
      cacGiaTri: so,
      caoNhat: String(Math.max(...n)),
      quanh: sach(cha.textContent).slice(0, 60),
    })
  }
  return ra.slice(0, 5)
}

/** Ứng viên overlay "đang tải". */
const ungVienChoTai = () =>
  [
    ...document.querySelectorAll(
      '[class*=process],[class*=loading],[class*=Loading],[class*=spinner],[class*=loader],[id*=process],[id*=loading],[class*=skeleton]',
    ),
  ]
    .slice(0, 12)
    .map((el) => ({ sel: neo(el), hien: hien(el), cls: el.className?.slice?.(0, 60) ?? null }))

// "Showing 1 to 10 of 57 entries", "Kết quả 1 - 20 trong 1.234"
const RE_KHOANG =
  /(?:showing|kết quả|ket qua)\\s*[\\d.,]+\\s*(?:to|-|–|đến|den)\\s*[\\d.,]+\\s*(?:of|\\/|trên|tren|trong)\\s*([\\d.,]+)/i
// "1.234 văn bản", "57 entries"
const RE_DEM = /([\\d.,]{1,13})\\s*(entries|records|results|items|kết quả|ket qua|văn bản|van ban|dòng|mục)/i
// "Trang 1/62" — cho biết TỔNG SỐ TRANG, dùng được cho vòng lặp so-lan
const RE_SO_TRANG = /(?:trang|page)\\s*(\\d+)\\s*\\/\\s*(\\d+)/i

/** Ứng viên dòng "tổng số kết quả" — để đối chiếu bóc đủ hay chưa. */
const ungVienTong = () => {
  const ra = []
  for (const el of document.querySelectorAll('body *')) {
    if (el.children.length > 2) continue
    // Bỏ phần tử có form control bên trong: text của ô "10 25 50 100 entries per
    // page" khớp RE_DEM và cho ra "tổng = 102550100" — rác thuần.
    if (el.querySelector('select, option, input, textarea, button')) continue
    const t = sach(el.textContent)
    if (t.length > 120 || t.length < 5) continue

    const mTrang = t.match(RE_SO_TRANG)
    const mKhoang = t.match(RE_KHOANG)
    const mDem = t.match(RE_DEM)
    if (!mTrang && !mKhoang && !mDem) continue

    ra.push({
      sel: neo(el),
      chu: t,
      tong: ((mKhoang ?? mDem)?.[1] ?? '').replace(/[.,]/g, ''),
      tongTrang: mTrang?.[2] ?? null,
      // khớp kiểu "X đến Y trong Z" thì chắc chắn là dòng tổng, ưu tiên lên đầu
      chac: !!mKhoang,
    })
  }
  return ra.sort((a, b) => (b.chac ? 1 : 0) - (a.chac ? 1 : 0)).slice(0, 4)
}

/** Ứng viên "số trang đang xem" — dấu hiệu tốt nhất để chờ trang mới. */
const ungVienTrangHienTai = () => {
  const ra = []
  for (const el of document.querySelectorAll(
    '[class*=current],[class*=active],[class*=selected],[aria-current]',
  )) {
    const t = sach(el.textContent)
    if (!/^\\d{1,4}$/.test(t)) continue
    ra.push({ sel: neo(el), chu: t, cls: el.className?.slice?.(0, 60) ?? null, hien: hien(el) })
  }
  return ra.slice(0, 5)
}

/** Ảnh chụp trạng thái để so trước/sau khi bấm. */
const chupTrangThai = (selDong) => ({
  url: location.href,
  soDong: selDong ? document.querySelectorAll(selDong).length : 0,
  khoaDong: selDong
    ? [...document.querySelectorAll(selDong)].map((r) => sach(r.textContent)).join('|').slice(0, 4000)
    : '',
  trangHienTai: ungVienTrangHienTai().filter((x) => x.hien)[0]?.chu ?? null,
  tong: ungVienTong()[0]?.chu ?? null,
})
`

/** @param {import('playwright-core').Page} page */
const goiTrong = (page, bieuThuc, ...doiSo) =>
  page.evaluate(new Function('a', `${MA_DO}\nreturn (${bieuThuc})(a)`), doiSo[0])

// ── in báo cáo ───────────────────────────────────────────────────────────────

const gach = (t) => console.log(`\n${'━'.repeat(78)}\n${t}\n${'━'.repeat(78)}`)
const muc = (t) => console.log(`\n▸ ${t}`)

/**
 * Selector cho "nút trang sau lúc CHƯA bị tắt" — dùng làm điều kiện dừng.
 *
 * Không ghép `>> nth=` với `:not(...)` được: nth đếm trên tập ĐÃ lọc, mà ở trang
 * đầu thì Previous đang tắt còn Next thì không, nên chỉ số lệch một nhịp. Với
 * selector nhập nhằng thì thu hẹp bằng `:has-text()` của Playwright.
 *
 * @param {{ sel: string, the: string, chu: string, soKhop: number, viTri: number }} n
 * @param {string} pseudo ví dụ `:not(.disabled)`
 */
function chuaTat(n, pseudo) {
  if (n.soKhop <= 1) return `${n.sel}${pseudo}`
  if (/^[\p{L}\d ]{1,20}$/u.test(n.chu)) return `${n.the}${pseudo}:has-text("${n.chu}")`
  return `${n.sel}${pseudo} >> nth=${Math.max(n.viTri, 0)}`
}

async function main() {
  const { browser, tuSpawn, con } = await moBrowser()
  const ctx = browser.contexts()[0] ?? (await browser.newContext())
  const page = await ctx.newPage()
  await page.setViewportSize({ width: 1440, height: 900 }).catch(() => {})

  try {
    gach(`DÒ PHÂN TRANG\n${url}`)
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 })

    // ── 1. chờ danh sách thật xuất hiện ──────────────────────────────────────
    // Không chờ "có dòng nào" — nhiều site đặt sẵn một dòng "Loading…". Chờ tới
    // khi số dòng ĐỨNG YÊN qua 2 lần đo liền nhau.
    muc('Chờ danh sách ổn định')
    let dong = []
    let truocDo = -1
    for (let i = 0; i < 60; i++) {
      dong = await goiTrong(page, 'ungVienDong')
      const nay = dong[0]?.so ?? 0
      if (nay >= 2 && nay === truocDo) break
      truocDo = nay
      await page.waitForTimeout(500)
    }
    console.log(`  ổn định sau khi thấy ${dong[0]?.so ?? 0} dòng ở ứng viên đầu`)

    // Khu phân trang thường render SAU bảng (DataTables dựng bảng trước, thanh
    // trang sau) — không chờ thêm thì có lần dò ra 0 nút "trang sau".
    for (let i = 0; i < 20; i++) {
      const thu = await goiTrong(page, 'ungVienSau')
      if (thu.some((n) => n.hien)) break
      if (i === 19) console.log('  (chờ 10s vẫn chưa thấy nút phân trang nào đang hiện)')
      await page.waitForTimeout(500)
    }

    // ── 2. ứng viên ──────────────────────────────────────────────────────────
    const [nutSau, soDongMoiTrang, choTai, tong, trangHT, soTrangLink] = await Promise.all([
      goiTrong(page, 'ungVienSau'),
      goiTrong(page, 'ungVienSoDong'),
      goiTrong(page, 'ungVienChoTai'),
      goiTrong(page, 'ungVienTong'),
      goiTrong(page, 'ungVienTrangHienTai'),
      goiTrong(page, 'ungVienSoTrangLink'),
    ])

    muc(`Dòng của danh sách — ${dong.length} ứng viên`)
    dong.forEach((d, i) =>
      console.log(
        `  ${i === 0 ? '→' : ' '} ${d.sel}\n      ${d.so} dòng · ${d.kieu}${d.soO ? ` · ${d.soO} ô/dòng` : ''}` +
          (d.chuTb ? ` · ~${d.chuTb} ký tự/dòng` : '') +
          (d.tieuDe?.length ? `\n      tiêu đề: ${d.tieuDe.join(' | ')}` : '') +
          `\n      mẫu: ${d.mau}`,
      ),
    )
    const selDong = dong[0]?.sel ?? null

    muc(`Nút "trang sau" — ${nutSau.length} ứng viên`)
    nutSau.forEach((n, i) =>
      console.log(
        `  ${i === 0 ? '→' : ' '} ${n.selAnToan}  <${n.the}> "${n.chu}"  ${n.hien ? 'đang hiện' : 'ĐANG ẨN'}` +
          (n.selAnToan !== n.sel
            ? `\n      ⚠ "${n.sel}" khớp ${n.soKhop} phần tử (nút này là thứ ${n.viTri + 1}) — Previous/Next` +
              `\n        dùng chung class, engine lấy .first() nên phải thu hẹp như trên`
            : '') +
          (n.href ? `\n      href=${n.href.slice(0, 60)}` : '') +
          (n.classDisabled || n.attrDisabled || n.ariaDisabled === 'true'
            ? `\n      ĐANG BỊ TẮT ngay từ trang đầu: class=${n.classDisabled} attr=${n.attrDisabled} aria=${n.ariaDisabled}`
            : ''),
      ),
    )
    if (soTrangLink.length) {
      muc(`Dải link số trang — ${soTrangLink.length} ứng viên`)
      soTrangLink.forEach((s) =>
        console.log(
          `    khung ${s.selKhung}  ·  mỗi số: ${s.selItem}\n      thấy các số: ${s.cacSo.join(' ')}`,
        ),
      )
      if (!nutSau.length) {
        console.log('\n  ⚠ Site này KHÔNG có nút "trang sau", chỉ có link số trang.')
        console.log('    Engine KHÔNG thay biến trong selector (chỉ url/giaTri/chu/ma), nên bước "bam"')
        console.log('    không viết được selector kiểu a[data-page="{{LAP_SO}}"]. Cách chạy được:')
        console.log('    dùng "chay-js" — ma CÓ được thay biến — rồi tự tìm link mang số cần bấm:')
        console.log(
          `      [...document.querySelectorAll('${soTrangLink[0].selItem}')]\n` +
            `        .find(a => a.textContent.trim() === String(Number('{{LAP_SO}}') + 1))?.click()`,
        )
        console.log(`    Điều kiện dừng: lặp "so-lan" với soLan = số trang lớn nhất thấy được (${soTrangLink[0].caoNhatThay}).`)
      }
    }

    const chiMotTrang =
      nutSau[0] && (nutSau[0].classDisabled || nutSau[0].attrDisabled || nutSau[0].ariaDisabled === 'true')
    if (chiMotTrang) {
      console.log('\n  ⇒ Nút đã tắt sẵn ở trang đầu: danh sách này CHỈ CÓ MỘT TRANG.')
      console.log('    Không có gì để dò thêm — bỏ vòng lặp đi, chỉ cần một bước "lay-bang".')
    }

    muc(`Số dòng mỗi trang — ${soDongMoiTrang.length} ứng viên`)
    if (!soDongMoiTrang.length) console.log('  (không thấy — site này không cho đổi)')
    soDongMoiTrang.forEach((s, i) =>
      console.log(
        `  ${i === 0 ? '→' : ' '} ${s.sel}  (${s.kieu})\n      giá trị: ${s.cacGiaTri.join(', ')}` +
          `\n      đang chọn: ${s.dangChon ?? '?'} · CAO NHẤT: ${s.caoNhat}` +
          (s.coTatCa ? ` · có "tất cả" = ${s.coTatCa}` : '') +
          (s.quanh ? `\n      quanh đó: ${s.quanh}` : ''),
      ),
    )

    muc('Overlay "đang tải"')
    const choTaiThay = choTai.filter((c) => c.sel)
    if (!choTaiThay.length) console.log('  (không thấy)')
    choTaiThay.forEach((c) => console.log(`    ${c.sel} — lúc rảnh: ${c.hien ? 'ĐANG HIỆN' : 'ẩn'}`))

    muc('Tổng số kết quả (để đối chiếu bóc đủ chưa)')
    if (!tong.length) console.log('  (không thấy)')
    tong.forEach((t) =>
      console.log(
        `  ${t.chac ? '→' : ' '} ${t.sel} → "${t.chu}"` +
          (t.tong ? `\n      ⇒ tổng kết quả = ${t.tong}` : '') +
          (t.tongTrang ? `\n      ⇒ TỔNG SỐ TRANG = ${t.tongTrang} (dùng được cho vòng lặp "so-lan")` : ''),
      ),
    )

    muc('Số trang đang xem')
    if (!trangHT.length) console.log('  (không thấy)')
    trangHT.forEach((t) => console.log(`    ${t.sel} → "${t.chu}"  cls=${t.cls}`))

    // ── 3. thí nghiệm: bấm next thật rồi so DOM ──────────────────────────────
    let ketLuan = { kieu: 'khong-ro', dauHieu: null, urlDoi: false, spinner: null }
    if (nutSau[0]?.hien && selDong && !chiMotTrang) {
      muc(`Thí nghiệm: bấm ${nutSau[0].selAnToan}`)
      const truoc = await goiTrong(page, `(s) => chupTrangThai(s)`, selDong)
      console.log(`  trước: ${truoc.soDong} dòng · trang "${truoc.trangHienTai}" · ${truoc.url.slice(0, 70)}`)

      await page
        .locator(nutSau[0].selAnToan)
        .first()
        .click({ timeout: 15_000 })
        .catch((e) => {
          console.log(`  (không bấm được: ${e.message.split('\n')[0]})`)
        })

      // lấy mẫu overlay 50ms/lần để biết nó sống bao lâu
      const selSpinner = choTaiThay.map((c) => c.sel)
      const mau = []
      for (let i = 0; i < 30; i++) {
        mau.push(
          await page
            .evaluate(
              (ds) =>
                ds
                  .map((s) => {
                    const el = document.querySelector(s)
                    if (!el) return '·'
                    const st = getComputedStyle(el)
                    return st.display !== 'none' && st.visibility !== 'hidden' ? 'H' : '·'
                  })
                  .join(''),
              selSpinner,
            )
            .catch(() => '?'),
        )
        await page.waitForTimeout(50)
      }
      if (selSpinner.length) {
        const songDay = selSpinner
          .map((s, i) => ({ s, so: mau.filter((m) => m[i] === 'H').length }))
          .filter((x) => x.so > 0)
        ketLuan.spinner = songDay[0] ?? null
        console.log(
          songDay.length
            ? `  overlay có hiện: ${songDay.map((x) => `${x.s} (~${x.so * 50}ms)`).join(', ')}`
            : '  overlay KHÔNG hề hiện trong 1,5s sau khi bấm → đừng dùng nó làm dấu hiệu chờ',
        )
      }

      await page.waitForTimeout(1200)
      const sau = await goiTrong(page, `(s) => chupTrangThai(s)`, selDong)
      console.log(`  sau:   ${sau.soDong} dòng · trang "${sau.trangHienTai}" · ${sau.url.slice(0, 70)}`)

      ketLuan.urlDoi = truoc.url !== sau.url
      const doiKhoa = truoc.khoaDong !== sau.khoaDong
      const doiTrang = truoc.trangHienTai !== sau.trangHienTai && sau.trangHienTai !== null
      const doiTong = truoc.tong !== sau.tong && sau.tong !== null

      if (ketLuan.urlDoi) {
        // Lấy mẫu URL từ URL THẬT sau khi bấm, thay số cuối bằng {{LAP_SO}} —
        // chắc hơn đoán `?page=` vì mỗi site đặt tên tham số một kiểu
        // (page_num, p, trang, start…).
        const m = sau.url.match(/(\d+)(?!.*\d)/)
        ketLuan.urlSau = sau.url
        ketLuan.mauUrl = m
          ? sau.url.slice(0, m.index) + '{{LAP_SO}}' + sau.url.slice(m.index + m[1].length)
          : null
      }

      muc('Kết luận')
      console.log(`  URL đổi:           ${ketLuan.urlDoi ? 'CÓ → dùng mo-trang + {{LAP_SO}}' : 'không → AJAX'}`)
      if (ketLuan.mauUrl) {
        console.log(`      URL trang sau:  ${ketLuan.urlSau}`)
        console.log(`      mẫu suy ra:     ${ketLuan.mauUrl}`)
        console.log(`      ⚠ kiểm mốc đếm: lượt 1 sẽ mở ${ketLuan.mauUrl.replace('{{LAP_SO}}', '1')}`)
      }
      console.log(
        `  nội dung dòng đổi: ${
          doiKhoa ? 'CÓ' : ketLuan.urlDoi ? 'không (URL đã đổi nên không cần xét)' : 'KHÔNG (⚠ bấm không ăn?)'
        }`,
      )
      console.log(`  số trang đổi:      ${doiTrang ? `CÓ (${truoc.trangHienTai} → ${sau.trangHienTai})` : 'không'}`)
      console.log(`  dòng tổng đổi:     ${doiTong ? `CÓ ("${sau.tong}")` : 'không'}`)

      // ưu tiên dấu hiệu KHẲNG ĐỊNH (biết chắc đang ở trang mấy) hơn là "có gì đó đổi"
      if (ketLuan.urlDoi) ketLuan.kieu = 'url'
      else if (doiTrang) {
        ketLuan.kieu = 'so-trang'
        ketLuan.dauHieu = trangHT.filter((x) => x.hien)[0]?.sel ?? null
      } else if (doiTong) {
        ketLuan.kieu = 'dong-tong'
        ketLuan.dauHieu = tong[0]?.sel ?? null
      } else if (doiKhoa) {
        ketLuan.kieu = 'khoa-dong'
        ketLuan.dauHieu = selDong
      }
      console.log(`  ⇒ dấu hiệu chờ nên dùng: ${ketLuan.kieu}${ketLuan.dauHieu ? ` trên ${ketLuan.dauHieu}` : ''}`)
    } else {
      muc('Bỏ qua thí nghiệm bấm')
      console.log(
        chiMotTrang
          ? '  nút "trang sau" đã tắt sẵn → chỉ một trang, không có gì để so'
          : '  không tìm được nút "trang sau" đang hiện, hoặc không có selector dòng',
      )
    }

    // ── 4. ở trang cuối, nút next "tắt" bằng cách gì? ────────────────────────
    muc('Cách nút "trang sau" bị tắt ở trang cuối')
    let kieuTat = null
    if (nutSau[0]) {
      const sel = nutSau[0].selAnToan
      for (let i = 0; i < 40; i++) {
        const con = await page.locator(sel).count().catch(() => 0)
        if (con === 0) {
          kieuTat = { kieu: 'mat', dungKhi: sel }
          break
        }
        const tt = await page
          .locator(sel)
          .first()
          .evaluate((el) => {
            const st = getComputedStyle(el)
            // trả về ĐÚNG tên class đã bật, vì mỗi site gọi một kiểu:
            // disabled / inactive / off / is-disabled…
            const clsTat = [...el.classList].find((c) =>
              /^(disabled|inactive|off|is-disabled|dt-paging-button-disabled)$/i.test(c),
            )
            return {
              mat: false,
              an: st.display === 'none' || st.visibility === 'hidden',
              cls: clsTat ?? null,
              attr: el.disabled === true || el.hasAttribute('disabled'),
              aria: el.getAttribute('aria-disabled'),
            }
          })
          .catch(() => null)
        if (!tt) break
        if (tt.mat) {
          kieuTat = { kieu: 'mat', dungKhi: sel }
          break
        }
        if (tt.an) {
          kieuTat = { kieu: 'an', dungKhi: sel }
          break
        }
        if (tt.cls) {
          kieuTat = { kieu: 'class', tenClass: tt.cls, dungKhi: chuaTat(nutSau[0], `:not(.${tt.cls})`) }
          break
        }
        if (tt.attr) {
          kieuTat = { kieu: 'attr', dungKhi: chuaTat(nutSau[0], ':not([disabled])') }
          break
        }
        if (tt.aria === 'true') {
          kieuTat = { kieu: 'aria', dungKhi: chuaTat(nutSau[0], ':not([aria-disabled="true"])') }
          break
        }
        const bam = await page
          .locator(sel)
          .first()
          .click({ timeout: 8000 })
          .then(() => true)
          .catch(() => false)
        if (!bam) break
        await page.waitForTimeout(700)
      }
    }
    if (kieuTat) {
      const giaiThich = {
        mat: 'phần tử BIẾN MẤT khỏi DOM',
        an: 'phần tử còn đó nhưng bị ẩn',
        class: `phần tử CÒN ĐÓ, chỉ thêm class "${kieuTat.tenClass}" ⚠ phải dùng :not(.${kieuTat.tenClass})`,
        attr: 'phần tử còn đó, thêm thuộc tính disabled',
        aria: 'phần tử còn đó, chỉ đổi aria-disabled="true"',
      }[kieuTat.kieu]
      console.log(`  ${giaiThich}`)
      console.log(`  ⇒ dungKhi: { selector: '${kieuTat.dungKhi}', dieuKien: 'vang-mat' }`)

      // Tự nghiệm lại điều kiện dừng ở CẢ HAI trạng thái. Sai một chiều là kịch
      // bản hoặc dừng ngay lượt đầu, hoặc chạy tới trần toiDa — đều im lặng.
      const hienOCuoi = await page.locator(kieuTat.dungKhi).first().isVisible().catch(() => false)
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 })
      await page.waitForTimeout(2000)
      const hienODau = await page.locator(kieuTat.dungKhi).first().isVisible().catch(() => false)
      console.log(
        `  tự nghiệm: ở trang cuối ${hienOCuoi ? 'CÒN thấy ⚠' : 'không thấy ✓'} · ` +
          `ở trang đầu ${hienODau ? 'thấy ✓' : 'KHÔNG thấy ⚠'}`,
      )
      if (chiMotTrang && !hienOCuoi && !hienODau) {
        // Danh sách một trang thì "trang đầu cũng không thấy" là ĐÚNG, không phải lỗi
        console.log('  (danh sách chỉ có 1 trang nên trang đầu = trang cuối — kết quả này là đúng)')
        kieuTat.dangTin = true
      } else if (hienOCuoi || !hienODau) {
        console.log('  ⚠ điều kiện dừng này KHÔNG đáng tin — sửa tay trước khi chạy kịch bản')
        kieuTat.dangTin = false
      } else {
        kieuTat.dangTin = true
      }
    } else {
      console.log('  không xác định được sau 40 lượt bấm — danh sách quá dài, tự kiểm ở trang cuối')
    }

    // ── 5. thử đặt số dòng mỗi trang lên cao nhất ────────────────────────────
    muc('Thử đặt số dòng mỗi trang lên CAO NHẤT')
    let goiYSoDong = null
    if (soDongMoiTrang[0]?.kieu === 'select' && soDongMoiTrang[0].caoNhat) {
      const s = soDongMoiTrang[0]
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 })
      await page.waitForTimeout(1500)
      const truocDong = await page.locator(selDong).count().catch(() => 0)
      const dat = s.coTatCa ?? s.caoNhat
      const ok = await page
        .locator(s.sel)
        .first()
        .selectOption(dat)
        .then(() => true)
        .catch((e) => {
          console.log(`  không chọn được: ${e.message.split('\n')[0]}`)
          return false
        })
      if (ok) {
        await page.waitForTimeout(2500)
        const sauDong = await page.locator(selDong).count().catch(() => 0)
        const tongMoi = await goiTrong(page, 'ungVienTong')
        console.log(`  chọn "${dat}" → ${truocDong} dòng/trang thành ${sauDong} dòng/trang`)
        if (tongMoi[0]) console.log(`  dòng tổng giờ ghi: "${tongMoi[0].chu}"`)
        if (sauDong > truocDong) {
          const tongSo = Number(tongMoi[0]?.tong || tong[0]?.tong || 0)
          const soTrang = tongSo && sauDong ? Math.ceil(tongSo / sauDong) : null
          console.log(
            `  ⇒ NÊN DÙNG: thêm bước "chon" ${s.sel} = ${dat} ngay sau khi mở trang` +
              (soTrang ? `\n     ${tongSo} kết quả / ${sauDong} mỗi trang = ${soTrang} lượt lặp (trước là ${Math.ceil(tongSo / (truocDong || 1))})` : ''),
          )
          goiYSoDong = { sel: s.sel, giaTri: dat }
        } else {
          console.log('  ⚠ số dòng KHÔNG tăng — site có thể chặn giá trị này, cứ để mặc định')
        }
      }
    } else if (soDongMoiTrang[0]?.kieu === 'nút') {
      console.log(`  ô này là nút/link chứ không phải <select> → dùng bước "bam" vào ${soDongMoiTrang[0].sel}`)
      console.log(`  các giá trị: ${soDongMoiTrang[0].cacGiaTri.join(', ')} → cao nhất ${soDongMoiTrang[0].caoNhat}`)
    } else {
      console.log('  (không có ô nào để đổi)')
    }

    // ── 6. kịch bản gợi ý ────────────────────────────────────────────────────
    const kb = dungKichBan({ url, selDong, dong: dong[0], nutSau: nutSau[0], kieuTat, ketLuan, goiYSoDong })
    gach('KỊCH BẢN GỢI Ý')
    console.log(JSON.stringify(kb, null, 2))

    if (LUU) {
      const duong = join(process.cwd(), 'kich-ban', LUU.endsWith('.json') ? LUU : `${LUU}.json`)
      writeFileSync(duong, JSON.stringify(kb, null, 2), 'utf8')
      console.log(`\n✓ đã lưu → ${duong}`)
      console.log('  Mở app, chọn kịch bản này, kiểm lại 3 selector rồi bấm Chạy.')
    } else {
      console.log('\n(thêm --luu ten-file.json để ghi thẳng vào thư mục kich-ban/)')
    }
  } finally {
    await page.close().catch(() => {})
    if (tuSpawn && !GIU) {
      await browser.close().catch(() => {})
      con?.kill()
    } else {
      await browser.close().catch(() => {}) // chỉ ngắt CDP, cửa sổ giữ nguyên
    }
  }
}

/** Dựng JSON kịch bản từ những gì dò được. */
function dungKichBan({ url, selDong, dong, nutSau, kieuTat, ketLuan, goiYSoDong }) {
  const cot = dong?.tieuDe?.length
    ? dong.tieuDe.map((t, i) => ({
        ten:
          t
            .toLowerCase()
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_|_$/g, '') || `cot_${i + 1}`,
        selector: `td:nth-child(${i + 1})`,
        nguon: { kieu: 'text' },
      }))
    : [{ ten: 'noi_dung', nguon: { kieu: 'text' } }]

  const layBang = (id, nhan) => ({
    id,
    nhan,
    hanhDong: { loai: 'lay-bang', ten: 'danh_sach', selectorDong: selDong ?? '', cot },
  })

  const buoc = [
    {
      id: 'p1',
      nhan: 'Mở trang danh sách',
      hanhDong: { loai: 'mo-trang', url, choSelector: selDong ?? 'body' },
    },
    {
      id: 'p2',
      nhan: 'Chờ dữ liệu thật về',
      hanhDong: { loai: 'cho', selector: selDong ?? 'body', trangThai: 'hien', ms: 800 },
    },
  ]

  if (goiYSoDong) {
    buoc.push({
      id: 'p3',
      nhan: `Đặt số dòng mỗi trang = ${goiYSoDong.giaTri} (ít lượt lặp hơn = nhanh hơn)`,
      hanhDong: { loai: 'chon', selector: goiYSoDong.sel, giaTri: goiYSoDong.giaTri },
    })
    buoc.push({ id: 'p4', nhan: 'Chờ nạp lại theo số dòng mới', hanhDong: { loai: 'cho', ms: 1500 } })
  }

  // Phân trang bằng URL thì không cần vòng lặp "cho-den-khi" — mo-trang từng trang
  // chắc tay hơn hẳn, vì mỗi lượt là một page-load thật, không có race nào.
  if (ketLuan.kieu === 'url') {
    buoc.push({
      id: 'p5',
      nhan: '⚠ URL đổi khi sang trang — thay {{LAP_SO}} vào URL rồi đặt soLan = số trang',
      hanhDong: {
        loai: 'lap',
        kieu: 'so-lan',
        soLan: 10,
        buoc: [
          {
            id: 'p5a',
            nhan: ketLuan.mauUrl
              ? 'Mở trang thứ {{LAP_SO}} (mẫu URL lấy từ cú bấm thật — kiểm lại mốc đếm)'
              : 'Mở trang thứ {{LAP_SO}} — SỬA URL NÀY cho khớp mẫu phân trang',
            hanhDong: {
              loai: 'mo-trang',
              url: ketLuan.mauUrl ?? `${url}?page={{LAP_SO}}`,
              choSelector: selDong ?? 'body',
            },
          },
          layBang('p5b', 'Bóc trang {{LAP_SO}}'),
        ],
      },
    })
    return { ten: `Dò tự động — ${new URL(url).hostname}`, moTa: 'Kịch bản gợi ý do scripts/do-phan-trang.mjs sinh ra. Phân trang đổi URL: sửa mẫu URL cho khớp rồi đặt soLan.', buoc }
  }

  // AJAX: bóc trang đầu ngoài vòng lặp, trong lặp thì BẤM RỒI MỚI BÓC — nếu bóc
  // trước bấm sau, engine kiểm dungKhi đầu mỗi lượt sẽ dừng trước khi trang cuối
  // được bóc.
  buoc.push(layBang('p5', 'Bóc trang đầu (ngoài vòng lặp)'))

  // selAnToan, không phải sel: nếu Previous/Next dùng chung class thì sel trỏ vào
  // cả hai và engine lấy .first() → bấm Previous mãi.
  const selSau = nutSau?.selAnToan ?? nutSau?.sel ?? ''

  // Có dấu hiệu KHẲNG ĐỊNH (biết chắc phải sang trang số mấy) thì tách được
  // "bấm" và "chờ" thành 2 bước — thấy được spotlight lúc bấm.
  //
  // Không có thì phải so nội dung trước/sau, và lúc đó cú bấm BUỘC phải nằm
  // trong cùng bước JS: nếu bấm ở bước riêng, tới lúc bước chờ đọc "nội dung
  // trước" thì trang mới có thể đã về rồi → so cái mới với cái mới, chờ vô ích.
  const buocLap =
    ketLuan.kieu === 'so-trang' && ketLuan.dauHieu
      ? [
          {
            id: 'p6a',
            nhan: 'Bấm trang sau',
            hanhDong: { loai: 'bam', selector: selSau, choDieuHuong: false },
          },
          {
            id: 'p6b',
            nhan: 'Chờ tới khi đúng trang {{LAP_SO}}+1 đã hiện',
            hanhDong: {
              loai: 'chay-js',
              ma:
                `return (async () => {\n` +
                `  const dich = String(Number('{{LAP_SO}}') + 1)\n` +
                `  for (let i = 0; i < 300; i++) {\n` +
                `    const trang = document.querySelector('${ketLuan.dauHieu}')?.textContent.trim()\n` +
                `    if (trang === dich) return 'đã sang trang ' + dich\n` +
                `    await new Promise((r) => setTimeout(r, 100))\n` +
                `  }\n` +
                `  throw new Error('30s mà vẫn chưa sang trang ' + dich)\n` +
                `})()`,
            },
          },
          layBang('p6c', 'Bóc trang vừa mở (nối thêm)'),
        ]
      : [
          {
            id: 'p6a',
            nhan: 'Bấm trang sau RỒI chờ nội dung đổi (gộp một bước để không hụt mốc so sánh)',
            hanhDong: {
              loai: 'chay-js',
              ma:
                `return (async () => {\n` +
                `  const khoa = () => [...document.querySelectorAll('${selDong}')].map((r) => r.textContent).join('|')\n` +
                `  const truoc = khoa()\n` +
                // trong trang chỉ có querySelector thuần, không hiểu selector
                // Playwright — nên nhập nhằng thì lấy theo chỉ số
                `  ${
                  (nutSau?.soKhop ?? 1) > 1
                    ? `document.querySelectorAll('${nutSau.sel}')[${Math.max(nutSau.viTri, 0)}]?.click()`
                    : `document.querySelector('${nutSau?.sel ?? ''}')?.click()`
                }\n` +
                `  for (let i = 0; i < 300; i++) {\n` +
                `    await new Promise((r) => setTimeout(r, 100))\n` +
                `    const nay = khoa()\n` +
                `    if (nay && nay !== truoc) {\n` +
                `      await new Promise((r) => setTimeout(r, 150))\n` +
                `      if (khoa() === nay) return 'nội dung đã đổi'\n` +
                `    }\n` +
                `  }\n` +
                `  throw new Error('30s mà nội dung không đổi')\n` +
                `})()`,
            },
          },
          layBang('p6b', 'Bóc trang vừa mở (nối thêm)'),
        ]

  buoc.push({
    id: 'p6',
    nhan: 'Lặp: sang trang sau rồi bóc, tới khi hết trang',
    hanhDong: {
      loai: 'lap',
      kieu: 'cho-den-khi',
      toiDa: 200,
      dungKhi: { selector: kieuTat?.dungKhi ?? selSau, dieuKien: 'vang-mat' },
      buoc: buocLap,
    },
  })

  return {
    ten: `Dò tự động — ${new URL(url).hostname}`,
    moTa:
      'Kịch bản gợi ý do scripts/do-phan-trang.mjs sinh ra. ' +
      (kieuTat
        ? `Nút trang sau ở trang cuối: ${kieuTat.kieu}. `
        : 'CHƯA xác định được cách nút trang sau bị tắt — kiểm lại dungKhi. ') +
      `Dấu hiệu chờ: ${ketLuan.kieu}.`,
    buoc,
  }
}

main().catch((e) => {
  console.error('\n✗ Lỗi:', e.message)
  process.exit(1)
})
