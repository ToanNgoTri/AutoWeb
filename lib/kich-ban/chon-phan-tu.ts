import { getPage } from '../tvpl/browser'

export type PhanTuDaChon = {
  selector: string
  the: string
  id: string | null
  cssClass: string | null
  chu: string
  /** mọi thuộc tính của phần tử, để bạn biết có thể bóc `href`, `lawid`, `data-*`… */
  thuocTinh: Record<string, string>
  /** các selector khác cũng trỏ tới phần tử này, để bạn chọn cái nào bền hơn */
  goiY: string[]
}

/**
 * Bật chế độ chọn trên cửa sổ Chrome đang mở: rê chuột thì phần tử sáng lên,
 * bấm thì trả selector về đây. Escape để huỷ.
 */
export async function chonPhanTu(timeoutMs = 120_000): Promise<PhanTuDaChon | null> {
  const page = await getPage()
  await page.bringToFront().catch(() => {})

  return page.evaluate(async (thoiGian) => {
    // ── tính selector cho một phần tử ────────────────────────────────────────
    const idHopLe = (id: string) => /^[A-Za-z][\w:-]*$/.test(id)
    const duyNhat = (sel: string) => {
      try {
        return document.querySelectorAll(sel).length === 1
      } catch {
        return false
      }
    }
    // bỏ các class trông như sinh tự động (hash, số thuần, utility dài)
    const classOn = (c: string) => c.length > 1 && c.length < 40 && !/^[a-z]{0,3}[0-9a-f]{6,}$/i.test(c)

    const duongDan = (el: Element): string => {
      const khuc: string[] = []
      let cur: Element | null = el
      while (cur && cur !== document.body && khuc.length < 6) {
        const cha: Element | null = cur.parentElement
        if (!cha) break
        const cungThe = [...cha.children].filter((x) => x.tagName === cur!.tagName)
        const the = cur.tagName.toLowerCase()
        khuc.unshift(cungThe.length > 1 ? `${the}:nth-of-type(${cungThe.indexOf(cur) + 1})` : the)
        cur = cha
      }
      return khuc.join(' > ')
    }

    const tinhSelector = (el: Element): { chinh: string; goiY: string[] } => {
      const goiY: string[] = []
      const the = el.tagName.toLowerCase()

      if (el.id && idHopLe(el.id) && duyNhat(`#${el.id}`)) goiY.push(`#${el.id}`)

      const cls = [...el.classList].filter(classOn)
      for (const c of cls) {
        const s = `.${CSS.escape(c)}`
        if (duyNhat(s)) goiY.push(s)
      }
      if (cls.length) {
        const s = the + cls.map((c) => `.${CSS.escape(c)}`).join('')
        if (duyNhat(s)) goiY.push(s)
      }
      for (const attr of ['name', 'data-testid', 'aria-label', 'placeholder']) {
        const v = el.getAttribute(attr)
        if (v) {
          const s = `${the}[${attr}="${v.replace(/"/g, '\\"')}"]`
          if (duyNhat(s)) goiY.push(s)
        }
      }
      const dd = duongDan(el)
      if (dd) goiY.push(dd)

      // selector KHÔNG duy nhất cũng hữu ích khi bóc bảng (nhiều dòng cùng dạng)
      if (cls.length) {
        const chung = the + cls.map((c) => `.${CSS.escape(c)}`).join('')
        if (!goiY.includes(chung)) goiY.push(chung)
      }

      return { chinh: goiY[0] ?? the, goiY: [...new Set(goiY)].slice(0, 6) }
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
    bang.textContent = '◎ Đang chọn phần tử — bấm để lấy selector, Esc để huỷ'
    bang.style.cssText =
      'position:fixed;z-index:2147483647;pointer-events:none;left:50%;transform:translateX(-50%);top:12px;background:#0f172a;color:#7dd3fc;font:600 13px/1.5 -apple-system,sans-serif;padding:7px 14px;border-radius:999px;box-shadow:0 4px 16px rgba(0,0,0,.5)'
    document.body.append(vien, nhan, bang)

    let hienTai: Element | null = null
    const ve = (el: Element) => {
      const r = el.getBoundingClientRect()
      vien.style.left = `${r.left}px`
      vien.style.top = `${r.top}px`
      vien.style.width = `${r.width}px`
      vien.style.height = `${r.height}px`
      nhan.textContent = tinhSelector(el).chinh
      nhan.style.left = `${Math.max(4, r.left)}px`
      nhan.style.top = `${r.top > 40 ? r.top - 26 : r.bottom + 8}px`
    }

    const ketQua = await new Promise<Element | null>((resolve) => {
      const onMove = (e: MouseEvent) => {
        const el = e.target as Element | null
        if (!el || el.classList?.contains('__kb_pick')) return
        hienTai = el
        ve(el)
      }
      const onClick = (e: MouseEvent) => {
        e.preventDefault()
        e.stopImmediatePropagation()
        don()
        resolve((e.target as Element) ?? hienTai)
      }
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          don()
          resolve(null)
        }
      }
      const don = () => {
        document.removeEventListener('mousemove', onMove, true)
        document.removeEventListener('click', onClick, true)
        document.removeEventListener('keydown', onKey, true)
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
    })

    if (!ketQua) return null
    const { chinh, goiY } = tinhSelector(ketQua)
    const thuocTinh: Record<string, string> = {}
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
