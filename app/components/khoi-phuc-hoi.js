'use client'

import { useState } from 'react'
import { idMoi } from '@/lib/kich-ban/loai'
import { DanhSachBuoc } from './danh-sach-buoc'
import { OSelector } from './o-selector'

const inp =
  'w-full rounded-md border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-xs text-neutral-100 placeholder:text-neutral-600 focus:border-sky-600 focus:outline-none'
const lbl = 'mb-1 block text-[11px] font-medium text-neutral-400'

/**
 * Khu khai các quy trình phục hồi. Engine kiểm dấu hiệu của từng quy trình
 * TRƯỚC MỖI BƯỚC và cả khi một bước lỗi — nên nếu site đăng xuất giữa đường và
 * đẩy về trang chủ, kịch bản tự đăng nhập lại rồi chạy tiếp đúng chỗ đang dở.
 *
 * @param {object} props
 * @param {import('@/lib/kich-ban/loai').PhucHoi[]} props.ds
 * @param {(ds: import('@/lib/kich-ban/loai').PhucHoi[]) => void} props.doi
 */
export function KhoiPhucHoi({ ds, doi }) {
  const [mo, setMo] = useState(true)

  const them = () =>
    doi([
      ...ds,
      {
        ten: `Phục hồi ${ds.length + 1}`,
        khi: { kieu: 'phan-tu', selector: '', dieuKien: 'co-mat', url: '', dieuKienUrl: 'khop' },
        tuKichHoat: true,
        quayLaiTrang: true,
        buoc: [{ id: idMoi(), hanhDong: { loai: 'bam', selector: '' } }],
      },
    ])
  const dat = (i, p) => doi(ds.map((x, j) => (i === j ? { ...x, ...p } : x)))
  const xoa = (i) => doi(ds.filter((_, j) => j !== i))

  return (
    <section className="mt-5 rounded-lg border border-emerald-900/60 bg-emerald-500/[0.03] p-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMo((v) => !v)}
          className="text-xs font-medium uppercase tracking-wider text-emerald-400"
        >
          {mo ? '▾' : '▸'} Phục hồi ({ds.length})
        </button>
        <span className="mr-auto text-[11px] text-neutral-500">
          tự chạy khi phát hiện dấu hiệu — ví dụ bị đăng xuất giữa đường
        </span>
        {mo && (
          <button
            type="button"
            onClick={them}
            className="rounded-md border border-neutral-700 px-2.5 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
          >
            + Thêm quy trình
          </button>
        )}
      </div>

      {mo && (
        <div className="mt-3 space-y-3">
          {ds.length === 0 && (
            <p className="text-[11px] leading-relaxed text-neutral-500">
              Chưa có quy trình nào. Thêm một quy trình với dấu hiệu là “ô đăng nhập hiện lại” và các bước
              đăng nhập — từ đó kịch bản tự đăng nhập lại mỗi khi phiên bị mất, không cần bạn can thiệp.
            </p>
          )}

          {ds.map((p, i) => (
            <div key={i} className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-3">
              <div className="mb-2.5 flex items-center gap-2">
                <input
                  value={p.ten}
                  onChange={(e) => dat(i, { ten: e.target.value })}
                  placeholder="Tên quy trình"
                  className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-xs font-medium text-emerald-300 hover:border-neutral-700 focus:border-neutral-600 focus:outline-none"
                />
                <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-[11px] text-neutral-400">
                  <input
                    type="checkbox"
                    checked={p.tuKichHoat !== false}
                    onChange={(e) => dat(i, { tuKichHoat: e.target.checked })}
                    className="h-3 w-3 accent-emerald-500"
                  />
                  Tự kích hoạt
                </label>
                <button
                  type="button"
                  title="Xoá quy trình"
                  onClick={() => xoa(i)}
                  className="h-6 w-6 shrink-0 rounded text-xs text-neutral-500 hover:bg-neutral-800 hover:text-red-400"
                >
                  ✕
                </button>
              </div>

              <div className="mb-2.5 rounded-md border border-neutral-800 bg-neutral-950/40 p-2">
                <p className={lbl}>Dấu hiệu cần phục hồi</p>
                <select
                  value={p.khi.kieu ?? 'phan-tu'}
                  onChange={(e) => dat(i, { khi: { ...p.khi, kieu: e.target.value } })}
                  className={`${inp} mb-2`}
                >
                  <option value="phan-tu">Nhận ra bằng PHẦN TỬ trên trang</option>
                  <option value="url">Nhận ra bằng URL (site đá về trang chủ / trang đăng nhập)</option>
                  <option value="ca-hai">Cả hai — phải thoả CẢ phần tử LẪN URL (ít báo nhầm nhất)</option>
                </select>

                {(p.khi.kieu ?? 'phan-tu') !== 'url' && (
                  <>
                    <OSelector
                      nhan="Phần tử làm dấu hiệu"
                      giaTri={p.khi.selector ?? ''}
                      doi={(v) => dat(i, { khi: { ...p.khi, selector: v } })}
                      goiY=".txt-account-Home"
                    />
                    <select
                      value={p.khi.dieuKien ?? 'co-mat'}
                      onChange={(e) => dat(i, { khi: { ...p.khi, dieuKien: e.target.value } })}
                      className={`${inp} mt-2`}
                    >
                      <option value="co-mat">…phần tử đó HIỆN ra (ví dụ ô đăng nhập trở lại)</option>
                      <option value="vang-mat">…phần tử đó ẨN đi (ví dụ mất khối thông tin tài khoản)</option>
                    </select>
                  </>
                )}

                {(p.khi.kieu ?? 'phan-tu') !== 'phan-tu' && (
                  <div className={(p.khi.kieu ?? 'phan-tu') === 'ca-hai' ? 'mt-2' : ''}>
                    <label className={lbl}>URL làm dấu hiệu</label>
                    <input
                      value={p.khi.url ?? ''}
                      onChange={(e) => dat(i, { khi: { ...p.khi, url: e.target.value } })}
                      placeholder="https://thuvienphapluat.vn"
                      spellCheck={false}
                      className={`${inp} font-mono text-sky-300`}
                    />
                    <select
                      value={p.khi.dieuKienUrl ?? 'khop'}
                      onChange={(e) => dat(i, { khi: { ...p.khi, dieuKienUrl: e.target.value } })}
                      className={`${inp} mt-2`}
                    >
                      <option value="khop">…URL hiện tại KHỚP mẫu trên (bị đá về đúng trang này)</option>
                      <option value="khong-khop">…URL hiện tại KHÔNG khớp mẫu trên (đã rời khỏi trang cần ở)</option>
                    </select>
                    <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">
                      Mặc định là khớp <b>đúng cả URL</b> (không phân biệt hoa thường, bỏ qua dấu{' '}
                      <code className="text-neutral-400">/</code> thừa ở cuối). Dùng{' '}
                      <code className="text-neutral-400">*</code> cho đoạn bất kỳ —{' '}
                      <code className="text-neutral-400">https://thuvienphapluat.vn/dang-nhap*</code> — hoặc
                      bọc trong <code className="text-neutral-400">/…/</code> để dùng regex.
                    </p>
                  </div>
                )}

                <label className="mt-2 flex cursor-pointer items-start gap-1.5 text-[11px] text-neutral-400">
                  <input
                    type="checkbox"
                    checked={p.quayLaiTrang !== false}
                    onChange={(e) => dat(i, { quayLaiTrang: e.target.checked })}
                    className="mt-0.5 h-3 w-3 accent-emerald-500"
                  />
                  <span>
                    Quay lại trang đang dở sau khi khắc phục
                    <span className="text-neutral-500">
                      {' '}
                      — đăng nhập lại xong mà đang đứng ở trang chủ thì tự mở lại đúng trang lúc bị văng, rồi
                      mới chạy tiếp bước đang làm. Với dấu hiệu kiểu URL thì gần như bắt buộc bật.
                    </span>
                  </span>
                </label>
              </div>

              <p className="mb-1 text-[11px] font-medium text-emerald-300">
                Các bước khắc phục ({p.buoc.length})
              </p>
              <DanhSachBuoc
                ds={p.buoc}
                doi={(moi) => dat(i, { buoc: moi })}
                nhanThemCuoi="Thêm bước khắc phục"
              />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
