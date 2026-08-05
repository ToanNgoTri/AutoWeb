/**
 * Giao thức event giữa engine (server) và UI (client). File này KHÔNG sinh ra mã
 * lúc chạy — chỉ khai kiểu bằng JSDoc để editor gợi ý và để chỗ ghi tài liệu.
 *
 * @typedef {'cho' | 'dang-chay' | 'xong' | 'loi' | 'bo-qua'} TrangThaiBuoc
 */

/**
 * @typedef {object} KetQuaChay
 * @property {string} tenKichBan
 * @property {string} batDau
 * @property {string} ketThuc
 * @property {string} urlCuoi
 * @property {Record<string, Record<string, string | null>[]>} bang
 *   dữ liệu từ các bước "lấy bảng"; trong vòng lặp thì các lượt được NỐI THÊM
 * @property {Record<string, unknown>} giaTri
 *   dữ liệu từ "lấy một giá trị" và "chạy JS"; lặp nhiều lượt thì thành mảng
 * @property {number} soLanPhucHoi
 *   số lần phải chạy quy trình phục hồi (ví dụ đăng nhập lại)
 */

/**
 * Event đẩy về UI theo dòng NDJSON. `type` quyết định các trường còn lại:
 *
 *  - `buoc`      : { id, nhan, trangThai, chiTiet?, lanLap?, trongPhucHoi? }
 *                  id là id của bước — bền khi chèn/xoá/đổi thứ tự, và định danh
 *                  được bước con lồng trong vòng lặp. lanLap là lượt lặp hiện
 *                  tại nếu bước nằm trong vòng lặp; trongPhucHoi là tên quy
 *                  trình phục hồi đang chạy.
 *  - `shot`      : { jpegBase64 }
 *  - `log`       : { msg }
 *  - `can-nguoi` : { msg }
 *  - `phuc-hoi`  : { ten, giaiDoan: 'bat-dau' | 'xong' | 'that-bai', msg? }
 *  - `xong`      : { ketQua: KetQuaChay }
 *  - `loi`       : { msg }
 *  - `ket-thuc`  : không có trường nào
 *
 * @typedef {object} SuKien
 * @property {'buoc'|'shot'|'log'|'can-nguoi'|'phuc-hoi'|'xong'|'loi'|'ket-thuc'} type
 *
 * @typedef {(e: SuKien) => void} Emit
 */

export {}
