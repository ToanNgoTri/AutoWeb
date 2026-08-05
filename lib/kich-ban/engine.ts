import type { Page } from 'playwright-core'
import { getPage } from '../tvpl/browser'
import { Tempo } from '../tvpl/pace'
import type { Pace } from '../tvpl/types'
import { moTaBuoc, type Buoc, type CotDuLieu, type KichBan, type Nguon } from './loai'
import type { Emit, KetQuaChay } from './su-kien'

/** Trang chặn của Cloudflare (bản tiếng Anh và tiếng Việt). */
const CHAN_BOT = /just a moment|chờ một chút|checking|attention required|xác minh/i
const NHAC_NGUOI_SAU = 20
const CHO_TOI_DA = 180

/** Chỉ cho 1 phiên chạy cùng lúc — Cloudflare rất nhạy với request song song. */
const g = globalThis as typeof globalThis & { __kbBusy?: boolean }

export class DangChayError extends Error {
  constructor() {
    super('Đang có một kịch bản khác chạy. Chờ nó xong đã.')
  }
}

/** Thay {{TEN_BIEN}} bằng process.env.TEN_BIEN — để mật khẩu không nằm trong file kịch bản. */
function thayBien(s: string): string {
  return s.replace(/\{\{\s*([A-Z0-9_]+)\s*\}\}/g, (khop, ten) => process.env[ten] ?? khop)
}

/** Che giá trị bí mật khi ghi log. */
function cheBiMat(goc: string, daThay: string): string {
  return goc === daThay ? daThay : '••••••'
}

export async function chayKichBan(
  kb: KichBan,
  emit: Emit,
  { pace = 'cham' as Pace }: { pace?: Pace } = {},
): Promise<KetQuaChay> {
  if (g.__kbBusy) throw new DangChayError()
  g.__kbBusy = true

  const t = new Tempo(pace)
  const batDau = new Date().toISOString()
  const bang: KetQuaChay['bang'] = {}
  const giaTri: KetQuaChay['giaTri'] = {}
  let dungTicker: (() => void) | undefined

  try {
    const page = await getPage()
    await page.bringToFront().catch(() => {})
    dungTicker = batDauChupLienTuc(page, emit, t.cfg.shotMs)

    const buocDung = kb.buoc.filter((b) => !b.tat)

    for (let i = 0; i < buocDung.length; i++) {
      const b = buocDung[i]
      const nhan = moTaBuoc(b)
      const baoTrangThai = (trangThai: 'dang-chay' | 'xong' | 'loi' | 'bo-qua', chiTiet?: string) =>
        emit({ type: 'buoc', index: i, nhan, trangThai, chiTiet })

      baoTrangThai('dang-chay')
      try {
        const chiTiet = await chayMotBuoc(page, b, nhan, t, emit, bang, giaTri)
        baoTrangThai('xong', chiTiet)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (b.boQuaLoi) {
          baoTrangThai('bo-qua', msg.split('\n')[0].slice(0, 160))
          emit({ type: 'log', msg: `Bước ${i + 1} lỗi nhưng được đánh dấu bỏ qua: ${msg.split('\n')[0]}` })
          continue
        }
        baoTrangThai('loi', msg.split('\n')[0].slice(0, 200))
        throw err
      }
    }

    await chup(page, emit)

    return {
      tenKichBan: kb.ten,
      batDau,
      ketThuc: new Date().toISOString(),
      urlCuoi: page.url(),
      bang,
      giaTri,
    }
  } finally {
    dungTicker?.()
    g.__kbBusy = false
  }
}

async function chayMotBuoc(
  page: Page,
  b: Buoc,
  nhan: string,
  t: Tempo,
  emit: Emit,
  bang: KetQuaChay['bang'],
  giaTri: KetQuaChay['giaTri'],
): Promise<string | undefined> {
  const a = b.hanhDong

  switch (a.loai) {
    case 'mo-trang': {
      const url = thayBien(a.url)
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
      const moc = a.choSelector?.trim()
      if (moc) {
        const giay = await vuotChanBot(page, moc, emit)
        return giay <= 1 ? page.url() : `${page.url()} (chờ ${giay}s)`
      }
      return page.url()
    }

    case 'cho': {
      if (a.selector?.trim()) {
        await t.spotlight(page, a.selector, nhan)
        await page
          .locator(a.selector)
          .first()
          .waitFor({ state: a.trangThai === 'an' ? 'hidden' : 'visible', timeout: 60_000 })
        await t.xoaSpotlight(page)
      }
      if (a.ms) await page.waitForTimeout(a.ms)
      return undefined
    }

    case 'dien': {
      const thoGiaTri = a.giaTri
      const giaTriThat = thayBien(thoGiaTri)
      await t.spotlight(page, a.selector, nhan)
      const o = page.locator(a.selector).first()
      await o.click()
      await o.fill('')
      if (a.tungKyTu) await o.pressSequentially(giaTriThat, { delay: t.cfg.typeDelay })
      else await o.fill(giaTriThat)
      await t.nghi(page, 350)
      if (a.enterSauKhiXong) {
        await o.press('Enter')
        await t.nghi(page, 400)
      }
      await t.xoaSpotlight(page)
      return cheBiMat(thoGiaTri, giaTriThat)
    }

    case 'chon': {
      await t.spotlight(page, a.selector, nhan)
      const daChon = await page.selectOption(a.selector, thayBien(a.giaTri))
      await t.nghi(page, 700)
      await t.xoaSpotlight(page)
      return `value=${daChon.join(',')}`
    }

    case 'bam': {
      await t.spotlight(page, a.selector, nhan)
      if (a.choDieuHuong) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => {}),
          page.locator(a.selector).first().click({ timeout: 30_000 }),
        ])
        await t.xoaSpotlight(page)
        return page.url()
      }
      await page.locator(a.selector).first().click({ timeout: 30_000 })
      await t.nghi(page, 500)
      await t.xoaSpotlight(page)
      return undefined
    }

    case 'nhan-phim': {
      if (a.selector?.trim()) {
        await t.spotlight(page, a.selector, nhan)
        await page.locator(a.selector).first().press(a.phim)
        await t.xoaSpotlight(page)
      } else {
        await page.keyboard.press(a.phim)
      }
      await t.nghi(page, 400)
      return a.phim
    }

    case 'cuon-den': {
      await page.locator(a.selector).first().scrollIntoViewIfNeeded({ timeout: 30_000 })
      await t.spotlight(page, a.selector, nhan)
      await t.xoaSpotlight(page)
      return undefined
    }

    case 'khang-dinh': {
      const o = page.locator(a.selector).first()
      let dat: boolean
      let thucTe = ''
      if (a.dieuKien === 'co-mat') {
        dat = await o.isVisible().catch(() => false)
      } else if (a.dieuKien === 'vang-mat') {
        dat = !(await o.isVisible().catch(() => false))
      } else {
        thucTe = ((await o.textContent().catch(() => '')) ?? '').replace(/\s+/g, ' ').trim()
        dat = thucTe.toLowerCase().includes((a.chu ?? '').toLowerCase())
      }
      if (dat) return 'đạt'
      const msg = `Khẳng định KHÔNG đạt: ${nhan}${thucTe ? ` — thực tế: "${thucTe.slice(0, 160)}"` : ''}`
      if (a.batBuoc) throw new Error(msg)
      emit({ type: 'log', msg })
      return 'không đạt (không bắt buộc)'
    }

    case 'lay-bang': {
      await page.locator(a.selectorDong).first().waitFor({ state: 'visible', timeout: 60_000 })
      await t.spotlight(page, a.selectorDong, nhan)
      const dong = await page.evaluate(bocBang, {
        selectorDong: a.selectorDong,
        cot: a.cot,
        gioiHan: a.gioiHan ?? 0,
      })
      await t.xoaSpotlight(page)
      bang[a.ten] = dong
      return `${dong.length} dòng × ${a.cot.length} cột`
    }

    case 'lay-mot': {
      await t.spotlight(page, a.selector, nhan)
      const v = await page.evaluate(bocMot, { selector: a.selector, nguon: a.nguon, regex: a.regex })
      await t.xoaSpotlight(page)
      giaTri[a.ten] = v
      return v === null ? '(không thấy)' : String(v).slice(0, 120)
    }

    case 'chay-js': {
      // Cửa sau có chủ ý: chạy JS của bạn trong ngữ cảnh trang.
      const v = await page.evaluate(
        (ma) => new Function(ma)(),
        a.ma,
      )
      if (a.ten) giaTri[a.ten] = v
      return typeof v === 'object' ? JSON.stringify(v).slice(0, 160) : String(v).slice(0, 160)
    }
  }
}

/** Chạy trong trang: bóc nhiều dòng thành bảng. */
function bocBang({
  selectorDong,
  cot,
  gioiHan,
}: {
  selectorDong: string
  cot: CotDuLieu[]
  gioiHan: number
}) {
  const sach = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim()

  const layTu = (el: Element, nguon: Nguon): string | null => {
    if (nguon.kieu === 'text') return sach(el.textContent)
    if (nguon.kieu === 'html') return el.innerHTML
    return el.getAttribute(nguon.ten)
  }

  let dsDong = [...document.querySelectorAll(selectorDong)]
  if (gioiHan > 0) dsDong = dsDong.slice(0, gioiHan)

  return dsDong.map((dong) => {
    const hang: Record<string, string | null> = {}
    for (const c of cot) {
      const dich = c.selector?.trim() ? dong.querySelector(c.selector) : dong
      let v = dich ? layTu(dich, c.nguon) : null
      if (v !== null && c.regex?.trim()) {
        try {
          const m = v.match(new RegExp(c.regex))
          v = m ? (m[1] ?? m[0]) : null
        } catch {
          // regex sai cú pháp → giữ giá trị thô
        }
      }
      hang[c.ten] = v
    }
    return hang
  })
}

/** Chạy trong trang: bóc một giá trị đơn. */
function bocMot({ selector, nguon, regex }: { selector: string; nguon: Nguon; regex?: string }) {
  const el = document.querySelector(selector)
  if (!el) return null
  let v: string | null
  if (nguon.kieu === 'text') v = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
  else if (nguon.kieu === 'html') v = el.innerHTML
  else v = el.getAttribute(nguon.ten)
  if (v !== null && regex?.trim()) {
    try {
      const m = v.match(new RegExp(regex))
      v = m ? (m[1] ?? m[0]) : null
    } catch {
      /* regex sai cú pháp → giữ nguyên */
    }
  }
  return v
}

/**
 * Chờ vượt trang chặn bot. Quá NHAC_NGUOI_SAU giây thì nhờ người bấm tay
 * nhưng vẫn tiếp tục chờ, không bỏ cuộc. Trả về số giây đã chờ.
 */
async function vuotChanBot(page: Page, moc: string, emit: Emit): Promise<number> {
  let daNhac = false
  for (let s = 0; s < CHO_TOI_DA; s++) {
    const tieuDe = await page.title().catch(() => '')
    const co = await page.locator(moc).count().catch(() => 0)
    const bibchan = CHAN_BOT.test(tieuDe)
    if (!bibchan && co > 0) return s

    if (bibchan && s >= NHAC_NGUOI_SAU && !daNhac) {
      daNhac = true
      emit({
        type: 'can-nguoi',
        msg: 'Trang đang đòi xác minh người thật. Bấm vào ô xác minh trong cửa sổ Chrome — kịch bản vẫn đang chờ bạn.',
      })
    }
    if (s === 0) emit({ type: 'log', msg: bibchan ? `Bị chặn bot ("${tieuDe}")…` : 'Đang chờ trang render…' })
    else if (s % 10 === 0) emit({ type: 'log', msg: `…vẫn đang chờ (${s}s), tiêu đề: "${tieuDe}"` })
    await page.waitForTimeout(1000)
  }
  throw new Error(`Chờ ${CHO_TOI_DA}s mà không thấy "${moc}". Trang có thể vẫn bị chặn bot.`)
}

async function chup(page: Page, emit: Emit) {
  try {
    const buf = await page.screenshot({ type: 'jpeg', quality: 45, timeout: 5_000 })
    emit({ type: 'shot', jpegBase64: buf.toString('base64') })
  } catch {
    // đang điều hướng hoặc chưa vẽ xong — bỏ khung này
  }
}

function batDauChupLienTuc(page: Page, emit: Emit, moiMs: number) {
  let song = true
  ;(async () => {
    while (song) {
      await chup(page, emit)
      await new Promise((r) => setTimeout(r, moiMs))
    }
  })()
  return () => {
    song = false
  }
}
