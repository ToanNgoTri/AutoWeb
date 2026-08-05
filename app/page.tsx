'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  PACE_OPTIONS,
  STEP_LABELS,
  type Pace,
  type ScrapeEvent,
  type SearchResult,
  type StepStatus,
} from '@/lib/tvpl/types'

type Step = { label: string; status: StepStatus; detail?: string }

const initialSteps = (): Step[] => STEP_LABELS.map((label) => ({ label, status: 'pending' }))

export default function Home() {
  const [running, setRunning] = useState(false)
  const [steps, setSteps] = useState<Step[]>(initialSteps)
  const [logs, setLogs] = useState<string[]>([])
  const [shot, setShot] = useState<string | null>(null)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [needHuman, setNeedHuman] = useState<string | null>(null)
  const [limit, setLimit] = useState(20)
  const [pace, setPace] = useState<Pace>('cham')
  const [elapsed, setElapsed] = useState(0)
  const esRef = useRef<EventSource | null>(null)
  const logRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!running) return
    const t0 = Date.now()
    const id = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 250)
    return () => clearInterval(id)
  }, [running])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [logs])

  const start = useCallback(() => {
    esRef.current?.close()
    setSteps(initialSteps())
    setLogs([])
    setResult(null)
    setError(null)
    setNeedHuman(null)
    setElapsed(0)
    setRunning(true)

    const es = new EventSource(`/api/tvpl/stream?limit=${limit}&pace=${pace}`)
    esRef.current = es

    es.onmessage = (msg) => {
      const e: ScrapeEvent = JSON.parse(msg.data)
      switch (e.type) {
        case 'step':
          setSteps((prev) => {
            const next = [...prev]
            next[e.index] = { label: e.label, status: e.status, detail: e.detail }
            return next
          })
          break
        case 'shot':
          setShot(e.jpegBase64)
          break
        case 'log':
          setLogs((prev) => [...prev.slice(-200), e.msg])
          break
        case 'need-human':
          setNeedHuman(e.msg)
          break
        case 'result':
          setResult(e.data)
          setNeedHuman(null)
          break
        case 'error':
          setError(e.msg)
          setSteps((prev) => prev.map((s) => (s.status === 'running' ? { ...s, status: 'error' } : s)))
          break
        case 'done':
          setRunning(false)
          es.close()
          break
      }
    }

    es.onerror = () => {
      setRunning(false)
      es.close()
    }
  }, [limit, pace])

  const stop = useCallback(() => {
    esRef.current?.close()
    setRunning(false)
  }, [])

  const closeBrowser = useCallback(async () => {
    await fetch('/api/tvpl/browser', { method: 'DELETE' })
    setShot(null)
  }, [])

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="sticky top-0 z-10 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-5 py-3">
          <div className="mr-auto">
            <h1 className="text-lg font-semibold tracking-tight">Nghị định mới nhất — thuvienphapluat.vn</h1>
            <p className="text-xs text-neutral-500">
              Chrome thật · đăng nhập · tìm kiếm nâng cao · Loại văn bản = Nghị định · sắp xếp mới nhất
            </p>
          </div>

          <label className="flex items-center gap-2 text-xs text-neutral-400">
            Tốc độ
            <select
              value={pace}
              onChange={(e) => setPace(e.target.value as Pace)}
              disabled={running}
              title={PACE_OPTIONS.find((o) => o.value === pace)?.hint}
              className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-neutral-100 disabled:opacity-40"
            >
              {PACE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label} — {o.hint}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-xs text-neutral-400">
            Số dòng
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              disabled={running}
              className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-neutral-100 disabled:opacity-40"
            >
              {[10, 20, 30, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <button
            onClick={closeBrowser}
            disabled={running}
            className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800 disabled:opacity-40"
          >
            Đóng Chrome
          </button>

          {running ? (
            <button
              onClick={stop}
              className="rounded-md bg-neutral-700 px-4 py-2 text-sm font-medium hover:bg-neutral-600"
            >
              Ngắt theo dõi ({elapsed}s)
            </button>
          ) : (
            <button
              onClick={start}
              className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-amber-400"
            >
              ▶ Tìm Nghị định mới nhất
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-6">
        {needHuman && (
          <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <span className="text-lg leading-none">👆</span>
            <div>
              <b>Cần bạn bấm tay một lần</b>
              <p className="mt-0.5 text-amber-200/80">{needHuman}</p>
            </div>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
          {/* Màn hình trực tiếp */}
          <section>
            <SectionTitle>
              Màn hình Chrome
              {running && <span className="ml-2 animate-pulse text-red-400">● live</span>}
            </SectionTitle>
            <div className="relative aspect-[1440/900] overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900">
              {shot ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`data:image/jpeg;base64,${shot}`}
                  alt="Ảnh chụp trực tiếp cửa sổ Chrome đang được điều khiển"
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-neutral-500">
                  <span className="text-3xl">🖥️</span>
                  Bấm <b className="text-amber-500">Tìm Nghị định mới nhất</b> — một cửa sổ Chrome sẽ mở
                  và tự thao tác. Bạn xem được cả trên màn hình lẫn ở khung này.
                </div>
              )}
            </div>
          </section>

          {/* Tiến trình */}
          <section className="flex flex-col gap-4">
            <div>
              <SectionTitle>Các bước</SectionTitle>
              <ol className="space-y-1.5">
                {steps.map((s, idx) => (
                  <li
                    key={idx}
                    className={`flex gap-2.5 rounded-md px-2.5 py-2 text-xs leading-snug ${
                      s.status === 'running'
                        ? 'bg-amber-500/10 text-amber-200'
                        : s.status === 'done'
                          ? 'text-neutral-300'
                          : s.status === 'error'
                            ? 'bg-red-500/10 text-red-300'
                            : s.status === 'skipped'
                              ? 'text-neutral-500'
                              : 'text-neutral-600'
                    }`}
                  >
                    <span className="w-4 shrink-0 text-center">
                      {s.status === 'done'
                        ? '✓'
                        : s.status === 'running'
                          ? '◌'
                          : s.status === 'error'
                            ? '✕'
                            : s.status === 'skipped'
                              ? '–'
                              : idx + 1}
                    </span>
                    <span className="min-w-0">
                      {s.label}
                      {s.detail && (
                        <span className="mt-0.5 block break-all font-mono text-[10px] text-neutral-500">
                          {s.detail}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="min-h-0 flex-1">
              <SectionTitle>Log</SectionTitle>
              <div
                ref={logRef}
                className="h-32 overflow-y-auto rounded-md border border-neutral-800 bg-black/40 p-2.5 font-mono text-[11px] leading-relaxed text-neutral-400"
              >
                {logs.length === 0 ? <span className="text-neutral-600">—</span> : logs.map((l, i) => <div key={i}>{l}</div>)}
              </div>
            </div>
          </section>
        </div>

        {error && (
          <div className="mt-5 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <b>Lỗi:</b> {error}
          </div>
        )}

        {result && (
          <section className="mt-7">
            <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-base font-semibold">Kết quả</h2>
              <span className="text-xs text-neutral-500">
                {result.items.length} / {result.tong?.toLocaleString('vi-VN') ?? '?'} Nghị định · lúc{' '}
                {new Date(result.chayLuc).toLocaleTimeString('vi-VN')}
              </span>
              <LoginBadge dangNhap={result.dangNhap} />
              <a
                href={result.urlKetQua}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-amber-500 underline decoration-dotted"
              >
                mở trang kết quả gốc ↗
              </a>
            </div>

            <div className="overflow-x-auto rounded-lg border border-neutral-800">
              <table className="w-full min-w-[860px] border-collapse text-sm">
                <thead>
                  <tr className="bg-neutral-900 text-left text-xs uppercase tracking-wide text-neutral-500">
                    <th className="w-10 px-3 py-2.5 font-medium">#</th>
                    <th className="w-40 px-3 py-2.5 font-medium">Số hiệu</th>
                    <th className="w-28 px-3 py-2.5 font-medium">Ban hành</th>
                    <th className="px-3 py-2.5 font-medium">Tiêu đề</th>
                    <th className="w-24 px-3 py-2.5 font-medium">Tình trạng</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((it) => (
                    <tr key={it.lawId ?? it.stt} className="border-t border-neutral-800 align-top hover:bg-neutral-900/60">
                      <td className="px-3 py-2.5 text-neutral-600">{it.stt}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-amber-400">{it.soHieu ?? '—'}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-neutral-300">{it.ngayBanHanh ?? '—'}</td>
                      <td className="px-3 py-2.5">
                        {it.url ? (
                          <a href={it.url} target="_blank" rel="noreferrer" className="hover:text-amber-400 hover:underline">
                            {it.tieuDe}
                          </a>
                        ) : (
                          it.tieuDe
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-neutral-500">{it.tinhTrang ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!result.docDuocHieuLuc && (
              <p className="mt-2 text-xs text-neutral-600">
                Cột Hiệu lực / Tình trạng vẫn hiện “Đã biết” — nội dung này TVPL chỉ mở cho gói dịch vụ
                có trả phí, đăng nhập thường không đủ.
              </p>
            )}
          </section>
        )}
      </main>
    </div>
  )
}

function LoginBadge({ dangNhap }: { dangNhap: SearchResult['dangNhap'] }) {
  const map = {
    'thanh-cong': ['bg-emerald-500/15 text-emerald-300', '🔓 đã đăng nhập'],
    'da-dang-nhap-truoc-do': ['bg-emerald-500/15 text-emerald-300', '🔓 dùng phiên đăng nhập cũ'],
    'khong-cau-hinh': ['bg-neutral-700/40 text-neutral-400', '👤 chế độ khách'],
    'that-bai': ['bg-red-500/15 text-red-300', '⚠ đăng nhập thất bại'],
  } as const
  const [cls, label] = map[dangNhap.trangThai]
  const suffix = 'username' in dangNhap ? ` · ${dangNhap.username}` : ''
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs ${cls}`}
      title={'thongBaoTuTVPL' in dangNhap ? dangNhap.thongBaoTuTVPL : undefined}
    >
      {label}
      {suffix}
    </span>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">{children}</h2>
}
