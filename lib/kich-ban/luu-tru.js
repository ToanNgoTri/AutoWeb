import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { kiemTraKichBan } from './loai'

/**
 * @typedef {import('./loai').KichBan} KichBan
 * @typedef {import('./loai').TomTat} TomTat
 */

/**
 * Kịch bản lưu thành file JSON trong thư mục `kich-ban/` cạnh app.
 * Trong bản đóng gói standalone, cwd là thư mục gói nên vẫn lưu được bình thường.
 */
const THU_MUC = join(process.cwd(), 'kich-ban')

function slug(ten) {
  const s = ten
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // bỏ dấu tiếng Việt
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return s || 'kich-ban'
}

/** @returns {Promise<TomTat[]>} */
export async function danhSach() {
  await mkdir(THU_MUC, { recursive: true })
  const files = (await readdir(THU_MUC)).filter((f) => f.endsWith('.json'))
  const ra = []
  for (const f of files) {
    try {
      const kb = JSON.parse(await readFile(join(THU_MUC, f), 'utf8'))
      ra.push({ file: f, ten: kb.ten, moTa: kb.moTa, soBuoc: kb.buoc?.length ?? 0 })
    } catch {
      // file hỏng → bỏ qua, không làm sập danh sách
    }
  }
  return ra.sort((a, b) => a.ten.localeCompare(b.ten, 'vi'))
}

/** @returns {Promise<KichBan>} */
export async function doc(file) {
  const an = antoan(file)
  return JSON.parse(await readFile(join(THU_MUC, an), 'utf8'))
}

/**
 * @param {KichBan} kb
 * @returns {Promise<TomTat>}
 */
export async function luu(kb) {
  const loi = kiemTraKichBan(kb)
  if (loi.length) throw new Error(`Kịch bản chưa hợp lệ:\n- ${loi.join('\n- ')}`)
  await mkdir(THU_MUC, { recursive: true })
  const file = `${slug(kb.ten)}.json`
  await writeFile(join(THU_MUC, file), JSON.stringify(kb, null, 2), 'utf8')
  return { file, ten: kb.ten, moTa: kb.moTa, soBuoc: kb.buoc.length }
}

export async function xoa(file) {
  await unlink(join(THU_MUC, antoan(file)))
}

/** Chặn path traversal: chỉ nhận tên file phẳng, đuôi .json. */
function antoan(file) {
  if (!/^[A-Za-z0-9._-]+\.json$/.test(file)) throw new Error(`Tên file không hợp lệ: ${file}`)
  return file
}
