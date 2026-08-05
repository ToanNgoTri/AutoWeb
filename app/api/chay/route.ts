import { chayKichBan, DangChayError } from '@/lib/kich-ban/engine'
import { kiemTraKichBan, type KichBan } from '@/lib/kich-ban/loai'
import type { SuKien } from '@/lib/kich-ban/su-kien'
import { isPace } from '@/lib/tvpl/pace'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 900

/**
 * Nhận kịch bản qua POST rồi stream tiến trình về dạng NDJSON (mỗi dòng một
 * JSON). Dùng POST + đọc stream thủ công thay vì EventSource, vì EventSource
 * chỉ gửi được GET nên không mang nổi cả kịch bản.
 */
export async function POST(req: Request) {
  let than: { kichBan?: KichBan; pace?: string }
  try {
    than = await req.json()
  } catch {
    return Response.json({ loi: 'Body không phải JSON hợp lệ.' }, { status: 400 })
  }

  const kichBan = than.kichBan
  if (!kichBan) return Response.json({ loi: 'Thiếu trường "kichBan".' }, { status: 400 })

  const loi = kiemTraKichBan(kichBan)
  if (loi.length) return Response.json({ loi: loi.join('\n') }, { status: 400 })

  const pace = isPace(than.pace) ? than.pace : 'cham'
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let dongCua = false
      const gui = (e: SuKien) => {
        if (dongCua) return
        try {
          controller.enqueue(encoder.encode(JSON.stringify(e) + '\n'))
        } catch {
          dongCua = true
        }
      }

      req.signal.addEventListener('abort', () => {
        dongCua = true
      })

      try {
        const ketQua = await chayKichBan(kichBan, gui, { pace })
        gui({ type: 'xong', ketQua })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        gui({ type: 'loi', msg })
        if (!(err instanceof DangChayError)) console.error('[chay]', err)
      } finally {
        gui({ type: 'ket-thuc' })
        dongCua = true
        try {
          controller.close()
        } catch {
          /* client đã ngắt */
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
