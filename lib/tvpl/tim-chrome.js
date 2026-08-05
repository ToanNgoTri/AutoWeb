import { existsSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, join } from 'node:path'

/**
 * Tìm file thực thi của Chrome trên macOS / Windows / Linux.
 *
 * Đây là NGUỒN DUY NHẤT cho việc này: cả app (lib/tvpl/browser.js) và script
 * khởi động (scripts/khoi-dong.mjs) đều gọi vào đây, để không xảy ra cảnh hai
 * chỗ dò khác nhau rồi báo lỗi lệch nhau.
 */

export const LA_MAC = process.platform === 'darwin'
export const LA_WINDOWS = process.platform === 'win32'

/** Tên các bản Chrome/Chromium hay gặp trên macOS (cũng là tên file thực thi bên trong .app). */
const TEN_APP_MAC = [
  'Google Chrome',
  'Google Chrome Beta',
  'Google Chrome Dev',
  'Google Chrome Canary',
  'Chromium',
]

/** Nhánh thư mục con trên Windows, ghép sau Program Files / LocalAppData. */
const NHANH_WINDOWS = [
  ['Google', 'Chrome', 'Application', 'chrome.exe'],
  ['Google', 'Chrome Beta', 'Application', 'chrome.exe'],
  ['Google', 'Chrome Dev', 'Application', 'chrome.exe'],
  ['Google', 'Chrome SxS', 'Application', 'chrome.exe'], // Canary
  ['Chromium', 'Application', 'chrome.exe'],
]

const DUONG_DAN_LINUX = [
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/opt/google/chrome/chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/snap/bin/chromium',
]

/**
 * Chấp nhận mọi dạng người dùng hay dán vào, quy về file thực thi:
 *  - macOS : "…/Google Chrome.app"           → …/Contents/MacOS/Google Chrome
 *  - Windows: "…\\Chrome\\Application"        → …\\Application\\chrome.exe
 *  - cả hai : bỏ dấu ngoặc kép, khoảng trắng và dấu gạch chéo ở cuối
 *
 * @param {string} tho
 * @returns {string}
 */
export function chuanHoaDuongDanChrome(tho) {
  let p = tho.trim().replace(/^["']|["']$/g, '').trim()
  p = p.replace(/[/\\]+$/, '')

  if (p.toLowerCase().endsWith('.app')) {
    return join(p, 'Contents', 'MacOS', basename(p).replace(/\.app$/i, ''))
  }

  // Trỏ vào một thư mục có chrome.exe bên trong (Windows) → ghép thêm tên file.
  try {
    if (statSync(p).isDirectory()) {
      const exe = join(p, 'chrome.exe')
      if (existsSync(exe)) return exe
    }
  } catch {
    // không tồn tại thì trả về nguyên trạng để chỗ gọi báo lỗi cho rõ
  }

  return p
}

/**
 * Mọi đường dẫn sẽ thử, theo thứ tự ưu tiên. CHROME_PATH luôn đứng đầu.
 * @returns {string[]}
 */
export function duongDanChromeUngVien() {
  const ds = []
  const bien = process.env.CHROME_PATH?.trim()
  if (bien) ds.push(chuanHoaDuongDanChrome(bien))

  if (LA_WINDOWS) {
    const goc = [
      process.env.PROGRAMFILES,
      process.env['PROGRAMFILES(X86)'],
      process.env.LOCALAPPDATA,
    ].filter(Boolean)
    for (const g of goc) for (const nhanh of NHANH_WINDOWS) ds.push(join(g, ...nhanh))
  } else if (LA_MAC) {
    for (const thuMuc of ['/Applications', join(homedir(), 'Applications')]) {
      for (const ten of TEN_APP_MAC) ds.push(join(thuMuc, `${ten}.app`, 'Contents', 'MacOS', ten))
    }
  } else {
    ds.push(...DUONG_DAN_LINUX)
  }

  return [...new Set(ds)]
}

/**
 * @returns {{ duongDan: string | null, ungVien: string[] }}
 *   duongDan = null nghĩa là không tìm được; ungVien để in ra cho người dùng biết đã tìm ở đâu.
 */
export function timChrome() {
  const ungVien = duongDanChromeUngVien()
  return { duongDan: ungVien.find((p) => existsSync(p)) ?? null, ungVien }
}

/** Lệnh gợi ý để người dùng tự tìm Chrome, theo đúng hệ điều hành đang chạy. */
export function lenhTimChrome() {
  if (LA_WINDOWS) {
    return [
      'Mở Command Prompt (Win+R → gõ cmd) rồi chạy:',
      '  reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe" /ve',
      'Không ra thì thử:',
      '  where /r "C:\\Program Files" chrome.exe',
      '  where /r "%LOCALAPPDATA%" chrome.exe',
    ]
  }
  if (LA_MAC) {
    return [
      'Mở Terminal rồi chạy:',
      '  ls -d /Applications/*.app ~/Applications/*.app 2>/dev/null | grep -i chrom',
      'Không ra thì thử:',
      `  osascript -e 'POSIX path of (path to application "Google Chrome")'`,
    ]
  }
  return ['Chạy trong terminal:', '  which google-chrome chromium chromium-browser']
}

/** Ví dụ dòng CHROME_PATH đúng cú pháp cho hệ điều hành đang chạy. */
export function viDuChromePath() {
  if (LA_WINDOWS) return 'CHROME_PATH=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  if (LA_MAC) return 'CHROME_PATH=/Applications/Google Chrome.app'
  return 'CHROME_PATH=/usr/bin/google-chrome'
}

/** Thông báo lỗi đầy đủ, dùng chung cho app và cho script khởi động. */
export function moTaLoiChrome() {
  const { ungVien } = timChrome()
  const bien = process.env.CHROME_PATH?.trim()
  return [
    'Không tìm thấy Google Chrome.',
    bien
      ? `CHROME_PATH đang là "${bien}" → quy ra "${chuanHoaDuongDanChrome(bien)}" nhưng file đó không tồn tại.`
      : 'Chưa đặt biến CHROME_PATH.',
    '',
    'Đã tìm ở những chỗ này:',
    ...ungVien.map((p) => `  • ${p}`),
    '',
    'CÁCH SỬA:',
    '1) Tìm Chrome đang ở đâu.',
    ...lenhTimChrome().map((d) => `   ${d}`),
    '2) Thêm dòng này vào file .env.local (nằm cùng thư mục với script khởi động):',
    `   ${viDuChromePath()}`,
    LA_MAC ? '   (trỏ vào .app cũng được, app tự tìm file thực thi bên trong)' : '   (trỏ vào thư mục Application cũng được, app tự thêm chrome.exe)',
    '3) Lưu file rồi chạy lại.',
    '',
    'Chưa cài Chrome thì tải tại https://google.com/chrome (cần mạng một lần).',
  ].join('\n')
}
