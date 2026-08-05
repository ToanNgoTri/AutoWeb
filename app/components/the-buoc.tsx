'use client'

import {
  hanhDongMacDinh,
  META_HANH_DONG,
  moTaBuoc,
  type Buoc,
  type CotDuLieu,
  type HanhDong,
  type LoaiHanhDong,
  type Nguon,
} from '@/lib/kich-ban/loai'
import type { TrangThaiBuoc } from '@/lib/kich-ban/su-kien'
import { OSelector } from './o-selector'

const inp =
  'w-full rounded-md border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-xs text-neutral-100 placeholder:text-neutral-600 focus:border-sky-600 focus:outline-none'
const lbl = 'mb-1 block text-[11px] font-medium text-neutral-400'

export function TheBuoc({
  buoc,
  thuTu,
  tong,
  trangThai,
  chiTiet,
  doi,
  xoa,
  chuyen,
  nhanBan,
}: {
  buoc: Buoc
  thuTu: number
  tong: number
  trangThai?: TrangThaiBuoc
  chiTiet?: string
  doi: (b: Buoc) => void
  xoa: () => void
  chuyen: (huong: -1 | 1) => void
  nhanBan: () => void
}) {
  const a = buoc.hanhDong
  const datA = (moi: Partial<HanhDong>) => doi({ ...buoc, hanhDong: { ...a, ...moi } as HanhDong })

  const vien =
    trangThai === 'dang-chay'
      ? 'border-amber-500/70 bg-amber-500/[0.06]'
      : trangThai === 'xong'
        ? 'border-emerald-800/70'
        : trangThai === 'loi'
          ? 'border-red-600/70 bg-red-500/[0.06]'
          : trangThai === 'bo-qua'
            ? 'border-neutral-700 bg-neutral-800/30'
            : 'border-neutral-800'

  return (
    <div className={`rounded-lg border ${vien} ${buoc.tat ? 'opacity-45' : ''} bg-neutral-900/40 p-3`}>
      {/* thanh đầu */}
      <div className="mb-2.5 flex items-center gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-neutral-800 text-[11px] text-neutral-400">
          {trangThai === 'xong' ? '✓' : trangThai === 'dang-chay' ? '◌' : trangThai === 'loi' ? '✕' : thuTu}
        </span>

        <select
          value={a.loai}
          onChange={(e) => doi({ ...buoc, hanhDong: hanhDongMacDinh(e.target.value as LoaiHanhDong) })}
          className="rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs font-medium text-sky-300 focus:outline-none"
        >
          {META_HANH_DONG.map((m) => (
            <option key={m.loai} value={m.loai}>
              {m.nhan}
            </option>
          ))}
        </select>

        <input
          value={buoc.nhan ?? ''}
          onChange={(e) => doi({ ...buoc, nhan: e.target.value })}
          placeholder={moTaBuoc({ ...buoc, nhan: undefined })}
          className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-xs text-neutral-200 placeholder:text-neutral-600 hover:border-neutral-700 focus:border-neutral-600 focus:outline-none"
        />

        <div className="flex shrink-0 items-center gap-0.5 text-neutral-500">
          <IconBtn title="Lên" onClick={() => chuyen(-1)} disabled={thuTu === 1}>
            ↑
          </IconBtn>
          <IconBtn title="Xuống" onClick={() => chuyen(1)} disabled={thuTu === tong}>
            ↓
          </IconBtn>
          <IconBtn title="Nhân bản" onClick={nhanBan}>
            ⧉
          </IconBtn>
          <IconBtn title={buoc.tat ? 'Bật lại' : 'Tắt tạm'} onClick={() => doi({ ...buoc, tat: !buoc.tat })}>
            {buoc.tat ? '○' : '●'}
          </IconBtn>
          <IconBtn title="Xoá" onClick={xoa} nguyHiem>
            ✕
          </IconBtn>
        </div>
      </div>

      {/* thân form theo loại hành động */}
      <div className="space-y-2.5">
        {a.loai === 'mo-trang' && (
          <>
            <div>
              <label className={lbl}>URL</label>
              <input value={a.url} onChange={(e) => datA({ url: e.target.value })} className={inp} spellCheck={false} />
            </div>
            <OSelector
              nhan="Chờ phần tử này xuất hiện (mốc xác nhận trang đã tải xong / vượt xong Cloudflare)"
              giaTri={a.choSelector ?? ''}
              doi={(v) => datA({ choSelector: v })}
              goiY="body"
            />
          </>
        )}

        {a.loai === 'cho' && (
          <>
            <OSelector giaTri={a.selector ?? ''} doi={(v) => datA({ selector: v })} />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={lbl}>Chờ đến khi</label>
                <select
                  value={a.trangThai ?? 'hien'}
                  onChange={(e) => datA({ trangThai: e.target.value as 'hien' | 'an' })}
                  className={inp}
                >
                  <option value="hien">hiện ra</option>
                  <option value="an">ẩn đi / biến mất</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Nghỉ thêm (ms)</label>
                <input
                  type="number"
                  value={a.ms ?? ''}
                  onChange={(e) => datA({ ms: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="0"
                  className={inp}
                />
              </div>
            </div>
          </>
        )}

        {a.loai === 'dien' && (
          <>
            <OSelector giaTri={a.selector} doi={(v) => datA({ selector: v })} batBuoc />
            <div>
              <label className={lbl}>
                Nội dung nhập — dùng <code className="text-emerald-400">{'{{TEN_BIEN}}'}</code> để lấy từ .env.local
              </label>
              <input
                value={a.giaTri}
                onChange={(e) => datA({ giaTri: e.target.value })}
                placeholder="{{TVPL_USERNAME}}"
                className={inp}
                spellCheck={false}
              />
            </div>
            <div className="flex gap-4">
              <ChkBox tick={!!a.tungKyTu} doi={(v) => datA({ tungKyTu: v })}>
                Gõ từng ký tự (thấy được)
              </ChkBox>
              <ChkBox tick={!!a.enterSauKhiXong} doi={(v) => datA({ enterSauKhiXong: v })}>
                Nhấn Enter sau khi điền
              </ChkBox>
            </div>
          </>
        )}

        {a.loai === 'chon' && (
          <>
            <OSelector nhan="Selector của <select>" giaTri={a.selector} doi={(v) => datA({ selector: v })} batBuoc />
            <div>
              <label className={lbl}>Giá trị (value của option, không phải chữ hiển thị)</label>
              <input value={a.giaTri} onChange={(e) => datA({ giaTri: e.target.value })} className={inp} />
            </div>
          </>
        )}

        {a.loai === 'bam' && (
          <>
            <OSelector giaTri={a.selector} doi={(v) => datA({ selector: v })} batBuoc />
            <ChkBox tick={!!a.choDieuHuong} doi={(v) => datA({ choDieuHuong: v })}>
              Cú bấm này làm chuyển trang → chờ điều hướng xong
            </ChkBox>
          </>
        )}

        {a.loai === 'nhan-phim' && (
          <>
            <OSelector
              nhan="Selector (bỏ trống = gửi phím cho cả trang)"
              giaTri={a.selector ?? ''}
              doi={(v) => datA({ selector: v })}
            />
            <div>
              <label className={lbl}>Phím</label>
              <input
                value={a.phim}
                onChange={(e) => datA({ phim: e.target.value })}
                placeholder="Enter, Tab, Escape, ArrowDown, Control+A"
                className={inp}
              />
            </div>
          </>
        )}

        {a.loai === 'cuon-den' && <OSelector giaTri={a.selector} doi={(v) => datA({ selector: v })} batBuoc />}

        {a.loai === 'khang-dinh' && (
          <>
            <OSelector giaTri={a.selector} doi={(v) => datA({ selector: v })} batBuoc />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={lbl}>Điều kiện</label>
                <select
                  value={a.dieuKien}
                  onChange={(e) => datA({ dieuKien: e.target.value as 'co-mat' | 'vang-mat' | 'chua-chu' })}
                  className={inp}
                >
                  <option value="co-mat">có mặt / đang hiện</option>
                  <option value="vang-mat">vắng mặt / đang ẩn</option>
                  <option value="chua-chu">chứa chữ…</option>
                </select>
              </div>
              {a.dieuKien === 'chua-chu' && (
                <div>
                  <label className={lbl}>Chữ cần chứa</label>
                  <input value={a.chu ?? ''} onChange={(e) => datA({ chu: e.target.value })} className={inp} />
                </div>
              )}
            </div>
            <ChkBox tick={!!a.batBuoc} doi={(v) => datA({ batBuoc: v })}>
              Sai thì dừng cả kịch bản (bỏ tick = chỉ ghi log rồi đi tiếp)
            </ChkBox>
          </>
        )}

        {a.loai === 'lay-mot' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={lbl}>Tên giá trị (khoá trong kết quả)</label>
                <input value={a.ten} onChange={(e) => datA({ ten: e.target.value })} className={inp} />
              </div>
              <NguonChon nguon={a.nguon} doi={(n) => datA({ nguon: n })} />
            </div>
            <OSelector giaTri={a.selector} doi={(v) => datA({ selector: v })} batBuoc />
            <div>
              <label className={lbl}>Regex bóc tiếp (tuỳ chọn, lấy nhóm 1)</label>
              <input
                value={a.regex ?? ''}
                onChange={(e) => datA({ regex: e.target.value })}
                placeholder="Ban hành:\s*([\d/]+)"
                className={`${inp} font-mono`}
                spellCheck={false}
              />
            </div>
          </>
        )}

        {a.loai === 'lay-bang' && (
          <BangForm
            ten={a.ten}
            selectorDong={a.selectorDong}
            gioiHan={a.gioiHan}
            cot={a.cot}
            doi={(x) => datA(x)}
          />
        )}

        {a.loai === 'chay-js' && (
          <>
            <div>
              <label className={lbl}>Tên giá trị (tuỳ chọn — có tên thì kết quả được lưu lại)</label>
              <input value={a.ten ?? ''} onChange={(e) => datA({ ten: e.target.value })} className={inp} />
            </div>
            <div>
              <label className={lbl}>Mã JS chạy trong trang — phải có `return`</label>
              <textarea
                value={a.ma}
                onChange={(e) => datA({ ma: e.target.value })}
                rows={4}
                spellCheck={false}
                className={`${inp} font-mono leading-relaxed`}
              />
            </div>
          </>
        )}

        {/* tuỳ chọn chung */}
        <div className="flex items-center justify-between border-t border-neutral-800 pt-2">
          <ChkBox tick={!!buoc.boQuaLoi} doi={(v) => doi({ ...buoc, boQuaLoi: v })}>
            Lỗi ở bước này thì bỏ qua, chạy tiếp
          </ChkBox>
          {chiTiet && (
            <span className="max-w-[55%] truncate font-mono text-[10px] text-neutral-500" title={chiTiet}>
              {chiTiet}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function BangForm({
  ten,
  selectorDong,
  gioiHan,
  cot,
  doi,
}: {
  ten: string
  selectorDong: string
  gioiHan?: number
  cot: CotDuLieu[]
  doi: (x: { ten?: string; selectorDong?: string; gioiHan?: number; cot?: CotDuLieu[] }) => void
}) {
  const datCot = (i: number, c: Partial<CotDuLieu>) =>
    doi({ cot: cot.map((x, j) => (i === j ? { ...x, ...c } : x)) })

  return (
    <>
      <div className="grid grid-cols-[1fr_5rem] gap-2">
        <div>
          <label className={lbl}>Tên bảng (khoá trong kết quả)</label>
          <input value={ten} onChange={(e) => doi({ ten: e.target.value })} className={inp} />
        </div>
        <div>
          <label className={lbl}>Giới hạn</label>
          <input
            type="number"
            value={gioiHan ?? ''}
            onChange={(e) => doi({ gioiHan: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="hết"
            className={inp}
          />
        </div>
      </div>

      <OSelector
        nhan="Selector MỘT DÒNG — khớp nhiều phần tử, mỗi phần tử thành một hàng"
        giaTri={selectorDong}
        doi={(v) => doi({ selectorDong: v })}
        goiY='div[class^="content-"]:has(p.nqTitle)'
        batBuoc
      />

      <div className="rounded-md border border-neutral-800 bg-neutral-950/50 p-2">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[11px] font-medium text-neutral-400">Các cột ({cot.length})</span>
          <button
            type="button"
            onClick={() => doi({ cot: [...cot, { ten: `cot_${cot.length + 1}`, nguon: { kieu: 'text' } }] })}
            className="rounded border border-neutral-700 px-2 py-0.5 text-[11px] text-neutral-300 hover:bg-neutral-800"
          >
            + Thêm cột
          </button>
        </div>

        <div className="space-y-2">
          {cot.map((c, i) => (
            <div key={i} className="rounded border border-neutral-800 bg-neutral-900/50 p-2">
              <div className="mb-1.5 flex gap-1.5">
                <input
                  value={c.ten}
                  onChange={(e) => datCot(i, { ten: e.target.value })}
                  placeholder="tên_cột"
                  className={`${inp} font-mono text-emerald-300`}
                />
                <button
                  type="button"
                  onClick={() => doi({ cot: cot.filter((_, j) => j !== i) })}
                  disabled={cot.length === 1}
                  className="shrink-0 rounded border border-neutral-700 px-2 text-xs text-neutral-500 hover:border-red-700 hover:text-red-400 disabled:opacity-30"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={lbl}>Selector trong dòng (trống = cả dòng)</label>
                  <input
                    value={c.selector ?? ''}
                    onChange={(e) => datCot(i, { selector: e.target.value })}
                    placeholder="p.nqTitle a"
                    className={`${inp} font-mono text-sky-300`}
                    spellCheck={false}
                  />
                </div>
                <NguonChon nguon={c.nguon} doi={(n) => datCot(i, { nguon: n })} />
              </div>
              <div className="mt-1.5">
                <label className={lbl}>Regex bóc tiếp (tuỳ chọn)</label>
                <input
                  value={c.regex ?? ''}
                  onChange={(e) => datCot(i, { regex: e.target.value })}
                  placeholder="\d+/\d{4}/[A-ZĐ-]+"
                  className={`${inp} font-mono`}
                  spellCheck={false}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function NguonChon({ nguon, doi }: { nguon: Nguon; doi: (n: Nguon) => void }) {
  return (
    <div>
      <label className={lbl}>Lấy gì</label>
      <div className="flex gap-1.5">
        <select
          value={nguon.kieu}
          onChange={(e) => {
            const k = e.target.value as Nguon['kieu']
            doi(k === 'thuoc-tinh' ? { kieu: 'thuoc-tinh', ten: 'href' } : { kieu: k })
          }}
          className={inp}
        >
          <option value="text">Chữ (text)</option>
          <option value="thuoc-tinh">Thuộc tính</option>
          <option value="html">HTML bên trong</option>
        </select>
        {nguon.kieu === 'thuoc-tinh' && (
          <input
            value={nguon.ten}
            onChange={(e) => doi({ kieu: 'thuoc-tinh', ten: e.target.value })}
            placeholder="href"
            className={`${inp} font-mono`}
          />
        )}
      </div>
    </div>
  )
}

function ChkBox({
  tick,
  doi,
  children,
}: {
  tick: boolean
  doi: (v: boolean) => void
  children: React.ReactNode
}) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-neutral-400">
      <input
        type="checkbox"
        checked={tick}
        onChange={(e) => doi(e.target.checked)}
        className="h-3 w-3 accent-sky-500"
      />
      {children}
    </label>
  )
}

function IconBtn({
  children,
  onClick,
  title,
  disabled,
  nguyHiem,
}: {
  children: React.ReactNode
  onClick: () => void
  title: string
  disabled?: boolean
  nguyHiem?: boolean
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`h-6 w-6 rounded text-xs hover:bg-neutral-800 disabled:opacity-25 ${
        nguyHiem ? 'hover:text-red-400' : 'hover:text-neutral-200'
      }`}
    >
      {children}
    </button>
  )
}
