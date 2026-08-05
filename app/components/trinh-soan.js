'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { kiemTraKichBan } from '@/lib/kich-ban/loai'
import { DANH_SACH_MAU, MAU_TVPL_NGHI_DINH } from '@/lib/kich-ban/mau'
import { PACE_OPTIONS } from '@/lib/tvpl/types'
import { BoiCanh } from './boi-canh'
import { DanhSachBuoc } from './danh-sach-buoc'
import { KhoiPhucHoi } from './khoi-phuc-hoi'

const KHOA_NHAP = 'kich-ban-dang-soan'

export default function TrinhSoan() {
  // Component này chỉ render ở client (xem app/page.js) nên đọc localStorage
  // ngay trong initializer được — không setState trong effect, không lệch hydrate.
  const [kb, setKb] = useState(() => {
    try {
      const nhap = localStorage.getItem(KHOA_NHAP)
      if (nhap) return JSON.parse(nhap)
    } catch {
      /* nháp hỏng → dùng mẫu */
    }
    return MAU_TVPL_NGHI_DINH
  })
  const [pace, setPace] = useState('cham')
  const [dangChay, setDangChay] = useState(false)
  const [trangThaiBuoc, setTrangThaiBuoc] = useState({})
  const [logs, setLogs] = useState([])
  const [shot, setShot] = useState(null)
  const [ketQua, setKetQua] = useState(null)
  const [loi, setLoi] = useState(null)
  const [canNguoi, setCanNguoi] = useState(null)
  const [giay, setGiay] = useState(0)
  const [daLuu, setDaLuu] = useState([])
  const [thongBao, setThongBao] = useState(null)
  const huyRef = useRef(null)
  const logRef = useRef(null)

  useEffect(() => {
    void napDanhSach()
  }, [])

  // giữ bản nháp qua các lần tải lại trang
  useEffect(() => {
    localStorage.setItem(KHOA_NHAP, JSON.stringify(kb))
  }, [kb])

  useEffect(() => {
    if (!dangChay) return
    const t0 = Date.now()
    const id = setInterval(() => setGiay(Math.round((Date.now() - t0) / 1000)), 250)
    return () => clearInterval(id)
  }, [dangChay])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [logs])

  const napDanhSach = async () => {
    const r = await fetch('/api/kich-ban').then((x) => x.json())
    setDaLuu(r.danhSach ?? [])
  }

  // ── chạy ──────────────────────────────────────────────────────────────────
  const chay = useCallback(async () => {
    const loiCauHinh = kiemTraKichBan(kb)
    if (loiCauHinh.length) {
      setLoi(loiCauHinh.join('\n'))
      return
    }

    setTrangThaiBuoc({})
    setLogs([])
    setKetQua(null)
    setLoi(null)
    setCanNguoi(null)
    setGiay(0)
    setDangChay(true)

    const ac = new AbortController()
    huyRef.current = ac

    try {
      const res = await fetch('/api/chay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kichBan: kb, pace }),
        signal: ac.signal,
      })

      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({ loi: `HTTP ${res.status}` }))
        setLoi(d.loi ?? `HTTP ${res.status}`)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let dem = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        dem += decoder.decode(value, { stream: true })
        const dong = dem.split('\n')
        dem = dong.pop() ?? ''
        for (const d of dong) {
          if (!d.trim()) continue
          xuLy(JSON.parse(d))
        }
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        setLoi(e instanceof Error ? e.message : String(e))
      }
    } finally {
      setDangChay(false)
      huyRef.current = null
    }
  }, [kb, pace])

  /** @param {import('@/lib/kich-ban/su-kien').SuKien} e */
  const xuLy = (e) => {
    switch (e.type) {
      case 'buoc':
        setTrangThaiBuoc((p) => ({
          ...p,
          [e.id]: { tt: e.trangThai, ct: e.chiTiet, lanLap: e.lanLap, trongPhucHoi: e.trongPhucHoi },
        }))
        break
      case 'shot':
        setShot(e.jpegBase64)
        break
      case 'log':
        setLogs((p) => [...p.slice(-300), e.msg])
        break
      case 'can-nguoi':
        setCanNguoi(e.msg)
        break
      case 'phuc-hoi':
        setLogs((p) => [
          ...p.slice(-300),
          e.giaiDoan === 'bat-dau'
            ? `⟳ Phát hiện cần phục hồi → chạy "${e.ten}"…`
            : e.giaiDoan === 'xong'
              ? `⟳ Phục hồi "${e.ten}" xong, quay lại kịch bản.`
              : `⟳ Phục hồi "${e.ten}" THẤT BẠI: ${e.msg}`,
        ])
        break
      case 'xong':
        setKetQua(e.ketQua)
        setCanNguoi(null)
        break
      case 'loi':
        setLoi(e.msg)
        break
      case 'ket-thuc':
        break
    }
  }

  // ── sửa kịch bản ──────────────────────────────────────────────────────────
  const datBuocGoc = (ds) => setKb({ ...kb, buoc: ds })

  const luuKichBan = async () => {
    const r = await fetch('/api/kich-ban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kichBan: kb }),
    }).then((x) => x.json())
    if (r.loi) setLoi(r.loi)
    else {
      setThongBao(`Đã lưu vào kich-ban/${r.tomTat.file}`)
      setTimeout(() => setThongBao(null), 4000)
      void napDanhSach()
    }
  }

  const mo = async (file) => {
    const r = await fetch(`/api/kich-ban?file=${encodeURIComponent(file)}`).then((x) => x.json())
    if (r.kichBan) {
      setKb(r.kichBan)
      setTrangThaiBuoc({})
      setKetQua(null)
    }
  }

  const taiJson = () => {
    const blob = new Blob([JSON.stringify(kb, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${kb.ten || 'kich-ban'}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const buocDung = kb.buoc.filter((b) => !b.tat)

  return (
    <BoiCanh.Provider
      value={{ trangThai: trangThaiBuoc, tenPhucHoi: (kb.phucHoi ?? []).map((p) => p.ten).filter(Boolean) }}
    >
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* ── header ───────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-neutral-800 bg-neutral-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1700px] flex-wrap items-center gap-2.5 px-5 py-3">
          <input
            value={kb.ten}
            onChange={(e) => setKb({ ...kb, ten: e.target.value })}
            placeholder="Tên kịch bản"
            className="min-w-[15rem] flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-base font-semibold hover:border-neutral-700 focus:border-neutral-600 focus:outline-none"
          />

          <select
            onChange={(e) => e.target.value && void mo(e.target.value)}
            value=""
            className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-xs text-neutral-300"
          >
            <option value="">Mở kịch bản đã lưu…</option>
            {daLuu.map((t) => (
              <option key={t.file} value={t.file}>
                {t.ten} ({t.soBuoc} bước)
              </option>
            ))}
          </select>

          <select
            onChange={(e) => {
              const m = DANH_SACH_MAU.find((x) => x.ten === e.target.value)
              if (m) {
                setKb(structuredClone(m))
                setTrangThaiBuoc({})
                setKetQua(null)
              }
            }}
            value=""
            className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-xs text-neutral-300"
          >
            <option value="">Nạp mẫu…</option>
            {DANH_SACH_MAU.map((m) => (
              <option key={m.ten} value={m.ten}>
                {m.ten}
              </option>
            ))}
          </select>

          <select
            value={pace}
            onChange={(e) => setPace(e.target.value)}
            disabled={dangChay}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-xs text-neutral-300 disabled:opacity-40"
          >
            {PACE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label} — {o.hint}
              </option>
            ))}
          </select>

          <button onClick={luuKichBan} className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs hover:bg-neutral-800">
            Lưu
          </button>
          <button onClick={taiJson} className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs hover:bg-neutral-800">
            Tải JSON
          </button>
          <button
            onClick={() => fetch('/api/tvpl/browser', { method: 'DELETE' }).then(() => setShot(null))}
            disabled={dangChay}
            className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs hover:bg-neutral-800 disabled:opacity-40"
          >
            Đóng Chrome
          </button>

          {dangChay ? (
            <button
              onClick={() => huyRef.current?.abort()}
              className="rounded-md bg-neutral-700 px-4 py-2 text-sm font-medium hover:bg-neutral-600"
            >
              Ngắt ({giay}s)
            </button>
          ) : (
            <button
              onClick={chay}
              className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-amber-400"
            >
              ▶ Chạy {buocDung.length} bước
            </button>
          )}
        </div>

        {kb.moTa && <p className="mx-auto max-w-[1700px] px-7 pb-2.5 text-xs text-neutral-500">{kb.moTa}</p>}
      </header>

      <main className="mx-auto max-w-[1700px] px-5 py-5">
        {thongBao && (
          <div className="mb-4 rounded-lg border border-emerald-700/50 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-200">
            {thongBao}
          </div>
        )}
        {canNguoi && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <span className="text-lg leading-none">👆</span>
            <div>
              <b>Cần bạn bấm tay một lần</b>
              <p className="mt-0.5 text-amber-200/80">{canNguoi}</p>
            </div>
          </div>
        )}
        {loi && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm whitespace-pre-wrap text-red-200">
            <b>Lỗi:</b> {loi}
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* ── cột trái: soạn kịch bản ─────────────────────────────────── */}
          <section>
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
              Kịch bản — {kb.buoc.length} bước
            </h2>

            {/* Giữa mọi khe đều có điểm "+": chèn được bao nhiêu bước cũng được,
                không có trần nào. Vòng lặp còn chứa danh sách con của riêng nó. */}
            <DanhSachBuoc ds={kb.buoc} doi={datBuocGoc} />

            <KhoiPhucHoi ds={kb.phucHoi ?? []} doi={(moi) => setKb({ ...kb, phucHoi: moi })} />
          </section>

          {/* ── cột phải: màn hình + log ────────────────────────────────── */}
          <section className="space-y-4 xl:sticky xl:top-[4.5rem] xl:self-start">
            <div>
              <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
                Màn hình Chrome
                {dangChay && <span className="ml-2 animate-pulse text-red-400">● live</span>}
              </h2>
              <div className="relative aspect-[1440/900] overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900">
                {shot ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`data:image/jpeg;base64,${shot}`}
                    alt="Ảnh chụp trực tiếp cửa sổ Chrome đang được điều khiển"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center text-sm text-neutral-500">
                    <span className="text-3xl">🖥️</span>
                    Bấm <b className="text-amber-500">Chạy</b> — Chrome sẽ mở và tự thao tác theo kịch bản.
                    Nút <b className="text-sky-400">◎</b> ở mỗi ô selector cho bạn bấm chọn phần tử ngay trên
                    trang thật.
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">Log</h2>
              <div
                ref={logRef}
                className="h-28 overflow-y-auto rounded-md border border-neutral-800 bg-black/40 p-2.5 font-mono text-[11px] leading-relaxed text-neutral-400"
              >
                {logs.length === 0 ? <span className="text-neutral-600">—</span> : logs.map((l, i) => <div key={i}>{l}</div>)}
              </div>
            </div>

            {ketQua && <KhoiKetQua ketQua={ketQua} />}
          </section>
        </div>
      </main>
    </div>
    </BoiCanh.Provider>
  )
}

/**
 * @param {object} props
 * @param {import('@/lib/kich-ban/su-kien').KetQuaChay} props.ketQua
 */
function KhoiKetQua({ ketQua }) {
  const giay = Math.round((Date.parse(ketQua.ketThuc) - Date.parse(ketQua.batDau)) / 1000)
  const bangs = Object.entries(ketQua.bang)
  const giaTris = Object.entries(ketQua.giaTri)

  const taiCsv = (ten, dong) => {
    if (!dong.length) return
    const cot = Object.keys(dong[0])
    const esc = (v) => `"${(v ?? '').replace(/"/g, '""')}"`
    const csv = [cot.join(','), ...dong.map((d) => cot.map((c) => esc(d[c])).join(','))].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `${ten}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-xs font-medium uppercase tracking-wider text-neutral-500">Kết quả</h2>
        <span className="text-xs text-neutral-500">
          {giay}s · {new Date(ketQua.ketThuc).toLocaleTimeString('vi-VN')}
        </span>
        <a
          href={ketQua.urlCuoi}
          target="_blank"
          rel="noreferrer"
          className="max-w-[16rem] truncate text-xs text-amber-500 underline decoration-dotted"
        >
          {ketQua.urlCuoi} ↗
        </a>
      </div>

      {giaTris.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {giaTris.map(([k, v]) => (
            <span key={k} className="rounded-md border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs">
              <span className="text-neutral-500">{k}</span>{' '}
              <span className="font-mono text-emerald-300">
                {typeof v === 'object' ? JSON.stringify(v) : String(v)}
              </span>
            </span>
          ))}
        </div>
      )}

      {bangs.map(([ten, dong]) => {
        const cot = dong.length ? Object.keys(dong[0]) : []
        return (
          <div key={ten} className="mb-4">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="font-mono text-xs text-emerald-300">{ten}</span>
              <span className="text-xs text-neutral-500">{dong.length} dòng</span>
              <button
                onClick={() => taiCsv(ten, dong)}
                className="rounded border border-neutral-700 px-2 py-0.5 text-[11px] text-neutral-400 hover:bg-neutral-800"
              >
                Tải CSV
              </button>
            </div>
            <div className="max-h-96 overflow-auto rounded-lg border border-neutral-800">
              <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0">
                  <tr className="bg-neutral-900 text-left text-[11px] uppercase tracking-wide text-neutral-500">
                    {cot.map((c) => (
                      <th key={c} className="whitespace-nowrap px-2.5 py-2 font-medium">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dong.map((d, i) => (
                    <tr key={i} className="border-t border-neutral-800 align-top hover:bg-neutral-900/60">
                      {cot.map((c) => (
                        <td key={c} className="max-w-[22rem] px-2.5 py-1.5">
                          {d[c] && /^https?:\/\//.test(d[c]) ? (
                            <a
                              href={d[c]}
                              target="_blank"
                              rel="noreferrer"
                              className="block truncate text-sky-400 hover:underline"
                            >
                              {d[c]}
                            </a>
                          ) : (
                            <span className="line-clamp-3 text-neutral-300">{d[c] ?? '—'}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      {bangs.length === 0 && giaTris.length === 0 && (
        <p className="rounded-lg border border-dashed border-neutral-800 px-4 py-6 text-center text-xs text-neutral-600">
          Kịch bản chạy xong nhưng không bóc dữ liệu nào. Thêm bước <b>Lấy bảng</b> hoặc{' '}
          <b>Lấy một giá trị</b> để có kết quả.
        </p>
      )}
    </div>
  )
}
