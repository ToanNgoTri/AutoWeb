import { getPage } from '../tvpl/browser'

/**
 * Phần tử người dùng đã bấm chọn trên trang.
 *
 * @typedef {object} PhanTuDaChon
 * @property {string} selector
 * @property {string} the
 * @property {string | null} id
 * @property {string | null} cssClass
 * @property {string} chu
 * @property {Record<string, string>} thuocTinh
 *   mọi thuộc tính của phần tử, để bạn biết có thể bóc `href`, `lawid`, `data-*`…
 * @property {{ sel: string, soKhop: number }[]} goiY
 *   Các selector khác cũng trỏ tới phần tử này, kèm số phần tử mà nó khớp.
 *   soKhop = 1 phù hợp cho "bấm"/"điền"; soKhop > 1 chính là cái bạn cần cho
 *   "lấy bảng" (mỗi phần tử khớp thành một dòng).
 */

/**
 * Bật chế độ chọn trên cửa sổ Chrome đang mở: rê chuột thì phần tử sáng lên,
 * bấm thì trả selector về đây. Escape để huỷ.
 *
 * Giữ **Alt (⌥)** rồi bấm thì cú bấm đi thẳng vào trang thay vì bị bắt lấy —
 * cần cho những nút `div` phải bấm mới sổ ra danh sách `<a>` bên trong: mở nó
 * bằng Alt+bấm trước, rồi bấm thường vào đúng thẻ `<a>` muốn chọn.
 *
 * @returns {Promise<PhanTuDaChon | null>}
 */
export async function chonPhanTu(timeoutMs = 120_000) {
  const page = await getPage()
  await page.bringToFront().catch(() => {})

  try {
    return await moCheDoChon(page, timeoutMs)
  } catch (err) {
    // Alt+bấm có thể làm trang điều hướng → ngữ cảnh JS bị huỷ giữa chừng.
    const msg = err instanceof Error ? err.message : String(err)
    if (/execution context|destroyed|navigat/i.test(msg))
      throw new Error('Trang vừa chuyển/tải lại nên chế độ chọn bị ngắt. Bấm ◎ lần nữa để chọn tiếp.')
    throw err
  }
}

/**
 * Phần chạy trong trang — tách khỏi chonPhanTu() để gọi thẳng được với một
 * `page` bất kỳ khi cần test, không phải qua getPage().
 *
 * @param {import('playwright-core').Page} page
 * @param {number} timeoutMs
 * @returns {Promise<PhanTuDaChon | null>}
 */
export function moCheDoChon(page, timeoutMs) {
  return page.evaluate(async (thoiGian) => {
    // ── tính selector cho một phần tử ────────────────────────────────────────
    const idHopLe = (id) => /^[A-Za-z][\w:-]*$/.test(id)
    // bỏ các class trông như sinh tự động (hash, số thuần, utility dài)
    const classOn = (c) => c.length > 1 && c.length < 40 && !/^[a-z]{0,3}[0-9a-f]{6,}$/i.test(c)

    const duongDan = (el) => {
      const khuc = []
      let cur = el
      while (cur && cur !== document.body && khuc.length < 6) {
        const cha = cur.parentElement
        if (!cha) break
        const cungThe = [...cha.children].filter((x) => x.tagName === cur.tagName)
        const the = cur.tagName.toLowerCase()
        khuc.unshift(cungThe.length > 1 ? `${the}:nth-of-type(${cungThe.indexOf(cur) + 1})` : the)
        cur = cha
      }
      return khuc.join(' > ')
    }

    /** Selector cho CHÍNH phần tử, không leo tổ tiên. Rỗng nếu không có gì bám được. */
    const neoCho = (el) => {
      const the = el.tagName.toLowerCase()
      if (el.id && idHopLe(el.id)) return `#${CSS.escape(el.id)}`
      const cls = [...el.classList].filter(classOn)
      if (cls.length) return the + cls.map((c) => `.${CSS.escape(c)}`).join('')
      for (const attr of ['name', 'data-testid', 'aria-label', 'placeholder']) {
        const v = el.getAttribute(attr)
        if (v) return `${the}[${attr}="${v.replace(/"/g, '\\"')}"]`
      }
      return null
    }

    /**
     * Điểm càng thấp càng được ưu tiên. Đường dẫn nth-of-type bị dìm xuống
     * cuối: nó có thể khớp đúng 1 phần tử nhưng đổi layout một chút là hỏng.
     * Trong các selector "đọc được", chọn cái CỤ THỂ nhất (khớp ít nhất), rồi
     * mới tới cái ngắn hơn.
     */
    const diem = (x) => {
      const duongDanCung = x.sel.includes(':nth-of-type') ? 100_000 : 0
      // class/id kết thúc bằng số (content-0, item-3, row_12) là theo VỊ TRÍ:
      // trông cụ thể nhưng chỉ đúng với vài phần tử đầu → dìm xuống.
      const theoViTri = /[.#][\w-]*[-_]\d+(?![\w-])/.test(x.sel) ? 50_000 : 0
      return duongDanCung + theoViTri + x.soKhop * 10 + x.sel.length
    }

    const demKhop = (sel) => {
      try {
        return document.querySelectorAll(sel).length
      } catch {
        return 0
      }
    }

    const tinhSelector = (el) => {
      const ra = []
      const the = el.tagName.toLowerCase()

      // 1. bám vào chính phần tử
      const tuThan = neoCho(el)
      if (tuThan) ra.push(tuThan)

      // 2. neo vào tổ tiên gần nhất có id/class, rồi mô tả xuống phần tử này.
      //    Đây là dạng người thật hay viết: `p.nqTitle a`, `.right-col span`.
      let cha = el.parentElement
      for (let sau = 0; cha && cha !== document.body && sau < 4; sau++, cha = cha.parentElement) {
        const neo = neoCho(cha)
        if (!neo) continue
        ra.push(`${neo} ${tuThan ?? the}`)
        if (ra.length >= 4) break
      }

      // 3. cứu cánh: đường dẫn nth-of-type
      const dd = duongDan(el)
      if (dd) ra.push(dd)

      const goiY = [...new Set(ra)]
        .map((sel) => ({ sel, soKhop: demKhop(sel) }))
        .filter((x) => x.soKhop > 0)
        .sort((x, y) => diem(x) - diem(y))
        .slice(0, 6)

      return { chinh: goiY[0]?.sel ?? the, goiY }
    }

    // ── overlay ──────────────────────────────────────────────────────────────
    document.querySelectorAll('.__kb_pick').forEach((e) => e.remove())
    const vien = document.createElement('div')
    vien.className = '__kb_pick'
    vien.style.cssText =
      'position:fixed;z-index:2147483646;pointer-events:none;border:2px solid #0ea5e9;background:rgba(14,165,233,.14);border-radius:4px;transition:all .05s'
    const nhan = document.createElement('div')
    nhan.className = '__kb_pick'
    nhan.style.cssText =
      'position:fixed;z-index:2147483647;pointer-events:none;background:#0ea5e9;color:#fff;font:600 12px/1.4 -apple-system,sans-serif;padding:4px 8px;border-radius:4px;white-space:nowrap;max-width:80vw;overflow:hidden;text-overflow:ellipsis'
    const bang = document.createElement('div')
    bang.className = '__kb_pick'
    const CHU_BANG = '◎ Bấm để lấy selector · Alt(⌥)+bấm để bấm thật vào trang (mở dropdown) · Esc huỷ'
    const CHU_ALT = '⌥ Đang giữ Alt — cú bấm này đi thẳng vào trang, KHÔNG lấy selector'
    bang.textContent = CHU_BANG
    bang.style.cssText =
      'position:fixed;z-index:2147483647;pointer-events:none;left:50%;transform:translateX(-50%);top:12px;background:#0f172a;color:#7dd3fc;font:600 13px/1.5 -apple-system,sans-serif;padding:7px 14px;border-radius:999px;box-shadow:0 4px 16px rgba(0,0,0,.5)'
    document.body.append(vien, nhan, bang)

    let hienTai = null
    /** Alt đang giữ = nhường cú bấm cho trang (để mở dropdown, tab, accordion…). */
    const doiKieu = (giuAlt) => {
      vien.style.borderColor = giuAlt ? '#f59e0b' : '#0ea5e9'
      vien.style.background = giuAlt ? 'rgba(245,158,11,.14)' : 'rgba(14,165,233,.14)'
      nhan.style.background = giuAlt ? '#f59e0b' : '#0ea5e9'
      nhan.style.color = giuAlt ? '#1c1917' : '#fff'
      bang.textContent = giuAlt ? CHU_ALT : CHU_BANG
    }
    const ve = (el, giuAlt) => {
      const r = el.getBoundingClientRect()
      vien.style.left = `${r.left}px`
      vien.style.top = `${r.top}px`
      vien.style.width = `${r.width}px`
      vien.style.height = `${r.height}px`
      nhan.textContent = giuAlt ? 'bấm thật vào phần tử này' : tinhSelector(el).chinh
      nhan.style.left = `${Math.max(4, r.left)}px`
      nhan.style.top = `${r.top > 40 ? r.top - 26 : r.bottom + 8}px`
    }

    const ketQua = await new Promise((resolve) => {
      const onMove = (e) => {
        const el = e.target
        if (!el || el.classList?.contains('__kb_pick')) return
        hienTai = el
        doiKieu(e.altKey)
        ve(el, e.altKey)
      }
      const onClick = (e) => {
        // Alt+bấm: KHÔNG chặn gì cả, để trang tự xử lý cú bấm. Nhờ vậy mấy nút
        // <div> phải bấm mới sổ ra danh sách <a> mở được, rồi bấm thường lần
        // nữa vào đúng thẻ <a> bên trong để lấy selector.
        if (e.altKey) return
        e.preventDefault()
        e.stopImmediatePropagation()
        don()
        resolve(e.target ?? hienTai)
      }
      const onKey = (e) => {
        if (e.key === 'Escape') {
          don()
          resolve(null)
          return
        }
        if (e.key === 'Alt') doiKieu(true)
      }
      const onKeyUp = (e) => {
        if (e.key === 'Alt') doiKieu(false)
      }
      const don = () => {
        document.removeEventListener('mousemove', onMove, true)
        document.removeEventListener('click', onClick, true)
        document.removeEventListener('keydown', onKey, true)
        document.removeEventListener('keyup', onKeyUp, true)
        document.querySelectorAll('.__kb_pick').forEach((e) => e.remove())
        clearTimeout(hetGio)
      }
      const hetGio = setTimeout(() => {
        don()
        resolve(null)
      }, thoiGian)

      document.addEventListener('mousemove', onMove, true)
      document.addEventListener('click', onClick, true)
      document.addEventListener('keydown', onKey, true)
      document.addEventListener('keyup', onKeyUp, true)
    })

    if (!ketQua) return null
    const { chinh, goiY } = tinhSelector(ketQua)
    const thuocTinh = {}
    for (const a of ketQua.attributes) thuocTinh[a.name] = a.value.slice(0, 200)

    return {
      selector: chinh,
      the: ketQua.tagName.toLowerCase(),
      id: ketQua.id || null,
      cssClass: ketQua.className?.toString() || null,
      chu: (ketQua.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 160),
      thuocTinh,
      goiY,
    }
  }, timeoutMs)
}
