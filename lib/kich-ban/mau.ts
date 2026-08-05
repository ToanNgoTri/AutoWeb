import type { KichBan } from './loai'

const b = (id: string, x: Omit<KichBan['buoc'][number], 'id'>) => ({ id, ...x })

/**
 * Kịch bản mẫu: đúng luồng đã kiểm chứng trên thuvienphapluat.vn, nhưng dựng
 * hoàn toàn bằng các hành động cấu hình được — không có dòng code riêng nào.
 * Dùng làm ví dụ để bạn nhân bản rồi sửa cho site khác.
 */
export const MAU_TVPL_NGHI_DINH: KichBan = {
  ten: 'TVPL — Nghị định mới nhất',
  moTa:
    'Mở trang tra cứu, đăng nhập, mở "+ Thêm điều kiện", chọn Loại văn bản = Nghị định, ' +
    'sắp xếp mới nhất, bấm Tìm kiếm rồi bóc bảng kết quả. ' +
    'Mật khẩu lấy từ biến môi trường qua {{TVPL_PASSWORD}} nên không nằm trong file này.',
  buoc: [
    b('m01', {
      nhan: 'Mở trang Tra cứu Văn bản Pháp luật',
      hanhDong: {
        loai: 'mo-trang',
        url: 'https://thuvienphapluat.vn/page/tim-van-ban.aspx',
        // chờ mốc này = vượt xong Cloudflare
        choSelector: '#keywordTextBox',
      },
    }),

    // ── đăng nhập: bỏ qua lỗi vì nếu phiên trước còn hiệu lực thì ô này không hiện
    b('m02', {
      nhan: 'Điền tên đăng nhập',
      boQuaLoi: true,
      hanhDong: {
        loai: 'dien',
        selector: '.txt-account-Home',
        giaTri: '{{TVPL_USERNAME}}',
        tungKyTu: true,
      },
    }),
    b('m03', {
      nhan: 'Điền mật khẩu',
      boQuaLoi: true,
      hanhDong: {
        loai: 'dien',
        selector: '.txt-password-Home',
        giaTri: '{{TVPL_PASSWORD}}',
        tungKyTu: true,
      },
    }),
    b('m04', {
      nhan: 'Bấm Đăng nhập',
      boQuaLoi: true,
      hanhDong: { loai: 'bam', selector: '#loginButton' },
    }),
    b('m05', {
      nhan: 'Chờ ô đăng nhập biến mất (dấu hiệu đăng nhập xong)',
      boQuaLoi: true,
      hanhDong: { loai: 'cho', selector: '.txt-account-Home', trangThai: 'an' },
    }),
    b('m06', {
      nhan: 'Kiểm tra không có hộp thoại lỗi đăng nhập',
      hanhDong: { loai: 'khang-dinh', selector: '#error-dialog-form', dieuKien: 'vang-mat', batBuoc: false },
    }),
    b('m07', {
      nhan: 'Chờ form tìm kiếm trở lại sau khi tải lại trang',
      hanhDong: { loai: 'cho', selector: '#keywordTextBox', trangThai: 'hien' },
    }),

    // ── tìm kiếm nâng cao
    b('m08', {
      nhan: 'Bấm "+ Thêm điều kiện" để mở tìm kiếm nâng cao',
      hanhDong: { loai: 'bam', selector: '.autohideClick' },
    }),
    b('m09', {
      nhan: 'Chờ panel nâng cao hiện ra',
      hanhDong: { loai: 'cho', selector: '#documentTypeDropDownList', trangThai: 'hien' },
    }),
    b('m10', {
      nhan: 'Loại văn bản → Nghị định',
      hanhDong: { loai: 'chon', selector: '#documentTypeDropDownList', giaTri: '11' },
    }),
    b('m11', {
      nhan: 'Sắp xếp → Văn bản mới ban hành nằm trên',
      hanhDong: { loai: 'chon', selector: '#sortDropDownList', giaTri: '2' },
    }),
    b('m12', {
      nhan: 'Bấm Tìm kiếm',
      hanhDong: { loai: 'bam', selector: '#btnKeyWord', choDieuHuong: true },
    }),
    b('m13', {
      nhan: 'Chờ danh sách kết quả',
      hanhDong: { loai: 'cho', selector: 'p.nqTitle', trangThai: 'hien' },
    }),

    // ── bóc dữ liệu
    b('m14', {
      nhan: 'Lấy tổng số văn bản',
      hanhDong: {
        loai: 'lay-mot',
        ten: 'tong_so_van_ban',
        selector: '#lbTotal',
        nguon: { kieu: 'text' },
      },
    }),
    b('m15', {
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

/** Kịch bản trắng để bắt đầu từ đầu. */
export const MAU_TRANG: KichBan = {
  ten: 'Kịch bản mới',
  moTa: '',
  buoc: [
    {
      id: 'n01',
      nhan: 'Mở trang',
      hanhDong: { loai: 'mo-trang', url: 'https://', choSelector: 'body' },
    },
  ],
}

export const DANH_SACH_MAU: KichBan[] = [MAU_TVPL_NGHI_DINH, MAU_TRANG]
