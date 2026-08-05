/**
 * Script khởi động dùng chung cho macOS và Windows.
 *
 * Trước đây phần này viết bằng bash trong chay.command nên Windows không chạy
 * được, và nó tự dò Chrome bằng logic riêng — hai nguồn dò khác nhau là mầm lỗi.
 * Giờ mọi thứ nằm ở đây, còn chay.command / chay.bat chỉ là vỏ mỏng tìm ra Node
 * rồi gọi file này.
 *
 * Việc nó làm, theo thứ tự:
 *   1. đọc .env.local để in ra cấu hình đang dùng (app tự đọc lại file này)
 *   2. kiểm Chrome — thiếu thì in hướng dẫn sửa rồi dừng
 *   3. kiểm mạng — không tới được thì CẢNH BÁO nhưng vẫn chạy
 *   4. bật server.js và mở trình duyệt
 */
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { lookup } from 'node:dns/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline'

const GOC = dirname(fileURLToPath(import.meta.url))
process.chdir(GOC)

const LA_WINDOWS = process.platform === 'win32'
const HOST_KIEM_MANG = 'thuvienphapluat.vn'

/** Giữ cửa sổ lại để người dùng đọc được lỗi, thay vì nó biến mất ngay. */
async function dungLai(ma = 1) {
  process.stdout.write('\nBấm Enter để đóng...')
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  await new Promise((r) => rl.question('', () => r()))
  rl.close()
  process.exit(ma)
}

/** Đọc .env.local đủ dùng cho việc in thông tin (app dùng bộ đọc của Next). */
function docEnvLocal() {
  const f = join(GOC, '.env.local')
  if (!existsSync(f)) return {}
  /** @type {Record<string,string>} */
  const ra = {}
  for (const dong of readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = dong.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!m) continue
    ra[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
  return ra
}

const env = docEnvLocal()
// Đưa vào process.env để phần kiểm Chrome bên dưới thấy được CHROME_PATH.
for (const [k, v] of Object.entries(env)) if (!process.env[k]) process.env[k] = v

// ── 2. Chrome ───────────────────────────────────────────────────────────────
/**
 * Trong gói, file được copy thành .mjs; khi chạy từ project thì nó là .js.
 * Thử cả hai để launcher dùng được ở cả hai chỗ.
 */
async function napTimChrome() {
  for (const duong of ['./lib/tvpl/tim-chrome.mjs', './lib/tvpl/tim-chrome.js']) {
    try {
      return await import(duong)
    } catch {
      // thử tên còn lại
    }
  }
  throw new Error('không thấy lib/tvpl/tim-chrome.(mjs|js)')
}

let chromeBin = null
try {
  const modChrome = await napTimChrome()
  const { timChrome, moTaLoiChrome, chuanHoaDuongDanChrome } = modChrome
  const { duongDan } = timChrome()
  if (!duongDan) {
    console.error('✗ ' + moTaLoiChrome())
    await dungLai()
  }
  chromeBin = duongDan
  console.log(`ℹ Chrome: ${chromeBin}`)
  const dat = process.env.CHROME_PATH?.trim()
  if (dat) {
    const quyRa = chuanHoaDuongDanChrome(dat)
    if (quyRa !== chromeBin) {
      console.log(`⚠ CHROME_PATH="${dat}" không dùng được (không thấy ${quyRa}).`)
      console.log(`  Dùng tạm: ${chromeBin}`)
    }
  }
  // Truyền đường dẫn ĐÃ giải quyết sang server, để nó không phải dò lại.
  process.env.CHROME_PATH = chromeBin
} catch (e) {
  console.log(`ℹ Bỏ qua bước kiểm Chrome (${e instanceof Error ? e.message : e}).`)
  console.log('  Nếu thiếu Chrome, app sẽ báo lỗi khi bạn bấm Chạy.')
}

// ── 3. Mạng ─────────────────────────────────────────────────────────────────
try {
  await lookup(HOST_KIEM_MANG)
} catch {
  console.log(`\n⚠ Không phân giải được ${HOST_KIEM_MANG} — máy này có vẻ không có Internet.`)
  console.log('  Giao diện vẫn mở được, bạn vẫn soạn / lưu / mở kịch bản bình thường.')
  console.log('  Nhưng bấm Chạy sẽ lỗi mạng: app đọc dữ liệu trực tiếp từ website.')
  console.log('  Muốn dùng dữ liệu offline: chạy ở máy có mạng rồi bấm Tải CSV, mang file sang.\n')
}

// ── 4. Bật server ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || '3000'
const URL_APP = `http://localhost:${PORT}`

console.log(`▶ Đang chạy trên ${URL_APP}   (Ctrl+C để dừng)`)

const con = spawn(process.execPath, [join(GOC, 'server.js')], {
  stdio: 'inherit',
  env: { ...process.env, PORT, HOSTNAME: process.env.HOSTNAME || '127.0.0.1' },
})

setTimeout(() => {
  const [lenh, args] = LA_WINDOWS
    ? ['cmd', ['/c', 'start', '', URL_APP]]
    : process.platform === 'darwin'
      ? ['open', [URL_APP]]
      : ['xdg-open', [URL_APP]]
  spawn(lenh, args, { stdio: 'ignore', detached: true }).unref()
}, 2000)

con.on('exit', async (ma) => {
  if (ma && ma !== 0) {
    console.error(`\n✗ Server dừng với mã ${ma}.`)
    if (ma === 1) console.error('  Cổng có thể đang bị chiếm. Thử đổi cổng: PORT=4000')
    await dungLai(ma)
  }
  process.exit(ma ?? 0)
})

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    con.kill()
    process.exit(0)
  })
}
