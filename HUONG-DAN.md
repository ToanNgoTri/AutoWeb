# Hướng dẫn sử dụng

App điều khiển Chrome thật thao tác trên website theo **kịch bản bạn tự khai**: vào trang nào, chờ gì,
điền gì vào đâu, bấm cái nào, bóc ra field nào. Có sẵn kịch bản mẫu cho thuvienphapluat.vn.

---

## Phần 1 — Mở app trên máy mới (không cần mạng để cài)

### 1.1 Chuyển gói sang máy đích

Trên máy đã có sẵn project (máy này **cần mạng một lần** để tải Node runtime về nhúng kèm).
Chạy được **từ cả máy Windows lẫn máy Mac** — script đóng gói viết bằng Node, không cần `bash`:

```
npm run dong-goi:mac     gói cho macOS
npm run dong-goi:win     gói cho Windows 64-bit
```

Đóng gói **cho Windows, từ máy Windows** thì mở **Command Prompt** hoặc **PowerShell** trong thư mục
project rồi chạy `npm run dong-goi:win`. Đừng dùng lệnh có `bash` — Windows không có `bash` và sẽ báo
`'bash' is not recognized as an internal or external command`.

Gói ra `dist-offline\tvpl-nghidinh-windows` (hoặc `…-mac`). Nén lại theo dòng mà script in ra ở cuối —
nó tự đưa lệnh đúng cho hệ bạn đang dùng (`Compress-Archive` trên Windows, `zip` trên macOS).

**Đóng gói ra chỗ khác** — ví dụ ghi thẳng vào USB, khỏi copy hai lần:

```
node scripts/dong-goi.mjs --windows --ra D:\USB
node scripts/dong-goi.mjs --mac --ra ~/Desktop
```

Thư mục chưa có thì script tự tạo. Đường dẫn có khoảng trắng cũng được (đặt trong ngoặc kép).

⚠️ **Nếu gọi qua `npm run dong-goi` thì cờ phải có `--` đứng trước:**

```
npm run dong-goi -- --windows        ĐÚNG
npm run dong-goi --windows           SAI — npm ăn mất cờ, bạn nhận gói của hệ đang chạy
```

Dùng `npm run dong-goi:win` thì không phải nhớ chuyện này. Script cũng in ba dòng đầu để bạn kiểm:

```
▶ Đóng gói cho: windows
  Sẽ ghi vào: D:\USB\tvpl-nghidinh-windows
  Đang chạy trên: win32 x64
```

Cờ viết kiểu nào cũng nhận: `--windows`, `-windows`, `windows`, `win`, `WIN`, `-w`.
Gõ `node scripts/dong-goi.mjs --help` để xem đủ.

Một lưu ý khi **đóng gói cho macOS từ máy Windows**: Windows không có khái niệm quyền thực thi, nên
`chay.command` sẽ mất quyền chạy. Script cảnh báo sẵn; trên máy Mac chạy một lần
`chmod +x chay.command` là xong.

| Gói | Kích thước | Máy đích |
|---|---|---|
| `tvpl-nghidinh-mac` | 164 MB (zip ~56 MB) | macOS, **cùng loại chip** với máy đóng gói |
| `tvpl-nghidinh-windows` | 140 MB | Windows 64-bit |

Gói Windows đóng được **từ máy Mac** — không cần máy Windows để đóng gói.
Thêm `--khong-node` nếu máy đích đã có Node ≥ 20 (gói nhỏ hơn nhiều).

Copy file zip sang máy đích bằng **USB, AirDrop, ổ mạng nội bộ** — cách nào cũng được, không cần
Internet. Giải nén ra thư mục bất kỳ (Desktop cũng được).

Trong thư mục có:

```
chay.command  /  chay.bat   ← bấm đúp cái này để chạy (mac / Windows)
BAT-DAU-TU-DAY.txt          ← 5 dòng cần biết ngay
HUONG-DAN.md                ← file bạn đang đọc
khoi-dong.mjs               ← script khởi động (dùng chung cả hai hệ)
runtime/node  /  node.exe   ← Node nhúng kèm, không phải cài
node_modules/               ← thư viện đã gom đủ, không phải npm install
lib/tvpl/tim-chrome.mjs     ← phần dò Chrome, để báo lỗi ngay lúc khởi động
kich-ban/                   ← kịch bản dạng JSON
.env.local                  ← tài khoản đăng nhập + CHROME_PATH nếu cần
server.js  .next/           ← bản build của app
```

### 1.2 Chạy

| | macOS | Windows |
|---|---|---|
| Bấm đúp | `chay.command` | `chay.bat` |
| Cửa sổ mở ra | Terminal | Command Prompt |
| Đổi cổng | `PORT=4000 ./chay.command` | `set PORT=4000 && chay.bat` |
| Dừng | `Ctrl+C` | `Ctrl+C` |

Trình duyệt tự mở `http://localhost:3000` sau khoảng 2 giây.

Dòng đầu tiên nó in ra cho biết đang dùng Chrome nào:

```
ℹ Chrome: /Applications/Google Chrome.app/Contents/MacOS/Google Chrome
ℹ Chrome: C:\Program Files\Google\Chrome\Application\chrome.exe
```

### 1.3 Nếu hệ điều hành không cho mở

**Windows** — Defender SmartScreen báo *"Windows protected your PC"*:
bấm **More info** → **Run anyway**. Chỉ một lần.
Nếu file bị chặn sâu hơn: chuột phải `chay.bat` → **Properties** → tick **Unblock** → **OK**.

**macOS** — Finder báo *"không mở được vì không rõ nhà phát triển"* (xảy ra khi gói đi qua email/Drive):

- **Cách nhanh:** chuột phải `chay.command` → **Open** → **Open**. Chỉ một lần.
- **Cách chắc:** mở Terminal, gõ `xattr -cr ` (có dấu cách ở cuối), **kéo thả thư mục gói** vào cửa sổ
  Terminal, rồi Enter:

  ```bash
  xattr -cr /Users/ten-ban/Desktop/tvpl-nghidinh-mac
  ```

Chuyển qua USB hoặc AirDrop thường **không** bị cờ này.

### 1.4 Máy đích cần đúng hai thứ

| Cần | Vì sao |
|---|---|
| **Hệ điều hành khớp với gói** — gói `-mac` cho macOS cùng loại chip (Apple Silicon ↔ Apple Silicon), gói `-windows` cho Windows 64-bit | Node nhúng kèm là file thực thi biên dịch theo hệ điều hành + kiến trúc |
| **Google Chrome** | App điều khiển Chrome thật, vì thuvienphapluat.vn có Cloudflare chặn bot. Không có cách thay thế. Xem **1.6** nếu báo lỗi không tìm thấy Chrome |

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

### 1.6 Lỗi "Không tìm thấy Google Chrome" / CHROME_PATH

**Lỗi này không liên quan gì tới mạng** — nó chỉ là dò đường dẫn trên máy. Nên sửa được hoàn toàn khi
máy bị cắt mạng. Chỉ *cài Chrome* mới cần mạng, nếu máy chưa có Chrome.

App tự tìm ở 15 chỗ trên Windows và 10 chỗ trên macOS (Chrome, Chrome Beta, Chrome Dev, Canary,
Chromium). Nếu Chrome của bạn nằm chỗ khác thì phải chỉ đường.

#### Bước 1 — tìm Chrome đang ở đâu

**Windows** — mở Command Prompt (`Win+R` → gõ `cmd` → Enter):

```bat
reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe" /ve
```

Không ra thì thử:

```bat
where /r "C:\Program Files" chrome.exe
where /r "%LOCALAPPDATA%" chrome.exe
```

**macOS** — mở Terminal (`Cmd+Space` → gõ `Terminal`):

```bash
ls -d /Applications/*.app ~/Applications/*.app 2>/dev/null | grep -i chrom
```

Không ra thì hỏi thẳng macOS:

```bash
osascript -e 'POSIX path of (path to application "Google Chrome")'
```

Vẫn không ra thì máy chưa có Chrome — phải cài từ https://google.com/chrome (cần mạng một lần).

#### Bước 2 — ghi đường dẫn vào `.env.local`

File `.env.local` nằm **cùng thư mục với `chay.bat` / `chay.command`**.

| | Mở file thế nào | Không thấy file? |
|---|---|---|
| **Windows** | Chuột phải → **Open with** → **Notepad** | View → tick **Hidden items**, và bỏ tick **Hide extensions** |
| **macOS** | Mở bằng **TextEdit** | Bấm `Cmd+Shift+.` để hiện file ẩn |

Thêm **một dòng**, đúng cú pháp hệ điều hành của bạn:

```
# Windows
CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe

# macOS
CHROME_PATH=/Applications/Google Chrome.app
```

Bốn điều giúp khỏi sai:

- **Windows:** trỏ vào `chrome.exe`, hoặc chỉ trỏ vào thư mục `...\Chrome\Application` cũng được —
  app tự thêm `chrome.exe`.
- **macOS:** trỏ vào `.app` là đủ — app tự tìm file thực thi bên trong.
- **Không cần dấu ngoặc kép**, kể cả khi đường dẫn có khoảng trắng (`Program Files` không sao). Có
  ngoặc kép cũng vẫn chạy.
- **Không có `.env.local`?** Tạo file mới tên đúng `.env.local` (dấu chấm ở đầu, **không** có `.txt`
  ở cuối — Notepad hay tự thêm, chọn *Save as type: All Files*).

#### Bước 3 — lưu file rồi bấm đúp lại

Chạy đúng thì dòng đầu in ra Chrome nó dùng:

```
ℹ Chrome: C:\Program Files\Google\Chrome\Application\chrome.exe
```

Nếu `CHROME_PATH` bạn đặt bị sai, nó **nói rõ rồi mới dùng tạm cái khác**, không lặng lẽ bỏ qua:

```
⚠ CHROME_PATH="C:\Sai\chrome.exe" không dùng được (không thấy C:\Sai\chrome.exe).
  Dùng tạm: C:\Program Files\Google\Chrome\Application\chrome.exe
```

Và nếu không tìm được Chrome nào, nó **liệt kê đủ mọi đường dẫn đã tìm** rồi in lại 3 bước trên, kèm
lệnh đúng cho hệ điều hành đang chạy.

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

**Phần tử phải bấm mới hiện ra** — dropdown, menu, accordion, tab: trong lúc chọn, cú bấm thường bị app
bắt lấy để đọc selector nên trang không phản ứng gì. Giữ **Alt** (trên Mac là **⌥ Option**) rồi bấm thì
cú bấm đi thẳng vào trang như người thật:

1. **Alt+bấm** vào nút `div` → nó sổ ra danh sách `<a>` bên trong.
2. **Bấm thường** vào đúng thẻ `<a>` muốn lấy → selector nhảy về app.

Đang giữ Alt thì khung viền và banner chuyển sang **màu vàng** kèm chữ *"bấm thật vào phần tử này"* —
nhìn màu là biết cú bấm sắp tới sẽ đi đâu. Alt+bấm bao nhiêu lần cũng được, chế độ chọn vẫn sống; chỉ
khi cú bấm đó làm **chuyển trang** thì chế độ chọn bị ngắt (app báo rõ) — bấm **◎** lần nữa là tiếp tục.

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

#### Nhận ra bằng URL — "cứ bị đá về trang này là biết văng phiên"

Nhiều site mất phiên là đẩy thẳng về trang chủ hoặc trang đăng nhập, chẳng để lại phần tử nào chắc chắn
để bám. Ô **Dấu hiệu** vì vậy có ba kiểu:

| Kiểu | Nhận ra bằng | Dùng khi |
|---|---|---|
| **Phần tử** *(mặc định)* | selector hiện / ẩn | trang nào cũng có ô đăng nhập khi bị out |
| **URL** | URL hiện tại khớp / không khớp mẫu | bị đá về đúng một địa chỉ cố định |
| **Cả hai** | phải thoả **cả** phần tử **lẫn** URL | chắc ăn nhất, ít báo nhầm |

Mẫu URL viết ba cách:

| Viết | Khớp cái gì |
|---|---|
| `https://thuvienphapluat.vn` | **đúng URL đó** — không phân biệt hoa/thường, `/` thừa ở cuối bỏ qua |
| `https://thuvienphapluat.vn/*` | trang đó **và mọi trang con**; `*` thay cho đoạn bất kỳ |
| `/dang-nhap\|login/i` | bọc trong `/…/` là **regex** |

⚠️ Cố ý **không** mặc định "chứa chuỗi": `https://thuvienphapluat.vn` là tiền tố của mọi trang trong
site, nếu hiểu là chứa-chuỗi thì dấu hiệu lúc nào cũng đúng và phục hồi chạy vô tận. Muốn "mọi trang
con" thì thêm `*`.

App còn **hỏng sớm** thay vì đứng chờ đủ 180s cho một phần tử không bao giờ hiện: đang chờ trang tải mà
URL trùng dấu hiệu là báo lỗi ngay; chờ quá 4 giây chưa thấy mốc thì dò thêm cả dấu hiệu kiểu phần tử.
Lỗi đó làm bước hiện tại chạy lại sau khi phục hồi — đúng cái ta cần.

#### Quay lại trang đang dở

Đây là chỗ hay hụt: **đăng nhập lại xong thường nằm ở trang chủ, không phải trang đang dùng dở.** Kịch
bản chạy tiếp trên trang chủ thì bước sau bóc ra rỗng hoặc lỗi.

Tick **"Quay lại trang đang dở sau khi khắc phục"** (mặc định bật) để app tự mở lại đúng trang lúc bị
văng rồi mới chạy tiếp. App biết "trang đang dở" là trang nào nhờ ghi lại URL **ở thời điểm vừa kiểm
xong mọi dấu hiệu và thấy sạch** — chứ không ghi bừa URL sau mỗi bước, vì URL đó có khi đã là trang chủ
mà site vừa đá về.

Hai đường về, app chọn đường chắc hơn:

| Bị đá về lúc | App làm gì |
|---|---|
| Đang chờ một bước **Mở trang** | Bước đó hỏng ngay → phục hồi → **chạy lại chính bước đó**, tự nó biết URL cần mở |
| Giữa hai bước (bấm một cái là văng) | Phục hồi → **mở lại URL lành lặn gần nhất** → chạy tiếp bước đang tới |

Vì vậy bước **Mở trang** nên luôn khai *phần tử làm mốc*: có mốc thì bị đá về là hỏng ngay đúng bước đó
và về đúng chỗ, không mốc thì app không biết trang vừa mở là trang sai.

Với dấu hiệu kiểu URL thì gần như **bắt buộc bật** — vì URL không tự đổi sau khi đăng nhập, dấu hiệu sẽ
còn nguyên. App chặn sẵn: chạy phục hồi **3 lần liên tiếp** mà dấu hiệu vẫn còn thì dừng hẳn và nói rõ
lý do, không lặp vô tận.

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
| Đang chọn ◎ mà bấm nút không thấy dropdown sổ ra | Cú bấm bị app bắt lấy để đọc selector. Giữ **Alt (⌥)** rồi bấm — xem mục **3.2** |
| *"Đã chạy phục hồi … 3 lần liên tiếp mà dấu hiệu vẫn còn"* | Khắc phục xong nhưng dấu hiệu không tắt. Nếu dấu hiệu là URL: bật **Quay lại trang đang dở**, hoặc đổi mẫu URL cho hẹp lại (đừng để `*` quét cả site) |
| Cột trong bảng rỗng hết | Selector cột sai, hoặc regex không khớp. Thử bỏ regex trước để xem giá trị thô |
| Cột rỗng chỉ ở vài dòng | Có thể dữ liệu **thật sự không có** trên trang đó, không phải lỗi. Mở tay trang đó trong Chrome kiểm chứng |
| Cột Hiệu lực / Tình trạng hiện *"Đã biết"* | Nội dung này thuvienphapluat.vn chỉ mở cho **gói trả phí**; đăng nhập thường không đủ |
| Bước *Đăng nhập* lỗi | Sai tài khoản trong `.env.local`, hoặc site đổi form. Xem thông báo lỗi — app in nguyên văn thông báo của site |
| *"Không tìm thấy Google Chrome"* / đặt `CHROME_PATH` mà vẫn lỗi | Xem mục **1.6**. Nhớ: `.env.local` phải nằm **cùng thư mục với `chay.bat` / `chay.command`**; Windows trỏ vào `chrome.exe`, macOS trỏ vào `.app` |
| App không mở, cổng 3000 bận | macOS `PORT=4000 ./chay.command` · Windows `set PORT=4000 && chay.bat` |
| Đóng gói báo `EPERM: operation not permitted, symlink` | Bản script cũ. Cập nhật `scripts/dong-goi.mjs` — nó phải copy bằng `dereference: true`. Script mới in `✓ không còn symlink nào trong gói` ở bước 3/5 |
| Windows: cửa sổ đen hiện rồi tắt ngay | Mở Command Prompt, `cd` vào thư mục rồi chạy `chay.bat` để đọc được lỗi |
| Windows: chữ tiếng Việt trong cửa sổ bị lỗi ô vuông | Chỉ là hiển thị của Command Prompt, app vẫn chạy đúng. Đọc thông báo trong trình duyệt thay vì trong cửa sổ đen |
| Chrome mở nhưng app báo không nối được | Đóng hết cửa sổ Chrome do app bật (nút **Đóng Chrome**), rồi chạy lại |
| Bấm Chạy báo lỗi mạng | Máy không có Internet. Xem lại mục 1.5 |

**Đừng chạy quá dày.** Cloudflare sẽ chặn IP. Nếu cần chạy định kỳ, giãn ≥ 15 phút một lần.

---

## Phần 5 — Lưu ý cần biết

- **Mật khẩu trong gói.** Nếu gói được đóng kèm `.env.local`, mật khẩu nằm trong đó ở dạng đọc được.
  Đừng gửi gói cho người không nên biết mật khẩu. Muốn tránh: xoá dòng `cp .env.local` trong
  `scripts/dong-goi.mjs` rồi tự tạo file ở máy đích.
- **Gói Windows được đóng từ máy Mac.** Chạy thử `chay.bat` một lần trên máy Windows trước khi phát cho
  người khác.
- **"Chạy JS" là cửa sau thật** — nó thực thi mã JS trong trang đang mở. Chỉ chạy kịch bản bạn tự viết
  hoặc đã đọc qua; đừng chạy file JSON người khác gửi mà chưa xem.
- **Dùng để tra cứu.** `robots.txt` của thuvienphapluat.vn cho phép truy cập nhưng bảo lưu quyền
  (`ai-train=no, use=reference`). Lưu metadata + link về nguồn thì bình thường; đừng mirror toàn văn ra
  public.
- **Kịch bản giòn theo bản chất.** Site đổi id/class là kịch bản hỏng — nhưng sửa được ngay trong UI
  bằng nút ◎ thay vì phải sửa code.
