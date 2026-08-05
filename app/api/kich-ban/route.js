import { danhSach, doc, luu, xoa } from '@/lib/kich-ban/luu-tru'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** ?file=abc.json → đọc một kịch bản; không có file → liệt kê. */
export async function GET(req) {
  const file = new URL(req.url).searchParams.get('file')
  try {
    if (file) return Response.json({ kichBan: await doc(file) })
    return Response.json({ danhSach: await danhSach() })
  } catch (err) {
    return Response.json({ loi: err instanceof Error ? err.message : String(err) }, { status: 400 })
  }
}

export async function POST(req) {
  try {
    const { kichBan } = await req.json()
    return Response.json({ tomTat: await luu(kichBan) })
  } catch (err) {
    return Response.json({ loi: err instanceof Error ? err.message : String(err) }, { status: 400 })
  }
}

export async function DELETE(req) {
  const file = new URL(req.url).searchParams.get('file')
  if (!file) return Response.json({ loi: 'Thiếu ?file=' }, { status: 400 })
  try {
    await xoa(file)
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ loi: err instanceof Error ? err.message : String(err) }, { status: 400 })
  }
}
