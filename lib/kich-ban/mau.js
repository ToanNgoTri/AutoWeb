import { idMoi } from './loai'

/**
 * @typedef {import('./loai').Buoc} Buoc
 * @typedef {import('./loai').KichBan} KichBan
 * @typedef {import('./loai').PhucHoi} PhucHoi
 */

/**
 * @param {string} id
 * @param {Omit<Buoc, 'id'>} x
 * @returns {Buoc}
 */
const b = (id, x) => ({ id, ...x })

/** URL kết quả tìm kiếm Nghị định mới nhất — chính là URL mà nút Tìm kiếm của TVPL điều hướng tới. */
const URL_KET_QUA =
  'https://thuvienphapluat.vn/page/tim-van-ban.aspx' +
  '?keyword=&area=0&type=11&status=0&lan=1&org=0&signer=0&match=True&sort=2&bdate=&edate='

/**
 * Quy trình phục hồi dùng chung: dấu hiệu là ô đăng nhập hiện trở lại.
 * Engine kiểm dấu hiệu này TRƯỚC MỖI BƯỚC và cả khi một bước lỗi, nên:
 *  - lần chạy đầu (chưa đăng nhập) → nó tự đăng nhập giúp
 *  - đang chạy giữa đường mà TVPL đăng xuất và đẩy về trang chủ → tự đăng nhập
 *    lại rồi thử lại đúng bước đang dở, không cần bắt đầu lại từ đầu
 *
 * @param {string} tienTo
 * @returns {PhucHoi}
 */
function phucHoiDangNhap(tienTo) {
  return {
    ten: 'Đăng nhập lại',
    // Dấu hiệu 'phan-tu': ô đăng nhập hiện trở lại. Đổi sang 'url' (hoặc
    // 'ca-hai') nếu site đá về một URL cố định mỗi khi mất phiên.
    khi: { kieu: 'phan-tu', selector: '.txt-account-Home', dieuKien: 'co-mat' },
    tuKichHoat: true,
    // Đăng nhập lại xong nhưng đang ở trang chủ → mở lại trang đang dở rồi mới chạy tiếp.
    quayLaiTrang: true,
    buoc: [
      b(`${tienTo}p1`, {
        nhan: 'Điền tên đăng nhập',
        hanhDong: {
          loai: 'dien',
          selector: '.txt-account-Home',
          giaTri: '{{TVPL_USERNAME}}',
          tungKyTu: true,
        },
      }),
      b(`${tienTo}p2`, {
        nhan: 'Điền mật khẩu',
        hanhDong: {
          loai: 'dien',
          selector: '.txt-password-Home',
          giaTri: '{{TVPL_PASSWORD}}',
          tungKyTu: true,
        },
      }),
      b(`${tienTo}p3`, { nhan: 'Bấm Đăng nhập', hanhDong: { loai: 'bam', selector: '#loginButton' } }),
      b(`${tienTo}p4`, {
        nhan: 'Chờ ô đăng nhập biến mất',
        boQuaLoi: true, // hết giờ thì để bước khẳng định bên dưới báo lỗi cho rõ
        hanhDong: { loai: 'cho', selector: '.txt-account-Home', trangThai: 'an' },
      }),
      b(`${tienTo}p5`, {
        nhan: 'Xác nhận đã đăng nhập được',
        hanhDong: {
          loai: 'khang-dinh',
          selector: '.txt-account-Home',
          dieuKien: 'vang-mat',
          batBuoc: true,
        },
      }),
    ],
  }
}

/**
 * Kịch bản mẫu 1: đúng luồng đã kiểm chứng trên thuvienphapluat.vn, dựng hoàn
 * toàn bằng các hành động cấu hình được. Nhân bản rồi sửa là dùng cho site khác.
 *
 * @type {KichBan}
 */
export const MAU_TVPL_NGHI_DINH = {
  ten: 'TVPL — Nghị định mới nhất',
  moTa:
    'Mở trang tra cứu, mở "+ Thêm điều kiện", chọn Loại văn bản = Nghị định, sắp xếp mới nhất, ' +
    'bấm Tìm kiếm rồi bóc bảng kết quả. Đăng nhập KHÔNG nằm trong danh sách bước mà là quy trình ' +
    'phục hồi tự kích hoạt — nên bị đăng xuất giữa đường cũng tự vào lại.',
  phucHoi: [phucHoiDangNhap('a')],
  buoc: [
    b('m01', {
      nhan: 'Mở trang Tra cứu Văn bản Pháp luật',
      hanhDong: {
        loai: 'mo-trang',
        url: 'https://thuvienphapluat.vn/page/tim-van-ban.aspx',
        choSelector: '#keywordTextBox', // chờ mốc này = vượt xong Cloudflare
      },
    }),

    // TVPL nhớ cookie Cookie_VB nên panel nâng cao có thể đang mở sẵn từ phiên
    // trước — một cú bấm lúc đó sẽ ĐÓNG nó. Hai bước có điều kiện, đối xứng.
    b('m02', {
      nhan: 'Panel đang mở sẵn → thu lại cho thấy cú bấm',
      chayKhi: { selector: '#documentTypeDropDownList', dieuKien: 'co-mat' },
      hanhDong: { loai: 'bam', selector: '.autohideClick' },
    }),
    b('m03', {
      nhan: 'Bấm "+ Thêm điều kiện" để mở tìm kiếm nâng cao',
      chayKhi: { selector: '#documentTypeDropDownList', dieuKien: 'vang-mat' },
      hanhDong: { loai: 'bam', selector: '.autohideClick' },
    }),
    b('m04', {
      nhan: 'Chờ panel nâng cao hiện ra',
      hanhDong: { loai: 'cho', selector: '#documentTypeDropDownList', trangThai: 'hien' },
    }),
    b('m05', {
      nhan: 'Loại văn bản → Nghị định',
      hanhDong: { loai: 'chon', selector: '#documentTypeDropDownList', giaTri: '11' },
    }),
    b('m06', {
      nhan: 'Sắp xếp → Văn bản mới ban hành nằm trên',
      hanhDong: { loai: 'chon', selector: '#sortDropDownList', giaTri: '2' },
    }),
    b('m07', {
      nhan: 'Bấm Tìm kiếm',
      hanhDong: { loai: 'bam', selector: '#btnKeyWord', choDieuHuong: true },
    }),
    b('m08', {
      nhan: 'Chờ danh sách kết quả',
      hanhDong: { loai: 'cho', selector: 'p.nqTitle', trangThai: 'hien' },
    }),
    b('m09', {
      nhan: 'Lấy tổng số văn bản',
      hanhDong: { loai: 'lay-mot', ten: 'tong_so_van_ban', selector: '#lbTotal', nguon: { kieu: 'text' } },
    }),
    b('m10', {
      nhan: 'Bóc bảng Nghị định',
      hanhDong: {
        loai: 'lay-bang',
        ten: 'nghi_dinh',
        selectorDong: 'div[class^="content-"]:has(p.nqTitle)',
        gioiHan: 20,
        cot: [
          { ten: 'stt', selector: '.number', nguon: { kieu: 'text' } },
          {
            ten: 'so_hieu',
            selector: 'p.nqTitle a',
            nguon: { kieu: 'text' },
            regex: '\\d+/\\d{4}/[A-ZĐ-]+',
          },
          { ten: 'tieu_de', selector: 'p.nqTitle a', nguon: { kieu: 'text' } },
          { ten: 'link', selector: 'p.nqTitle a', nguon: { kieu: 'thuoc-tinh', ten: 'href' } },
          { ten: 'law_id', selector: 'p.nqTitle', nguon: { kieu: 'thuoc-tinh', ten: 'lawid' } },
          {
            ten: 'ngay_ban_hanh',
            selector: '.right-col',
            nguon: { kieu: 'text' },
            regex: 'Ban hành:\\s*([\\d/]+)',
          },
          {
            ten: 'hieu_luc',
            selector: '.right-col',
            nguon: { kieu: 'text' },
            regex: 'Hiệu lực:\\s*(.*?)\\s*Tình trạng:',
          },
          {
            ten: 'tinh_trang',
            selector: '.right-col',
            nguon: { kieu: 'text' },
            regex: 'Tình trạng:\\s*(.*?)\\s*Cập nhật:',
          },
          {
            ten: 'ngay_cap_nhat',
            selector: '.right-col',
            nguon: { kieu: 'text' },
            regex: 'Cập nhật:\\s*([\\d/]+)',
          },
        ],
      },
    }),
  ],
}

/**
 * Kịch bản mẫu 2: ví dụ VÒNG LẶP theo kiểu "vào → làm việc → ra → vào lại".
 * Bóc danh sách một lần, rồi mỗi dòng: mở trang chi tiết, đối chiếu số hiệu và
 * ngày ký ghi trên văn bản với dữ liệu ở danh sách, rồi quay về danh sách.
 *
 * @type {KichBan}
 */
export const MAU_TVPL_VONG_LAP = {
  ten: 'TVPL — mở từng Nghị định rồi quay lại (ví dụ vòng lặp)',
  moTa:
    'Bóc 3 Nghị định mới nhất, sau đó LẶP theo từng dòng: mở trang chi tiết bằng {{DONG.link}}, ' +
    'đối chiếu số hiệu / ngày ký in trên văn bản, rồi quay về trang danh sách và làm dòng tiếp theo. ' +
    'Cột kiểu "Biến" cho phép ghép dữ liệu dòng gốc với dữ liệu bóc ở trang con.',
  phucHoi: [phucHoiDangNhap('b')],
  buoc: [
    b('v01', {
      nhan: 'Mở thẳng trang kết quả Nghị định mới nhất',
      hanhDong: { loai: 'mo-trang', url: URL_KET_QUA, choSelector: 'p.nqTitle' },
    }),
    b('v02', {
      nhan: 'Bóc danh sách 3 Nghị định đầu',
      hanhDong: {
        loai: 'lay-bang',
        ten: 'danh_sach',
        selectorDong: 'div[class^="content-"]:has(p.nqTitle)',
        gioiHan: 3,
        cot: [
          {
            ten: 'so_hieu',
            selector: 'p.nqTitle a',
            nguon: { kieu: 'text' },
            regex: '\\d+/\\d{4}/[A-ZĐ-]+',
          },
          { ten: 'link', selector: 'p.nqTitle a', nguon: { kieu: 'thuoc-tinh', ten: 'href' } },
          {
            ten: 'ngay_ban_hanh',
            selector: '.right-col',
            nguon: { kieu: 'text' },
            regex: 'Ban hành:\\s*([\\d/]+)',
          },
        ],
      },
    }),
    b('v03', {
      nhan: 'Lặp: mở từng Nghị định rồi quay lại danh sách',
      hanhDong: {
        loai: 'lap',
        kieu: 'moi-dong',
        tenBang: 'danh_sach',
        buoc: [
          b('v03a', {
            nhan: 'Mở trang chi tiết của dòng đang xử lý',
            hanhDong: { loai: 'mo-trang', url: '{{DONG.link}}', choSelector: 'body' },
          }),
          b('v03b', { nhan: 'Chờ nội dung vẽ xong', hanhDong: { loai: 'cho', ms: 1200 } }),
          b('v03c', {
            nhan: 'Bóc chi tiết, ghép với dữ liệu của dòng',
            hanhDong: {
              loai: 'lay-bang',
              ten: 'chi_tiet',
              selectorDong: 'body',
              gioiHan: 1,
              cot: [
                { ten: 'luot', nguon: { kieu: 'bien', ten: 'LAP_SO' } },
                { ten: 'so_hieu_o_danh_sach', nguon: { kieu: 'bien', ten: 'DONG.so_hieu' } },
                // Bỏ TRỐNG selector = lấy chính dòng (ở đây dòng là <body>).
                // Đặt selector:'body' sẽ tìm <body> BÊN TRONG <body> → không có gì.
                {
                  ten: 'so_hieu_tren_van_ban',
                  nguon: { kieu: 'text' },
                  regex: 'Số:\\s*(\\S+)',
                },
                {
                  ten: 'ngay_ky_tren_van_ban',
                  nguon: { kieu: 'text' },
                  regex: 'ngày (\\d{1,2} tháng \\d{1,2} năm \\d{4})',
                },
                { ten: 'ngay_ban_hanh_o_danh_sach', nguon: { kieu: 'bien', ten: 'DONG.ngay_ban_hanh' } },
                { ten: 'link', nguon: { kieu: 'bien', ten: 'DONG.link' } },
              ],
            },
          }),
          b('v03d', {
            nhan: 'Ra khỏi trang chi tiết, vào lại danh sách',
            hanhDong: { loai: 'mo-trang', url: URL_KET_QUA, choSelector: 'p.nqTitle' },
          }),
        ],
      },
    }),
  ],
}

/**
 * Kịch bản trắng để bắt đầu từ đầu.
 *
 * @type {KichBan}
 */
export const MAU_TRANG = {
  ten: 'Kịch bản mới',
  moTa: '',
  buoc: [
    { id: idMoi('n'), nhan: 'Mở trang', hanhDong: { loai: 'mo-trang', url: 'https://', choSelector: 'body' } },
  ],
}

/** @type {KichBan[]} */
export const DANH_SACH_MAU = [MAU_TVPL_NGHI_DINH, MAU_TVPL_VONG_LAP, MAU_TRANG]
