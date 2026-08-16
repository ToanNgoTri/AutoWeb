import { getPage } from '../tvpl/browser'
import { Tempo } from '../tvpl/pace'
import { khopMauUrl, moTaBuoc, moTaDauHieu } from './loai'

/**
 * @typedef {import('../tvpl/types').Pace} Pace
 * @typedef {import('./loai').Buoc} Buoc
 * @typedef {import('./loai').DauHieu} DauHieu
 * @typedef {import('./loai').DieuKienChay} DieuKienChay
 * @typedef {import('./loai').KichBan} KichBan
 * @typedef {import('./loai').PhucHoi} PhucHoi
 * @typedef {import('./su-kien').Emit} Emit
 * @typedef {import('./su-kien').KetQuaChay} KetQuaChay
 */

/** Trang chặn của Cloudflare (bản tiếng Anh và tiếng Việt). */
const CHAN_BOT = /just a moment|chờ một chút|checking|attention required|xác minh/i
const NHAC_NGUOI_SAU = 20
const CHO_TOI_DA = 180
/**
 * Chờ ngần này giây không thấy mốc thì mới đi dò dấu hiệu mất phiên kiểu phần
 * tử. Trang mới vẽ dở dang hay hiện thoáng ô đăng nhập, dò sớm quá là báo nhầm.
 */
const CHO_ROI_MOI_DO_DAU_HIEU = 4

/** Trần an toàn: tránh vòng lặp vô hạn và phục hồi đệ quy vô tận. */
const LAP_TOI_DA_TUYET_DOI = 1000
const PHUC_HOI_TOI_DA_MOI_BUOC = 2
/**
 * Chạy phục hồi xong mà dấu hiệu vẫn còn, ngần này lần liên tiếp thì dừng hẳn.
 * Cần nhất cho dấu hiệu kiểu URL: URL không tự đổi sau khi đăng nhập lại nên
 * nếu không chặn, nó sẽ phục hồi lại trước từng bước cho tới hết kịch bản.
 */
const PHUC_HOI_LIEN_TIEP_TOI_DA = 3

/**
 * Chỉ cho 1 phiên chạy cùng lúc — Cloudflare rất nhạy với request song song.
 *
 * @type {typeof globalThis & { __kbBusy?: boolean }}
 */
const g = globalThis

export class DangChayError extends Error {
  constructor() {
    super('Đang có một kịch bản khác chạy. Chờ nó xong đã.')
  }
}

/**
 * Biến dùng cho {{...}}: từ process.env, cộng biến của vòng lặp đang chạy.
 *
 * @typedef {Record<string, string>} Bien
 */

/**
 * Trạng thái dùng chung suốt một lần chạy.
 *
 * @typedef {object} NgacCanh
 * @property {import('playwright-core').Page} page
 * @property {Tempo} t
 * @property {Emit} emit
 * @property {KichBan} kb
 * @property {KetQuaChay['bang']} bang
 * @property {KetQuaChay['giaTri']} giaTri
 * @property {string | null} phucHoiDangChay
 *   đang ở trong quy trình phục hồi nào (để không phục hồi lồng phục hồi)
 * @property {number} soLanPhucHoi
 * @property {Map<string, number>} lienTiep
 *   mỗi quy trình phục hồi đã chạy liên tiếp bao nhiêu lần mà dấu hiệu vẫn chưa tắt
 * @property {string | null} urlTot
 *   URL gần nhất lúc mọi thứ còn lành lặn — chỗ để quay lại sau khi phục hồi xong
 */

/**
 * @param {string} s
 * @param {Bien} bien
 * @returns {string}
 */
function thayBien(s, bien) {
  return s.replace(/\{\{\s*([A-Z0-9_.]+)\s*\}\}/gi, (khop, ten) => {
    const key = ten.trim()
    if (key in bien) return bien[key]
    const env = process.env[key.toUpperCase()]
    return env ?? khop
  })
}

/** Che giá trị bí mật khi ghi log. */
function cheBiMat(goc, daThay) {
  return goc === daThay ? daThay : '••••••'
}

/**
 * @param {KichBan} kb
 * @param {Emit} emit
 * @param {{ pace?: Pace }} [tuyChon]
 * @returns {Promise<KetQuaChay>}
 */
export async function chayKichBan(kb, emit, { pace = 'cham' } = {}) {
  if (g.__kbBusy) throw new DangChayError()
  g.__kbBusy = true

  const batDau = new Date().toISOString()
  let dungTicker

  try {
    const t = new Tempo(pace)
    const page = await getPage()
    await page.bringToFront().catch(() => {})
    dungTicker = batDauChupLienTuc(page, emit, t.cfg.shotMs)

    /** @type {NgacCanh} */
    const nc = {
      page,
      t,
      emit,
      kb,
      bang: {},
      giaTri: {},
      phucHoiDangChay: null,
      soLanPhucHoi: 0,
      lienTiep: new Map(),
      urlTot: null,
    }

    await chayDanhSach(nc, kb.buoc, {})

    await chup(page, emit)

    return {
      tenKichBan: kb.ten,
      batDau,
      ketThuc: new Date().toISOString(),
      urlCuoi: page.url(),
      bang: nc.bang,
      giaTri: nc.giaTri,
      soLanPhucHoi: nc.soLanPhucHoi,
    }
  } finally {
    dungTicker?.()
    g.__kbBusy = false
  }
}

/**
 * Chạy một danh sách bước. Gọi đệ quy cho thân vòng lặp và cho quy trình phục hồi.
 *
 * @param {NgacCanh} nc
 * @param {Buoc[]} ds
 * @param {Bien} bien
 * @param {number} [lanLap]
 */
async function chayDanhSach(nc, ds, bien, lanLap) {
  for (const b of ds) {
    if (b.tat) continue

    const nhan = moTaBuoc(b)
    const bao = (trangThai, chiTiet) =>
      nc.emit({
        type: 'buoc',
        id: b.id,
        nhan,
        trangThai,
        chiTiet,
        lanLap,
        trongPhucHoi: nc.phucHoiDangChay ?? undefined,
      })

    // Phiên có thể đã mất trước cả khi bước này chạy (site tự đẩy về trang chủ).
    // Bước sắp chạy mà tự nó điều hướng thì phục hồi khỏi cần quay lại trang cũ
    // — đỡ một lượt tải trang thừa.
    await thuTuPhucHoi(nc, bien, { khongQuayLai: b.hanhDong.loai === 'mo-trang' })

    // Qua được vòng kiểm trên tức là lúc này mọi dấu hiệu đều sạch → URL hiện
    // tại (kết quả của bước trước) đúng là "trang đang dùng dở" đáng quay lại.
    // Cố ý KHÔNG ghi ở chỗ khác: URL chưa qua kiểm có thể chính là trang chủ mà
    // site vừa đá về, ghi vào thì phục hồi xong lại tưởng đang đứng đúng chỗ.
    ghiNhoUrlTot(nc)

    if (b.chayKhi && !(await kiemDieuKien(nc.page, b.chayKhi, bien))) {
      bao('bo-qua', moTaDieuKienKhongThoa(b.chayKhi))
      continue
    }

    bao('dang-chay')

    let lanThu = 0
    for (;;) {
      try {
        const chiTiet = await chayMotBuoc(nc, b, nhan, bien)
        bao('xong', chiTiet)
        break
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)

        // Bước lỗi có thể chỉ vì bị đăng xuất giữa đường → phục hồi rồi thử lại.
        // Thử lại chính bước này nên khỏi mở lại trang cũ cho tốn một lượt tải.
        if (
          lanThu < PHUC_HOI_TOI_DA_MOI_BUOC &&
          (await thuTuPhucHoi(nc, bien, { khongQuayLai: b.hanhDong.loai === 'mo-trang' }))
        ) {
          lanThu++
          nc.emit({ type: 'log', msg: `Đã phục hồi, thử lại bước "${nhan}" (lần ${lanThu + 1}).` })
          continue
        }

        if (b.boQuaLoi) {
          bao('bo-qua', motDong(msg))
          nc.emit({ type: 'log', msg: `Bước "${nhan}" lỗi nhưng được đánh dấu bỏ qua: ${motDong(msg)}` })
          break
        }
        bao('loi', motDong(msg))
        throw err
      }
    }
  }
}

const motDong = (msg) => msg.split('\n')[0].slice(0, 200)

/** @param {DieuKienChay} dk */
function moTaDieuKienKhongThoa(dk) {
  return `điều kiện không thoả: ${dk.selector} ${dk.dieuKien === 'co-mat' ? 'không có mặt' : 'đang có mặt'}`
}

/**
 * Kiểm một điều kiện / dấu hiệu. Kiểu 'phan-tu' (mặc định) xét phần tử đang
 * hiện hay ẩn; kiểu 'url' xét URL hiện tại; 'ca-hai' đòi thoả cả hai.
 *
 * @param {import('playwright-core').Page} page
 * @param {DieuKienChay & DauHieu} dk
 * @param {Bien} [bien]
 * @returns {Promise<boolean>}
 */
async function kiemDieuKien(page, dk, bien = {}) {
  const kieu = dk.kieu ?? 'phan-tu'
  if (kieu === 'url') return kiemUrl(page, dk, bien)

  const hien = await page
    .locator(dk.selector)
    .first()
    .isVisible()
    .catch(() => false)
  const thoaPhanTu = dk.dieuKien === 'co-mat' ? hien : !hien
  return kieu === 'ca-hai' ? thoaPhanTu && kiemUrl(page, dk, bien) : thoaPhanTu
}

/**
 * @param {import('playwright-core').Page} page
 * @param {DauHieu} dk
 * @param {Bien} bien
 * @returns {boolean}
 */
function kiemUrl(page, dk, bien) {
  const khop = khopMauUrl(page.url(), thayBien(dk.url ?? '', bien))
  return dk.dieuKienUrl === 'khong-khop' ? !khop : khop
}

/**
 * Kiểm mọi quy trình phục hồi tự kích hoạt; cái nào có dấu hiệu thoả thì chạy.
 * Trả về true nếu đã chạy ít nhất một quy trình.
 *
 * @param {NgacCanh} nc
 * @param {Bien} bien
 * @param {{ khongQuayLai?: boolean }} [tuyChon]
 *   khongQuayLai: bước sắp chạy tự nó điều hướng nên khỏi mở lại trang cũ
 * @returns {Promise<boolean>}
 */
async function thuTuPhucHoi(nc, bien, { khongQuayLai = false } = {}) {
  // Đang ở trong phục hồi thì không phục hồi lồng nhau nữa.
  if (nc.phucHoiDangChay) return false
  const ds = (nc.kb.phucHoi ?? []).filter((p) => p.tuKichHoat !== false)
  if (ds.length === 0) return false

  let daChay = false
  for (const p of ds) {
    if (!(await kiemDieuKien(nc.page, p.khi, bien))) {
      nc.lienTiep.set(p.ten, 0)
      continue
    }
    const lan = (nc.lienTiep.get(p.ten) ?? 0) + 1
    if (lan > PHUC_HOI_LIEN_TIEP_TOI_DA) {
      throw new Error(
        `Đã chạy phục hồi "${p.ten}" ${PHUC_HOI_LIEN_TIEP_TOI_DA} lần liên tiếp mà dấu hiệu ` +
          `(${moTaDauHieu(p.khi)}) vẫn còn — dừng để khỏi lặp vô tận. ` +
          `Nếu dấu hiệu là URL thì sau khi khắc phục URL phải khác đi: bật "Quay lại trang đang dở", ` +
          `hoặc đổi sang dấu hiệu kiểu phần tử / "cả hai".`,
      )
    }
    nc.lienTiep.set(p.ten, lan)
    await chayPhucHoi(nc, p, bien, !khongQuayLai)
    daChay = true
  }
  return daChay
}

/**
 * Ghi nhớ URL "lành lặn" gần nhất để sau khi phục hồi biết đường quay lại.
 * Chỉ được gọi ngay sau một vòng kiểm dấu hiệu sạch — xem chayDanhSach().
 *
 * @param {NgacCanh} nc
 */
function ghiNhoUrlTot(nc) {
  if (nc.phucHoiDangChay) return
  const url = nc.page.url()
  if (/^https?:\/\//i.test(url)) nc.urlTot = url
}

/**
 * URL hiện tại có trùng dấu hiệu mất phiên của quy trình phục hồi nào không.
 * Chỉ xét phần URL của dấu hiệu (tra được ngay, không phải hỏi DOM).
 *
 * @param {NgacCanh} nc
 * @param {Bien} bien
 * @returns {string | null} tên quy trình, hoặc null
 */
function dauHieuUrlHong(nc, bien) {
  if (nc.phucHoiDangChay) return null
  const p = (nc.kb.phucHoi ?? []).find(
    (x) =>
      x.tuKichHoat !== false &&
      (x.khi?.kieu === 'url' || x.khi?.kieu === 'ca-hai') &&
      kiemUrl(nc.page, x.khi, bien),
  )
  return p ? p.ten : null
}

/**
 * Như trên nhưng xét ĐỦ dấu hiệu, kể cả loại phải hỏi DOM. Đắt hơn nên chỉ
 * dùng lúc đang chờ trang mà mãi không thấy mốc.
 *
 * @param {NgacCanh} nc
 * @param {Bien} bien
 * @returns {Promise<string | null>} tên quy trình, hoặc null
 */
async function dauHieuHong(nc, bien) {
  if (nc.phucHoiDangChay) return null
  for (const p of nc.kb.phucHoi ?? []) {
    if (p.tuKichHoat === false) continue
    if (await kiemDieuKien(nc.page, p.khi, bien)) return p.ten
  }
  return null
}

/**
 * @param {NgacCanh} nc
 * @param {PhucHoi} p
 * @param {Bien} bien
 * @param {boolean} [tuDong] true = do dấu hiệu tự kích hoạt (không phải "Gọi phục hồi" tay)
 */
async function chayPhucHoi(nc, p, bien, tuDong = false) {
  nc.emit({ type: 'phuc-hoi', ten: p.ten, giaiDoan: 'bat-dau' })
  nc.phucHoiDangChay = p.ten
  nc.soLanPhucHoi++
  try {
    await chayDanhSach(nc, p.buoc, bien)
    // Đăng nhập lại xong nhưng đang đứng ở trang chủ chứ không phải trang dở
    // dang — mở lại đúng chỗ cũ rồi mới chạy tiếp bước đang làm.
    if (tuDong && p.quayLaiTrang !== false) await quayLaiTrangDangDo(nc)
    nc.emit({ type: 'phuc-hoi', ten: p.ten, giaiDoan: 'xong' })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    nc.emit({ type: 'phuc-hoi', ten: p.ten, giaiDoan: 'that-bai', msg: motDong(msg) })
    throw new Error(`Quy trình phục hồi "${p.ten}" cũng lỗi: ${motDong(msg)}`)
  } finally {
    nc.phucHoiDangChay = null
  }
}

/**
 * Mở lại URL lành lặn gần nhất, nếu quy trình phục hồi đã làm trôi mất trang.
 *
 * @param {NgacCanh} nc
 */
async function quayLaiTrangDangDo(nc) {
  const dich = nc.urlTot
  if (!dich || dich === nc.page.url()) return
  nc.emit({ type: 'log', msg: `Phục hồi xong — quay lại trang đang dở: ${dich}` })
  await nc.page.goto(dich, { waitUntil: 'domcontentloaded', timeout: 60_000 })
}

/**
 * @param {NgacCanh} nc
 * @param {Buoc} b
 * @param {string} nhan
 * @param {Bien} bien
 * @returns {Promise<string | undefined>}
 */
async function chayMotBuoc(nc, b, nhan, bien) {
  const { page, t, emit } = nc
  const a = b.hanhDong

  switch (a.loai) {
    case 'mo-trang': {
      await page.goto(thayBien(a.url, bien), { waitUntil: 'domcontentloaded', timeout: 60_000 })
      const moc = a.choSelector?.trim()
      if (moc) {
        const giay = await vuotChanBot(page, moc, emit, nc, bien)
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
      const giaTriThat = thayBien(a.giaTri, bien)
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
      return cheBiMat(a.giaTri, giaTriThat)
    }

    case 'chon': {
      await t.spotlight(page, a.selector, nhan)
      const daChon = await page.selectOption(a.selector, thayBien(a.giaTri, bien))
      await t.nghi(page, 700)
      await t.xoaSpotlight(page)
      return `value=${daChon.join(',')}`
    }

    case 'bam': {
      await t.spotlight(page, a.selector, nhan)
      if (a.choDieuHuong) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => {}),
          bam(page, a.selector, emit),
        ])
        await t.xoaSpotlight(page)
        return page.url()
      }
      const cach = await bam(page, a.selector, emit)
      await t.nghi(page, 500)
      await t.xoaSpotlight(page)
      return cach
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
      let dat
      let thucTe = ''
      if (a.dieuKien === 'co-mat') {
        dat = await o.isVisible().catch(() => false)
      } else if (a.dieuKien === 'vang-mat') {
        dat = !(await o.isVisible().catch(() => false))
      } else {
        thucTe = ((await o.textContent().catch(() => '')) ?? '').replace(/\s+/g, ' ').trim()
        dat = thucTe.toLowerCase().includes(thayBien(a.chu ?? '', bien).toLowerCase())
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
      // Cột kiểu 'bien' không đọc từ DOM nên giải quyết ở đây, ngoài trang.
      const cotDom = a.cot.filter((c) => c.nguon.kieu !== 'bien')
      const dongDom = await page.evaluate(bocBang, {
        selectorDong: a.selectorDong,
        cot: cotDom,
        gioiHan: a.gioiHan ?? 0,
      })
      // Ghép lại theo đúng thứ tự cột người dùng đã sắp.
      const dong = dongDom.map((hangDom) => {
        const hang = {}
        for (const c of a.cot) {
          hang[c.ten] =
            c.nguon.kieu === 'bien' ? (bien[c.nguon.ten] ?? null) : (hangDom[c.ten] ?? null)
        }
        return hang
      })
      await t.xoaSpotlight(page)
      // Trong vòng lặp, mỗi lượt NỐI THÊM vào bảng cùng tên thay vì ghi đè.
      const daCo = nc.bang[a.ten]
      nc.bang[a.ten] = daCo ? [...daCo, ...dong] : dong
      return daCo
        ? `+${dong.length} dòng (tổng ${nc.bang[a.ten].length})`
        : `${dong.length} dòng × ${a.cot.length} cột`
    }

    case 'lay-mot': {
      await t.spotlight(page, a.selector, nhan)
      const v = await page.evaluate(bocMot, { selector: a.selector, nguon: a.nguon, regex: a.regex })
      await t.xoaSpotlight(page)
      gomGiaTri(nc, a.ten, v)
      return v === null ? '(không thấy)' : String(v).slice(0, 120)
    }

    case 'chay-js': {
      // Cửa sau có chủ ý: chạy JS của bạn trong ngữ cảnh trang.
      const v = await page.evaluate((ma) => new Function(ma)(), thayBien(a.ma, bien))
      if (a.ten) gomGiaTri(nc, a.ten, v)
      return typeof v === 'object' ? JSON.stringify(v).slice(0, 160) : String(v).slice(0, 160)
    }

    case 'lap':
      return chayVongLap(nc, a, bien)

    case 'goi-phuc-hoi': {
      const p = (nc.kb.phucHoi ?? []).find((x) => x.ten.trim() === a.tenPhucHoi.trim())
      if (!p) throw new Error(`Không có quy trình phục hồi tên "${a.tenPhucHoi}"`)
      await chayPhucHoi(nc, p, bien)
      return `đã chạy "${p.ten}"`
    }

    default:
      throw new Error(`Loại hành động không biết: ${a.loai}`)
  }
}

/**
 * Bấm một phần tử. Nút thật thì cú bấm thường là đủ; nhưng mấy nút dựng bằng
 * `<div>` hay bị thứ khác nằm đè (banner dính, lớp phủ trong suốt) làm
 * Playwright từ chối bấm. Gặp vậy thì bấm cưỡng bức đúng vị trí đó — và nói rõ
 * đã phải làm thế, đừng lặng lẽ.
 *
 * @param {import('playwright-core').Page} page
 * @param {string} selector
 * @param {Emit} emit
 * @returns {Promise<string | undefined>}
 */
async function bam(page, selector, emit) {
  const o = page.locator(selector).first()
  try {
    await o.click({ timeout: 30_000 })
    return undefined
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // Chỉ cứu trường hợp bị chắn/không ổn định; selector sai thì để lỗi nguyên vẹn.
    if (!/intercepts pointer events|not stable|outside of the viewport/i.test(msg)) throw err
    emit({ type: 'log', msg: `"${selector}" bị thứ khác nằm đè — bấm cưỡng bức. (${motDong(msg)})` })
    await o.scrollIntoViewIfNeeded({ timeout: 10_000 }).catch(() => {})
    await o.click({ timeout: 15_000, force: true })
    return 'bấm cưỡng bức (bị đè)'
  }
}

/**
 * Lặp nhiều lượt thì giá trị cùng tên gom thành mảng thay vì ghi đè.
 *
 * @param {NgacCanh} nc
 * @param {string} ten
 * @param {unknown} v
 */
function gomGiaTri(nc, ten, v) {
  if (!(ten in nc.giaTri)) {
    nc.giaTri[ten] = v
    return
  }
  const cu = nc.giaTri[ten]
  nc.giaTri[ten] = Array.isArray(cu) ? [...cu, v] : [cu, v]
}

/**
 * @param {NgacCanh} nc
 * @param {import('./loai').HanhDong} a hành động loại 'lap'
 * @param {Bien} bien
 * @returns {Promise<string>}
 */
async function chayVongLap(nc, a, bien) {
  const { emit } = nc

  if (a.kieu === 'moi-dong') {
    const ten = (a.tenBang ?? '').trim()
    const dong = nc.bang[ten]
    if (!dong) {
      throw new Error(
        `Chưa có bảng "${ten}" để lặp. Bảng phải được bóc bởi một bước "Lấy bảng" chạy TRƯỚC vòng lặp này.`,
      )
    }
    // Chụp lại danh sách dòng trước khi lặp: thân lặp có thể nối thêm vào cùng
    // bảng đó, nếu đọc trực tiếp sẽ thành lặp vô hạn.
    const dsDong = [...dong]
    emit({ type: 'log', msg: `Vòng lặp theo bảng "${ten}": ${dsDong.length} lượt.` })
    for (let i = 0; i < Math.min(dsDong.length, LAP_TOI_DA_TUYET_DOI); i++) {
      /** @type {Bien} */
      const bienLap = { ...bien, LAP_SO: String(i + 1), LAP_TONG: String(dsDong.length) }
      for (const [k, v] of Object.entries(dsDong[i])) bienLap[`DONG.${k}`] = v ?? ''
      await chayDanhSach(nc, a.buoc, bienLap, i + 1)
    }
    return `${dsDong.length} lượt`
  }

  if (a.kieu === 'so-lan') {
    const n = Math.min(a.soLan ?? 0, LAP_TOI_DA_TUYET_DOI)
    for (let i = 0; i < n; i++) {
      await chayDanhSach(nc, a.buoc, { ...bien, LAP_SO: String(i + 1), LAP_TONG: String(n) }, i + 1)
    }
    return `${n} lượt`
  }

  // cho-den-khi
  const tran = Math.min(a.toiDa ?? 0, LAP_TOI_DA_TUYET_DOI)
  let i = 0
  for (; i < tran; i++) {
    if (a.dungKhi && (await kiemDieuKien(nc.page, a.dungKhi, bien))) {
      emit({ type: 'log', msg: `Điều kiện dừng đã thoả sau ${i} lượt.` })
      return `${i} lượt (dừng vì điều kiện thoả)`
    }
    await chayDanhSach(nc, a.buoc, { ...bien, LAP_SO: String(i + 1) }, i + 1)
  }
  emit({ type: 'log', msg: `Đã chạm trần ${tran} lượt mà điều kiện dừng vẫn chưa thoả.` })
  return `${i} lượt (chạm trần)`
}

/**
 * Chạy trong trang: bóc nhiều dòng thành bảng.
 *
 * @param {{ selectorDong: string, cot: import('./loai').CotDuLieu[], gioiHan: number }} tuyChon
 */
function bocBang({ selectorDong, cot, gioiHan }) {
  const sach = (s) => (s ?? '').replace(/\s+/g, ' ').trim()

  const layTu = (el, nguon) => {
    if (nguon.kieu === 'text') return sach(el.textContent)
    if (nguon.kieu === 'html') return el.innerHTML
    return el.getAttribute(nguon.ten)
  }

  let dsDong = [...document.querySelectorAll(selectorDong)]
  if (gioiHan > 0) dsDong = dsDong.slice(0, gioiHan)

  return dsDong.map((dong) => {
    const hang = {}
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

/**
 * Chạy trong trang: bóc một giá trị đơn.
 *
 * @param {{ selector: string, nguon: import('./loai').Nguon, regex?: string }} tuyChon
 */
function bocMot({ selector, nguon, regex }) {
  const el = document.querySelector(selector)
  if (!el) return null
  let v
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
 *
 * @param {import('playwright-core').Page} page
 * @param {string} moc
 * @param {Emit} emit
 * @param {NgacCanh} nc
 * @param {Bien} bien
 * @returns {Promise<number>}
 */
async function vuotChanBot(page, moc, emit, nc, bien) {
  let daNhac = false
  for (let s = 0; s < CHO_TOI_DA; s++) {
    const tieuDe = await page.title().catch(() => '')
    const co = await page.locator(moc).count().catch(() => 0)
    const biChan = CHAN_BOT.test(tieuDe)
    if (!biChan && co > 0) return s

    // Bị đá về đúng URL đã khai là dấu hiệu mất phiên → hỏng ngay, đừng chờ hết
    // 180s. Lỗi này để chayDanhSach chạy phục hồi rồi mở LẠI CHÍNH trang này —
    // cách chắc nhất để quay về đúng chỗ đang dở, vì bước này tự nó biết URL.
    const tenPhucHoi =
      dauHieuUrlHong(nc, bien) ??
      // Dấu hiệu kiểu phần tử phải hỏi DOM nên đắt hơn, và trong vài giây đầu
      // trang còn đang vẽ dở dễ báo nhầm → chỉ hỏi khi đã chờ quá lâu.
      (s >= CHO_ROI_MOI_DO_DAU_HIEU ? await dauHieuHong(nc, bien) : null)
    if (tenPhucHoi) {
      throw new Error(
        `Đang ở "${page.url()}" mà không thấy "${moc}" — trùng dấu hiệu mất phiên của quy trình ` +
          `phục hồi "${tenPhucHoi}".`,
      )
    }

    if (biChan && s >= NHAC_NGUOI_SAU && !daNhac) {
      daNhac = true
      emit({
        type: 'can-nguoi',
        msg: 'Trang đang đòi xác minh người thật. Bấm vào ô xác minh trong cửa sổ Chrome — kịch bản vẫn đang chờ bạn.',
      })
    }
    if (s === 0) emit({ type: 'log', msg: biChan ? `Bị chặn bot ("${tieuDe}")…` : 'Đang chờ trang render…' })
    else if (s % 10 === 0) emit({ type: 'log', msg: `…vẫn đang chờ (${s}s), tiêu đề: "${tieuDe}"` })
    await page.waitForTimeout(1000)
  }
  throw new Error(`Chờ ${CHO_TOI_DA}s mà không thấy "${moc}". Trang có thể vẫn bị chặn bot.`)
}

async function chup(page, emit) {
  try {
    const buf = await page.screenshot({ type: 'jpeg', quality: 45, timeout: 5_000 })
    emit({ type: 'shot', jpegBase64: buf.toString('base64') })
  } catch {
    // đang điều hướng hoặc chưa vẽ xong — bỏ khung này
  }
}

function batDauChupLienTuc(page, emit, moiMs) {
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
