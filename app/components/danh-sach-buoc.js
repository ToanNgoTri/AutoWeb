'use client'

import { hanhDongMacDinh, idMoi } from '@/lib/kich-ban/loai'
import { ChenBuoc } from './chen-buoc'
import { TheBuoc } from './the-buoc'

/**
 * Danh sách bước có điểm chèn ở mọi khe. Dùng cho cả kịch bản chính, thân vòng
 * lặp (lồng bao nhiêu tầng cũng được) và các quy trình phục hồi.
 *
 * Mọi phép sửa (chèn / xoá / đổi thứ tự / nhân bản) gói gọn trong đây, cha chỉ
 * cần nhận mảng mới qua `doi` — nên không có giới hạn cứng nào về số bước.
 *
 * @param {object} props
 * @param {import('@/lib/kich-ban/loai').Buoc[]} props.ds
 * @param {(ds: import('@/lib/kich-ban/loai').Buoc[]) => void} props.doi
 * @param {string} [props.nhanThemCuoi]
 * @param {boolean} [props.trongVongLap] true = đang là thân vòng lặp; chỉ dùng để đổi lời nhắc khi rỗng
 */
export function DanhSachBuoc({ ds, doi, nhanThemCuoi = 'Thêm bước ở cuối', trongVongLap }) {
  const chen = (viTri, loai) =>
    doi([...ds.slice(0, viTri), { id: idMoi(), hanhDong: hanhDongMacDinh(loai) }, ...ds.slice(viTri)])

  const datBuoc = (i, b) => doi(ds.map((x, j) => (i === j ? b : x)))
  const xoa = (i) => doi(ds.filter((_, j) => j !== i))
  const nhanBan = (i) =>
    doi([...ds.slice(0, i + 1), { ...structuredClone(ds[i]), id: idMoi() }, ...ds.slice(i + 1)])
  const chuyen = (i, huong) => {
    const j = i + huong
    if (j < 0 || j >= ds.length) return
    const moi = [...ds]
    ;[moi[i], moi[j]] = [moi[j], moi[i]]
    doi(moi)
  }

  if (ds.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-800 px-4 py-6 text-center">
        <p className="mb-3 text-xs text-neutral-600">
          {trongVongLap
            ? 'Vòng lặp chưa có bước con nào. Thêm những bước cần làm lại mỗi lượt.'
            : 'Chưa có bước nào.'}
        </p>
        <div className="mx-auto max-w-xs">
          <ChenBuoc kieu="nut" nhan="Thêm bước đầu tiên" chen={(l) => chen(0, l)} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <ChenBuoc chen={(l) => chen(0, l)} />
      {ds.map((b, i) => (
        <div key={b.id}>
          <TheBuoc
            buoc={b}
            thuTu={i + 1}
            tong={ds.length}
            doi={(x) => datBuoc(i, x)}
            xoa={() => xoa(i)}
            chuyen={(h) => chuyen(i, h)}
            nhanBan={() => nhanBan(i)}
          />
          <ChenBuoc chen={(l) => chen(i + 1, l)} />
        </div>
      ))}
      <div className="mt-1">
        <ChenBuoc kieu="nut" nhan={nhanThemCuoi} chen={(l) => chen(ds.length, l)} />
      </div>
    </div>
  )
}
