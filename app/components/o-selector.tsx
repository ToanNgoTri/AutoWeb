'use client'

import { useState } from 'react'
import type { PhanTuDaChon } from '@/lib/kich-ban/chon-phan-tu'

/**
 * Ô nhập selector kèm nút ◎ để bấm chọn trực tiếp phần tử trên cửa sổ Chrome.
 * Sau khi chọn, hiện thông tin phần tử và các selector thay thế để bạn cân
 * giữa "ngắn gọn" và "bền khi site đổi layout".
 */
export function OSelector({
  giaTri,
  doi,
  nhan = 'Selector',
  goiY,
  batBuoc,
}: {
  giaTri: string
  doi: (v: string) => void
  nhan?: string
  goiY?: string
  batBuoc?: boolean
}) {
  const [dangChon, setDangChon] = useState(false)
  const [phanTu, setPhanTu] = useState<PhanTuDaChon | null>(null)
  const [loi, setLoi] = useState<string | null>(null)

  const chon = async () => {
    setDangChon(true)
    setLoi(null)
    setPhanTu(null)
    try {
      const r = await fetch('/api/chon-phan-tu', { method: 'POST' })
      const d = await r.json()
      if (d.loi) setLoi(d.loi)
      else if (d.huy) setLoi('Đã huỷ (Esc) hoặc quá lâu không bấm.')
      else {
        setPhanTu(d.phanTu)
        doi(d.phanTu.selector)
      }
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e))
    } finally {
      setDangChon(false)
    }
  }

  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-neutral-400">
        {nhan}
        {batBuoc && <span className="text-red-400"> *</span>}
      </label>
      <div className="flex gap-1.5">
        <input
          value={giaTri}
          onChange={(e) => doi(e.target.value)}
          placeholder={goiY ?? '#id, .class, text=Đăng nhập'}
          spellCheck={false}
          className="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 font-mono text-xs text-sky-300 placeholder:text-neutral-600 focus:border-sky-600 focus:outline-none"
        />
        <button
          type="button"
          onClick={chon}
          disabled={dangChon}
          title="Bấm rồi chọn phần tử trực tiếp trên cửa sổ Chrome"
          className="shrink-0 rounded-md border border-sky-700 bg-sky-950/60 px-2.5 py-1.5 text-xs text-sky-300 hover:bg-sky-900/60 disabled:opacity-40"
        >
          {dangChon ? '…' : '◎'}
        </button>
      </div>

      {dangChon && (
        <p className="mt-1 text-[11px] text-sky-400">
          Sang cửa sổ Chrome, rê chuột rồi bấm vào phần tử bạn muốn (Esc để huỷ).
        </p>
      )}
      {loi && <p className="mt-1 text-[11px] text-amber-400">{loi}</p>}

      {phanTu && (
        <div className="mt-1.5 space-y-1 rounded-md border border-neutral-800 bg-neutral-950/60 p-2 text-[11px]">
          <div className="text-neutral-400">
            <code className="text-sky-300">
              &lt;{phanTu.the}
              {phanTu.id ? ` id="${phanTu.id}"` : ''}&gt;
            </code>
            {phanTu.chu && <span className="ml-1.5 text-neutral-500">“{phanTu.chu.slice(0, 70)}”</span>}
          </div>

          {phanTu.goiY.length > 1 && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-neutral-500">Chọn cách khác:</span>
              {phanTu.goiY.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => doi(s)}
                  className={`rounded border px-1.5 py-0.5 font-mono ${
                    s === giaTri
                      ? 'border-sky-600 bg-sky-950 text-sky-300'
                      : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {Object.keys(phanTu.thuocTinh).length > 0 && (
            <div className="text-neutral-500">
              Thuộc tính bóc được:{' '}
              {Object.keys(phanTu.thuocTinh).map((k) => (
                <code key={k} className="mr-1 text-emerald-400">
                  {k}
                </code>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
