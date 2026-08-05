#!/bin/bash
# Đóng gói app thành một thư mục tự chứa, copy sang máy khác là chạy được,
# KHÔNG cần npm install, KHÔNG cần cài Node.
#
#   bash scripts/dong-goi.sh              # cho macOS (mặc định), nhúng Node
#   bash scripts/dong-goi.sh --windows    # cho Windows x64, nhúng Node
#   bash scripts/dong-goi.sh --khong-node # nhỏ hơn, máy đích phải tự có Node >= 20
#
# Kết quả: dist-offline/tvpl-nghidinh-<he-dieu-hanh>/  → nén lại rồi copy đi.
#
# LƯU Ý: gói Windows được tạo TỪ macOS nên chưa được chạy thử trên Windows thật.
# Chạy thử một lần trên máy Windows trước khi phát cho người khác.
set -euo pipefail

cd "$(dirname "$0")/.."
GOC="$(pwd)"
NHUNG_NODE=1
HDH="mac"
for arg in "$@"; do
  case "$arg" in
    --windows) HDH="windows" ;;
    --khong-node) NHUNG_NODE=0 ;;
    *) echo "✗ Cờ không hiểu: $arg"; exit 1 ;;
  esac
done
RA="$GOC/dist-offline/tvpl-nghidinh-$HDH"

# Bản Node nhúng kèm lấy từ nodejs.org: bản Homebrew phụ thuộc dylib trong
# /opt/homebrew nên copy sang máy sạch là chết.
NODE_VER="v22.14.0"
if [[ "$HDH" == "windows" ]]; then
  NODE_ARCH="win-x64"
  NODE_EXT="zip"
  NODE_BIN_TRONG_GOI="node.exe"
else
  case "$(uname -m)" in
    arm64) NODE_ARCH="darwin-arm64" ;;
    x86_64) NODE_ARCH="darwin-x64" ;;
    *) echo "✗ Kiến trúc $(uname -m) chưa hỗ trợ"; exit 1 ;;
  esac
  NODE_EXT="tar.gz"
  NODE_BIN_TRONG_GOI="node"
fi

echo "▶ 1/5  Build production"
rm -rf "$RA" "$GOC/.next"
npm run build >/dev/null

echo "▶ 2/5  Gom bản standalone"
mkdir -p "$RA"
cp -R "$GOC/.next/standalone/." "$RA/"
# server.js không tự phục vụ 2 thư mục này, phải copy tay (theo tài liệu Next)
mkdir -p "$RA/.next"
cp -R "$GOC/.next/static" "$RA/.next/static"
[[ -d "$GOC/public" ]] && cp -R "$GOC/public" "$RA/public"

# kịch bản đã lưu → mang theo để máy đích có sẵn mà dùng.
# Dùng "/." + mkdir -p vì bản standalone có thể đã tự tạo thư mục kich-ban rỗng,
# lúc đó `cp -R src dst` sẽ lồng thành kich-ban/kich-ban.
if [[ -d "$GOC/kich-ban" ]]; then
  mkdir -p "$RA/kich-ban"
  cp -R "$GOC/kich-ban/." "$RA/kich-ban/"
fi

# .env.local chứa tài khoản TVPL — mang theo để máy đích chạy được ngay.
# Nếu không muốn nhúng mật khẩu vào gói, xoá dòng cp này và tự tạo .env.local ở máy đích.
[[ -f "$GOC/.env.local" ]] && cp "$GOC/.env.local" "$RA/.env.local"

echo "▶ 3/5  Kiểm tra playwright-core có được gom ĐỦ chưa"
# Kiểm file thật, không chỉ kiểm thư mục: bộ dò của Next hay copy thiếu
# browsers.json và làm gói chết lúc chạy với lỗi "Cannot find module".
if [[ ! -f "$RA/node_modules/playwright-core/browsers.json" ]]; then
  echo "  … thiếu file, copy tay cả package"
  rm -rf "$RA/node_modules/playwright-core"
  mkdir -p "$RA/node_modules"
  cp -R "$GOC/node_modules/playwright-core" "$RA/node_modules/playwright-core"
fi
for f in browsers.json package.json index.js; do
  [[ -f "$RA/node_modules/playwright-core/$f" ]] || { echo "✗ vẫn thiếu playwright-core/$f"; exit 1; }
done
echo "  ✓ playwright-core: $(du -sh "$RA/node_modules/playwright-core" | cut -f1)"

if [[ "$NHUNG_NODE" == "1" ]]; then
  echo "▶ 4/5  Tải Node $NODE_VER ($NODE_ARCH) để nhúng kèm"
  TMP="$(mktemp -d)"
  TEN="node-$NODE_VER-$NODE_ARCH"
  curl -fsSL "https://nodejs.org/dist/$NODE_VER/$TEN.$NODE_EXT" -o "$TMP/node.$NODE_EXT"
  mkdir -p "$RA/runtime"
  if [[ "$NODE_EXT" == "zip" ]]; then
    unzip -q "$TMP/node.$NODE_EXT" -d "$TMP"
    cp "$TMP/$TEN/node.exe" "$RA/runtime/node.exe"
  else
    tar -xzf "$TMP/node.$NODE_EXT" -C "$TMP"
    cp "$TMP/$TEN/bin/node" "$RA/runtime/node"
    chmod +x "$RA/runtime/node"
  fi
  rm -rf "$TMP"
  echo "  ✓ runtime/$NODE_BIN_TRONG_GOI ($(du -sh "$RA/runtime/$NODE_BIN_TRONG_GOI" | cut -f1))"
else
  echo "▶ 4/5  Bỏ qua Node runtime (--khong-node)"
fi

echo "▶ 5/5  Tạo script khởi động + hướng dẫn"
[[ -f "$GOC/HUONG-DAN.md" ]] && cp "$GOC/HUONG-DAN.md" "$RA/HUONG-DAN.md"

# Toàn bộ logic khởi động (tìm Chrome, kiểm mạng, bật server, mở trình duyệt)
# nằm trong khoi-dong.mjs — chạy được trên cả macOS và Windows.
cp "$GOC/scripts/khoi-dong.mjs" "$RA/khoi-dong.mjs"

# khoi-dong.mjs import lib/tvpl/tim-chrome.js để kiểm Chrome NGAY LÚC KHỞI ĐỘNG.
# Bộ dò phụ thuộc của Next không gom file này (nó đã được biên dịch vào bundle
# của server), nên phải copy tay — thiếu là mất luôn bước kiểm Chrome.
# Đặt tên .mjs trong gói: package.json của bản standalone không có
# "type":"module", nếu để .js thì Node in cảnh báo MODULE_TYPELESS_PACKAGE_JSON.
mkdir -p "$RA/lib/tvpl"
cp "$GOC/lib/tvpl/tim-chrome.js" "$RA/lib/tvpl/tim-chrome.mjs"
[[ -f "$RA/lib/tvpl/tim-chrome.mjs" ]] || { echo "✗ thiếu lib/tvpl/tim-chrome.mjs trong gói"; exit 1; }

if [[ "$HDH" == "windows" ]]; then
  # .bat phải dùng CRLF, nếu không cmd.exe hiểu sai dòng lệnh.
  {
    printf '@echo off\r\n'
    printf 'setlocal\r\n'
    printf 'cd /d "%%~dp0"\r\n'
    printf 'chcp 65001 >nul\r\n'
    printf '\r\n'
    printf 'set "NODE="\r\n'
    printf 'if exist "runtime\\node.exe" set "NODE=runtime\\node.exe"\r\n'
    printf 'if not defined NODE (\r\n'
    printf '  where node >nul 2>&1 && set "NODE=node"\r\n'
    printf ')\r\n'
    printf 'if not defined NODE (\r\n'
    printf '  echo [X] Khong tim thay Node.\r\n'
    printf '  echo     Goi nay duoc dong bang --khong-node nen may phai cai Node ^>= 20 tu nodejs.org\r\n'
    printf '  pause\r\n'
    printf '  exit /b 1\r\n'
    printf ')\r\n'
    printf '\r\n'
    printf 'if not defined PORT set "PORT=3000"\r\n'
    printf '"%%NODE%%" khoi-dong.mjs\r\n'
    printf 'if errorlevel 1 pause\r\n'
  } > "$RA/chay.bat"
  echo "  ✓ chay.bat (Windows)"
else
  cat > "$RA/chay.command" <<'LAUNCHER'
#!/bin/bash
# Bấm đúp vào file này để chạy app.
cd "$(dirname "$0")"

NODE=""
# Node nhúng kèm có thể bị macOS chặn nếu gói đi qua mạng (cờ com.apple.quarantine),
# nên thử chạy thật một lần chứ không chỉ kiểm quyền thực thi.
if [[ -x "./runtime/node" ]] && ./runtime/node -v >/dev/null 2>&1; then
  NODE="./runtime/node"
elif command -v node >/dev/null 2>&1; then
  NODE="node"
  echo "ℹ Dùng Node của máy vì Node nhúng kèm không chạy được."
fi

if [[ -z "$NODE" ]]; then
  echo "✗ Không chạy được Node."
  echo
  echo "  Nếu gói này được tải/gửi qua mạng, macOS đã gắn cờ cách ly. Mở Terminal và chạy:"
  echo
  echo "      xattr -cr \"$(pwd)\""
  echo
  echo "  rồi bấm đúp lại chay.command. Hoặc cài Node >= 20 từ nodejs.org."
  read -r -p "Enter để đóng..." _ ; exit 1
fi

exec "$NODE" khoi-dong.mjs
LAUNCHER
  chmod +x "$RA/chay.command"
  echo "  ✓ chay.command (macOS)"
fi

if [[ "$HDH" == "windows" ]]; then
cat > "$RA/BAT-DAU-TU-DAY.txt" <<'DOCS'
tvpl-nghidinh - bat dau tu day (Windows)
========================================

1. Bam dup vao  chay.bat   -> trinh duyet tu mo http://localhost:3000

2. Neu Windows Defender / SmartScreen canh bao:
   bam "More info" -> "Run anyway". Chi phai lam mot lan.

3. May nay can: Windows 64-bit, va Google Chrome.
   KHONG can cai Node, KHONG can npm install.

4. Neu bao "Khong tim thay Google Chrome": mo Command Prompt (Win+R -> cmd) chay
      reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe" /ve
   roi them dong nay vao file .env.local (cung thu muc nay, mo bang Notepad):
      CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe

5. VE MANG: goi nay khong can mang de CAI, nhung luc CHAY van can Internet
   vi app doc du lieu truc tiep tu thuvienphapluat.vn.

Doi cong:  mo Command Prompt, cd vao thu muc nay roi:  set PORT=4000 && chay.bat

Huong dan day du: mo file  HUONG-DAN.md  (bang Notepad hoac VS Code)
DOCS
else
cat > "$RA/BAT-DAU-TU-DAY.txt" <<'DOCS'
tvpl-nghidinh — bắt đầu từ đây (macOS)
======================================

1. Bấm đúp vào  chay.command   → trình duyệt tự mở http://localhost:3000

2. Nếu macOS báo "không mở được vì không rõ nhà phát triển":
   Chuột phải vào chay.command → Open → Open.
   Vẫn không được thì mở Terminal, gõ  xattr -cr  rồi kéo thư mục này vào, Enter.

3. Máy này cần: macOS cùng loại chip với máy đóng gói, và Google Chrome.
   KHÔNG cần cài Node, KHÔNG cần npm install.

4. Nếu báo "Không tìm thấy Google Chrome": mở Terminal chạy
      ls -d /Applications/*.app ~/Applications/*.app 2>/dev/null | grep -i chrom
   rồi thêm dòng này vào file .env.local (cùng thư mục này, Cmd+Shift+. để hiện file ẩn):
      CHROME_PATH=/Applications/Google Chrome.app
   Trỏ vào .app là đủ, không cần trỏ sâu vào trong.

5. VỀ MẠNG: gói này không cần mạng để CÀI, nhưng lúc CHẠY vẫn cần Internet
   vì app đọc dữ liệu trực tiếp từ thuvienphapluat.vn.

Đổi cổng:  PORT=4000 ./chay.command

Hướng dẫn đầy đủ: mở file  HUONG-DAN.md
DOCS
fi

echo
echo "✓ Xong: $RA"
echo "  Kích thước: $(du -sh "$RA" | cut -f1)"
echo
# Với gói macOS thì kiểm luôn: Node chạy được và import được tim-chrome.js.
if [[ "$HDH" == "mac" && "$NHUNG_NODE" == "1" ]]; then
  if ! (cd "$RA" && ./runtime/node -e "import('./lib/tvpl/tim-chrome.mjs').then(m=>{const r=m.timChrome();if(!r.duongDan)process.exit(9);console.log('  ✓ kiểm gói: Chrome →',r.duongDan)})" ); then
    echo "  ⚠ Gói chạy được nhưng không tìm thấy Chrome trên MÁY NÀY (máy đích có thể vẫn ổn)."
  fi
fi

echo "  Hệ điều hành đích: $HDH"
if [[ "$HDH" == "windows" ]]; then
  echo
  echo "  ⚠ Gói Windows này được tạo từ macOS nên CHƯA chạy thử trên Windows thật."
  echo "    Chạy chay.bat một lần trên máy Windows trước khi phát cho người khác."
else
  echo
  echo "  Kiểm nhanh trước khi gửi đi:"
  echo "    cd \"$RA\" && ./runtime/node -v && ./runtime/node khoi-dong.mjs"
fi
echo
echo "  Nén để mang đi:"
echo "    cd dist-offline && zip -qr $(basename "$RA").zip $(basename "$RA")"
