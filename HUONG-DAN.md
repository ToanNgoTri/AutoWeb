# Hướng dẫn sử dụng

App điều khiển Chrome thật thao tác trên website theo **kịch bản bạn tự khai**: vào trang nào, chờ gì,
điền gì vào đâu, bấm cái nào, bóc ra field nào. Có sẵn kịch bản mẫu cho thuvienphapluat.vn.

---

## Phần 1 — Mở app trên máy mới (không cần mạng để cài)

### 1.1 Chuyển gói sang máy đích

Trên máy đã có sẵn project:

```bash
npm run dong-goi
cd dist-offline && zip -qr tvpl-nghidinh.zip tvpl-nghidinh
```

Copy `tvpl-nghidinh.zip` (~164 MB) sang máy đích bằng **USB, AirDrop, ổ mạng nội bộ** — cách nào cũng
được, không cần Internet. Giải nén ra một thư mục bất kỳ (Desktop cũng được).

Trong thư mục có:

```
chay.command            ← bấm đúp cái này để chạy
BAT-DAU-TU-DAY.txt      ← 4 dòng cần biết ngay
HUONG-DAN.md            ← file bạn đang đọc
runtime/node            ← Node nhúng kèm, không phải cài
node_modules/           ← thư viện đã gom đủ, không phải npm install
kich-ban/               ← kịch bản dạng JSON
.env.local              ← tài khoản đăng nhập
server.js  .next/       ← bản build của app
```

### 1.2 Chạy

Bấm đúp **`chay.command`**. Một cửa sổ Terminal mở ra, rồi trình duyệt tự mở
`http://localhost:3000`.

Đổi cổng nếu 3000 đang bận: mở Terminal, `cd` vào thư mục rồi

```bash
PORT=4000 ./chay.command
```

Dừng app: bấm `Ctrl+C` trong cửa sổ Terminal đó, hoặc đóng cửa sổ.

### 1.3 Nếu macOS không cho mở

Gói đi qua mạng (email, Drive, tải về) sẽ bị macOS gắn cờ cách ly, và Finder báo *"không mở được vì
không rõ nhà phát triển"*. Hai cách:

- **Cách nhanh:** chuột phải vào `chay.command` → **Open** → **Open**. Chỉ phải làm một lần.
- **Cách chắc:** mở Terminal, gõ `xattr -cr ` (có dấu cách ở cuối), **kéo thả thư mục gói** vào cửa sổ
  Terminal, rồi Enter. Lệnh sẽ thành:

  ```bash
  xattr -cr /Users/ten-ban/Desktop/tvpl-nghidinh
  ```

Chuyển qua USB hoặc AirDrop thường **không** bị cờ này.

### 1.4 Máy đích cần đúng hai thứ

| Cần | Vì sao |
|---|---|
| **macOS cùng loại chip** với máy đóng gói (Apple Silicon ↔ Apple Silicon) | Node nhúng kèm là binary biên dịch theo kiến trúc |
| **Google Chrome** trong `/Applications` | App điều khiển Chrome thật, vì thuvienphapluat.vn có Cloudflare chặn bot. Không có cách thay thế. Chrome ở chỗ khác thì thêm `CHROME_PATH=/đường/dẫn` vào `.env.local` |

Không cần cài Node. Không cần `npm install`. Không cần quyền admin.

### 1.5 ⚠️ Về chuyện "không có mạng"

Đây là chỗ dễ hiểu sai nhất, nên nói thẳng:

| Việc | Cần Internet? |
|---|---|
| Copy gói sang máy, cài đặt, mở app | **Không** |
| Mở giao diện, soạn / sửa / lưu / mở kịch bản | **Không** |
| Xem lại file CSV / JSON đã xuất trước đó | **Không** |
| **Bấm Chạy để lấy dữ liệu** | **CÓ** — bắt buộc |

App không chứa sẵn dữ liệu văn bản; nó mở Chrome đi đọc trực tiếp từ thuvienphapluat.vn. Máy offline
hoàn toàn sẽ mở được giao diện nhưng bấm Chạy là lỗi mạng. Không có cách tránh — dữ liệu nằm trên
server của họ.

**Muốn dùng dữ liệu ở máy offline:** chạy trên máy có mạng → bấm **Tải CSV** ở bảng kết quả → mang file
CSV sang máy offline mở bằng Excel / Numbers. `chay.command` cũng cảnh báo sẵn nếu không kết nối được.

---

## Phần 2 — Chạy kịch bản có sẵn

1. Mở `http://localhost:3000`. Ô trên cùng bên trái là **tên kịch bản**; mặc định app nạp mẫu
   **TVPL — Nghị định mới nhất**.
2. Chọn **Tốc độ**. Lần đầu nên để **Chậm** hoặc **Rất chậm** để thấy rõ từng thao tác.
3. Bấm **▶ Chạy**.

Cửa sổ Chrome bật lên và tự thao tác. Bạn xem được ở hai nơi: chính cửa sổ Chrome đó, và khung **Màn
hình Chrome** trong app. Trước mỗi thao tác app **khoanh viền vàng + dán nhãn** lên đúng phần tử sắp bị
tác động và làm tối phần còn lại.

Từng thẻ bước đổi màu theo trạng thái:

| | |
|---|---|
| viền vàng, dấu `◌` | đang chạy |
| viền xanh, dấu `✓` | xong — dòng chữ nhỏ bên dưới là kết quả thật (`value=11`, `20 dòng × 9 cột`, URL…) |
| xám, dấu `–` | bỏ qua vì điều kiện không thoả, hoặc bị tắt |
| viền đỏ, dấu `✕` | lỗi |
| nhãn tím `lượt 3` | bước này đang ở lượt 3 của vòng lặp |
| nhãn xanh `phục hồi` | bước này đang chạy trong quy trình phục hồi |

### Đọc kết quả

Dưới khung màn hình:

- **Chip giá trị đơn** — ví dụ `tong_so_van_ban 5995`.
- **Bảng** — mỗi bảng có nút **Tải CSV** (mở được bằng Excel, đã có BOM nên không lỗi font tiếng Việt).
- Link trong bảng bấm được, mở ra tab mới.

### Tốc độ

| Tốc độ | Thời gian một lượt mẫu | Dùng khi |
|---|---|---|
| Nhanh | ~11s | chạy cho xong, lấy dữ liệu |
| Vừa | ~17s | theo dõi bình thường |
| Chậm *(mặc định)* | ~30s | đọc kịp từng thao tác |
| Rất chậm | ~47s | trình diễn cho người khác xem |

### Nút khác trên header

- **Mở kịch bản đã lưu** — nạp file JSON trong `kich-ban/`.
- **Nạp mẫu** — 3 mẫu: *Nghị định mới nhất*, *ví dụ vòng lặp*, *kịch bản trắng*.
- **Lưu** — ghi vào `kich-ban/<tên>.json`.
- **Tải JSON** — tải kịch bản về máy (để gửi cho người khác).
- **Đóng Chrome** — tắt cửa sổ Chrome mà app đang điều khiển.
- **Ngắt** — dừng theo dõi phiên đang chạy.

Bản nháp đang soạn tự lưu trong trình duyệt, tải lại trang không mất.

---

## Phần 3 — Tự làm kịch bản cho site khác

### 3.1 Thêm bước ở bất kỳ đâu

Giữa **mọi cặp bước** — và trước bước đầu, sau bước cuối — có một điểm **+** mảnh. Rê chuột vào là hiện,
bấm là chọn loại hành động rồi chèn đúng chỗ đó. Số bước không giới hạn.

Mỗi bước có: **↑ ↓** đổi thứ tự · **⧉** nhân bản · **●** tắt tạm (giữ lại nhưng không chạy) · **✕** xoá.

### 3.2 Nút ◎ — lấy selector mà không cần biết HTML

Đây là nút quan trọng nhất. Cạnh mỗi ô selector có **◎**:

1. Chạy kịch bản một lần cho Chrome mở đúng trang bạn muốn (hoặc tự bấm trong Chrome tới đó).
2. Bấm **◎** → sang cửa sổ Chrome.
3. Rê chuột: phần tử sáng lên kèm selector. Bấm vào phần tử → selector nhảy về app. `Esc` để huỷ.

App còn đưa ra các selector thay thế kèm **số phần tử mà nó khớp**:

- Cần **đúng 1** cho *Bấm* / *Điền*.
- Cần **nhiều dòng** cho *Lấy bảng* — mỗi phần tử khớp thành một hàng.

Và liệt kê các **thuộc tính bóc được** (`href`, `lawid`, `data-*`…) để bạn biết có gì lấy được.

### 3.3 Các loại hành động

| Hành động | Khai gì |
|---|---|
| **Mở trang** | URL + phần tử làm mốc "đã tải xong". Mốc này cũng là chỗ chờ vượt Cloudflare |
| **Chờ** | selector + chờ *hiện ra* hay *ẩn đi*; hoặc chờ số ms |
| **Điền** | selector + nội dung; gõ từng ký tự (thấy được) hay đổ một cục; có Enter sau khi điền hay không |
| **Chọn dropdown** | selector `<select>` + **value** của option (không phải chữ hiển thị) |
| **Bấm** | selector + tick "cú bấm này làm chuyển trang" nếu nó điều hướng |
| **Nhấn phím** | `Enter`, `Tab`, `Escape`, `ArrowDown`, `Control+A`… |
| **Cuộn đến** | selector |
| **Khẳng định** | kiểm *có mặt* / *vắng mặt* / *chứa chữ*; sai thì dừng hẳn hoặc chỉ ghi log |
| **Lấy bảng** | selector **một dòng** + các cột |
| **Lấy một giá trị** | selector + nguồn + regex |
| **Chạy JS** | cửa sau: mã JS chạy trong trang, phải có `return` |
| **Vòng lặp** | xem 3.6 |
| **Gọi phục hồi** | chạy tay một quy trình ở mục Phục hồi |

### 3.4 Lấy bảng — phần hay dùng nhất

Hai tầng selector:

1. **Selector một dòng** — khớp *nhiều* phần tử, mỗi phần tử thành một hàng.
   Ví dụ `div[class^="content-"]:has(p.nqTitle)`.
2. **Mỗi cột** có selector *tương đối trong dòng đó*. Ví dụ `p.nqTitle a`.
   **Để trống = lấy chính cả dòng.**

⚠️ Bẫy hay gặp: nếu selector dòng là `body` thì cột **phải để trống** selector, đừng ghi `body` — vì như
vậy là tìm `body` bên trong `body`, không có gì cả.

Mỗi cột chọn **lấy gì**:

| Nguồn | Kết quả |
|---|---|
| **Chữ (text)** | nội dung chữ |
| **Thuộc tính** | `href`, `src`, `value`, `lawid`, `data-…` |
| **HTML bên trong** | HTML thô |
| **Biến** | không đọc DOM, lấy từ `{{DONG.tên_cột}}`, `{{LAP_SO}}`, hoặc biến `.env.local` |

Thêm **regex** để bóc tiếp. Có nhóm `(...)` thì lấy nhóm 1. Ví dụ trên chuỗi
`Ban hành: 03/08/2026 Hiệu lực: Đã biết`:

- `Ban hành:\s*([\d/]+)` → `03/08/2026`
- `Hiệu lực:\s*(.*?)\s*Tình trạng:` → `Đã biết`

Cột cũng có điểm **+** để chèn, và **↑ ↓ ⧉ ✕** — thứ tự cột chính là thứ tự cột trong bảng và file CSV.

### 3.5 Chỉ chạy khi… (điều kiện từng bước)

Tick **"Chỉ chạy bước này khi…"** rồi chọn một phần tử: bước chỉ chạy nếu phần tử đó **đang hiện** hoặc
**đang ẩn**. Không thoả thì bước bị bỏ qua, không tính là lỗi.

Dùng cho những chỗ trạng thái không đoán được. Ví dụ thật trong mẫu: thuvienphapluat.vn nhớ cookie nên
panel "Tìm kiếm nâng cao" có thể **đang mở sẵn** từ lần trước — một cú bấm lúc đó sẽ *đóng* nó. Mẫu vì
vậy có hai bước đối xứng:

- *"Panel đang mở sẵn → thu lại"* — chỉ chạy khi `#documentTypeDropDownList` **đang hiện**
- *"Bấm + Thêm điều kiện"* — chỉ chạy khi `#documentTypeDropDownList` **đang ẩn**

### 3.6 Vòng lặp — cho việc lặp đi lặp lại

Chọn hành động **Vòng lặp**, rồi thêm bước con vào bên trong (thân lặp cũng có đủ điểm **+**).

| Kiểu | Dùng khi | Biến dùng được |
|---|---|---|
| **Đúng N lượt** | biết trước số lượt | `{{LAP_SO}}` `{{LAP_TONG}}` |
| **Mỗi dòng của một bảng** | đã bóc được danh sách, giờ xử lý từng dòng | thêm `{{DONG.tên_cột}}` |
| **Tới khi điều kiện thoả** | không biết trước bao nhiêu lượt | `{{LAP_SO}}` — bắt buộc khai số lượt tối đa |

Đúng luồng "vào → làm việc → ra → vào lại", xem mẫu **TVPL — mở từng Nghị định rồi quay lại**:

1. Mở trang danh sách
2. **Lấy bảng** `danh_sach` (số hiệu, link, ngày ban hành)
3. **Vòng lặp / mỗi dòng** của `danh_sach`:
   - Mở trang `{{DONG.link}}`
   - Chờ nội dung vẽ xong
   - **Lấy bảng** `chi_tiet` — ghép cột kiểu **Biến** (`DONG.so_hieu`) với cột đọc từ trang con
   - Mở lại trang danh sách ← *"ra rồi vào lại"*

Hai quy tắc:

- **Lấy bảng** trong vòng lặp **nối thêm** dòng vào bảng cùng tên (hiện `+1 dòng (tổng 3)`), không ghi đè.
- **Lấy một giá trị** trong vòng lặp **gom thành mảng**.

Trần an toàn: 1000 lượt mỗi vòng lặp.

### 3.7 Phục hồi — tự đăng nhập lại khi bị out

Mục **Phục hồi** (khung xanh dưới danh sách bước) khai: *dấu hiệu* → *các bước khắc phục*.

App kiểm dấu hiệu **trước mỗi bước** và **cả khi một bước lỗi**. Thoả thì chạy các bước khắc phục rồi
**thử lại đúng bước đang dở** — không phải bắt đầu lại từ đầu.

Mẫu có sẵn một quy trình:

- **Dấu hiệu:** `.txt-account-Home` (ô đăng nhập) **hiện trở lại**
- **Khắc phục:** điền tên → điền mật khẩu → bấm Đăng nhập → chờ ô biến mất → khẳng định đã vào được

Nhờ vậy **không có bước đăng nhập nào trong danh sách bước chính**, mà một khai báo lo cả hai việc:
lần chạy đầu chưa đăng nhập thì nó đăng nhập, và đang chạy giữa đường bị đăng xuất thì nó vào lại.

Bỏ tick **Tự kích hoạt** nếu chỉ muốn gọi tay bằng hành động *Gọi phục hồi*.

### 3.8 Mật khẩu — đừng gõ trực tiếp vào kịch bản

Ô nội dung của **Điền** hỗ trợ `{{TEN_BIEN}}`, thay bằng biến trong `.env.local` lúc chạy:

```
TVPL_USERNAME=tên_đăng_nhập
TVPL_PASSWORD=mật_khẩu
```

Kịch bản chỉ ghi `{{TVPL_PASSWORD}}`, nên chia sẻ file JSON không lộ mật khẩu, và trong log app hiện
`••••••`.

Đổi tài khoản: sửa `.env.local` rồi khởi động lại app.

---

## Phần 4 — Xử lý sự cố

| Hiện tượng | Nguyên nhân & cách xử lý |
|---|---|
| Banner vàng *"Cần bạn bấm tay một lần"* | Cloudflare đòi xác minh người thật. Sang cửa sổ Chrome bấm vào ô xác minh — app vẫn đang chờ bạn, tới 180s |
| Lần chạy đầu chậm (~10–15s ở bước mở trang) | Đang vượt Cloudflare. Các lần sau nhanh hơn nhờ profile Chrome ở `~/.tvpl-chrome-cdp` giữ cookie |
| *"Đang có một kịch bản khác chạy"* | Chỉ cho 1 phiên cùng lúc (Cloudflare rất nhạy với request song song). Chờ xong hoặc bấm **Ngắt** |
| Bước lỗi *"Timeout … waiting for locator"* | Selector không còn đúng. Bấm **◎** chọn lại phần tử |
| Cột trong bảng rỗng hết | Selector cột sai, hoặc regex không khớp. Thử bỏ regex trước để xem giá trị thô |
| Cột rỗng chỉ ở vài dòng | Có thể dữ liệu **thật sự không có** trên trang đó, không phải lỗi. Mở tay trang đó trong Chrome kiểm chứng |
| Cột Hiệu lực / Tình trạng hiện *"Đã biết"* | Nội dung này thuvienphapluat.vn chỉ mở cho **gói trả phí**; đăng nhập thường không đủ |
| Bước *Đăng nhập* lỗi | Sai tài khoản trong `.env.local`, hoặc site đổi form. Xem thông báo lỗi — app in nguyên văn thông báo của site |
| App không mở, cổng 3000 bận | `PORT=4000 ./chay.command` |
| Chrome mở nhưng app báo không nối được | Đóng hết cửa sổ Chrome do app bật (nút **Đóng Chrome**), rồi chạy lại |
| Bấm Chạy báo lỗi mạng | Máy không có Internet. Xem lại mục 1.5 |

**Đừng chạy quá dày.** Cloudflare sẽ chặn IP. Nếu cần chạy định kỳ, giãn ≥ 15 phút một lần.

---

## Phần 5 — Lưu ý cần biết

- **Mật khẩu trong gói.** Nếu gói được đóng kèm `.env.local`, mật khẩu nằm trong đó ở dạng đọc được.
  Đừng gửi gói cho người không nên biết mật khẩu. Muốn tránh: xoá dòng `cp .env.local` trong
  `scripts/dong-goi.sh` rồi tự tạo file ở máy đích.
- **"Chạy JS" là cửa sau thật** — nó thực thi mã JS trong trang đang mở. Chỉ chạy kịch bản bạn tự viết
  hoặc đã đọc qua; đừng chạy file JSON người khác gửi mà chưa xem.
- **Dùng để tra cứu.** `robots.txt` của thuvienphapluat.vn cho phép truy cập nhưng bảo lưu quyền
  (`ai-train=no, use=reference`). Lưu metadata + link về nguồn thì bình thường; đừng mirror toàn văn ra
  public.
- **Kịch bản giòn theo bản chất.** Site đổi id/class là kịch bản hỏng — nhưng sửa được ngay trong UI
  bằng nút ◎ thay vì phải sửa code.
