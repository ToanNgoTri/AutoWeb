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

# .env.local chứa tài khoản TVPL — mang theo để máy đích chạy được ngay.
# Nếu không muốn nhúng mật khẩu vào gói, xoá dòng cp này và tự tạo .env.local ở máy đích.
[[ -f "$GOC/.env.local" ]] && cp "$GOC/.env.local" "$RA/.env.local"

echo "▶ 3/5  Kiểm tra playwright-core có được gom vào chưa"
if [[ ! -d "$RA/node_modules/playwright-core" ]]; then
  echo "  … bộ dò phụ thuộc bỏ sót, copy tay"
  mkdir -p "$RA/node_modules"
  cp -R "$GOC/node_modules/playwright-core" "$RA/node_modules/playwright-core"
fi
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

echo "▶ 5/5  Tạo script khởi động"
cat > "$RA/chay.command" <<'LAUNCHER'
#!/bin/bash
# Bấm đúp vào file này để chạy app.
cd "$(dirname "$0")"

if [[ -x "./runtime/node" ]]; then
  NODE="./runtime/node"
elif command -v node >/dev/null 2>&1; then
  NODE="node"
else
  echo "✗ Không tìm thấy Node. Gói này được đóng bằng --khong-node nên máy phải cài Node >= 20."
  read -r -p "Enter để đóng..." _ ; exit 1
fi

if [[ ! -d "/Applications/Google Chrome.app" ]] && [[ -z "${CHROME_PATH:-}" ]]; then
  echo "✗ Chưa có Google Chrome. App bắt buộc cần Chrome thật để vượt Cloudflare."
  echo "  Cài Chrome, hoặc đặt CHROME_PATH trong .env.local"
  read -r -p "Enter để đóng..." _ ; exit 1
fi

PORT="${PORT:-3000}"
echo "▶ Đang chạy trên http://localhost:$PORT  (Ctrl+C để dừng)"
(sleep 2 && open "http://localhost:$PORT") &
PORT="$PORT" HOSTNAME=127.0.0.1 exec "$NODE" server.js
LAUNCHER
chmod +x "$RA/chay.command"

cat > "$RA/DOC-TRUOC-KHI-CHAY.txt" <<'DOCS'
tvpl-nghidinh — bản đóng gói
============================

CÁCH DÙNG
  Bấm đúp vào "chay.command". Trình duyệt sẽ tự mở http://localhost:3000
  (Lần đầu macOS có thể chặn: chuột phải vào chay.command → Open → Open.)

MÁY ĐÍCH CẦN GÌ
  1. macOS cùng kiến trúc với máy đóng gói (Apple Silicon / Intel).
  2. Google Chrome cài trong /Applications  ← BẮT BUỘC, không thay thế được.
     App điều khiển Chrome thật vì thuvienphapluat.vn có Cloudflare chặn bot.
  3. KHÔNG cần cài Node, KHÔNG cần npm install (đã nhúng sẵn trong runtime/).

QUAN TRỌNG — VỀ CHUYỆN "KHÔNG CÓ MẠNG"
  Gói này không cần mạng để CÀI ĐẶT.
  Nhưng khi CHẠY thì vẫn phải có Internet, vì app đi đọc dữ liệu trực tiếp
  từ thuvienphapluat.vn. Máy hoàn toàn offline sẽ mở được giao diện nhưng
  bấm tìm kiếm sẽ báo lỗi mạng.
  Muốn dùng thật sự offline thì phải đổi thiết kế: chạy sẵn trên máy có mạng,
  xuất kết quả ra file JSON, rồi mang file đó sang máy offline để đọc.

TÀI KHOẢN
  Sửa file .env.local nếu cần đổi tài khoản TVPL:
      TVPL_USERNAME=...
      TVPL_PASSWORD=...
  Xoá 2 dòng đó thì app chạy ở chế độ khách.
  Lưu ý: file .env.local trong gói này đang chứa mật khẩu ở dạng chữ thường
  đọc được. Đừng gửi gói cho người không nên biết mật khẩu.

ĐỔI CỔNG
  PORT=4000 ./chay.command
DOCS

echo
echo "✓ Xong: $RA"
echo "  Kích thước: $(du -sh "$RA" | cut -f1)"
echo
echo "  Nén để mang đi:"
echo "    cd dist-offline && zip -qr tvpl-nghidinh.zip tvpl-nghidinh"
