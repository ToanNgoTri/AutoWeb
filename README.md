# tvpl-nghidinh

App Next.js điều khiển **Chrome thật** theo **kịch bản bạn tự khai báo**: vào trang nào, chờ phần tử
nào, điền gì vào đâu, bấm cái gì, rồi bóc ra field nào — tất cả là dữ liệu, không phải code.

Bạn xem nó thao tác ở hai nơi: cửa sổ Chrome bật lên trên màn hình, và khung "Màn hình Chrome" trong
app (screenshot stream, kiểu computer-use). Trước mỗi thao tác app khoanh viền vàng lên đúng phần tử
sắp bị tác động.

Luồng "Nghị định mới nhất trên thuvienphapluat.vn" có sẵn làm **kịch bản mẫu** — dựng hoàn toàn từ các
hành động cấu hình được, không có dòng code riêng nào. Nhân bản nó rồi sửa là dùng cho site khác.

## Kịch bản gồm những gì

Mỗi bước = một **hành động** + tuỳ chọn chung. Các hành động có sẵn:

| Hành động | Khai báo gì |
|---|---|
| **Mở trang** | URL + phần tử làm mốc "đã tải xong" (mốc này cũng là chỗ chờ vượt Cloudflare) |
| **Chờ** | selector + chờ *hiện ra* hay *ẩn đi*, hoặc chờ số ms |
| **Điền** | selector + nội dung; gõ từng ký tự hay đổ một cục; có Enter sau khi điền hay không |
| **Chọn dropdown** | selector `<select>` + `value` |
| **Bấm** | selector + cú bấm này có làm chuyển trang không |
| **Nhấn phím** | Enter / Tab / Escape / ArrowDown / Control+A… |
| **Cuộn đến** | selector |
| **Khẳng định** | selector + *có mặt* / *vắng mặt* / *chứa chữ*; sai thì dừng hẳn hay chỉ ghi log |
| **Lấy bảng** | selector **một dòng** (khớp nhiều phần tử) + danh sách cột, mỗi cột có selector con, lấy *text* / *thuộc tính* / *HTML*, kèm regex bóc tiếp |
| **Lấy một giá trị** | selector + nguồn + regex |
| **Chạy JS** | cửa sau: mã JS chạy trong trang, giá trị `return` được lưu lại |
| **Vòng lặp** | nhóm bước con chạy lại: N lượt / mỗi dòng của một bảng đã bóc / tới khi một điều kiện thoả |
| **Gọi phục hồi** | chạy tay một quy trình phục hồi đã khai |

### Sửa ở đâu cũng được, không có trần nào

Giữa **mọi cặp bước** — và trước bước đầu, sau bước cuối — có một điểm **+** mảnh. Rê chuột vào là hiện,
bấm là chọn loại hành động rồi chèn đúng vào chỗ đó. Số bước **không giới hạn**: danh sách bước là một
mảng, mọi phép chèn/xoá/đổi thứ tự nằm trong `DanhSachBuoc` và chỉ trả mảng mới về cho cha.

Mỗi bước có ↑ ↓ đổi thứ tự, ⧉ nhân bản, ● tắt tạm, ✕ xoá. Danh sách **cột** trong "Lấy bảng" cũng vậy:
có điểm **+** giữa mọi cặp cột, kèm ↑ ↓ ⧉ ✕ cho từng cột — thứ tự cột chính là thứ tự cột trong bảng
kết quả và file CSV.

Thân **vòng lặp** dùng lại đúng component đó, nên lồng bao nhiêu tầng cũng được và cũng có đủ điểm chèn.

## Vòng lặp

Ba kiểu, đều đã chạy thật:

| Kiểu | Dùng khi | Biến dùng được trong thân lặp |
|---|---|---|
| **Đúng N lượt** | biết trước số lượt | `{{LAP_SO}}`, `{{LAP_TONG}}` |
| **Mỗi dòng của một bảng** | đã bóc được danh sách, giờ xử lý từng dòng | thêm `{{DONG.tên_cột}}` |
| **Tới khi điều kiện thoả** | không biết trước bao nhiêu lượt (có trần bắt buộc) | `{{LAP_SO}}` |

Đúng cái luồng "vào → sửa → ra → vào lại": kịch bản mẫu **TVPL — mở từng Nghị định rồi quay lại** bóc
danh sách một lần, rồi mỗi dòng mở `{{DONG.link}}`, bóc dữ liệu trang chi tiết, rồi quay về danh sách.

Hai quy tắc cần biết:

- **`Lấy bảng` trong vòng lặp NỐI THÊM** dòng vào bảng cùng tên (chi tiết hiện `+1 dòng (tổng 3)`), không
  ghi đè. Danh sách dòng để lặp được chụp lại trước khi vào lặp, nên thân lặp ghi vào cùng bảng đó cũng
  không thành lặp vô hạn.
- **`Lấy một giá trị` trong vòng lặp gom thành mảng** thay vì ghi đè.

Muốn ghép dữ liệu dòng gốc với dữ liệu bóc ở trang con thì dùng cột nguồn **Biến** — nó không đọc DOM mà
lấy từ `{{DONG.…}}` / `{{LAP_SO}}` / biến `.env.local`.

Trần an toàn: 1000 lượt mỗi vòng lặp, và kiểu "tới khi" bắt buộc phải khai số lượt tối đa.

## Tự đăng nhập lại khi bị out

Mục **Phục hồi** khai các quy trình `{ dấu hiệu → các bước khắc phục }`. Engine kiểm dấu hiệu **trước mỗi
bước** và **cả khi một bước lỗi**; thoả thì chạy quy trình rồi **thử lại đúng bước đang dở** (tối đa 2
lần), không phải bắt đầu lại từ đầu.

Kịch bản mẫu vì vậy **không có bước đăng nhập nào trong danh sách bước** — đăng nhập là quy trình phục
hồi với dấu hiệu "ô `.txt-account-Home` hiện trở lại". Nhờ đó cùng một khai báo lo được cả hai việc: lần
chạy đầu chưa đăng nhập thì nó đăng nhập, và bị đăng xuất giữa đường thì nó vào lại.

Đã test bằng cách chủ động gọi `logout.aspx` giữa lúc chạy: quy trình tự kích hoạt, đăng nhập lại, rồi
kịch bản chạy tiếp và bước khẳng định "vẫn đang đăng nhập" **đạt**.

Không phục hồi lồng phục hồi (đang trong quy trình phục hồi thì không tự kích hoạt thêm), nên không có
đệ quy vô tận.

Mỗi bước còn có:

- **Chỉ chạy khi…** — điều kiện kiểm ngay trước khi chạy (`selector` đang hiện / đang ẩn). Đây là cách
  diễn đạt "chỉ đăng nhập nếu chưa đăng nhập", "chỉ bấm mở nếu panel đang đóng".
- **Bỏ qua lỗi** — lỗi ở bước này thì ghi log rồi chạy tiếp.
- **Tắt tạm** — giữ bước lại nhưng không chạy.
- **Nhãn** riêng, hiện trên timeline và trên spotlight ở trang thật.

Giá trị nhập hỗ trợ `{{TEN_BIEN}}`, thay bằng biến trong `.env.local` lúc chạy — nên **mật khẩu không
nằm trong file kịch bản**, và trong log nó hiện `••••••`.

## Nút ◎ — chọn phần tử trên trang thật

Cạnh mỗi ô selector có nút **◎**. Bấm nó rồi sang cửa sổ Chrome: rê chuột thì phần tử sáng lên kèm
selector, bấm là selector nhảy về app. Kèm theo là các selector thay thế **cùng số phần tử mà nó
khớp** — cần đúng 1 cho *Bấm*/*Điền*, cần nhiều dòng cho *Lấy bảng* — và danh sách thuộc tính bóc được
(`href`, `lawid`, `data-*`…).

Cách xếp hạng selector được điều chỉnh theo thứ tự một người thật sẽ chọn: dìm đường dẫn
`nth-of-type` (khớp đúng 1 nhưng đổi layout là hỏng) và dìm class theo vị trí (`content-0`), ưu tiên
selector neo vào tổ tiên có class. Chọn thẻ `<a>` tiêu đề trên TVPL cho ra `p.nqTitle a` chứ không
phải `div:nth-of-type(2) > div:nth-of-type(1) > …`.

## Lưu và mang đi

Kịch bản lưu thành JSON trong `kich-ban/`. Nút **Lưu** ghi vào đó, **Tải JSON** tải về máy, dropdown
**Mở kịch bản đã lưu** nạp lại. Bản nháp đang soạn tự giữ trong localStorage nên tải lại trang không
mất. Kết quả mỗi bảng có nút **Tải CSV**.

## Chạy

```bash
npm install
npm run dev          # → http://localhost:3000
```

Tài khoản đặt trong `.env.local` (đã được `.gitignore` qua `.env*`):

```
TVPL_USERNAME=...
TVPL_PASSWORD=...
```

Thiếu 2 biến này thì app vẫn chạy, chỉ là ở **chế độ khách** (bước đăng nhập được đánh dấu bỏ qua).

Yêu cầu: có **Google Chrome** trong `/Applications` (hoặc đặt `CHROME_PATH` trong `.env.local`).

## Vì sao KHÔNG dùng `chromium.launch()`

thuvienphapluat.vn nằm sau Cloudflare Bot Management. `curl`/`fetch` trả **HTTP 403 "Just a moment…"**,
nên `cheerio` thuần không dùng được — bắt buộc browser thật.

Nhưng browser thật thôi chưa đủ. Playwright khi tự launch sẽ thêm một loạt cờ automation và Cloudflare
nhận ra. Cách khắc phục: **tự spawn Chrome như người dùng bình thường rồi nối vào qua CDP**
(`chromium.connectOverCDP`). Đo bằng `scripts/test-cdp.mjs`:

| Cách khởi động | Thời gian vượt Cloudflare |
|---|---|
| `launchPersistentContext({channel:'chrome'})` | 25–60s, có lúc không qua |
| spawn Chrome + `connectOverCDP` | **~4s** |

Thú vị là `navigator.webdriver === false` ở cả hai cách — nên thủ phạm là bộ cờ launch, không phải cờ
webdriver.

Toàn phiên end-to-end: **~12s** từ profile trắng (kể cả đăng nhập), **~6s** khi profile đã có cookie.

Profile riêng ở `~/.tvpl-chrome-cdp`, cổng debug `9333` (đổi bằng `TVPL_CDP_PORT`). Cửa sổ Chrome được
giữ mở giữa các lần chạy; bấm **Đóng Chrome** trên header để tắt.

Nếu Cloudflare vẫn chặn, app **không bỏ cuộc**: sau 20s nó hiện banner nhờ bạn bấm tay vào ô xác minh
trong cửa sổ Chrome, và tiếp tục chờ tới 180s.

## Selector của kịch bản mẫu — lấy từ DOM thật, không phải đoán

`scripts/explore*.mjs` là các script dò DOM (chạy `node scripts/explore.mjs`, kết quả ghi vào
`scripts/out/`). Những gì tìm được và đưa vào kịch bản mẫu:

| Việc | Selector / giá trị |
|---|---|
| Toggle tìm kiếm nâng cao | `.autohideClick` — chữ thật là **"+ Thêm điều kiện"**, show/hide `.autohide` |
| Loại văn bản | `#documentTypeDropDownList`, **Nghị định = `11`** |
| Sắp xếp | `#sortDropDownList`, **mới ban hành nằm trên = `2`** |
| Nút tìm | `#btnKeyWord` → JS `SearchKeyword()` tự build query rồi `window.location` |
| Ô đăng nhập | `.txt-account-Home` / `.txt-password-Home` — **theo class**, vì `CheckFullLogin()` đọc bằng class chứ không bằng id |
| Nút đăng nhập | `#loginButton` → `CheckFullLogin()` |
| 1 dòng kết quả | `div[class^="content-"]` ⊃ `p.nqTitle[lawid]` + `.right-col` |
| Tổng số kết quả | `#lbTotal` |

Luồng đăng nhập thật của TVPL (đừng nhầm bước đầu là xác thực):

```
POST /page/ajaxcontroler.aspx  action=CheckFullLogin   → "<ok>" cho MỌI mật khẩu (chỉ là tiền kiểm)
POST /page/ajaxcontroler.aspx  action=Login            → "<ok>" = thành công, ngược lại là câu lỗi
   thành công → fnLogin() gọi location.reload()
   thất bại   → mở dialog #error-dialog-form chứa thông báo
```

Kịch bản mẫu đăng nhập qua **form trên trang** (điền + bấm) để bạn nhìn thấy, không gọi API ngầm.

Một cái bẫy đã xử lý bằng "Chỉ chạy khi…": TVPL nhớ cookie `Cookie_VB` nên panel nâng cao có thể
**đang mở sẵn** từ phiên trước — một cú bấm lúc đó sẽ *đóng* nó lại. Kịch bản mẫu vì vậy có hai bước
đối xứng: *thu lại nếu đang mở*, rồi *mở ra nếu đang đóng*.

Nút Tìm kiếm chỉ điều hướng tới một URL GET, nên nếu sau này muốn bỏ phần click:

```
/page/tim-van-ban.aspx?keyword=&area=0&type=11&status=0&lan=1&org=0&signer=0&match=True&sort=2&bdate=&edate=
```

(vẫn cần browser để qua Cloudflare)

## Tốc độ diễn

Dropdown **Tốc độ** trên header: Nhanh / Vừa / Chậm / Rất chậm (mặc định **Chậm**). Nó điều khiển ba
thứ cùng lúc — khoảng nghỉ giữa các thao tác, độ trễ giữa từng ký tự khi gõ, và tần số chụp màn hình.

Trước mỗi thao tác, app **khoanh viền vàng + dán nhãn** lên đúng phần tử sắp bị tác động và làm tối
phần còn lại (`Tempo.spotlight` trong `lib/tvpl/pace.js`), nên nhìn là biết ngay nó đang làm gì.

Đo thực tế, cùng một luồng từ profile trắng (kể cả đăng nhập):

| Tốc độ | Thời gian | Số khung stream |
|---|---|---|
| Nhanh | 11s | 10 |
| Vừa | 17s | 22 |
| Chậm *(mặc định)* | 30s | 55 |
| Rất chậm | 47s | 104 |

## Đóng gói mang sang máy khác

```bash
npm run dong-goi                       # nhúng luôn Node runtime (mặc định)
npm run dong-goi -- --khong-node       # gói nhỏ hơn, máy đích phải có Node >= 20
cd dist-offline && zip -qr tvpl-nghidinh.zip tvpl-nghidinh
```

Ra `dist-offline/tvpl-nghidinh/` (**~163 MB** có Node, ~59 MB không Node). Copy sang máy khác, bấm đúp
**`chay.command`** là chạy — không `npm install`, không cài Node.

Ba thứ làm việc này khả thi:

| | |
|---|---|
| `output: 'standalone'` | Next gom sẵn phần `node_modules` cần thiết + `server.js` |
| `playwright-core` thay vì `playwright` | 13 MB, không tải Chromium, không có bước `playwright install` |
| Dùng Chrome hệ thống qua CDP | không phải mang browser 95 MB theo gói |

Node nhúng kèm lấy từ **nodejs.org**, không phải bản Homebrew — bản Homebrew link tới dylib trong
`/opt/homebrew` nên copy sang máy sạch là chết (`otool -L` để kiểm).

**Máy đích cần:** macOS cùng kiến trúc (Apple Silicon / Intel) và **Google Chrome trong
/Applications** (bắt buộc — không có cách nào vượt Cloudflare mà không dùng browser thật).

### ⚠️ Về chuyện "máy không có mạng"

Gói này bỏ được nhu cầu mạng khi **cài đặt**. Nhưng khi **chạy** thì vẫn cần Internet, vì app đi đọc
dữ liệu trực tiếp từ thuvienphapluat.vn. Máy offline hoàn toàn sẽ mở được giao diện nhưng bấm tìm
kiếm là lỗi mạng — không có cách nào tránh, dữ liệu nằm trên server của họ.

Muốn dùng thật sự offline thì phải đổi thiết kế: chạy trên máy có mạng → xuất kết quả ra JSON → mang
file sang máy offline để đọc.

## Cấu trúc

```
lib/kich-ban/loai.js         định nghĩa kịch bản + kiểm tra đệ quy (THUẦN — client & server dùng chung)
lib/kich-ban/engine.js       chạy kịch bản, emit event + screenshot
lib/kich-ban/chon-phan-tu.js bộ chọn phần tử + cách xếp hạng selector
lib/kich-ban/mau.js          3 kịch bản mẫu: TVPL Nghị định, ví dụ vòng lặp, kịch bản trắng
lib/kich-ban/luu-tru.js      đọc/ghi kich-ban/*.json, chặn path traversal
lib/kich-ban/su-kien.js      SuKien, KetQuaChay (chỉ JSDoc, không sinh mã)
lib/tvpl/browser.js          spawn Chrome + connectOverCDP, singleton trên globalThis
lib/tvpl/pace.js             Tempo: khoảng nghỉ theo tốc độ + spotlight khoanh phần tử
lib/tvpl/types.js            Pace, PACE_OPTIONS
app/api/chay                 POST kịch bản → stream NDJSON, 1 phiên/lúc
app/api/kich-ban             GET liệt kê/đọc · POST lưu · DELETE xoá
app/api/chon-phan-tu         POST → chờ bạn bấm vào phần tử, trả selector
app/api/tvpl/browser         GET trạng thái / DELETE đóng Chrome
app/page.js                  trình soạn kịch bản + live view + kết quả
app/components/              the-buoc.js (form một bước) · danh-sach-buoc.js (list + điểm chèn, đệ quy)
                             chen-buoc.js (điểm "+") · khoi-phuc-hoi.js · o-selector.js (ô + ◎)
                             boi-canh.js (context trạng thái, khoá theo id bước)
scripts/dong-goi.sh          đóng gói thành thư mục tự chứa
scripts/*.mjs                script dò DOM, đo Cloudflare, test bộ chọn (tài liệu sống)
kich-ban/*.json              kịch bản đã lưu
```

## Giới hạn đã biết

- **Cột Hiệu lực / Tình trạng trả về "Đã biết" dù đã đăng nhập.** Tài khoản đang dùng thuộc **gói miễn
  phí** (góc tài khoản hiện link "Nâng cấp tài khoản", và `#ddlStatus` vẫn `disabled`). Muốn đọc 2 cột
  này phải nâng cấp gói trả phí. Kiểm chứng bằng `scripts/verify-login.mjs`.
  Bù lại, **toàn văn Nghị định thì đọc được** với tài khoản này.
- **Chỉ chạy local.** Không deploy Vercel được (serverless không mang được Chrome binary, không có disk
  bền cho profile, và không thể spawn process). Muốn lên server thì cần Docker +
  `mcr.microsoft.com/playwright`, và chấp nhận tỉ lệ bị Cloudflare chặn cao hơn vì IP datacenter.
- **Giòn theo thiết kế.** Site đổi id/class là kịch bản hỏng — nhưng giờ sửa được ngay trong UI bằng
  nút ◎ thay vì phải sửa code. Đó chính là lý do phần selector được tách hẳn ra thành dữ liệu.
- **"Chạy JS" là cửa sau thật.** Nó `new Function(ma)()` trong trang đang mở. Chỉ chạy kịch bản bạn tự
  viết hoặc tự đọc qua; đừng chạy file JSON người khác gửi mà chưa xem.
- **Đừng gọi dày.** Cloudflare sẽ chặn IP. Đã chặn chạy song song ở tầng scraper; nếu cần chạy định kỳ
  thì cache kết quả và giãn ≥ 15 phút/lần.
- robots.txt của TVPL: `Allow: /` nhưng `Content-Signal: ai-train=no, use=reference`. App này dùng để
  **tra cứu** (lưu metadata + link về nguồn). Đừng mirror toàn văn ra public.
