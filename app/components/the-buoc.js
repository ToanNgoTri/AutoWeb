'use client'

import { hanhDongMacDinh, META_HANH_DONG, moTaBuoc } from '@/lib/kich-ban/loai'
import { useBoiCanh } from './boi-canh'
import { DanhSachBuoc } from './danh-sach-buoc'
import { OSelector } from './o-selector'

const inp =
  'w-full rounded-md border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-xs text-neutral-100 placeholder:text-neutral-600 focus:border-sky-600 focus:outline-none'
const lbl = 'mb-1 block text-[11px] font-medium text-neutral-400'

/**
 * Form sửa một bước. Thân form đổi theo `hanhDong.loai`.
 *
 * @param {object} props
 * @param {import('@/lib/kich-ban/loai').Buoc} props.buoc
 * @param {number} props.thuTu
 * @param {number} props.tong
 * @param {(b: import('@/lib/kich-ban/loai').Buoc) => void} props.doi
 * @param {() => void} props.xoa
 * @param {(huong: -1 | 1) => void} props.chuyen
 * @param {() => void} props.nhanBan
 */
export function TheBuoc({ buoc, thuTu, tong, doi, xoa, chuyen, nhanBan }) {
  const { trangThai: bang, tenPhucHoi } = useBoiCanh()
  const tt = bang[buoc.id]
  const trangThai = tt?.tt
  const chiTiet = tt?.ct
  const a = buoc.hanhDong
  const datA = (moi) => doi({ ...buoc, hanhDong: { ...a, ...moi } })

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
          onChange={(e) => doi({ ...buoc, hanhDong: hanhDongMacDinh(e.target.value) })}
          className="rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs font-medium text-sky-300 focus:outline-none"
        >
          {META_HANH_DONG.map((m) => (
            <option key={m.loai} value={m.loai}>
              {m.nhan}
            </option>
          ))}
        </select>

        {tt?.lanLap !== undefined && (
          <span
            title="Lượt lặp gần nhất mà bước này chạy"
            className="shrink-0 rounded bg-violet-500/15 px-1.5 py-0.5 text-[10px] text-violet-300"
          >
            lượt {tt.lanLap}
          </span>
        )}
        {tt?.trongPhucHoi && (
          <span
            title="Bước này chạy trong quy trình phục hồi"
            className="shrink-0 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-300"
          >
            phục hồi
          </span>
        )}

        <input
          value={buoc.nhan ?? ''}
          onChange={(e) => doi({ ...buoc, nhan: e.target.value })}
          placeholder={moTaBuoc({ ...buoc, nhan: undefined })}
          className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-xs text-neutral-200 placeholder:text-neutral-600 hover:border-neutral-700 focus:border-neutral-600 focus:outline-none"
        />

        <div className="flex shrink-0 items-center gap-0.5 text-neutral-500">
          <IconBtn title="Đưa bước lên" onClick={() => chuyen(-1)} disabled={thuTu === 1}>
            ↑
          </IconBtn>
          <IconBtn title="Đưa bước xuống" onClick={() => chuyen(1)} disabled={thuTu === tong}>
            ↓
          </IconBtn>
          <IconBtn title="Nhân bản bước" onClick={nhanBan}>
            ⧉
          </IconBtn>
          <IconBtn title={buoc.tat ? 'Bật lại' : 'Tắt tạm'} onClick={() => doi({ ...buoc, tat: !buoc.tat })}>
            {buoc.tat ? '○' : '●'}
          </IconBtn>
          <IconBtn title="Xoá bước" onClick={xoa} nguyHiem>
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
                  onChange={(e) => datA({ trangThai: e.target.value })}
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
                  onChange={(e) => datA({ dieuKien: e.target.value })}
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

        {a.loai === 'lap' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={lbl}>Lặp theo kiểu</label>
                <select value={a.kieu} onChange={(e) => datA({ kieu: e.target.value })} className={inp}>
                  <option value="so-lan">Đúng N lượt</option>
                  <option value="moi-dong">Mỗi dòng của một bảng đã bóc</option>
                  <option value="cho-den-khi">Tới khi một điều kiện thoả</option>
                </select>
              </div>
              {a.kieu === 'so-lan' && (
                <div>
                  <label className={lbl}>Số lượt</label>
                  <input
                    type="number"
                    min={1}
                    value={a.soLan ?? ''}
                    onChange={(e) => datA({ soLan: Number(e.target.value) })}
                    className={inp}
                  />
                </div>
              )}
              {a.kieu === 'moi-dong' && (
                <div>
                  <label className={lbl}>Tên bảng (do bước “Lấy bảng” trước đó tạo ra)</label>
                  <input
                    value={a.tenBang ?? ''}
                    onChange={(e) => datA({ tenBang: e.target.value })}
                    placeholder="danh_sach"
                    className={`${inp} font-mono`}
                  />
                </div>
              )}
              {a.kieu === 'cho-den-khi' && (
                <div>
                  <label className={lbl}>Tối đa bao nhiêu lượt (chống lặp vô hạn)</label>
                  <input
                    type="number"
                    min={1}
                    value={a.toiDa ?? ''}
                    onChange={(e) => datA({ toiDa: Number(e.target.value) })}
                    className={inp}
                  />
                </div>
              )}
            </div>

            {a.kieu === 'cho-den-khi' && (
              <div className="rounded-md border border-neutral-800 bg-neutral-950/40 p-2">
                <p className={lbl}>Dừng lặp khi…</p>
                <OSelector
                  nhan="Phần tử để kiểm"
                  giaTri={a.dungKhi?.selector ?? ''}
                  doi={(v) => datA({ dungKhi: { selector: v, dieuKien: a.dungKhi?.dieuKien ?? 'co-mat' } })}
                />
                <select
                  value={a.dungKhi?.dieuKien ?? 'co-mat'}
                  onChange={(e) =>
                    datA({
                      dungKhi: {
                        selector: a.dungKhi?.selector ?? '',
                        dieuKien: e.target.value,
                      },
                    })
                  }
                  className={`${inp} mt-2`}
                >
                  <option value="co-mat">…phần tử đó HIỆN ra</option>
                  <option value="vang-mat">…phần tử đó ẨN đi / không còn</option>
                </select>
              </div>
            )}

            {a.kieu === 'moi-dong' && (
              <p className="rounded-md border border-violet-800/50 bg-violet-500/5 px-2.5 py-2 text-[11px] leading-relaxed text-violet-200/80">
                Trong thân lặp dùng <code className="text-violet-300">{'{{DONG.tên_cột}}'}</code> để lấy giá
                trị của dòng đang xử lý (ví dụ mở <code className="text-violet-300">{'{{DONG.link}}'}</code>
                ), và <code className="text-violet-300">{'{{LAP_SO}}'}</code> /{' '}
                <code className="text-violet-300">{'{{LAP_TONG}}'}</code> cho số lượt. Bước “Lấy bảng” chạy
                trong lặp sẽ <b>nối thêm</b> dòng vào bảng cùng tên chứ không ghi đè.
              </p>
            )}

            <div className="rounded-md border border-violet-900/60 bg-violet-500/[0.04] p-2">
              <p className="mb-1 text-[11px] font-medium text-violet-300">
                Các bước chạy lại mỗi lượt ({a.buoc.length})
              </p>
              <DanhSachBuoc
                ds={a.buoc}
                doi={(moi) => datA({ buoc: moi })}
                nhanThemCuoi="Thêm bước con ở cuối"
                trongVongLap
              />
            </div>
          </>
        )}

        {a.loai === 'goi-phuc-hoi' && (
          <div>
            <label className={lbl}>Quy trình phục hồi cần chạy</label>
            {tenPhucHoi.length === 0 ? (
              <p className="rounded-md border border-amber-700/50 bg-amber-500/10 px-2.5 py-2 text-[11px] text-amber-200">
                Chưa khai quy trình phục hồi nào. Thêm ở mục <b>Phục hồi</b> phía dưới danh sách bước.
              </p>
            ) : (
              <select
                value={a.tenPhucHoi}
                onChange={(e) => datA({ tenPhucHoi: e.target.value })}
                className={inp}
              >
                <option value="">— chọn —</option>
                {tenPhucHoi.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* điều kiện chạy */}
        <div className="rounded-md border border-neutral-800 bg-neutral-950/40 p-2">
          <ChkBox
            tick={!!buoc.chayKhi}
            doi={(v) =>
              doi({ ...buoc, chayKhi: v ? { selector: '', dieuKien: 'co-mat' } : undefined })
            }
          >
            Chỉ chạy bước này khi…
          </ChkBox>
          {buoc.chayKhi && (
            <div className="mt-2 space-y-2">
              <OSelector
                nhan="Phần tử để kiểm tra"
                giaTri={buoc.chayKhi.selector}
                doi={(v) => doi({ ...buoc, chayKhi: { ...buoc.chayKhi, selector: v } })}
              />
              <select
                value={buoc.chayKhi.dieuKien}
                onChange={(e) =>
                  doi({
                    ...buoc,
                    chayKhi: { ...buoc.chayKhi, dieuKien: e.target.value },
                  })
                }
                className={inp}
              >
                <option value="co-mat">…phần tử đó ĐANG HIỆN</option>
                <option value="vang-mat">…phần tử đó ĐANG ẨN / không có</option>
              </select>
            </div>
          )}
        </div>

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

/**
 * @param {object} props
 * @param {string} props.ten
 * @param {string} props.selectorDong
 * @param {number} [props.gioiHan]
 * @param {import('@/lib/kich-ban/loai').CotDuLieu[]} props.cot
 * @param {(x: { ten?: string, selectorDong?: string, gioiHan?: number, cot?: import('@/lib/kich-ban/loai').CotDuLieu[] }) => void} props.doi
 */
function BangForm({ ten, selectorDong, gioiHan, cot, doi }) {
  const datCot = (i, c) => doi({ cot: cot.map((x, j) => (i === j ? { ...x, ...c } : x)) })

  const chenCot = (viTri) =>
    doi({
      cot: [
        ...cot.slice(0, viTri),
        { ten: `cot_${cot.length + 1}`, nguon: { kieu: 'text' } },
        ...cot.slice(viTri),
      ],
    })

  const chuyenCot = (i, huong) => {
    const j = i + huong
    if (j < 0 || j >= cot.length) return
    const ds = [...cot]
    ;[ds[i], ds[j]] = [ds[j], ds[i]]
    doi({ cot: ds })
  }

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
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px] font-medium text-neutral-400">Các cột ({cot.length})</span>
          <button
            type="button"
            onClick={() => chenCot(cot.length)}
            className="rounded border border-neutral-700 px-2 py-0.5 text-[11px] text-neutral-300 hover:bg-neutral-800"
          >
            + Thêm cột ở cuối
          </button>
        </div>

        {/* Giữa mọi cặp cột cũng có điểm "+" để chèn đúng chỗ, và ↑↓ để đổi thứ tự
            — thứ tự cột chính là thứ tự cột trong bảng kết quả và file CSV. */}
        <div>
          <ChenDong chen={() => chenCot(0)} />
          {cot.map((c, i) => (
            <div key={i}>
            <div className="rounded border border-neutral-800 bg-neutral-900/50 p-2">
              <div className="mb-1.5 flex gap-1.5">
                <input
                  value={c.ten}
                  onChange={(e) => datCot(i, { ten: e.target.value })}
                  placeholder="tên_cột"
                  className={`${inp} font-mono text-emerald-300`}
                />
                <button
                  type="button"
                  title="Đưa cột lên"
                  onClick={() => chuyenCot(i, -1)}
                  disabled={i === 0}
                  className="shrink-0 rounded border border-neutral-700 px-1.5 text-xs text-neutral-500 hover:text-neutral-200 disabled:opacity-25"
                >
                  ↑
                </button>
                <button
                  type="button"
                  title="Đưa cột xuống"
                  onClick={() => chuyenCot(i, 1)}
                  disabled={i === cot.length - 1}
                  className="shrink-0 rounded border border-neutral-700 px-1.5 text-xs text-neutral-500 hover:text-neutral-200 disabled:opacity-25"
                >
                  ↓
                </button>
                <button
                  type="button"
                  title="Nhân bản cột"
                  onClick={() => doi({ cot: [...cot.slice(0, i + 1), structuredClone(c), ...cot.slice(i + 1)] })}
                  className="shrink-0 rounded border border-neutral-700 px-1.5 text-xs text-neutral-500 hover:text-neutral-200"
                >
                  ⧉
                </button>
                <button
                  type="button"
                  title="Xoá cột"
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
            <ChenDong chen={() => chenCot(i + 1)} />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

/** Điểm chèn mảnh dùng cho danh sách cột — chỉ hiện khi rê chuột vào. */
function ChenDong({ chen }) {
  return (
    <button
      type="button"
      onClick={chen}
      title="Chèn một cột vào đây"
      className="group flex h-4 w-full items-center gap-2"
    >
      <span className="h-px flex-1 bg-transparent transition-colors group-hover:bg-neutral-700" />
      <span className="flex h-4 w-4 items-center justify-center rounded-full border border-neutral-700 text-[10px] leading-none text-neutral-600 opacity-0 transition-opacity group-hover:opacity-100">
        +
      </span>
      <span className="h-px flex-1 bg-transparent transition-colors group-hover:bg-neutral-700" />
    </button>
  )
}

/**
 * @param {object} props
 * @param {import('@/lib/kich-ban/loai').Nguon} props.nguon
 * @param {(n: import('@/lib/kich-ban/loai').Nguon) => void} props.doi
 */
function NguonChon({ nguon, doi }) {
  return (
    <div>
      <label className={lbl}>Lấy gì</label>
      <div className="flex gap-1.5">
        <select
          value={nguon.kieu}
          onChange={(e) => {
            const k = e.target.value
            if (k === 'thuoc-tinh') doi({ kieu: 'thuoc-tinh', ten: 'href' })
            else if (k === 'bien') doi({ kieu: 'bien', ten: 'DONG.' })
            else doi({ kieu: k })
          }}
          className={inp}
        >
          <option value="text">Chữ (text)</option>
          <option value="thuoc-tinh">Thuộc tính</option>
          <option value="html">HTML bên trong</option>
          <option value="bien">Biến (không đọc DOM)</option>
        </select>
        {nguon.kieu === 'thuoc-tinh' && (
          <input
            value={nguon.ten}
            onChange={(e) => doi({ kieu: 'thuoc-tinh', ten: e.target.value })}
            placeholder="href"
            className={`${inp} font-mono`}
          />
        )}
        {nguon.kieu === 'bien' && (
          <input
            value={nguon.ten}
            onChange={(e) => doi({ kieu: 'bien', ten: e.target.value })}
            placeholder="DONG.so_hieu"
            title="DONG.<tên cột> trong vòng lặp mỗi dòng, LAP_SO, hoặc biến trong .env.local"
            className={`${inp} font-mono`}
          />
        )}
      </div>
    </div>
  )
}

/**
 * @param {object} props
 * @param {boolean} props.tick
 * @param {(v: boolean) => void} props.doi
 * @param {import('react').ReactNode} props.children
 */
function ChkBox({ tick, doi, children }) {
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

/**
 * @param {object} props
 * @param {import('react').ReactNode} props.children
 * @param {() => void} props.onClick
 * @param {string} props.title
 * @param {boolean} [props.disabled]
 * @param {boolean} [props.nguyHiem]
 */
function IconBtn({ children, onClick, title, disabled, nguyHiem }) {
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
