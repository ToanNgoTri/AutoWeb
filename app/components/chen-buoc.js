'use client'

import { useEffect, useRef, useState } from 'react'
import { META_HANH_DONG } from '@/lib/kich-ban/loai'

/**
 * Điểm chèn bước. Đặt giữa mọi cặp bước (và trước bước đầu, sau bước cuối) để
 * thêm bước ở bất kỳ đâu, không phải chỉ nối vào cuối rồi bấm ↑ nhiều lần.
 *
 * kieu='duong': gạch mảnh, chỉ hiện rõ khi rê chuột vào — đỡ rối mắt.
 * kieu='nut'  : nút bình thường, dùng cho header và trạng thái chưa có bước nào.
 *
 * @param {object} props
 * @param {(loai: import('@/lib/kich-ban/loai').LoaiHanhDong) => void} props.chen
 * @param {'duong' | 'nut'} [props.kieu]
 * @param {string} [props.nhan]
 */
export function ChenBuoc({ chen, kieu = 'duong', nhan = 'Thêm bước' }) {
  const [mo, setMo] = useState(false)
  const boc = useRef(null)

  useEffect(() => {
    if (!mo) return
    const ngoai = (e) => {
      if (!boc.current?.contains(e.target)) setMo(false)
    }
    const phim = (e) => e.key === 'Escape' && setMo(false)
    document.addEventListener('mousedown', ngoai)
    document.addEventListener('keydown', phim)
    return () => {
      document.removeEventListener('mousedown', ngoai)
      document.removeEventListener('keydown', phim)
    }
  }, [mo])

  return (
    <div ref={boc} className="relative">
      {kieu === 'duong' ? (
        <button
          type="button"
          onClick={() => setMo((v) => !v)}
          title="Chèn một bước vào đây"
          className="group flex h-5 w-full items-center gap-2 px-1"
        >
          <span
            className={`h-px flex-1 transition-colors ${
              mo ? 'bg-sky-600' : 'bg-transparent group-hover:bg-neutral-700'
            }`}
          />
          <span
            className={`flex h-4.5 w-4.5 items-center justify-center rounded-full border text-[11px] leading-none transition-all ${
              mo
                ? 'border-sky-600 bg-sky-950 text-sky-300'
                : 'border-neutral-700 text-neutral-600 opacity-0 group-hover:opacity-100'
            }`}
          >
            +
          </span>
          <span
            className={`h-px flex-1 transition-colors ${
              mo ? 'bg-sky-600' : 'bg-transparent group-hover:bg-neutral-700'
            }`}
          />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setMo((v) => !v)}
          className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
            mo
              ? 'border-sky-600 bg-sky-950 text-sky-300'
              : 'border-neutral-700 text-neutral-300 hover:bg-neutral-800'
          }`}
        >
          + {nhan}
        </button>
      )}

      {mo && (
        <div
          className={`absolute left-0 right-0 z-30 mt-1 overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900 shadow-2xl shadow-black/60 ${
            kieu === 'nut' ? 'min-w-[19rem]' : ''
          }`}
        >
          <p className="border-b border-neutral-800 px-3 py-2 text-[11px] text-neutral-500">
            Chèn bước loại nào?
          </p>
          <div className="max-h-72 overflow-y-auto p-1">
            {META_HANH_DONG.map((m) => (
              <button
                key={m.loai}
                type="button"
                onClick={() => {
                  chen(m.loai)
                  setMo(false)
                }}
                className="flex w-full items-baseline gap-2 rounded px-2 py-1.5 text-left hover:bg-neutral-800"
              >
                <span className="shrink-0 text-xs font-medium text-sky-300">{m.nhan}</span>
                <span className="text-[11px] leading-snug text-neutral-500">{m.moTa}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
