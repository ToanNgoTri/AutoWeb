/**
 * Xuất .xlsx THẬT mà không cần thư viện nào.
 *
 * Vì sao không dùng CSV: Excel tự diễn giải lại nội dung khi mở CSV, mà dữ liệu
 * pháp luật thì đầy thứ trông giống ngày tháng — "12/2024" thành ngày, số hiệu
 * "01/2024/NĐ-CP" cũng dễ bị bóp, số 0 đứng đầu thì mất. Thêm nữa Excel bản
 * Việt lấy `;` làm dấu phân cột nên file phân cách bằng `,` dồn hết vào cột A.
 * File này ghi mọi ô dưới dạng inlineStr (text thuần) nên Excel mở lên đúng y
 * nguyên cái đã bóc được.
 *
 * Vì sao tự viết mà không thêm `exceljs`/`xlsx`: một file .xlsx là một ZIP chứa
 * vài file XML, và ZIP cho phép "stored" (không nén) — nên không cần thư viện
 * nén nào. Đổi lại file to hơn bản nén cỡ 3-5 lần: 10k dòng ≈ 3MB. Với danh
 * sách văn bản thì không đáng kể.
 *
 * Dùng được cả ở browser lẫn Node (chỉ cần TextEncoder).
 */

/** @typedef {{ ten: string, cot: string[], dong: Record<string, any>[] }} Sheet */

const BOC = new TextEncoder()

// ── XML ──────────────────────────────────────────────────────────────────────

/**
 * Excel từ chối mở file có ký tự điều khiển trong XML, mà text bóc từ web thì
 * hay lẫn mấy thứ đó — nên vứt luôn thay vì để Excel báo "cần sửa chữa".
 *
 * @param {any} v
 */
function thoat(v) {
  return String(v ?? '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

const KHAI_BAO = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'

/**
 * 0 → A, 25 → Z, 26 → AA…
 *
 * @param {number} i
 */
function chuCot(i) {
  let s = ''
  for (let n = i + 1; n > 0; ) {
    const du = (n - 1) % 26
    s = String.fromCharCode(65 + du) + s
    n = Math.floor((n - du) / 26)
  }
  return s
}

/**
 * Tên sheet của Excel: tối đa 31 ký tự, không được chứa : \ / ? * [ ]
 *
 * @param {string} ten
 * @param {number} viTri
 */
function tenSheetHopLe(ten, viTri) {
  const sach = (ten || '').replace(/[:\\/?*[\]]/g, '-').trim().slice(0, 31)
  return sach || `Sheet${viTri + 1}`
}

/**
 * Bề rộng cột đo theo nội dung dài nhất, có chặn trên để một ô lỗi không kéo
 * cột rộng ra cả màn hình.
 *
 * @param {Sheet} s
 */
function beRong(s) {
  return s.cot.map((c) => {
    let dai = c.length
    for (const d of s.dong) {
      const n = String(d[c] ?? '').length
      if (n > dai) dai = n
    }
    return Math.min(60, Math.max(10, dai + 2))
  })
}

/** @param {Sheet} s */
function xmlSheet(s) {
  const rong = beRong(s)
  const cuoi = `${chuCot(Math.max(s.cot.length - 1, 0))}${s.dong.length + 1}`

  const hang = []
  hang.push(
    `<row r="1">${s.cot
      .map((c, i) => `<c r="${chuCot(i)}1" s="1" t="inlineStr"><is><t>${thoat(c)}</t></is></c>`)
      .join('')}</row>`,
  )
  s.dong.forEach((d, j) => {
    const r = j + 2
    const o = s.cot
      .map((c, i) => {
        const v = d[c]
        if (v === null || v === undefined || v === '') return ''
        // xml:space="preserve" để khoảng trắng đầu/cuối không bị Excel cắt
        return `<c r="${chuCot(i)}${r}" t="inlineStr"><is><t xml:space="preserve">${thoat(v)}</t></is></c>`
      })
      .join('')
    hang.push(`<row r="${r}">${o}</row>`)
  })

  // Thứ tự các thẻ con là BẮT BUỘC theo schema: dimension → sheetViews →
  // sheetFormatPr → cols → sheetData → autoFilter. Sai thứ tự là Excel đòi sửa.
  return (
    `${KHAI_BAO}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<dimension ref="A1:${cuoi}"/>` +
    `<sheetViews><sheetView tabSelected="1" workbookViewId="0">` +
    `<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>` +
    `</sheetView></sheetViews>` +
    `<sheetFormatPr defaultRowHeight="15"/>` +
    `<cols>${rong.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` +
    `<sheetData>${hang.join('')}</sheetData>` +
    (s.cot.length ? `<autoFilter ref="A1:${cuoi}"/>` : '') +
    `</worksheet>`
  )
}

/**
 * styles.xml tối thiểu: xf 0 mặc định, xf 1 in đậm cho dòng tiêu đề.
 * Excel bắt buộc phải có ĐỦ 2 fill (none + gray125) dù không dùng fill nào.
 */
const XML_STYLES =
  `${KHAI_BAO}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
  `<fonts count="2">` +
  `<font><sz val="11"/><name val="Calibri"/></font>` +
  `<font><b/><sz val="11"/><name val="Calibri"/></font>` +
  `</fonts>` +
  `<fills count="2">` +
  `<fill><patternFill patternType="none"/></fill>` +
  `<fill><patternFill patternType="gray125"/></fill>` +
  `</fills>` +
  `<borders count="1"><border/></borders>` +
  `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
  `<cellXfs count="2">` +
  `<xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
  `<xf numFmtId="49" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
  `</cellXfs>` +
  // thiếu cellStyles "Normal" thì bộ đọc nào chặt tay sẽ càm ràm không có style
  // mặc định; Excel vẫn mở nhưng thêm vào cho sạch
  `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
  `</styleSheet>`

/** @param {Sheet[]} ds */
function xmlWorkbook(ds) {
  return (
    `${KHAI_BAO}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>` +
    ds
      .map((s, i) => `<sheet name="${thoat(tenSheetHopLe(s.ten, i))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
      .join('') +
    `</sheets></workbook>`
  )
}

/** @param {Sheet[]} ds */
function xmlContentTypes(ds) {
  return (
    `${KHAI_BAO}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    ds
      .map(
        (_, i) =>
          `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
      )
      .join('') +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
    `</Types>`
  )
}

/** @param {Sheet[]} ds */
function xmlRelsWorkbook(ds) {
  const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
  return (
    `${KHAI_BAO}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    ds
      .map(
        (_, i) =>
          `<Relationship Id="rId${i + 1}" Type="${R}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
      )
      .join('') +
    `<Relationship Id="rId${ds.length + 1}" Type="${R}/styles" Target="styles.xml"/>` +
    `</Relationships>`
  )
}

const XML_RELS_GOC =
  `${KHAI_BAO}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
  `</Relationships>`

// ── ZIP (chỉ dùng method 0 = stored, nên không cần thư viện nén) ─────────────

const BANG_CRC = (() => {
  const b = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    b[i] = c >>> 0
  }
  return b
})()

/** @param {Uint8Array} du */
function crc32(du) {
  let c = 0xffffffff
  for (let i = 0; i < du.length; i++) c = BANG_CRC[(c ^ du[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/**
 * @param {{ ten: string, du: Uint8Array }[]} tep
 * @param {Date} luc
 * @returns {Uint8Array}
 */
function dongZip(tep, luc) {
  const gio =
    ((luc.getHours() & 0x1f) << 11) | ((luc.getMinutes() & 0x3f) << 5) | ((luc.getSeconds() / 2) & 0x1f)
  const ngay =
    (((Math.max(luc.getFullYear(), 1980) - 1980) & 0x7f) << 9) | (((luc.getMonth() + 1) & 0xf) << 5) | (luc.getDate() & 0x1f)

  const cuc = []
  const muc = []
  let viTri = 0

  for (const t of tep) {
    const ten = BOC.encode(t.ten)
    const crc = crc32(t.du)

    const dau = new DataView(new ArrayBuffer(30))
    dau.setUint32(0, 0x04034b50, true) // signature
    dau.setUint16(4, 20, true) // cần version 2.0
    dau.setUint16(6, 0, true) // flags
    dau.setUint16(8, 0, true) // method 0 = stored
    dau.setUint16(10, gio, true)
    dau.setUint16(12, ngay, true)
    dau.setUint32(14, crc, true)
    dau.setUint32(18, t.du.length, true) // đã nén
    dau.setUint32(22, t.du.length, true) // gốc
    dau.setUint16(26, ten.length, true)
    dau.setUint16(28, 0, true) // extra
    cuc.push(new Uint8Array(dau.buffer), ten, t.du)

    const trung = new DataView(new ArrayBuffer(46))
    trung.setUint32(0, 0x02014b50, true)
    trung.setUint16(4, 20, true) // tạo bởi
    trung.setUint16(6, 20, true) // cần
    trung.setUint16(8, 0, true)
    trung.setUint16(10, 0, true)
    trung.setUint16(12, gio, true)
    trung.setUint16(14, ngay, true)
    trung.setUint32(16, crc, true)
    trung.setUint32(20, t.du.length, true)
    trung.setUint32(24, t.du.length, true)
    trung.setUint16(28, ten.length, true)
    trung.setUint16(30, 0, true)
    trung.setUint16(32, 0, true)
    trung.setUint16(34, 0, true)
    trung.setUint16(36, 0, true)
    trung.setUint32(38, 0, true)
    trung.setUint32(42, viTri, true)
    muc.push(new Uint8Array(trung.buffer), ten)

    viTri += 30 + ten.length + t.du.length
  }

  const daiMuc = muc.reduce((n, m) => n + m.length, 0)
  const ket = new DataView(new ArrayBuffer(22))
  ket.setUint32(0, 0x06054b50, true)
  ket.setUint16(8, tep.length, true)
  ket.setUint16(10, tep.length, true)
  ket.setUint32(12, daiMuc, true)
  ket.setUint32(16, viTri, true)

  const phan = [...cuc, ...muc, new Uint8Array(ket.buffer)]
  const ra = new Uint8Array(phan.reduce((n, p) => n + p.length, 0))
  let o = 0
  for (const p of phan) {
    ra.set(p, o)
    o += p.length
  }
  return ra
}

// ── API ──────────────────────────────────────────────────────────────────────

/**
 * Dựng một workbook .xlsx, mỗi bảng một sheet. Mọi ô là text nên Excel không
 * diễn giải lại số hiệu văn bản hay ngày tháng.
 *
 * @param {{ ten: string, dong: Record<string, any>[], cot?: string[] }[]} bang
 * @param {Date} [luc] mốc thời gian ghi vào ZIP
 * @returns {Uint8Array}
 */
export function taoXlsx(bang, luc = new Date()) {
  /** @type {Sheet[]} */
  const ds = (bang.length ? bang : [{ ten: 'Sheet1', dong: [] }]).map((b) => ({
    ten: b.ten,
    cot: b.cot ?? (b.dong.length ? Object.keys(b.dong[0]) : []),
    dong: b.dong,
  }))

  /** @type {{ ten: string, du: Uint8Array }[]} */
  const tep = [
    { ten: '[Content_Types].xml', du: BOC.encode(xmlContentTypes(ds)) },
    { ten: '_rels/.rels', du: BOC.encode(XML_RELS_GOC) },
    { ten: 'xl/workbook.xml', du: BOC.encode(xmlWorkbook(ds)) },
    { ten: 'xl/_rels/workbook.xml.rels', du: BOC.encode(xmlRelsWorkbook(ds)) },
    { ten: 'xl/styles.xml', du: BOC.encode(XML_STYLES) },
    ...ds.map((s, i) => ({ ten: `xl/worksheets/sheet${i + 1}.xml`, du: BOC.encode(xmlSheet(s)) })),
  ]

  return dongZip(tep, luc)
}

export const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/**
 * Tên file an toàn cho cả macOS lẫn Windows.
 *
 * @param {string} ten
 */
export function tenTepAnToan(ten) {
  return (ten || 'ket-qua').replace(/[\\/:*?"<>|]/g, '-').slice(0, 80)
}
