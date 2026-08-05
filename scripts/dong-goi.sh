#!/bin/bash
# Đóng gói app thành một thư mục tự chứa, copy sang máy khác là chạy được,
# KHÔNG cần npm install, KHÔNG cần cài Node.
#
#   bash scripts/dong-goi.sh              # nhúng luôn Node runtime (mặc định)
#   bash scripts/dong-goi.sh --khong-node # nhỏ hơn, nhưng máy đích phải có Node >= 20
#
# Kết quả: dist-offline/tvpl-nghidinh/  → nén lại rồi copy đi.
set -euo pipefail

cd "$(dirname "$0")/.."
GOC="$(pwd)"
RA="$GOC/dist-offline/tvpl-nghidinh"
NHUNG_NODE=1
[[ "${1:-}" == "--khong-node" ]] && NHUNG_NODE=0

# Bản Node nhúng kèm: lấy từ nodejs.org vì bản Homebrew phụ thuộc dylib của
# Homebrew, copy sang máy khác sẽ không chạy được.
NODE_VER="v22.14.0"
case "$(uname -m)" in
  arm64) NODE_ARCH="darwin-arm64" ;;
  x86_64) NODE_ARCH="darwin-x64" ;;
  *) echo "✗ Kiến trúc $(uname -m) chưa hỗ trợ"; exit 1 ;;
esac

echo "▶ 1/5  Build production"
rm -rf "$GOC/dist-offline" "$GOC/.next"
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
  curl -fsSL "https://nodejs.org/dist/$NODE_VER/node-$NODE_VER-$NODE_ARCH.tar.gz" -o "$TMP/node.tgz"
  tar -xzf "$TMP/node.tgz" -C "$TMP"
  mkdir -p "$RA/runtime"
  cp "$TMP/node-$NODE_VER-$NODE_ARCH/bin/node" "$RA/runtime/node"
  chmod +x "$RA/runtime/node"
  rm -rf "$TMP"
  # bản nodejs.org chỉ phụ thuộc lib hệ thống → chạy được trên máy sạch
  echo "  ✓ runtime/node ($(du -sh "$RA/runtime/node" | cut -f1))"
else
  echo "▶ 4/5  Bỏ qua Node runtime (--khong-node)"
fi

echo "▶ 5/5  Tạo script khởi động + hướng dẫn"
[[ -f "$GOC/HUONG-DAN.md" ]] && cp "$GOC/HUONG-DAN.md" "$RA/HUONG-DAN.md"
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

if [[ ! -d "/Applications/Google Chrome.app" ]] && [[ -z "${CHROME_PATH:-}" ]]; then
  echo "✗ Chưa có Google Chrome trong /Applications."
  echo "  App điều khiển Chrome thật (thuvienphapluat.vn chặn bot), nên đây là bắt buộc."
  echo "  Cài Chrome, hoặc thêm dòng CHROME_PATH=/duong/dan/toi/Chrome vào file .env.local"
  read -r -p "Enter để đóng..." _ ; exit 1
fi

# Cảnh báo sớm thay vì để người dùng đợi rồi mới thấy lỗi mạng.
if ! /usr/bin/nc -z -G 3 thuvienphapluat.vn 443 >/dev/null 2>&1; then
  echo "⚠ Không kết nối được thuvienphapluat.vn."
  echo "  Giao diện vẫn mở được và bạn vẫn soạn/lưu kịch bản được, nhưng bấm Chạy sẽ lỗi:"
  echo "  app đọc dữ liệu trực tiếp từ website nên lúc CHẠY vẫn cần Internet."
  echo
fi

PORT="${PORT:-3000}"
echo "▶ Đang chạy trên http://localhost:$PORT  (Ctrl+C để dừng)"
(sleep 2 && open "http://localhost:$PORT") &
PORT="$PORT" HOSTNAME=127.0.0.1 exec "$NODE" server.js
LAUNCHER
chmod +x "$RA/chay.command"

cat > "$RA/BAT-DAU-TU-DAY.txt" <<'DOCS'
tvpl-nghidinh — bắt đầu từ đây
==============================

1. Bấm đúp vào  chay.command   → trình duyệt tự mở http://localhost:3000

2. Nếu macOS báo "không mở được vì không rõ nhà phát triển":
   Chuột phải vào chay.command → Open → Open.
   Vẫn không được thì mở Terminal, gõ  xattr -cr  rồi kéo thư mục này vào, Enter.

3. Máy này cần: macOS cùng loại chip với máy đóng gói, và Google Chrome
   trong /Applications. KHÔNG cần cài Node, KHÔNG cần npm install.

4. VỀ MẠNG: gói này không cần mạng để CÀI, nhưng lúc CHẠY vẫn cần Internet
   vì app đọc dữ liệu trực tiếp từ thuvienphapluat.vn.

Hướng dẫn đầy đủ: mở file  HUONG-DAN.md
DOCS

echo
echo "✓ Xong: $RA"
echo "  Kích thước: $(du -sh "$RA" | cut -f1)"
echo
echo "  Kiểm nhanh trước khi gửi đi:"
echo "    cd \"$RA\" && ./runtime/node -v"
echo
echo "  Nén để mang đi:"
echo "    cd dist-offline && zip -qr tvpl-nghidinh.zip tvpl-nghidinh"
