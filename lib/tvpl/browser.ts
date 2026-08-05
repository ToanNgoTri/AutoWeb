import { chromium, type Browser, type Page } from 'playwright-core'
import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

/**
 * KHÔNG dùng chromium.launch()/launchPersistentContext().
 *
 * Playwright khi tự launch sẽ thêm một loạt cờ automation, và Cloudflare của
 * thuvienphapluat.vn nhận ra: challenge mất 25-60s, có lúc không qua được.
 * Tự spawn Chrome như người dùng bình thường rồi nối vào qua CDP thì challenge
 * qua trong ~4s. Đo thực tế bằng scripts/test-cdp.mjs.
 */

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
].filter(Boolean) as string[]

const CDP_PORT = Number(process.env.TVPL_CDP_PORT ?? 9333)

/** Profile riêng của app, để không đụng vào Chrome cá nhân của bạn. */
export const PROFILE_DIR = join(homedir(), '.tvpl-chrome-cdp')

type Held = { browser: Browser; child?: ChildProcess }
const g = globalThis as typeof globalThis & { __tvplBrowser?: Held }

function chromePath() {
  const found = CHROME_CANDIDATES.find((p) => existsSync(p))
  if (!found) {
    throw new Error(
      'Không tìm thấy Google Chrome. Cài Chrome, hoặc đặt CHROME_PATH trong .env.local.',
    )
  }
  return found
}

async function tryConnect(): Promise<Browser | null> {
  try {
    return await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`)
  } catch {
    return null
  }
}

export async function getBrowser(): Promise<Browser> {
  if (g.__tvplBrowser?.browser.isConnected()) return g.__tvplBrowser.browser
  g.__tvplBrowser = undefined

  // Chrome có thể đã bật sẵn từ lần chạy trước (dev server reload) → nối lại
  const existing = await tryConnect()
  if (existing) {
    g.__tvplBrowser = { browser: existing }
    return existing
  }

  mkdirSync(PROFILE_DIR, { recursive: true })
  const child = spawn(
    chromePath(),
    [
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${PROFILE_DIR}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--lang=vi-VN',
      '--window-size=1440,960',
      'about:blank',
    ],
    { stdio: 'ignore', detached: true },
  )
  child.unref()

  // chờ debug endpoint mở
  for (let i = 0; i < 60; i++) {
    const b = await tryConnect()
    if (b) {
      g.__tvplBrowser = { browser: b, child }
      return b
    }
    await new Promise((r) => setTimeout(r, 500))
  }

  child.kill()
  throw new Error(`Chrome không mở được cổng debug ${CDP_PORT} sau 30s.`)
}

export async function getPage(): Promise<Page> {
  const browser = await getBrowser()
  const ctx = browser.contexts()[0] ?? (await browser.newContext())
  const page = ctx.pages().find((p) => !p.isClosed()) ?? (await ctx.newPage())
  await page.setViewportSize({ width: 1440, height: 900 }).catch(() => {})
  return page
}

/** Ngắt CDP và tắt luôn cửa sổ Chrome do app bật (profile trên disk giữ nguyên). */
export async function closeBrowser() {
  const held = g.__tvplBrowser
  g.__tvplBrowser = undefined
  if (!held) return
  await held.browser.close().catch(() => {}) // chỉ disconnect
  held.child?.kill() // tắt hẳn cửa sổ
}

export function isOpen() {
  return !!g.__tvplBrowser?.browser.isConnected()
}
