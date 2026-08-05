import type { Page } from 'playwright-core'
import type { Pace } from './types'

export type { Pace }

type PaceConfig = {
  /** hệ số nhân cho mọi khoảng nghỉ */
  mult: number
  /** ms giữa 2 ký tự khi gõ */
  typeDelay: number
  /** ms giữa 2 khung screenshot */
  shotMs: number
  /** giữ spotlight bao lâu trước khi thao tác */
  spotlightMs: number
}

const CONFIG: Record<Pace, PaceConfig> = {
  nhanh: { mult: 0.25, typeDelay: 15, shotMs: 900, spotlightMs: 150 },
  vua: { mult: 1, typeDelay: 60, shotMs: 650, spotlightMs: 550 },
  cham: { mult: 2.2, typeDelay: 130, shotMs: 420, spotlightMs: 1100 },
  'rat-cham': { mult: 4, typeDelay: 220, shotMs: 320, spotlightMs: 1900 },
}

export function isPace(v: unknown): v is Pace {
  return typeof v === 'string' && v in CONFIG
}

/** Bộ điều khiển nhịp cho một phiên chạy. */
export class Tempo {
  readonly cfg: PaceConfig

  constructor(readonly pace: Pace) {
    this.cfg = CONFIG[pace]
  }

  /** Nghỉ `ms` giây-thật, đã nhân theo tốc độ đã chọn. */
  async nghi(page: Page, ms: number) {
    await page.waitForTimeout(Math.round(ms * this.cfg.mult))
  }

  /**
   * Khoanh viền vàng + dán nhãn lên phần tử sắp được tác động, giữ một lúc cho
   * người xem kịp nhìn. Overlay dùng pointer-events:none nên không cản click.
   */
  async spotlight(page: Page, selector: string, label: string) {
    await page
      .evaluate(
        ({ sel, text }) => {
          document.querySelectorAll('.__tvpl_spot').forEach((e) => e.remove())
          const el = document.querySelector(sel)
          if (!el) return
          el.scrollIntoView({ block: 'center', behavior: 'smooth' })
          const r = el.getBoundingClientRect()
          const box = document.createElement('div')
          box.className = '__tvpl_spot'
          box.style.cssText = [
            'position:fixed',
            'z-index:2147483647',
            'pointer-events:none',
            `left:${r.left - 6}px`,
            `top:${r.top - 6}px`,
            `width:${r.width + 12}px`,
            `height:${r.height + 12}px`,
            'border:3px solid #f59e0b',
            'border-radius:6px',
            'box-shadow:0 0 0 9999px rgba(0,0,0,.42), 0 0 20px #f59e0b',
          ].join(';')
          const tag = document.createElement('div')
          tag.className = '__tvpl_spot'
          tag.textContent = text
          tag.style.cssText = [
            'position:fixed',
            'z-index:2147483647',
            'pointer-events:none',
            `left:${Math.max(4, r.left - 6)}px`,
            `top:${r.top > 46 ? r.top - 40 : r.bottom + 12}px`,
            'background:#f59e0b',
            'color:#1c1917',
            'font:600 14px/1.45 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif',
            'padding:5px 11px',
            'border-radius:6px',
            'white-space:nowrap',
            'box-shadow:0 3px 10px rgba(0,0,0,.4)',
          ].join(';')
          document.body.append(box, tag)
        },
        { sel: selector, text: label },
      )
      .catch(() => {}) // trang đang điều hướng thì bỏ qua
    await page.waitForTimeout(this.cfg.spotlightMs)
  }

  async xoaSpotlight(page: Page) {
    await page
      .evaluate(() => document.querySelectorAll('.__tvpl_spot').forEach((e) => e.remove()))
      .catch(() => {})
  }
}
