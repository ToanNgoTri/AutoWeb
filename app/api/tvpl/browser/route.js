import { closeBrowser, isOpen, PROFILE_DIR } from '@/lib/tvpl/browser'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json({
    open: isOpen(),
    profile: PROFILE_DIR,
    coTaiKhoan: !!(process.env.TVPL_USERNAME && process.env.TVPL_PASSWORD),
    username: process.env.TVPL_USERNAME ?? null,
  })
}

/** Đóng cửa sổ Chrome do app bật (profile trên disk vẫn giữ cookie). */
export async function DELETE() {
  await closeBrowser()
  return Response.json({ open: false })
}
