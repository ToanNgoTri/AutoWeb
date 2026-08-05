'use client'

import { createContext, useContext } from 'react'

/**
 * @typedef {{ tt: import('@/lib/kich-ban/su-kien').TrangThaiBuoc, ct?: string, lanLap?: number, trongPhucHoi?: string }} TrangThaiMot
 *
 * Trạng thái chạy, khoá theo id của bước — bền khi chèn/xoá/đổi thứ tự.
 * @typedef {Record<string, TrangThaiMot>} TrangThaiMap
 */

/**
 * Dùng context thay vì truyền prop xuyên nhiều tầng: bước con của vòng lặp nằm
 * sâu bao nhiêu tầng cũng đọc được trạng thái và danh sách quy trình phục hồi.
 *
 * @type {import('react').Context<{ trangThai: TrangThaiMap, tenPhucHoi: string[] }>}
 */
export const BoiCanh = createContext({
  trangThai: {},
  tenPhucHoi: [],
})

/** Tên phải bắt đầu bằng "use" — quy ước hook của React, eslint kiểm việc này. */
export const useBoiCanh = () => useContext(BoiCanh)
