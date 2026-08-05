/**
 * Đóng gói app thành một thư mục tự chứa: copy sang máy khác là chạy được,
 * KHÔNG cần npm install, KHÔNG cần cài Node.
 *
 * Viết bằng Node (không phải bash) để chạy được cả trên Windows và macOS —
 * bản bash cũ báo "bash: not recognized" khi đóng gói từ máy Windows.
 *
 *   node scripts/dong-goi.mjs --windows
 *   node scripts/dong-goi.mjs --mac --ra /Volumes/USB
 *   node scripts/dong-goi.mjs --help
 */
import { spawn } from 'node:child_process'
import { chmod, cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const GOC = resolve(fileURLToPath(import.meta.url), '..', '..')
const NODE_VER = 'v22.14.0'

// ── hướng dẫn ───────────────────────────────────────────────────────────────
const HUONG_DAN = `Cách dùng:
  npm run dong-goi:mac              gói cho macOS
  npm run dong-goi:win              gói cho Windows 64-bit
  node scripts/dong-goi.mjs [cờ...]

Cờ — viết kiểu nào cũng nhận (--windows, -windows, windows, win, WIN):
  --windows            đóng gói cho Windows 64-bit
  --mac                đóng gói cho macOS (mặc định = hệ đang chạy)
  --khong-node         không nhúng Node (máy đích phải tự có Node >= 20)
  --ra <thư mục>       đặt gói vào thư mục khác, ví dụ:  --ra D:\\USB
  --help               in bảng này

Ví dụ đóng gói Windows ra thẳng USB:
  node scripts/dong-goi.mjs --windows --ra D:\\USB
  node scripts/dong-goi.mjs --windows --ra /Volumes/USB

QUAN TRỌNG khi chạy qua npm: phải có -- trước cờ.
  ĐÚNG :  npm run dong-goi -- --windows
  SAI  :  npm run dong-goi --windows      <- npm ăn mất cờ, bạn nhận gói của hệ mặc định
Dùng  npm run dong-goi:win  thì không phải nhớ chuyện này.`

// ── đọc cờ ──────────────────────────────────────────────────────────────────
/** Mặc định đóng cho chính hệ đang chạy, vì đó là ý người dùng hay muốn nhất. */
let hdh = process.platform === 'win32' ? 'windows' : 'mac'
let nhungNode = true
let thuMucRa = ''

const args = process.argv.slice(2)
for (let i = 0; i < args.length; i++) {
  const goc = args[i]
  const co = goc.toLowerCase()
  if (['--windows', '-windows', 'windows', '--win', '-win', 'win', '-w'].includes(co)) {
    hdh = 'windows'
  } else if (['--mac', '-mac', 'mac', '--macos', '-macos', 'macos', '-m'].includes(co)) {
    hdh = 'mac'
  } else if (
    ['--khong-node', '-khong-node', 'khong-node', '--khong_node', '--no-node', '-no-node'].includes(co)
  ) {
    nhungNode = false
  } else if (['--ra', '-ra', '--out', '-out', '-o'].includes(co)) {
    thuMucRa = args[++i] ?? ''
    if (!thuMucRa) thoat('✗ Cờ --ra cần kèm đường dẫn thư mục.')
  } else if (co.startsWith('--ra=') || co.startsWith('--out=')) {
    thuMucRa = goc.slice(goc.indexOf('=') + 1)
  } else if (['--help', '-h', '-help', 'help'].includes(co)) {
    console.log(HUONG_DAN)
    process.exit(0)
  } else {
    console.error(`✗ Không hiểu cờ: ${goc}\n`)
    console.error(HUONG_DAN)
    process.exit(1)
  }
}

function thoat(msg) {
  console.error(msg)
  process.exit(1)
}

// ── thư mục đích ────────────────────────────────────────────────────────────
if (thuMucRa) {
  if (thuMucRa === '~') thuMucRa = homedir()
  else if (thuMucRa.startsWith('~/')) thuMucRa = join(homedir(), thuMucRa.slice(2))
  thuMucRa = resolve(thuMucRa)
} else {
  thuMucRa = join(GOC, 'dist-offline')
}

const RA = join(thuMucRa, `tvpl-nghidinh-${hdh}`)

// Bước dưới có xoá thư mục đích nên chặn mấy chỗ nguy hiểm.
if ([resolve('/'), homedir()].includes(RA) || thuMucRa === resolve('/')) {
  thoat(`✗ Không đóng gói trực tiếp vào ${RA}`)
}

console.log(`▶ Đóng gói cho: ${hdh}`)
console.log(`  Sẽ ghi vào: ${RA}`)
console.log(`  Đang chạy trên: ${process.platform} ${process.arch}\n`)

// ── tiện ích ────────────────────────────────────────────────────────────────
/** Chạy một lệnh, thừa hưởng stdio. shell:true để npm/tar trên Windows cũng gọi được. */
function chay(lenh, { im = false, cwd } = {}) {
  return new Promise((ok, loi) => {
    const p = spawn(lenh, { shell: true, cwd, stdio: im ? 'ignore' : 'inherit' })
    p.on('error', loi)
    p.on('exit', (ma) => (ma === 0 ? ok() : loi(new Error(`Lệnh thất bại (${ma}): ${lenh}`))))
  })
}

async function coFile(p) {
  try {
    await stat(p)
    return true
  } catch {
    return false
  }
}

// ── 1. build ────────────────────────────────────────────────────────────────
console.log('▶ 1/5  Build production')
await rm(RA, { recursive: true, force: true })
await rm(join(GOC, '.next'), { recursive: true, force: true })
await chay('npm run build', { im: true })

// ── 2. gom standalone ───────────────────────────────────────────────────────
console.log('▶ 2/5  Gom bản standalone')
const STANDALONE = join(GOC, '.next', 'standalone')
if (!existsSync(STANDALONE)) {
  thoat('✗ Không thấy .next/standalone — next.config phải có output: "standalone".')
}
await mkdir(RA, { recursive: true })
await cp(STANDALONE, RA, { recursive: true })

// server.js không tự phục vụ 2 thư mục này, phải copy tay (theo tài liệu Next)
await cp(join(GOC, '.next', 'static'), join(RA, '.next', 'static'), { recursive: true })
if (await coFile(join(GOC, 'public'))) {
  await cp(join(GOC, 'public'), join(RA, 'public'), { recursive: true })
}

// kịch bản đã lưu → mang theo để máy đích có sẵn mà dùng
if (await coFile(join(GOC, 'kich-ban'))) {
  await mkdir(join(RA, 'kich-ban'), { recursive: true })
  await cp(join(GOC, 'kich-ban'), join(RA, 'kich-ban'), { recursive: true })
}

// .env.local mang theo để máy đích chạy được ngay.
// Không muốn nhúng mật khẩu vào gói thì xoá 3 dòng dưới và tự tạo file ở máy đích.
if (await coFile(join(GOC, '.env.local'))) {
  await cp(join(GOC, '.env.local'), join(RA, '.env.local'))
}

// ── 3. playwright-core ──────────────────────────────────────────────────────
console.log('▶ 3/5  Kiểm playwright-core có được gom ĐỦ chưa')
const PW_GOI = join(RA, 'node_modules', 'playwright-core')
// Kiểm FILE THẬT, không chỉ kiểm thư mục: bộ dò của Next hay copy thiếu
// browsers.json và làm gói chết lúc chạy với lỗi "Cannot find module".
if (!(await coFile(join(PW_GOI, 'browsers.json')))) {
  console.log('  … thiếu file, copy tay cả package')
  await rm(PW_GOI, { recursive: true, force: true })
  await mkdir(join(RA, 'node_modules'), { recursive: true })
  await cp(join(GOC, 'node_modules', 'playwright-core'), PW_GOI, { recursive: true })
}
for (const f of ['browsers.json', 'package.json', 'index.js']) {
  if (!(await coFile(join(PW_GOI, f)))) thoat(`✗ vẫn thiếu playwright-core/${f}`)
}
console.log('  ✓ playwright-core đủ file')

// ── 4. Node runtime ─────────────────────────────────────────────────────────
const TEN_NODE_BIN = hdh === 'windows' ? 'node.exe' : 'node'

if (nhungNode) {
  const arch = hdh === 'windows' ? 'win-x64' : process.arch === 'arm64' ? 'darwin-arm64' : 'darwin-x64'
  const ext = hdh === 'windows' ? 'zip' : 'tar.gz'
  const ten = `node-${NODE_VER}-${arch}`
  const url = `https://nodejs.org/dist/${NODE_VER}/${ten}.${ext}`

  console.log(`▶ 4/5  Tải Node ${NODE_VER} (${arch})`)
  const tmp = await mkdtemp(join(tmpdir(), 'tvpl-node-'))
  const file = join(tmp, `node.${ext}`)

  const res = await fetch(url)
  if (!res.ok) thoat(`✗ Tải Node thất bại: HTTP ${res.status} — ${url}`)
  await writeFile(file, Buffer.from(await res.arrayBuffer()))

  // bsdtar (có sẵn trên macOS và Windows 10+) mở được cả .tar.gz và .zip
  await chay(`tar -xf "${file}" -C "${tmp}"`)

  await mkdir(join(RA, 'runtime'), { recursive: true })
  const trongGoi = hdh === 'windows' ? join(tmp, ten, 'node.exe') : join(tmp, ten, 'bin', 'node')
  if (!existsSync(trongGoi)) thoat(`✗ Không thấy ${trongGoi} sau khi giải nén.`)
  await cp(trongGoi, join(RA, 'runtime', TEN_NODE_BIN))
  if (hdh !== 'windows') await chmod(join(RA, 'runtime', TEN_NODE_BIN), 0o755)
  await rm(tmp, { recursive: true, force: true })

  const kb = Math.round((await stat(join(RA, 'runtime', TEN_NODE_BIN))).size / 1024 / 1024)
  console.log(`  ✓ runtime/${TEN_NODE_BIN} (${kb} MB)`)
} else {
  console.log('▶ 4/5  Bỏ qua Node runtime (--khong-node)')
}

// ── 5. launcher + tài liệu ──────────────────────────────────────────────────
console.log('▶ 5/5  Tạo script khởi động + hướng dẫn')

if (await coFile(join(GOC, 'HUONG-DAN.md'))) {
  await cp(join(GOC, 'HUONG-DAN.md'), join(RA, 'HUONG-DAN.md'))
}

// Toàn bộ logic khởi động nằm trong khoi-dong.mjs — chạy được cả hai hệ.
await cp(join(GOC, 'scripts', 'khoi-dong.mjs'), join(RA, 'khoi-dong.mjs'))

// khoi-dong.mjs import file này để kiểm Chrome NGAY LÚC KHỞI ĐỘNG. Bộ dò phụ
// thuộc của Next không gom nó (đã biên dịch vào bundle server) nên phải copy
// tay. Đặt tên .mjs vì package.json của bản standalone không có type:"module".
await mkdir(join(RA, 'lib', 'tvpl'), { recursive: true })
await cp(join(GOC, 'lib', 'tvpl', 'tim-chrome.js'), join(RA, 'lib', 'tvpl', 'tim-chrome.mjs'))
if (!(await coFile(join(RA, 'lib', 'tvpl', 'tim-chrome.mjs')))) {
  thoat('✗ thiếu lib/tvpl/tim-chrome.mjs trong gói')
}

if (hdh === 'windows') {
  // .bat phải dùng CRLF, nếu không cmd.exe hiểu sai dòng lệnh.
  const bat = [
    '@echo off',
    'setlocal',
    'cd /d "%~dp0"',
    'chcp 65001 >nul',
    '',
    'set "NODE="',
    'if exist "runtime\\node.exe" set "NODE=runtime\\node.exe"',
    'if not defined NODE (',
    '  where node >nul 2>&1 && set "NODE=node"',
    ')',
    'if not defined NODE (',
    '  echo [X] Khong tim thay Node.',
    '  echo     Goi nay duoc dong bang --khong-node nen may phai cai Node ^>= 20 tu nodejs.org',
    '  pause',
    '  exit /b 1',
    ')',
    '',
    'if not defined PORT set "PORT=3000"',
    '"%NODE%" khoi-dong.mjs',
    'if errorlevel 1 pause',
    '',
  ].join('\r\n')
  await writeFile(join(RA, 'chay.bat'), bat, 'utf8')
  console.log('  ✓ chay.bat (Windows)')
} else {
  const sh = `#!/bin/bash
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
  echo "      xattr -cr \\"$(pwd)\\""
  echo
  echo "  rồi bấm đúp lại chay.command. Hoặc cài Node >= 20 từ nodejs.org."
  read -r -p "Enter để đóng..." _ ; exit 1
fi

exec "$NODE" khoi-dong.mjs
`
  await writeFile(join(RA, 'chay.command'), sh, 'utf8')
  await chmod(join(RA, 'chay.command'), 0o755).catch(() => {})
  console.log('  ✓ chay.command (macOS)')
  if (process.platform === 'win32') {
    console.log('  ⚠ Đóng gói macOS từ Windows: chay.command sẽ MẤT quyền thực thi.')
    console.log('    Trên máy Mac chạy một lần:  chmod +x chay.command')
  }
}

const BAT_DAU_WIN = `tvpl-nghidinh - bat dau tu day (Windows)
========================================

1. Bam dup vao  chay.bat   -> trinh duyet tu mo http://localhost:3000

2. Neu Windows Defender / SmartScreen canh bao:
   bam "More info" -> "Run anyway". Chi phai lam mot lan.

3. May nay can: Windows 64-bit, va Google Chrome.
   KHONG can cai Node, KHONG can npm install.

4. Neu bao "Khong tim thay Google Chrome": mo Command Prompt (Win+R -> cmd) chay
      reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe" /ve
   roi them dong nay vao file .env.local (cung thu muc nay, mo bang Notepad):
      CHROME_PATH=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe

5. VE MANG: goi nay khong can mang de CAI, nhung luc CHAY van can Internet
   vi app doc du lieu truc tiep tu thuvienphapluat.vn.

Doi cong:  mo Command Prompt, cd vao thu muc nay roi:  set PORT=4000 && chay.bat

Huong dan day du: mo file  HUONG-DAN.md  (bang Notepad hoac VS Code)
`

const BAT_DAU_MAC = `tvpl-nghidinh — bắt đầu từ đây (macOS)
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
`

await writeFile(
  join(RA, 'BAT-DAU-TU-DAY.txt'),
  hdh === 'windows' ? BAT_DAU_WIN : BAT_DAU_MAC,
  'utf8',
)

// ── kiểm gói ────────────────────────────────────────────────────────────────
const CUNG_HE = (hdh === 'windows') === (process.platform === 'win32')
if (nhungNode && CUNG_HE) {
  const nodeGoi = join(RA, 'runtime', TEN_NODE_BIN)
  try {
    // cwd PHẢI là thư mục gói, không thì './lib/...' resolve theo project.
    await chay(
      `"${nodeGoi}" -e "import('./lib/tvpl/tim-chrome.mjs').then(m=>{const r=m.timChrome();console.log('  ✓ kiểm gói: Chrome →', r.duongDan ?? '(không thấy Chrome trên máy này)')})"`,
      { cwd: RA },
    )
  } catch (e) {
    console.log(`  ⚠ Không chạy được Node trong gói để kiểm: ${e.message}`)
  }
}

const tenGoi = basename(RA)
console.log(`\n✓ Xong: ${RA}`)
console.log(`  Hệ điều hành đích: ${hdh}`)
if (!CUNG_HE) {
  console.log(`\n  ⚠ Gói ${hdh} này được tạo từ ${process.platform} nên CHƯA chạy thử trên hệ đích.`)
  console.log('    Chạy thử một lần trên máy đích trước khi phát cho người khác.')
}
console.log('\n  Nén để mang đi:')
if (process.platform === 'win32') {
  console.log(`    powershell Compress-Archive -Path "${RA}" -DestinationPath "${RA}.zip"`)
} else {
  console.log(`    cd "${thuMucRa}" && zip -qr ${tenGoi}.zip ${tenGoi}`)
}
