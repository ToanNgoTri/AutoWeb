# tvpl-nghidinh

App Next.js điều khiển **Chrome thật** thao tác trên [thuvienphapluat.vn](https://thuvienphapluat.vn):
mở trang Tra cứu văn bản → **đăng nhập** → bấm **"+ Thêm điều kiện"** (tìm kiếm nâng cao) → chọn **Loại
văn bản = Nghị định** → chọn **sắp xếp mới nhất** → bấm Tìm kiếm → đọc bảng kết quả.

Bạn xem nó thao tác ở hai nơi: cửa sổ Chrome bật lên trên màn hình, và khung "Màn hình Chrome" trong
app (screenshot stream ~1 khung/giây qua SSE, kiểu computer-use).

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

## Selector — lấy từ DOM thật, không phải đoán

`scripts/explore*.mjs` là các script dò DOM (chạy `node scripts/explore.mjs`, kết quả ghi vào
`scripts/out/`). Những gì tìm được:

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

App đăng nhập qua **form trên trang** (điền + bấm) để bạn nhìn thấy, không gọi API ngầm.

Nút Tìm kiếm chỉ điều hướng tới một URL GET, nên nếu sau này muốn bỏ phần click:

```
/page/tim-van-ban.aspx?keyword=&area=0&type=11&status=0&lan=1&org=0&signer=0&match=True&sort=2&bdate=&edate=
```

(vẫn cần browser để qua Cloudflare)

## Tốc độ diễn

Dropdown **Tốc độ** trên header: Nhanh / Vừa / Chậm / Rất chậm (mặc định **Chậm**). Nó điều khiển ba
thứ cùng lúc — khoảng nghỉ giữa các thao tác, độ trễ giữa từng ký tự khi gõ, và tần số chụp màn hình.

Trước mỗi thao tác, app **khoanh viền vàng + dán nhãn** lên đúng phần tử sắp bị tác động và làm tối
phần còn lại (`Tempo.spotlight` trong `lib/tvpl/pace.ts`), nên nhìn là biết ngay nó đang làm gì.

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
lib/tvpl/browser.ts   spawn Chrome + connectOverCDP, singleton trên globalThis
lib/tvpl/scraper.ts   9 bước automation, emit event + screenshot
lib/tvpl/pace.ts      Tempo: khoảng nghỉ theo tốc độ + spotlight khoanh phần tử
lib/tvpl/types.ts     NghiDinh, SearchResult, LoginState, ScrapeEvent, Pace, STEP_LABELS
app/api/tvpl/stream   SSE, 1 phiên/lúc (BusyError nếu gọi trùng)
app/api/tvpl/browser  GET trạng thái / DELETE đóng Chrome
app/page.tsx          UI: live view + timeline + log + bảng kết quả
scripts/dong-goi.sh   đóng gói thành thư mục tự chứa
scripts/*.mjs         các script dò DOM & đo Cloudflare (tài liệu sống)
```

## Giới hạn đã biết

- **Cột Hiệu lực / Tình trạng trả về "Đã biết" dù đã đăng nhập.** Tài khoản đang dùng thuộc **gói miễn
  phí** (góc tài khoản hiện link "Nâng cấp tài khoản", và `#ddlStatus` vẫn `disabled`). Muốn đọc 2 cột
  này phải nâng cấp gói trả phí. Kiểm chứng bằng `scripts/verify-login.mjs`.
  Bù lại, **toàn văn Nghị định thì đọc được** với tài khoản này.
- **Chỉ chạy local.** Không deploy Vercel được (serverless không mang được Chrome binary, không có disk
  bền cho profile, và không thể spawn process). Muốn lên server thì cần Docker +
  `mcr.microsoft.com/playwright`, và chấp nhận tỉ lệ bị Cloudflare chặn cao hơn vì IP datacenter.
- **Giòn theo thiết kế.** TVPL đổi id dropdown là hỏng. Chạy lại `scripts/explore.mjs` để dò lại.
- **Đừng gọi dày.** Cloudflare sẽ chặn IP. Đã chặn chạy song song ở tầng scraper; nếu cần chạy định kỳ
  thì cache kết quả và giãn ≥ 15 phút/lần.
- robots.txt của TVPL: `Allow: /` nhưng `Content-Signal: ai-train=no, use=reference`. App này dùng để
  **tra cứu** (lưu metadata + link về nguồn). Đừng mirror toàn văn ra public.
