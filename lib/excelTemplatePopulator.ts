import * as XLSX from "xlsx"
import type { Departure, Jalur, Segment } from "./data"
import { JALUR, SEGMENTS, calc, fmtDate, plat as getPlat } from "./data"

/**
 * Format tanggal Indonesia: YYYY-MM-DD -> "1 Oktober 2026"
 */
export function formatIndoDate(isoDate: string): string {
  if (!isoDate) return ""
  const parts = isoDate.split("-")
  if (parts.length < 3) return isoDate
  const y = parts[0]
  const m = parseInt(parts[1], 10)
  const d = parseInt(parts[2], 10)
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ]
  return `${d} ${months[m - 1] || m} ${y}`
}

/**
 * Format tanggal pendek: YYYY-MM-DD -> "01/10/2026"
 */
export function formatShortDate(isoDate: string): string {
  if (!isoDate) return ""
  const parts = isoDate.split("-")
  if (parts.length < 3) return isoDate
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

/**
 * Helper untuk mendapatkan nama rute/jalur yang benar dan akurat
 */
export function resolveRouteName(d: Departure, jalurList?: Jalur[]): string {
  if (d.jalurNama) return d.jalurNama
  if ((d as any).jalur_nama) return (d as any).jalur_nama
  if ((d as any).rute) return (d as any).rute

  if (jalurList && jalurList.length > 0) {
    const found = jalurList.find(
      (j) =>
        j.id === d.jalurId ||
        j.nama === d.jalurId ||
        (j.id && d.jalurId && String(j.id).toLowerCase() === String(d.jalurId).toLowerCase())
    )
    if (found && found.nama) return found.nama
  }

  const staticFound = JALUR.find((j) => j.id === d.jalurId || j.nama === d.jalurId)
  if (staticFound && staticFound.nama) return staticFound.nama

  if (d.jalurId && !d.jalurId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return d.jalurId
  }

  return "Trayek Operasional"
}

/**
 * Helper untuk mendapatkan nama segmen yang benar
 */
export function resolveSegmentName(segId: string, segmentList?: Segment[]): string {
  if (segmentList && segmentList.length > 0) {
    const found = segmentList.find(
      (s) => s.id === segId || s.nama === segId || (s.id && String(s.id).toLowerCase() === String(segId).toLowerCase())
    )
    if (found && found.nama) return found.nama
  }

  const staticFound = SEGMENTS.find((s) => s.id === segId || s.nama === segId)
  if (staticFound && staticFound.nama) return staticFound.nama

  return segId || "Lainnya"
}

/**
 * Pemetaan rute/jalur aplikasi ke offset baris di blueprint blok AK15 (versi sebelumnya)
 */
export function matchRouteToBlockOffset(
  jalurNama: string,
  segmenNama: string
): { offset: number; segOffset: number; segKey: string } {
  const j = (jalurNama || "").toLowerCase()
  const s = (segmenNama || "").toLowerCase()

  // 1. Bus Kota
  if (j.includes("cibiru") || j.includes("cicaheum") || j.includes("leuwipanjang")) {
    return { offset: 3, segOffset: 87, segKey: "biskota" }
  }
  if (j.includes("alun") || j.includes("kbp") || j.includes("kota baru")) {
    return { offset: 4, segOffset: 87, segKey: "biskota" }
  }
  if (j.includes("elang") || j.includes("jatinangor")) {
    return { offset: 5, segOffset: 87, segKey: "biskota" }
  }
  if (j.includes("kelapa") || j.includes("tanjung sari") || j.includes("tj sari")) {
    return { offset: 6, segOffset: 87, segKey: "biskota" }
  }
  if (j.includes("ledeng")) {
    return { offset: 7, segOffset: 87, segKey: "biskota" }
  }
  if (j.includes("disabilitas")) {
    return { offset: 8, segOffset: 88, segKey: "biskota" }
  }
  if (j.includes("itb")) {
    return { offset: 9, segOffset: 90, segKey: "jemputan" }
  }
  if (j.includes("unpad")) {
    return { offset: 10, segOffset: 90, segKey: "jemputan" }
  }
  if (j.includes("hkbp")) {
    return { offset: 11, segOffset: 90, segKey: "jemputan" }
  }
  if (j.includes("abai")) {
    return { offset: 12, segOffset: 90, segKey: "jemputan" }
  }
  if (j.includes("borong") || s.includes("borong") || s.includes("sewa") || s.includes("pariwisata")) {
    return { offset: 13, segOffset: 96, segKey: "pariwisata" }
  }
  if (j.includes("mjt") || s.includes("mjt")) {
    return { offset: 14, segOffset: 89, segKey: "biskota" }
  }
  if (j.includes("haji") || s.includes("haji")) {
    return { offset: 15, segOffset: 95, segKey: "biskota" }
  }

  // 2. AKDP
  if (j.includes("kuningan") || j.includes("garut")) {
    return { offset: 23, segOffset: 91, segKey: "antarkota" }
  }
  if (j.includes("ciledug") || j.includes("cirebon")) {
    return { offset: 24, segOffset: 91, segKey: "antarkota" }
  }
  if (j.includes("indramayu")) {
    return { offset: 25, segOffset: 91, segKey: "antarkota" }
  }
  if (j.includes("pangandaran") || j.includes("sindang barang") || j.includes("s. barang")) {
    return { offset: 26, segOffset: 91, segKey: "antarkota" }
  }

  // 3. AKAP
  if (j.includes("yogya") || j.includes("jogja")) {
    return { offset: 33, segOffset: 92, segKey: "antarkota" }
  }
  if (j.includes("metro (eks)") || j.includes("metro(eks)")) {
    return { offset: 35, segOffset: 92, segKey: "antarkota" }
  }
  if (j.includes("metro")) {
    return { offset: 34, segOffset: 92, segKey: "antarkota" }
  }
  if (j.includes("tanjung karang") || j.includes("lampung")) {
    return { offset: 36, segOffset: 92, segKey: "antarkota" }
  }
  if (j.includes("talang padang")) {
    return { offset: 37, segOffset: 92, segKey: "antarkota" }
  }
  if (j.includes("sukabumi")) {
    return { offset: 38, segOffset: 92, segKey: "antarkota" }
  }

  // 4. Perintis
  if (j.includes("cikidang")) return { offset: 45, segOffset: 93, segKey: "perintis" }
  if (j.includes("jasinga")) return { offset: 46, segOffset: 93, segKey: "perintis" }
  if (j.includes("sadang")) return { offset: 47, segOffset: 93, segKey: "perintis" }
  if (j.includes("sagaranten") && j.includes("surade")) return { offset: 48, segOffset: 93, segKey: "perintis" }
  if (j.includes("tegal buled")) return { offset: 49, segOffset: 93, segKey: "perintis" }
  if (j.includes("pelabuhan ratu")) return { offset: 50, segOffset: 93, segKey: "perintis" }

  // 5. Pemadu Moda
  if (j.includes("tegal luar") || j.includes("gede bage")) {
    return { offset: 60, segOffset: 94, segKey: "pemadumoda" }
  }
  if (j.includes("husein")) {
    return { offset: 61, segOffset: 94, segKey: "pemadumoda" }
  }

  // 6. Bandara
  if (
    j.includes("kertajati") ||
    j.includes("bandara") ||
    s.includes("bandara") ||
    j.includes("soekarno-hatta")
  ) {
    return { offset: 72, segOffset: 94, segKey: "pemadumoda" }
  }

  if (s.includes("jemputan")) return { offset: 9, segOffset: 90, segKey: "jemputan" }
  if (s.includes("borong") || s.includes("sewa")) return { offset: 13, segOffset: 96, segKey: "pariwisata" }
  if (s.includes("haji")) return { offset: 15, segOffset: 95, segKey: "biskota" }
  if (s.includes("perintis")) return { offset: 48, segOffset: 93, segKey: "perintis" }
  if (s.includes("akap") || s.includes("antar kota")) return { offset: 33, segOffset: 92, segKey: "antarkota" }

  return { offset: 3, segOffset: 87, segKey: "biskota" }
}

/**
 * Ekstrak blueprint 102 baris Hari 1 dari template asli DAMRI
 */
function extractAK15Blueprint(templateSheet: XLSX.WorkSheet) {
  const rows: (XLSX.CellObject | null)[][] = []
  for (let r = 0; r < 102; r++) {
    const row: (XLSX.CellObject | null)[] = []
    for (let c = 0; c <= 19; c++) {
      const addr = XLSX.utils.encode_cell({ r, c })
      const cell = templateSheet[addr]
      row.push(cell ? { ...cell } : null)
    }
    rows.push(row)
  }
  const merges = (templateSheet["!merges"] || []).filter((m) => m.s.r <= 101)
  return { rows, merges }
}

/**
 * Membangun Sheet AK 15 versi dinamis (persis versi sebelumnya sesuai permintaan pengguna)
 */
export function buildDynamicAK15Sheet(
  blueprint: { rows: (XLSX.CellObject | null)[][]; merges: XLSX.Range[] },
  uniqueDates: string[],
  approved: Departure[],
  jalurList?: Jalur[],
  segments?: Segment[]
): XLSX.WorkSheet {
  const wsAK: XLSX.WorkSheet = {}
  const akMerges: XLSX.Range[] = []
  let cumulativeRevenue = 0

  const datesToRender = uniqueDates.length > 0 ? uniqueDates : [""]

  datesToRender.forEach((dateStr, dateIdx) => {
    const blockStartRow = dateIdx * 103 // Format versi sebelumnya dengan jeda antar blok
    const dateFormatted = dateStr ? formatIndoDate(dateStr) : "(Tidak Ada Data)"
    const dayDeps = dateStr ? approved.filter((d) => d.date === dateStr) : []

    // 1. Salin struktur blueprint (judul, label rute di Kolom A & B, dan header kolom)
    for (let r = 0; r < 102; r++) {
      const targetRow = blockStartRow + r
      for (let c = 0; c <= 19; c++) {
        const srcCell = blueprint.rows[r][c]
        if (srcCell) {
          const isHeaderRow =
            r === 0 ||
            r === 2 ||
            r === 3 ||
            r === 21 ||
            r === 22 ||
            r === 31 ||
            r === 32 ||
            r === 43 ||
            r === 44 ||
            r === 58 ||
            r === 59 ||
            r === 70 ||
            r === 71 ||
            r === 85 ||
            r === 86
          if (c < 2 || isHeaderRow) {
            wsAK[XLSX.utils.encode_cell({ r: targetRow, c })] = { ...srcCell }
          }
        }
      }
    }

    // 2. Tulis informasi tanggal pada header blok secara eksplisit (sebagai TEKS)
    const dateRowOffsets = [1, 21, 31, 43, 58, 70, 85]
    dateRowOffsets.forEach((off) => {
      const r = blockStartRow + off
      wsAK[XLSX.utils.encode_cell({ r, c: 8 })] = {
        t: "s",
        v: off === 85 ? "S.D Tanggal :" : "TANGGAL :",
      }
      wsAK[XLSX.utils.encode_cell({ r, c: 9 })] = {
        t: "s",
        v: dateFormatted,
      }
    })

    // 3. Jika hari ini memiliki data, isi ke baris rute yang sesuai
    const lineMap = new Map<number, Departure[]>()
    dayDeps.forEach((dep) => {
      const jName = resolveRouteName(dep, jalurList)
      const sName = resolveSegmentName(dep.segmentId, segments)
      const match = matchRouteToBlockOffset(jName, sName)
      const cur = lineMap.get(match.offset) || []
      cur.push(dep)
      lineMap.set(match.offset, cur)
    })

    let dayTotalRit = 0
    let dayTotalKm = 0
    let dayTotalPnp = 0
    let dayTotalUpp = 0
    const activeBuses = new Set<string>()

    lineMap.forEach((depsInLine, offset) => {
      const r = blockStartRow + offset
      const so = new Set(depsInLine.map((d) => d.cb)).size
      const rit = depsInLine.length
      let kmTempuh = 0
      let kmEmpty = 0
      let pnp = 0
      let pm = 0
      let tarif = 0
      let pend = 0
      let sub = 0
      let bag = 0
      let upp = 0

      depsInLine.forEach((d) => {
        const c = calc(d)
        activeBuses.add(d.cb)
        kmTempuh += d.kmTempuh || 0
        kmEmpty += d.kmEmpty || 0
        pnp += d.penumpang || 0
        pm += d.pm || 0
        tarif = c.tarif || tarif
        pend += d.pendapatan || 0
        sub += d.subsidi || 0
        bag += d.bagasi || 0
        upp += c.total
      })

      const jmlhKm = kmTempuh + kmEmpty
      const jmlhPnp = pnp + pm
      const kmPerRit = rit > 0 ? Math.round(kmTempuh / rit) : 0
      const kmEmptyPerRit = so > 0 ? Math.round(kmEmpty / so) : 0
      const ritPerBus = so > 0 ? Number((rit / so).toFixed(2)) : "-"
      const pnpPerRit = rit > 0 ? Number((jmlhPnp / rit).toFixed(2)) : "-"
      const uppPerBus = so > 0 ? Math.round(upp / so) : "-"

      dayTotalRit += rit
      dayTotalKm += jmlhKm
      dayTotalPnp += jmlhPnp
      dayTotalUpp += upp

      // Isi kolom C sampai T
      wsAK[XLSX.utils.encode_cell({ r, c: 2 })] = { t: "n", v: so }
      wsAK[XLSX.utils.encode_cell({ r, c: 3 })] = { t: "n", v: rit }
      wsAK[XLSX.utils.encode_cell({ r, c: 4 })] = { t: "n", v: kmPerRit }
      if (kmEmptyPerRit > 0) wsAK[XLSX.utils.encode_cell({ r, c: 5 })] = { t: "n", v: kmEmptyPerRit }
      wsAK[XLSX.utils.encode_cell({ r, c: 6 })] = { t: "n", v: kmTempuh }
      if (kmEmpty > 0) wsAK[XLSX.utils.encode_cell({ r, c: 7 })] = { t: "n", v: kmEmpty }
      wsAK[XLSX.utils.encode_cell({ r, c: 8 })] = { t: "n", v: jmlhKm }
      wsAK[XLSX.utils.encode_cell({ r, c: 9 })] = { t: "n", v: pnp }
      if (pm > 0) wsAK[XLSX.utils.encode_cell({ r, c: 10 })] = { t: "n", v: pm }
      wsAK[XLSX.utils.encode_cell({ r, c: 11 })] = { t: "n", v: jmlhPnp }
      if (tarif > 0) wsAK[XLSX.utils.encode_cell({ r, c: 12 })] = { t: "n", v: tarif }
      wsAK[XLSX.utils.encode_cell({ r, c: 13 })] = { t: "n", v: pend }
      if (sub > 0) wsAK[XLSX.utils.encode_cell({ r, c: 14 })] = { t: "n", v: sub }
      if (bag > 0) wsAK[XLSX.utils.encode_cell({ r, c: 15 })] = { t: "n", v: bag }
      wsAK[XLSX.utils.encode_cell({ r, c: 16 })] = { t: "n", v: upp }
      wsAK[XLSX.utils.encode_cell({ r, c: 17 })] =
        typeof ritPerBus === "number" ? { t: "n", v: ritPerBus } : { t: "s", v: String(ritPerBus) }
      wsAK[XLSX.utils.encode_cell({ r, c: 18 })] =
        typeof pnpPerRit === "number" ? { t: "n", v: pnpPerRit } : { t: "s", v: String(pnpPerRit) }
      wsAK[XLSX.utils.encode_cell({ r, c: 19 })] =
        typeof uppPerBus === "number" ? { t: "n", v: uppPerBus } : { t: "s", v: String(uppPerBus) }
    })

    // 4. Baris TOTAL PRODUKSI dan Rekapitulasi Kumulatif
    const daySO = activeBuses.size
    cumulativeRevenue += dayTotalUpp
    const avgRev = Math.round(cumulativeRevenue / (dateIdx + 1))

    const rTotal = blockStartRow + 96
    wsAK[XLSX.utils.encode_cell({ r: rTotal, c: 1 })] = { t: "s", v: "JUMLAH TOTAL" }
    wsAK[XLSX.utils.encode_cell({ r: rTotal, c: 2 })] = { t: "n", v: daySO }
    wsAK[XLSX.utils.encode_cell({ r: rTotal, c: 3 })] = { t: "n", v: dayTotalRit }
    wsAK[XLSX.utils.encode_cell({ r: rTotal, c: 6 })] = { t: "n", v: dayTotalKm }
    wsAK[XLSX.utils.encode_cell({ r: rTotal, c: 8 })] = { t: "n", v: dayTotalKm }
    wsAK[XLSX.utils.encode_cell({ r: rTotal, c: 11 })] = { t: "n", v: dayTotalPnp }
    wsAK[XLSX.utils.encode_cell({ r: rTotal, c: 16 })] = { t: "n", v: dayTotalUpp }

    // Ringkasan metrik
    wsAK[XLSX.utils.encode_cell({ r: blockStartRow + 97, c: 13 })] = {
      t: "s",
      v: "PENDAPATAN SAMPAI DENGAN HARI INI",
    }
    wsAK[XLSX.utils.encode_cell({ r: blockStartRow + 97, c: 16 })] = { t: "n", v: cumulativeRevenue }

    wsAK[XLSX.utils.encode_cell({ r: blockStartRow + 98, c: 13 })] = {
      t: "s",
      v: "PENDAPATAN RATA RATA PERHARI",
    }
    wsAK[XLSX.utils.encode_cell({ r: blockStartRow + 98, c: 16 })] = { t: "n", v: avgRev }

    wsAK[XLSX.utils.encode_cell({ r: blockStartRow + 99, c: 13 })] = { t: "s", v: "UPP HARI INI" }
    wsAK[XLSX.utils.encode_cell({ r: blockStartRow + 99, c: 16 })] = { t: "n", v: dayTotalUpp }

    // 5. Salin merges blueprint untuk blok tanggal ini
    blueprint.merges.forEach((m) => {
      akMerges.push({
        s: { r: m.s.r + blockStartRow, c: m.s.c },
        e: { r: m.e.r + blockStartRow, c: m.e.c },
      })
    })
  })

  const maxRow = datesToRender.length * 103
  wsAK["!ref"] = `A1:T${maxRow}`
  wsAK["!merges"] = akMerges
  wsAK["!cols"] = [
    { wch: 6 },
    { wch: 38 },
    { wch: 8 },
    { wch: 8 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 8 },
    { wch: 12 },
    { wch: 12 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
    { wch: 10 },
    { wch: 10 },
    { wch: 14 },
  ]

  return wsAK
}

/**
 * Membangun Sheet Rincian Ritase dengan nama rute/jalur yang sudah diperbaiki akurat
 */
export function buildDynamicDetailSheet(
  approved: Departure[],
  jalurList?: Jalur[],
  segments?: Segment[]
): XLSX.WorkSheet {
  const detailRows: any[][] = [
    [
      "No",
      "Tanggal",
      "Jam",
      "Segmen",
      "Rute / Jalur",
      "No. Armada (CB)",
      "No. Plat",
      "Pengemudi (Sopir)",
      "KM Tempuh",
      "KM Empty",
      "Penumpang (Org)",
      "P/M",
      "Pendapatan (Rp)",
      "Subsidi (Rp)",
      "Bagasi (Rp)",
      "Total Produksi (Rp)",
      "UPP (Rp/km)",
      "Status",
    ],
  ]

  approved
    .slice()
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .forEach((d, idx) => {
      const c = calc(d)
      const ruteNama = resolveRouteName(d, jalurList)
      const segNama = resolveSegmentName(d.segmentId, segments)

      detailRows.push([
        idx + 1,
        formatShortDate(d.date),
        d.time,
        segNama,
        ruteNama,
        d.cb,
        getPlat(d.cb) || d.cb,
        d.driver,
        d.kmTempuh || 0,
        d.kmEmpty || 0,
        d.penumpang || 0,
        d.pm || 0,
        d.pendapatan || 0,
        d.subsidi || 0,
        d.bagasi || 0,
        c.total,
        Math.round(c.upp),
        d.status === "disetujui" ? "Disetujui" : d.status,
      ])
    })

  const wsDetail = XLSX.utils.aoa_to_sheet(detailRows)
  wsDetail["!cols"] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 8 },
    { wch: 16 },
    { wch: 36 },
    { wch: 16 },
    { wch: 14 },
    { wch: 22 },
    { wch: 12 },
    { wch: 12 },
    { wch: 16 },
    { wch: 8 },
    { wch: 18 },
    { wch: 16 },
    { wch: 14 },
    { wch: 20 },
    { wch: 14 },
    { wch: 12 },
  ]
  return wsDetail
}

/**
 * Fungsi Utama: Menghasilkan Workbook Excel DAMRI HANYA memuat 2 sheet (AK15 dan Rincian Ritase)
 */
export function populateDamriTemplate(
  masterWorkbook: XLSX.WorkBook,
  departures: Departure[],
  startDate: string,
  endDate: string,
  segments?: Segment[],
  jalurList?: Jalur[]
): XLSX.WorkBook {
  const approved = departures.filter(
    (d) =>
      d.status === "disetujui" &&
      (!startDate || d.date >= startDate) &&
      (!endDate || d.date <= endDate)
  )

  const uniqueDates = Array.from(new Set(approved.map((d) => d.date))).sort()

  // 1. Ekstrak Blueprint Day 1 dari template master AK15
  const wsAKMaster = masterWorkbook.Sheets["AK15"]
  if (!wsAKMaster) throw new Error("Template master AK15 tidak ditemukan")
  const blueprint = extractAK15Blueprint(wsAKMaster)

  // 2. Buat workbook baru HANYA memuat 2 SHEET: 'AK15' dan 'Rincian Ritase'
  const wbOut = XLSX.utils.book_new()

  // Sheet 1: AK15 (Format versi sebelumnya yang dinamis sesuai tanggal)
  const wsAK = buildDynamicAK15Sheet(blueprint, uniqueDates, approved, jalurList, segments)
  XLSX.utils.book_append_sheet(wbOut, wsAK, "AK15")

  // Sheet 2: Rincian Ritase (Detail per perjalanan dengan informasi kolom Rute / Jalur yang benar)
  const wsDetail = buildDynamicDetailSheet(approved, jalurList, segments)
  XLSX.utils.book_append_sheet(wbOut, wsDetail, "Rincian Ritase")

  return wbOut
}
