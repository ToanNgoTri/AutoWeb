import type { KichBan } from './loai'

export type TrangThaiBuoc = 'cho' | 'dang-chay' | 'xong' | 'loi' | 'bo-qua'

export type KetQuaChay = {
  tenKichBan: string
  batDau: string
  ketThuc: string
  urlCuoi: string
  /** dữ liệu từ các bước "lấy bảng", khoá là tên bảng */
  bang: Record<string, Record<string, string | null>[]>
  /** dữ liệu từ các bước "lấy một giá trị" và "chạy JS" */
  giaTri: Record<string, unknown>
}

/** Event đẩy về UI theo dòng NDJSON. */
export type SuKien =
  | { type: 'buoc'; index: number; nhan: string; trangThai: TrangThaiBuoc; chiTiet?: string }
  | { type: 'shot'; jpegBase64: string }
  | { type: 'log'; msg: string }
  | { type: 'can-nguoi'; msg: string }
  | { type: 'xong'; ketQua: KetQuaChay }
  | { type: 'loi'; msg: string }
  | { type: 'ket-thuc' }

export type Emit = (e: SuKien) => void

export type YeuCauChay = {
  kichBan: KichBan
  pace?: string
}
