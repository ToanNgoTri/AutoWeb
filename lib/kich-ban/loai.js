/**
 * Định nghĩa kịch bản tự động hoá. File này THUẦN (không import playwright)
 * để cả UI phía client lẫn engine phía server dùng chung.
 *
 * Selector nhận cú pháp Playwright: CSS (`#id`, `.class`), `text=Đăng nhập`,
 * `role=button[name="Tìm kiếm"]`, `xpath=//div`.
 *
 * Các kiểu dữ liệu mô tả bằng JSDoc — chỉ để editor gợi ý, lúc chạy không có
 * kiểm tra nào, nên hàm kiemTraKichBan() bên dưới mới là chỗ chặn cấu hình sai.
 */

/**
 * Nguồn lấy dữ liệu ra khỏi một phần tử. `kieu` quyết định có cần `ten` không:
 *  - 'text'        : text của phần tử
 *  - 'html'        : innerHTML
 *  - 'thuoc-tinh'  : cần `ten` — href, src, value, lawid, data-*…
 *  - 'bien'        : cần `ten` — KHÔNG đọc từ DOM mà lấy từ BIẾN đang có:
 *                    {{DONG.ten_cot}} của vòng lặp "mỗi dòng", {{LAP_SO}}, hoặc
 *                    biến trong .env.local. Dùng để ghép dữ liệu dòng gốc với
 *                    dữ liệu bóc được ở trang con.
 *
 * @typedef {{ kieu: 'text' | 'html' | 'thuoc-tinh' | 'bien', ten?: string }} Nguon
 */

/**
 * @typedef {object} CotDuLieu
 * @property {string} ten tên cột trong bảng kết quả
 * @property {string} [selector] selector TƯƠNG ĐỐI trong mỗi dòng; bỏ trống = lấy chính dòng đó
 * @property {Nguon} nguon
 * @property {string} [regex] bóc tiếp từ giá trị thô; dùng nhóm 1 nếu có, không khớp thì để trống
 */

/**
 * Điều kiện kiểm bằng cách xem một phần tử đang hiện hay đang ẩn.
 * Dùng cho "chỉ chạy bước này khi…", cho điều kiện dừng vòng lặp, và cho dấu
 * hiệu nhận biết phiên đăng nhập đã mất.
 *
 * @typedef {{ selector: string, dieuKien: 'co-mat' | 'vang-mat' }} DieuKienChay
 */

/**
 * Dấu hiệu nhận biết cần phục hồi. Mở rộng của DieuKienChay: ngoài phần tử,
 * còn nhận ra bằng URL — site đá về trang chủ / trang đăng nhập là biết mất
 * phiên, kể cả khi không có phần tử nào bám được.
 *
 *  - kieu 'phan-tu' (mặc định, cũng là dạng của mọi kịch bản cũ): xét selector
 *  - kieu 'url'    : xét URL hiện tại
 *  - kieu 'ca-hai' : phải thoả CẢ HAI mới coi là mất phiên (ít báo nhầm nhất)
 *
 * @typedef {object} DauHieu
 * @property {'phan-tu' | 'url' | 'ca-hai'} [kieu] bỏ trống = 'phan-tu'
 * @property {string} [selector]
 * @property {'co-mat' | 'vang-mat'} [dieuKien]
 * @property {string} [url] mẫu URL — xem khopMauUrl()
 * @property {'khop' | 'khong-khop'} [dieuKienUrl] bỏ trống = 'khop'
 */

/**
 * URL hiện tại có khớp mẫu người dùng khai không.
 *
 * Ba cách viết mẫu, cố ý KHÔNG mặc định "chứa chuỗi" — vì
 * `https://thuvienphapluat.vn/` là tiền tố của mọi trang trong site, để mặc
 * định chứa-chuỗi thì dấu hiệu lúc nào cũng đúng và phục hồi chạy vô tận:
 *
 *  - `https://thuvienphapluat.vn`         khớp ĐÚNG URL đó (bỏ qua hoa/thường,
 *                                         dấu `/` thừa ở cuối, `#` `?` rỗng)
 *  - `https://thuvienphapluat.vn/*`       có `*` = khớp mẫu, `*` thay cho đoạn bất kỳ
 *  - `/dang-nhap|login/i`                 bọc trong `/.../` = regex
 *
 * @param {string} url URL hiện tại
 * @param {string} mau mẫu người dùng khai
 * @returns {boolean}
 */
export function khopMauUrl(url, mau) {
  const m = (mau ?? '').trim()
  if (!m) return false

  const laRegex = m.match(/^\/(.+)\/([a-z]*)$/)
  if (laRegex) {
    try {
      return new RegExp(laRegex[1], laRegex[2] || 'i').test(url)
    } catch {
      return false // regex sai cú pháp → coi như không khớp, đừng phục hồi bừa
    }
  }

  const chuan = (s) =>
    s
      .trim()
      .toLowerCase()
      .replace(/[?#]$/, '')
      .replace(/\/+$/, '')

  if (m.includes('*')) {
    let than = chuan(m)
    // "https://site.vn/*" phải khớp cả chính "https://site.vn" — người khai
    // muốn nói "trang này và mọi trang con", chứ không phải "chỉ trang con".
    let duoi = ''
    if (than.endsWith('/*')) {
      than = than.slice(0, -2)
      duoi = '(/.*)?'
    }
    const re =
      than
        .split('*')
        .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('.*') + duoi
    try {
      return new RegExp(`^${re}$`).test(chuan(url))
    } catch {
      return false
    }
  }

  return chuan(url) === chuan(m)
}

/**
 * Mô tả dấu hiệu bằng tiếng Việt, dùng cho log.
 *
 * @param {DauHieu} d
 * @returns {string}
 */
export function moTaDauHieu(d) {
  const pt = `${d.selector} ${d.dieuKien === 'vang-mat' ? 'vắng mặt' : 'có mặt'}`
  const u = `URL ${d.dieuKienUrl === 'khong-khop' ? 'KHÔNG khớp' : 'khớp'} "${d.url}"`
  if (d.kieu === 'url') return u
  if (d.kieu === 'ca-hai') return `${pt} VÀ ${u}`
  return pt
}

/**
 * Hành động của một bước. `loai` quyết định các trường còn lại:
 *
 *  - 'mo-trang'    : { url, choSelector? }
 *  - 'cho'         : { selector?, trangThai?: 'hien' | 'an', ms? }
 *  - 'dien'        : { selector, giaTri, tungKyTu?, enterSauKhiXong? }
 *                    tungKyTu = gõ từng ký tự (thấy được) thay vì đổ một cục;
 *                    enterSauKhiXong = bấm Enter sau khi điền xong.
 *  - 'chon'        : { selector, giaTri }
 *  - 'bam'         : { selector, choDieuHuong? }
 *  - 'nhan-phim'   : { selector?, phim }
 *  - 'cuon-den'    : { selector }
 *  - 'khang-dinh'  : { selector, dieuKien: 'co-mat' | 'vang-mat' | 'chua-chu', chu?, batBuoc? }
 *                    batBuoc: true = sai thì dừng cả kịch bản; false = chỉ ghi
 *                    log rồi đi tiếp.
 *  - 'lay-bang'    : { ten, selectorDong, gioiHan?, cot: CotDuLieu[] }
 *  - 'lay-mot'     : { ten, selector, nguon, regex? }
 *  - 'chay-js'     : { ten?, ma }
 *  - 'lap'         : { kieu, soLan?, tenBang?, dungKhi?, toiDa?, buoc: Buoc[] }
 *                    Vòng lặp: các bước con chạy lại nhiều lượt. Ba kiểu:
 *                      'so-lan'      : lặp đúng `soLan` lượt
 *                      'moi-dong'    : lặp một lượt cho MỖI DÒNG của bảng
 *                                      `tenBang` đã bóc trước đó; trong thân lặp
 *                                      dùng {{DONG.ten_cot}}
 *                      'cho-den-khi' : lặp tới khi `dungKhi` thoả (có trần `toiDa`)
 *                    Trong mọi kiểu, {{LAP_SO}} là số lượt hiện tại (đếm từ 1).
 *  - 'goi-phuc-hoi': { tenPhucHoi } — gọi một quy trình phục hồi đã khai ở mục
 *                    "Phục hồi" của kịch bản.
 *
 * @typedef {{ loai: LoaiHanhDong } & Record<string, any>} HanhDong
 *
 * @typedef {'mo-trang'|'cho'|'dien'|'chon'|'bam'|'nhan-phim'|'cuon-den'|'khang-dinh'|'lay-bang'|'lay-mot'|'chay-js'|'lap'|'goi-phuc-hoi'} LoaiHanhDong
 */

/**
 * @typedef {object} Buoc
 * @property {string} id
 * @property {string} [nhan] nhãn hiện trên timeline & spotlight; bỏ trống thì tự sinh từ hành động
 * @property {boolean} [tat] tắt tạm bước này mà không phải xoá
 * @property {boolean} [boQuaLoi] lỗi ở bước này thì ghi log rồi đi tiếp, không dừng kịch bản
 * @property {DieuKienChay} [chayKhi] chỉ chạy bước này khi điều kiện thoả
 * @property {HanhDong} hanhDong
 */

/**
 * Quy trình phục hồi. Engine kiểm `khi` TRƯỚC MỖI BƯỚC và cả khi một bước lỗi;
 * thoả thì chạy `buoc` rồi thử lại bước đang dở. Đây là cách xử lý "đang chạy
 * giữa đường thì bị đăng xuất và site quay về màn hình chính".
 *
 * @typedef {object} PhucHoi
 * @property {string} ten tên để gọi bằng hành động "Gọi phục hồi"
 * @property {DauHieu} khi dấu hiệu cần phục hồi: ô đăng nhập hiện lại, hoặc URL bị đá về trang chủ
 * @property {Buoc[]} buoc
 * @property {boolean} [tuKichHoat] false = chỉ chạy khi được gọi tay, không tự kích hoạt
 * @property {boolean} [quayLaiTrang] bỏ trống = true. Sau khi khắc phục xong, nếu đang đứng ở
 *   trang khác thì tự mở lại trang dở dang trước lúc mất phiên rồi mới chạy tiếp
 */

/**
 * @typedef {object} KichBan
 * @property {string} ten
 * @property {string} [moTa]
 * @property {Buoc[]} buoc
 * @property {PhucHoi[]} [phucHoi] các quy trình phục hồi dùng chung cho cả kịch bản
 */

/**
 * Metadata để UI dựng form — mô tả từng loại hành động và các trường của nó.
 * `coSelector` = loại này cần selector (để hiện nút chọn phần tử).
 *
 * @type {{ loai: LoaiHanhDong, nhan: string, moTa: string, coSelector: boolean }[]}
 */
export const META_HANH_DONG = [
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
  { loai: 'lap', nhan: 'Vòng lặp', moTa: 'Chạy lại nhóm bước con: N lượt / mỗi dòng của bảng / tới khi thoả điều kiện', coSelector: false },
  { loai: 'goi-phuc-hoi', nhan: 'Gọi phục hồi', moTa: 'Chạy một quy trình phục hồi đã khai (ví dụ: đăng nhập)', coSelector: false },
]

/**
 * Hành động rỗng mặc định khi người dùng thêm bước mới.
 *
 * @param {LoaiHanhDong} loai
 * @returns {HanhDong}
 */
export function hanhDongMacDinh(loai) {
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
    case 'lap':
      return { loai, kieu: 'so-lan', soLan: 3, toiDa: 50, buoc: [] }
    case 'goi-phuc-hoi':
      return { loai, tenPhucHoi: '' }
    default:
      throw new Error(`Loại hành động không biết: ${loai}`)
  }
}

/**
 * Nhãn tự sinh, dùng cho timeline và cho spotlight trên trang.
 *
 * @param {Buoc} b
 * @returns {string}
 */
export function moTaBuoc(b) {
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
    case 'lap':
      return a.kieu === 'so-lan'
        ? `Lặp ${a.soLan ?? '?'} lượt (${a.buoc.length} bước con)`
        : a.kieu === 'moi-dong'
          ? `Lặp theo mỗi dòng của bảng "${a.tenBang ?? '?'}" (${a.buoc.length} bước con)`
          : `Lặp tới khi ${a.dungKhi?.selector ?? '?'} ${
              a.dungKhi?.dieuKien === 'co-mat' ? 'hiện ra' : 'ẩn đi'
            } (${a.buoc.length} bước con)`
    case 'goi-phuc-hoi':
      return `Gọi phục hồi "${a.tenPhucHoi}"`
    default:
      return a.loai
  }
}

/**
 * Trả về danh sách lỗi cấu hình; rỗng = hợp lệ. Đi đệ quy vào bước con.
 *
 * @param {KichBan} kb
 * @returns {string[]}
 */
export function kiemTraKichBan(kb) {
  const loi = []
  if (!kb.ten.trim()) loi.push('Kịch bản chưa có tên.')

  const tenPhucHoi = new Set((kb.phucHoi ?? []).map((p) => p.ten.trim()).filter(Boolean))

  ;(kb.phucHoi ?? []).forEach((p, i) => {
    const nhan = `Phục hồi ${i + 1}`
    if (!p.ten.trim()) loi.push(`${nhan}: chưa có tên`)
    const kieuDauHieu = p.khi?.kieu ?? 'phan-tu'
    if (kieuDauHieu !== 'url' && !p.khi?.selector?.trim())
      loi.push(`${nhan} ("${p.ten}"): thiếu selector dấu hiệu`)
    if (kieuDauHieu !== 'phan-tu' && !p.khi?.url?.trim())
      loi.push(`${nhan} ("${p.ten}"): thiếu mẫu URL làm dấu hiệu`)
    if (p.buoc.length === 0) loi.push(`${nhan} ("${p.ten}"): chưa có bước nào`)
    loi.push(...kiemTraDanhSach(p.buoc, `${nhan} ("${p.ten}") › `, tenPhucHoi))
  })

  if (kb.buoc.filter((b) => !b.tat).length === 0) loi.push('Kịch bản chưa có bước nào đang bật.')
  loi.push(...kiemTraDanhSach(kb.buoc, '', tenPhucHoi))
  return loi
}

/**
 * @param {Buoc[]} ds
 * @param {string} duong
 * @param {Set<string>} tenPhucHoi
 * @returns {string[]}
 */
function kiemTraDanhSach(ds, duong, tenPhucHoi) {
  const loi = []
  ds.filter((b) => !b.tat).forEach((b, i) => {
    const a = b.hanhDong
    const ten = META_HANH_DONG.find((m) => m.loai === a.loai)?.nhan
    const o = (msg) => loi.push(`${duong}Bước ${i + 1} (${ten}): ${msg}`)

    switch (a.loai) {
      case 'mo-trang':
        // URL có thể chứa {{BIEN}} nên chỉ biết được lúc chạy — chỉ chặn khi
        // vừa không có biến, vừa không phải http(s).
        if (!/\{\{\s*[A-Z0-9_.]+\s*\}\}/i.test(a.url) && !/^https?:\/\/.+/i.test(a.url))
          o('URL phải bắt đầu bằng http:// hoặc https://, hoặc chứa biến {{...}}')
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
          if (c.nguon.kieu === 'bien' && !c.nguon.ten.trim()) o(`cột ${j + 1} thiếu tên biến`)
        })
        break
      case 'lay-mot':
        if (!a.ten.trim()) o('thiếu tên giá trị')
        if (!a.selector.trim()) o('thiếu selector')
        break
      case 'chay-js':
        if (!a.ma.trim()) o('chưa có mã JS')
        break
      case 'lap': {
        if (a.buoc.filter((x) => !x.tat).length === 0) o('vòng lặp chưa có bước con nào đang bật')
        if (a.kieu === 'so-lan' && !(a.soLan && a.soLan > 0)) o('số lượt lặp phải > 0')
        if (a.kieu === 'moi-dong' && !a.tenBang?.trim()) o('thiếu tên bảng để lặp theo dòng')
        if (a.kieu === 'cho-den-khi') {
          if (!a.dungKhi?.selector.trim()) o('thiếu selector cho điều kiện dừng')
          if (!(a.toiDa && a.toiDa > 0)) o('cần đặt số lượt tối đa để tránh lặp vô hạn')
        }
        loi.push(...kiemTraDanhSach(a.buoc, `${duong}Bước ${i + 1} › `, tenPhucHoi))
        break
      }
      case 'goi-phuc-hoi':
        if (!a.tenPhucHoi.trim()) o('chưa chọn quy trình phục hồi')
        else if (!tenPhucHoi.has(a.tenPhucHoi.trim()))
          o(`không có quy trình phục hồi nào tên "${a.tenPhucHoi}"`)
        break
    }

    if (a.loai === 'khang-dinh' && a.dieuKien === 'chua-chu' && !a.chu?.trim()) o('thiếu chữ cần chứa')
    if (b.chayKhi && !b.chayKhi.selector.trim()) o('điều kiện "chỉ chạy khi" thiếu selector')
  })
  return loi
}

/**
 * Tóm tắt một kịch bản đã lưu trên disk.
 *
 * @typedef {{ file: string, ten: string, moTa?: string, soBuoc: number }} TomTat
 */

export function idMoi(prefix = 'b') {
  return `${prefix}${Math.random().toString(36).slice(2, 9)}`
}
