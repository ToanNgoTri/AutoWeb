/**
 * Định nghĩa kịch bản tự động hoá. File này THUẦN (không import playwright)
 * để cả UI phía client lẫn engine phía server dùng chung.
 *
 * Selector nhận cú pháp Playwright: CSS (`#id`, `.class`), `text=Đăng nhập`,
 * `role=button[name="Tìm kiếm"]`, `xpath=//div`.
 */

/** Nguồn lấy dữ liệu ra khỏi một phần tử. */
export type Nguon =
  | { kieu: 'text' }
  | { kieu: 'html' }
  | { kieu: 'thuoc-tinh'; ten: string } // href, src, value, lawid, data-*…

export type CotDuLieu = {
  /** tên cột trong bảng kết quả */
  ten: string
  /** selector TƯƠNG ĐỐI trong mỗi dòng; bỏ trống = lấy chính dòng đó */
  selector?: string
  nguon: Nguon
  /** regex bóc tiếp từ giá trị thô; dùng nhóm 1 nếu có, không khớp thì để trống */
  regex?: string
}

export type HanhDong =
  | { loai: 'mo-trang'; url: string; choSelector?: string }
  | { loai: 'cho'; selector?: string; trangThai?: 'hien' | 'an'; ms?: number }
  | {
      loai: 'dien'
      selector: string
      giaTri: string
      /** gõ từng ký tự (thấy được) thay vì đổ một cục */
      tungKyTu?: boolean
      /** bấm Enter sau khi điền xong */
      enterSauKhiXong?: boolean
    }
  | { loai: 'chon'; selector: string; giaTri: string }
  | { loai: 'bam'; selector: string; choDieuHuong?: boolean }
  | { loai: 'nhan-phim'; selector?: string; phim: string }
  | { loai: 'cuon-den'; selector: string }
  | {
      loai: 'khang-dinh'
      selector: string
      dieuKien: 'co-mat' | 'vang-mat' | 'chua-chu'
      chu?: string
      /** true = sai thì dừng cả kịch bản; false = chỉ ghi log rồi đi tiếp */
      batBuoc?: boolean
    }
  | { loai: 'lay-bang'; ten: string; selectorDong: string; gioiHan?: number; cot: CotDuLieu[] }
  | { loai: 'lay-mot'; ten: string; selector: string; nguon: Nguon; regex?: string }
  | { loai: 'chay-js'; ten?: string; ma: string }

export type LoaiHanhDong = HanhDong['loai']

export type Buoc = {
  id: string
  /** nhãn hiện trên timeline & spotlight; bỏ trống thì tự sinh từ hành động */
  nhan?: string
  /** tắt tạm bước này mà không phải xoá */
  tat?: boolean
  /** lỗi ở bước này thì ghi log rồi đi tiếp, không dừng kịch bản */
  boQuaLoi?: boolean
  hanhDong: HanhDong
}

export type KichBan = {
  ten: string
  moTa?: string
  buoc: Buoc[]
}

/** Metadata để UI dựng form — mô tả từng loại hành động và các trường của nó. */
export const META_HANH_DONG: {
  loai: LoaiHanhDong
  nhan: string
  moTa: string
  /** trường nào cần selector (để hiện nút chọn phần tử) */
  coSelector: boolean
}[] = [
  { loai: 'mo-trang', nhan: 'Mở trang', moTa: 'Điều hướng tới một URL', coSelector: false },
  { loai: 'cho', nhan: 'Chờ', moTa: 'Chờ phần tử hiện/ẩn, hoặc chờ số ms', coSelector: true },
  { loai: 'dien', nhan: 'Điền', moTa: 'Gõ chữ vào input/textarea', coSelector: true },
  { loai: 'chon', nhan: 'Chọn dropdown', moTa: 'selectOption theo value', coSelector: true },
  { loai: 'bam', nhan: 'Bấm', moTa: 'Click, có thể chờ điều hướng', coSelector: true },
  { loai: 'nhan-phim', nhan: 'Nhấn phím', moTa: 'Enter, Tab, Escape, ArrowDown…', coSelector: true },
  { loai: 'cuon-den', nhan: 'Cuộn đến', moTa: 'Cuộn phần tử vào khung nhìn', coSelector: true },
  { loai: 'khang-dinh', nhan: 'Khẳng định', moTa: 'Kiểm tra điều kiện, sai thì báo', coSelector: true },
  { loai: 'lay-bang', nhan: 'Lấy bảng', moTa: 'Bóc nhiều dòng thành bảng nhiều cột', coSelector: true },
  { loai: 'lay-mot', nhan: 'Lấy một giá trị', moTa: 'Bóc một giá trị đơn lẻ', coSelector: true },
  { loai: 'chay-js', nhan: 'Chạy JS', moTa: 'Cửa sau: chạy JS trong trang, lấy giá trị trả về', coSelector: false },
]

/** Hành động rỗng mặc định khi người dùng thêm bước mới. */
export function hanhDongMacDinh(loai: LoaiHanhDong): HanhDong {
  switch (loai) {
    case 'mo-trang':
      return { loai, url: 'https://' }
    case 'cho':
      return { loai, selector: '', trangThai: 'hien' }
    case 'dien':
      return { loai, selector: '', giaTri: '', tungKyTu: true }
    case 'chon':
      return { loai, selector: '', giaTri: '' }
    case 'bam':
      return { loai, selector: '', choDieuHuong: false }
    case 'nhan-phim':
      return { loai, phim: 'Enter' }
    case 'cuon-den':
      return { loai, selector: '' }
    case 'khang-dinh':
      return { loai, selector: '', dieuKien: 'co-mat', batBuoc: false }
    case 'lay-bang':
      return {
        loai,
        ten: 'ket_qua',
        selectorDong: '',
        cot: [{ ten: 'noi_dung', nguon: { kieu: 'text' } }],
      }
    case 'lay-mot':
      return { loai, ten: 'gia_tri', selector: '', nguon: { kieu: 'text' } }
    case 'chay-js':
      return { loai, ma: 'return document.title' }
  }
}

/** Nhãn tự sinh, dùng cho timeline và cho spotlight trên trang. */
export function moTaBuoc(b: Buoc): string {
  if (b.nhan?.trim()) return b.nhan.trim()
  const a = b.hanhDong
  switch (a.loai) {
    case 'mo-trang':
      return `Mở ${a.url}`
    case 'cho':
      return a.ms ? `Chờ ${a.ms}ms` : `Chờ ${a.selector} ${a.trangThai === 'an' ? 'ẩn đi' : 'hiện ra'}`
    case 'dien':
      return `Điền vào ${a.selector}`
    case 'chon':
      return `Chọn ${a.giaTri} ở ${a.selector}`
    case 'bam':
      return `Bấm ${a.selector}`
    case 'nhan-phim':
      return `Nhấn ${a.phim}`
    case 'cuon-den':
      return `Cuộn đến ${a.selector}`
    case 'khang-dinh':
      return `Khẳng định ${a.selector} ${
        a.dieuKien === 'co-mat' ? 'có mặt' : a.dieuKien === 'vang-mat' ? 'vắng mặt' : `chứa "${a.chu}"`
      }`
    case 'lay-bang':
      return `Lấy bảng "${a.ten}" từ ${a.selectorDong}`
    case 'lay-mot':
      return `Lấy "${a.ten}" từ ${a.selector}`
    case 'chay-js':
      return a.ten ? `Chạy JS → ${a.ten}` : 'Chạy JS'
  }
}

/** Trả về danh sách lỗi cấu hình; rỗng = hợp lệ. */
export function kiemTraKichBan(kb: KichBan): string[] {
  const loi: string[] = []
  if (!kb.ten.trim()) loi.push('Kịch bản chưa có tên.')
  const dung = kb.buoc.filter((b) => !b.tat)
  if (dung.length === 0) loi.push('Kịch bản chưa có bước nào đang bật.')

  dung.forEach((b, i) => {
    const a = b.hanhDong
    const o = (msg: string) => loi.push(`Bước ${i + 1} (${META_HANH_DONG.find((m) => m.loai === a.loai)?.nhan}): ${msg}`)
    switch (a.loai) {
      case 'mo-trang':
        if (!/^https?:\/\/.+/i.test(a.url)) o('URL phải bắt đầu bằng http:// hoặc https://')
        break
      case 'cho':
        if (!a.selector?.trim() && !a.ms) o('cần selector hoặc số ms')
        break
      case 'dien':
      case 'chon':
      case 'bam':
      case 'cuon-den':
      case 'khang-dinh':
        if (!a.selector.trim()) o('thiếu selector')
        break
      case 'nhan-phim':
        if (!a.phim.trim()) o('thiếu tên phím')
        break
      case 'lay-bang':
        if (!a.ten.trim()) o('thiếu tên bảng')
        if (!a.selectorDong.trim()) o('thiếu selector dòng')
        if (a.cot.length === 0) o('cần ít nhất một cột')
        a.cot.forEach((c, j) => {
          if (!c.ten.trim()) o(`cột ${j + 1} thiếu tên`)
          if (c.nguon.kieu === 'thuoc-tinh' && !c.nguon.ten.trim()) o(`cột ${j + 1} thiếu tên thuộc tính`)
        })
        break
      case 'lay-mot':
        if (!a.ten.trim()) o('thiếu tên giá trị')
        if (!a.selector.trim()) o('thiếu selector')
        break
      case 'chay-js':
        if (!a.ma.trim()) o('chưa có mã JS')
        break
    }
    if (a.loai === 'khang-dinh' && a.dieuKien === 'chua-chu' && !a.chu?.trim()) o('thiếu chữ cần chứa')
  })
  return loi
}

export function idMoi(prefix = 'b'): string {
  return `${prefix}${Math.random().toString(36).slice(2, 9)}`
}
