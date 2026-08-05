import { chonPhanTu } from '@/lib/kich-ban/chon-phan-tu'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Bật chế độ chọn trên cửa sổ Chrome đang mở và chờ bạn bấm vào một phần tử.
 * Trả về selector cùng các gợi ý thay thế.
 */
export async function POST() {
  try {
    const phanTu = await chonPhanTu()
    if (!phanTu) return Response.json({ huy: true })
    return Response.json({ phanTu })
  } catch (err) {
    return Response.json({ loi: err instanceof Error ? err.message : String(err) }, { status: 400 })
  }
}
