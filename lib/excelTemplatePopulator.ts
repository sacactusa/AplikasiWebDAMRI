import ExcelJS from "exceljs"
import type { Departure, Jalur, Segment } from "./data"
import { JALUR, SEGMENTS, calc, plat as getPlat } from "./data"

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
      (s) =>
        s.id === segId ||
        s.nama === segId ||
        ((s as any).rawId && (s as any).rawId === segId) ||
        ((s as any).kode && (s as any).kode === segId) ||
        (s.id && String(s.id).toLowerCase() === String(segId).toLowerCase())
    )
    if (found && found.nama) return found.nama
  }

  const staticFound = SEGMENTS.find((s) => s.id === segId || s.nama === segId)
  if (staticFound && staticFound.nama) return staticFound.nama

  return segId || "Lainnya"
}

// ==========================================
// STYLING CONSTANTS (ALL BORDERS & CORPORATE THEME)
// ==========================================

const BORDER_THIN: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FF94A3B8" } },
  left: { style: "thin", color: { argb: "FF94A3B8" } },
  bottom: { style: "thin", color: { argb: "FF94A3B8" } },
  right: { style: "thin", color: { argb: "FF94A3B8" } },
}

const BORDER_TOTAL: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FF475569" } },
  left: { style: "thin", color: { argb: "FF94A3B8" } },
  bottom: { style: "double", color: { argb: "FF0F2C59" } },
  right: { style: "thin", color: { argb: "FF94A3B8" } },
}

const FILL_NAVY: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF0F2C59" },
}

const FILL_SUBHEADER: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFE2E8F0" },
}

const FILL_SECTION_TITLE: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF1F5F9" },
}

const FILL_TOTAL_SECTION: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF8FAFC" },
}

const FILL_GRAND_TOTAL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFEF3C7" }, // Amber / Gold
}

/**
 * Membangun Sheet AK15 berbasis Segmen & Jalur dari Data Master dengan ALL BORDERS
 */
export function buildDynamicAK15Worksheet(
  ws: ExcelJS.Worksheet,
  uniqueDates: string[],
  reportDepartures: Departure[],
  masterSegments: Segment[],
  masterJalur: Jalur[]
) {
  // Set showGridLines agar tampilan Excel rapi
  ws.views = [{ showGridLines: true }]

  // Lebar 20 kolom (A sampai T)
  ws.columns = [
    { width: 6 },  // A: NO
    { width: 36 }, // B: JALUR
    { width: 8 },  // C: SO
    { width: 8 },  // D: RIT
    { width: 14 }, // E: KM PER RIT - TEMPUH
    { width: 12 }, // F: KM PER RIT - EMPTY
    { width: 14 }, // G: KM PER JALUR - TEMPUH
    { width: 12 }, // H: KM PER JALUR - EMPTY
    { width: 14 }, // I: JMLH KM
    { width: 12 }, // J: PNP
    { width: 10 }, // K: P/M
    { width: 12 }, // L: JUMLAH PNP
    { width: 14 }, // M: TARIF UMUM
    { width: 18 }, // N: PENDAPATAN UMUM
    { width: 16 }, // O: SUBSIDI
    { width: 14 }, // P: BAGASI
    { width: 20 }, // Q: UPP
    { width: 12 }, // R: RIT/BUS
    { width: 12 }, // S: PNP/RIT
    { width: 16 }, // T: UPP/BUS
  ]

  let cumulativeRevenue = 0
  const datesToRender = uniqueDates.length > 0 ? uniqueDates : [""]

  datesToRender.forEach((dateStr, dateIdx) => {
    const dateFormatted = dateStr ? formatIndoDate(dateStr) : "(Tidak Ada Data)"
    const dayDeps = dateStr ? reportDepartures.filter((d) => d.date === dateStr) : []

    // 1. Judul Laporan Harian
    const rTitle = ws.addRow(["REGISTER PENDAPATAN PERUSAHAAN (RPP) / AK 15"])
    rTitle.height = 28
    const startR = rTitle.number
    ws.mergeCells(`A${startR}:T${startR}`)
    rTitle.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FF0F2C59" } }
    rTitle.alignment = { horizontal: "center", vertical: "middle" }

    const rSub = ws.addRow([`CABANG : BANDUNG · TANGGAL : ${dateFormatted}`])
    rSub.height = 18
    const subR = rSub.number
    ws.mergeCells(`A${subR}:T${subR}`)
    rSub.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF64748B" } }
    rSub.alignment = { horizontal: "center", vertical: "middle" }

    ws.addRow([]) // Spacer

    // Kumpulkan segmen yang akan ditampilkan: dari Data Master
    const effectiveSegments = masterSegments.length > 0 ? masterSegments : SEGMENTS
    const effectiveJalur = masterJalur.length > 0 ? masterJalur : JALUR

    // Data rekapitulasi segmen untuk tabel di bagian bawah
    interface SegmentSummary {
      nama: string
      so: number
      rit: number
      kmTempuh: number
      kmEmpty: number
      jmlhKm: number
      pnp: number
      pm: number
      jmlhPnp: number
      tarif: number
      pend: number
      sub: number
      bag: number
      upp: number
    }
    const segmentSummaries: SegmentSummary[] = []

    // 2. Loop setiap Segmen dari Data Master
    effectiveSegments.forEach((segObj, segIdx) => {
      // Ambil jalur yang dimiliki segmen ini di Data Master
      const segJalurList = effectiveJalur.filter(
        (j) =>
          j.segmentId === segObj.id ||
          (j as any).segmen_id === segObj.id ||
          ((segObj as any).rawId && (j.segmentId === (segObj as any).rawId || (j as any).segmen_id === (segObj as any).rawId)) ||
          ((segObj as any).kode && (j.segmentId === (segObj as any).kode || (j as any).segmen_id === (segObj as any).kode))
      )

      // Cari keberangkatan yang termasuk dalam segmen ini
      const segDeps = dayDeps.filter(
        (d) =>
          d.segmentId === segObj.id ||
          ((segObj as any).rawId && d.segmentId === (segObj as any).rawId) ||
          ((segObj as any).kode && d.segmentId === (segObj as any).kode) ||
          ((d as any).segmentNama && (d as any).segmentNama.toLowerCase() === segObj.nama.toLowerCase())
      )

      // Cek apakah ada jalur di keberangkatan yang belum ada di daftar jalur segmen ini
      const extraRoutes = new Set<string>()
      segDeps.forEach((d) => {
        const rName = resolveRouteName(d, effectiveJalur)
        if (!segJalurList.some((j) => j.nama.toLowerCase() === rName.toLowerCase())) {
          extraRoutes.add(rName)
        }
      })

      // Header Segmen
      const segLetter = String.fromCharCode(65 + (segIdx % 26))
      const rSegHeader = ws.addRow([`${segLetter}. SEGMEN ${segObj.nama.toUpperCase()}`])
      rSegHeader.height = 22
      const segHeadR = rSegHeader.number
      ws.mergeCells(`A${segHeadR}:H${segHeadR}`)
      rSegHeader.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF0F2C59" } }
      rSegHeader.alignment = { horizontal: "left", vertical: "middle" }

      const dateCell = ws.getCell(`I${segHeadR}`)
      dateCell.value = `TANGGAL : ${dateFormatted}`
      ws.mergeCells(`I${segHeadR}:T${segHeadR}`)
      dateCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF475569" } }
      dateCell.alignment = { horizontal: "right", vertical: "middle" }

      // Tambahkan All Border & Fill pada header segmen
      for (let c = 1; c <= 20; c++) {
        const cell = ws.getCell(segHeadR, c)
        cell.border = BORDER_THIN
        cell.fill = FILL_SECTION_TITLE
      }

      // Baris Header Tabel (Level 1)
      const h1 = ws.addRow([
        "NO", "JALUR", "SO", "RIT",
        "KILOMETER PER RIT", "",
        "KILOMETER PER JALUR", "", "",
        "PENUMPANG", "", "",
        "TARIF UMUM",
        "PENDAPATAN", "", "", "",
        "RIT/BUS", "PNP/RIT", "UPP/BUS"
      ])
      h1.height = 22
      const h1R = h1.number

      // Baris Header Tabel (Level 2)
      const h2 = ws.addRow([
        "", "", "", "",
        "KM TEMPUH", "EMPTY",
        "KM TEMPUH", "EMPTY", "JMLH KM",
        "PNP", "P/M", "JUMLAH",
        "",
        "UMUM", "SUBSIDI", "BAGASI", "UPP",
        "", "", ""
      ])
      h2.height = 20
      const h2R = h2.number

      // Merges Header
      ws.mergeCells(`A${h1R}:A${h2R}`)
      ws.mergeCells(`B${h1R}:B${h2R}`)
      ws.mergeCells(`C${h1R}:C${h2R}`)
      ws.mergeCells(`D${h1R}:D${h2R}`)
      ws.mergeCells(`E${h1R}:F${h1R}`) // KM PER RIT
      ws.mergeCells(`G${h1R}:I${h1R}`) // KM PER JALUR
      ws.mergeCells(`J${h1R}:L${h1R}`) // PENUMPANG
      ws.mergeCells(`M${h1R}:M${h2R}`) // TARIF UMUM
      ws.mergeCells(`N${h1R}:Q${h1R}`) // PENDAPATAN
      ws.mergeCells(`R${h1R}:R${h2R}`)
      ws.mergeCells(`S${h1R}:S${h2R}`)
      ws.mergeCells(`T${h1R}:T${h2R}`)

      // Styling & All Borders untuk Header Tabel
      for (let r = h1R; r <= h2R; r++) {
        for (let c = 1; c <= 20; c++) {
          const cell = ws.getCell(r, c)
          cell.border = BORDER_THIN
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
          if (r === h1R) {
            cell.fill = FILL_NAVY
            cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } }
          } else {
            cell.fill = FILL_SUBHEADER
            cell.font = { name: "Calibri", size: 9, bold: true, color: { argb: "FF1E293B" } }
          }
        }
      }

      // Siapkan daftar seluruh rute untuk segmen ini (jalur data master + jalur ekstra)
      const allSegmentRoutes: { nama: string; tarif: number; jalurId?: string; kmTempuh?: number | null; kmEmpty?: number | null }[] = segJalurList.map((j) => ({
        nama: j.nama,
        tarif: j.tarif || 0,
        jalurId: j.id,
        kmTempuh: j.kmTempuh != null ? Number(j.kmTempuh) : null,
        kmEmpty: j.kmEmpty != null ? Number(j.kmEmpty) : null,
      }))
      extraRoutes.forEach((xName) => {
        allSegmentRoutes.push({ nama: xName, tarif: 0 })
      })

      // Inisialisasi akumulator segmen
      let segRit = 0
      let segKmTempuh = 0
      let segKmEmpty = 0
      let segPnp = 0
      let segPm = 0
      let segTarif = 0
      let segPend = 0
      let segSub = 0
      let segBag = 0
      let segUpp = 0

      // Tulis baris per Jalur
      allSegmentRoutes.forEach((routeObj, routeIdx) => {
        // Ambil data keberangkatan yang sesuai jalur ini
        const lineDeps = segDeps.filter((d) => {
          if (routeObj.jalurId && (d.jalurId === routeObj.jalurId || d.jalurId === (routeObj as any).id)) return true
          const rName = resolveRouteName(d, effectiveJalur)
          return rName.toLowerCase() === routeObj.nama.toLowerCase()
        })

        // SO = Jumlah bus yang beroperasi pada hari tersebut (dalam 1 hari)
        const so = new Set(lineDeps.map((d) => d.cb).filter(Boolean)).size
        const rit = lineDeps.length

        // Cek nilai jarak tetap dari master data jalur
        const fixedKmTempuh = routeObj.kmTempuh != null && Number(routeObj.kmTempuh) > 0 ? Number(routeObj.kmTempuh) : null
        const fixedKmEmpty = routeObj.kmEmpty != null ? Number(routeObj.kmEmpty) : null

        let kmTempuh = 0
        let kmEmpty = 0
        let pnp = 0
        let pm = 0
        let tarif = routeObj.tarif || 0
        let pend = 0
        let sub = 0
        let bag = 0
        let upp = 0

        lineDeps.forEach((d) => {
          const c = calc(d)
          const dTempuh = (d.kmTempuh != null && Number(d.kmTempuh) > 0) ? Number(d.kmTempuh) : (fixedKmTempuh || 0)
          const dEmpty = (d.kmEmpty != null && Number(d.kmEmpty) > 0) ? Number(d.kmEmpty) : (fixedKmEmpty || 0)
          kmTempuh += dTempuh
          kmEmpty += dEmpty
          pnp += d.penumpang || 0
          pm += d.pm || 0
          tarif = c.tarif || tarif
          pend += d.pendapatan || 0
          sub += d.subsidi || 0
          bag += d.bagasi || 0
          upp += c.total
        })

        // KM PER RIT (Kolom E & F)
        // Nilai tetap jarak dari Master Data Jalur
        const kmPerRit = fixedKmTempuh != null ? fixedKmTempuh : (rit > 0 ? Math.round(kmTempuh / rit) : 0)
        const kmEmptyPerRit = fixedKmEmpty != null ? fixedKmEmpty : (so > 0 ? Math.round(kmEmpty / so) : 0)

        // Hitung total kilometer per jalur jika ada jarak tetap
        if (fixedKmTempuh != null && rit > 0) {
          kmTempuh = rit * fixedKmTempuh
        }
        if (fixedKmEmpty != null && so > 0) {
          kmEmpty = so * fixedKmEmpty
        }

        // Akumulasi total ke segmen
        segRit += rit
        segKmTempuh += kmTempuh
        segKmEmpty += kmEmpty
        segPnp += pnp
        segPm += pm
        segTarif = tarif || segTarif
        segPend += pend
        segSub += sub
        segBag += bag
        segUpp += upp

        const jmlhKm = kmTempuh + kmEmpty
        const jmlhPnp = pnp + pm
        const ritPerBus = so > 0 ? Number((rit / so).toFixed(2)) : "-"
        const pnpPerRit = rit > 0 ? Number((jmlhPnp / rit).toFixed(2)) : "-"
        const uppPerBus = so > 0 ? Math.round(upp / so) : "-"

        // Tambah baris data jalur
        const rData = ws.addRow([
          routeIdx + 1,
          routeObj.nama,
          so > 0 ? so : "-",
          rit > 0 ? rit : "-",
          kmPerRit > 0 ? kmPerRit : "-",
          kmEmptyPerRit > 0 ? kmEmptyPerRit : "-",
          kmTempuh > 0 ? kmTempuh : "-",
          kmEmpty > 0 ? kmEmpty : "-",
          jmlhKm > 0 ? jmlhKm : "-",
          pnp > 0 ? pnp : "-",
          pm > 0 ? pm : "-",
          jmlhPnp > 0 ? jmlhPnp : "-",
          tarif > 0 ? tarif : "-",
          pend > 0 ? pend : "-",
          sub > 0 ? sub : "-",
          bag > 0 ? bag : "-",
          upp > 0 ? upp : "-",
          ritPerBus,
          pnpPerRit,
          uppPerBus,
        ])
        rData.height = 20
        const dataR = rData.number

        // Terapkan ALL BORDERS dan format sel
        for (let c = 1; c <= 20; c++) {
          const cell = ws.getCell(dataR, c)
          cell.border = BORDER_THIN
          cell.font = { name: "Calibri", size: 10 }

          if (c === 1 || c === 3 || c === 4) {
            cell.alignment = { horizontal: "center", vertical: "middle" }
          } else if (c === 2) {
            cell.alignment = { horizontal: "left", vertical: "middle" }
          } else {
            cell.alignment = { horizontal: "right", vertical: "middle" }
            if (typeof cell.value === "number") {
              cell.numFmt = "#,##0"
            }
          }
        }
      })

      // Hitung SO segmen = jumlah armada unik yang beroperasi di segmen ini
      const segSO = new Set(segDeps.map((d) => d.cb).filter(Boolean)).size
      const segJmlhKm = segKmTempuh + segKmEmpty
      const segJmlhPnp = segPnp + segPm
      const segRitPerBus = segSO > 0 ? Number((segRit / segSO).toFixed(2)) : "-"
      const segPnpPerRit = segRit > 0 ? Number((segJmlhPnp / segRit).toFixed(2)) : "-"
      const segUppPerBus = segSO > 0 ? Math.round(segUpp / segSO) : "-"

      segmentSummaries.push({
        nama: segObj.nama,
        so: segSO,
        rit: segRit,
        kmTempuh: segKmTempuh,
        kmEmpty: segKmEmpty,
        jmlhKm: segJmlhKm,
        pnp: segPnp,
        pm: segPm,
        jmlhPnp: segJmlhPnp,
        tarif: segTarif,
        pend: segPend,
        sub: segSub,
        bag: segBag,
        upp: segUpp,
      })

      // Baris TOTAL PRODUKSI SEGMEN
      const rTotalSeg = ws.addRow([
        "",
        `TOTAL PRODUKSI ${segObj.nama.toUpperCase()}`,
        segSO > 0 ? segSO : "-",
        segRit > 0 ? segRit : "-",
        "-",
        "-",
        segKmTempuh > 0 ? segKmTempuh : "-",
        segKmEmpty > 0 ? segKmEmpty : "-",
        segJmlhKm > 0 ? segJmlhKm : "-",
        segPnp > 0 ? segPnp : "-",
        segPm > 0 ? segPm : "-",
        segJmlhPnp > 0 ? segJmlhPnp : "-",
        "-",
        segPend > 0 ? segPend : "-",
        segSub > 0 ? segSub : "-",
        segBag > 0 ? segBag : "-",
        segUpp > 0 ? segUpp : "-",
        segRitPerBus,
        segPnpPerRit,
        segUppPerBus,
      ])
      rTotalSeg.height = 22
      const totalSegR = rTotalSeg.number

      // Terapkan ALL BORDERS (BORDER_TOTAL), font tebal, dan fill subtotal
      for (let c = 1; c <= 20; c++) {
        const cell = ws.getCell(totalSegR, c)
        cell.border = BORDER_TOTAL
        cell.fill = FILL_TOTAL_SECTION
        cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF0F2C59" } }

        if (c === 1 || c === 3 || c === 4) {
          cell.alignment = { horizontal: "center", vertical: "middle" }
        } else if (c === 2) {
          cell.alignment = { horizontal: "left", vertical: "middle" }
        } else {
          cell.alignment = { horizontal: "right", vertical: "middle" }
          if (typeof cell.value === "number") {
            cell.numFmt = "#,##0"
          }
        }
      }

      ws.addRow([]) // Spacer antar segmen
    })

    // 3. TABEL REKAPITULASI TOTAL PRODUKSI PER SEGMEN
    const rRekapHeader = ws.addRow(["TOTAL PRODUKSI"])
    rRekapHeader.height = 24
    const rekapHR = rRekapHeader.number
    ws.mergeCells(`A${rekapHR}:H${rekapHR}`)
    rRekapHeader.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF0F2C59" } }
    rRekapHeader.alignment = { horizontal: "left", vertical: "middle" }

    const rekapDateCell = ws.getCell(`I${rekapHR}`)
    rekapDateCell.value = `S.D Tanggal : ${dateFormatted}`
    ws.mergeCells(`I${rekapHR}:T${rekapHR}`)
    rekapDateCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF475569" } }
    rekapDateCell.alignment = { horizontal: "right", vertical: "middle" }

    for (let c = 1; c <= 20; c++) {
      const cell = ws.getCell(rekapHR, c)
      cell.border = BORDER_THIN
      cell.fill = FILL_SECTION_TITLE
    }

    // Header Rekap Tabel
    const rh1 = ws.addRow([
      "NO", "SEGMEN", "SO", "RIT",
      "KILOMETER PER SEGMEN", "", "", "", "",
      "PENUMPANG", "", "",
      "TARIF UMUM",
      "PENDAPATAN", "", "", "",
      "", "", ""
    ])
    rh1.height = 22
    const rh1R = rh1.number

    const rh2 = ws.addRow([
      "", "", "", "",
      "KM TEMPUH", "EMPTY", "KM TEMPUH", "EMPTY", "JMLH KM",
      "PNP", "P/M", "JUMLAH",
      "",
      "UMUM", "SUBSIDI", "BAGASI", "UPP",
      "", "", ""
    ])
    rh2.height = 20
    const rh2R = rh2.number

    ws.mergeCells(`A${rh1R}:A${rh2R}`)
    ws.mergeCells(`B${rh1R}:B${rh2R}`)
    ws.mergeCells(`C${rh1R}:C${rh2R}`)
    ws.mergeCells(`D${rh1R}:D${rh2R}`)
    ws.mergeCells(`E${rh1R}:I${rh1R}`) // KILOMETER
    ws.mergeCells(`J${rh1R}:L${rh1R}`) // PENUMPANG
    ws.mergeCells(`M${rh1R}:M${rh2R}`) // TARIF
    ws.mergeCells(`N${rh1R}:Q${rh1R}`) // PENDAPATAN
    ws.mergeCells(`R${rh1R}:T${rh2R}`) // KOSONGKAN SISA KOLOM REKAP

    for (let r = rh1R; r <= rh2R; r++) {
      for (let c = 1; c <= 20; c++) {
        const cell = ws.getCell(r, c)
        cell.border = BORDER_THIN
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
        if (r === rh1R) {
          cell.fill = FILL_NAVY
          cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } }
        } else {
          cell.fill = FILL_SUBHEADER
          cell.font = { name: "Calibri", size: 9, bold: true, color: { argb: "FF1E293B" } }
        }
      }
    }

    // Baris data rekapitulasi per segmen
    segmentSummaries.forEach((sum, idx) => {
      const rSum = ws.addRow([
        idx + 1,
        sum.nama,
        sum.so > 0 ? sum.so : "-",
        sum.rit > 0 ? sum.rit : "-",
        "-",
        "-",
        sum.kmTempuh > 0 ? sum.kmTempuh : "-",
        sum.kmEmpty > 0 ? sum.kmEmpty : "-",
        sum.jmlhKm > 0 ? sum.jmlhKm : "-",
        sum.pnp > 0 ? sum.pnp : "-",
        sum.pm > 0 ? sum.pm : "-",
        sum.jmlhPnp > 0 ? sum.jmlhPnp : "-",
        sum.tarif > 0 ? sum.tarif : "-",
        sum.pend > 0 ? sum.pend : "-",
        sum.sub > 0 ? sum.sub : "-",
        sum.bag > 0 ? sum.bag : "-",
        sum.upp > 0 ? sum.upp : "-",
        "", "", ""
      ])
      rSum.height = 20
      const sumR = rSum.number

      for (let c = 1; c <= 20; c++) {
        const cell = ws.getCell(sumR, c)
        cell.border = BORDER_THIN
        cell.font = { name: "Calibri", size: 10 }

        if (c === 1 || c === 3 || c === 4) {
          cell.alignment = { horizontal: "center", vertical: "middle" }
        } else if (c === 2) {
          cell.alignment = { horizontal: "left", vertical: "middle" }
        } else {
          cell.alignment = { horizontal: "right", vertical: "middle" }
          if (typeof cell.value === "number") {
            cell.numFmt = "#,##0"
          }
        }
      }
    })

    // 4. JUMLAH TOTAL (GRAND TOTAL)
    // Sesuai permintaan pengguna: SO adalah jumlah bus yang beroperasi pada hari tersebut (dalam 1 hari)
    const daySO = new Set(dayDeps.map((d) => d.cb).filter(Boolean)).size
    let dayRit = 0
    let dayKmTempuh = 0
    let dayKmEmpty = 0
    let dayPnp = 0
    let dayPm = 0
    let dayPend = 0
    let daySub = 0
    let dayBag = 0
    let dayUpp = 0

    dayDeps.forEach((d) => {
      const c = calc(d)
      dayRit += 1
      dayKmTempuh += d.kmTempuh || 0
      dayKmEmpty += d.kmEmpty || 0
      dayPnp += d.penumpang || 0
      dayPm += d.pm || 0
      dayPend += d.pendapatan || 0
      daySub += d.subsidi || 0
      dayBag += d.bagasi || 0
      dayUpp += c.total
    })

    const dayJmlhKm = dayKmTempuh + dayKmEmpty
    const dayJmlhPnp = dayPnp + dayPm
    cumulativeRevenue += dayUpp
    const avgRev = Math.round(cumulativeRevenue / (dateIdx + 1))

    const rGrand = ws.addRow([
      "",
      "JUMLAH TOTAL",
      daySO > 0 ? daySO : "-",
      dayRit > 0 ? dayRit : "-",
      "-",
      "-",
      dayKmTempuh > 0 ? dayKmTempuh : "-",
      dayKmEmpty > 0 ? dayKmEmpty : "-",
      dayJmlhKm > 0 ? dayJmlhKm : "-",
      dayPnp > 0 ? dayPnp : "-",
      dayPm > 0 ? dayPm : "-",
      dayJmlhPnp > 0 ? dayJmlhPnp : "-",
      "-",
      dayPend > 0 ? dayPend : "-",
      daySub > 0 ? daySub : "-",
      dayBag > 0 ? dayBag : "-",
      dayUpp > 0 ? dayUpp : "-",
      "", "", ""
    ])
    rGrand.height = 24
    const grandR = rGrand.number

    for (let c = 1; c <= 20; c++) {
      const cell = ws.getCell(grandR, c)
      cell.border = BORDER_TOTAL
      cell.fill = FILL_GRAND_TOTAL
      cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF78350F" } }

      if (c === 1 || c === 3 || c === 4) {
        cell.alignment = { horizontal: "center", vertical: "middle" }
      } else if (c === 2) {
        cell.alignment = { horizontal: "left", vertical: "middle" }
      } else {
        cell.alignment = { horizontal: "right", vertical: "middle" }
        if (typeof cell.value === "number") {
          cell.numFmt = "#,##0"
        }
      }
    }

    // 5. Tiga baris ringkasan pendapatan di bawah JUMLAH TOTAL
    const addMetricRow = (label: string, value: number) => {
      const rM = ws.addRow([])
      rM.height = 22
      const mR = rM.number
      ws.getCell(`N${mR}`).value = label
      ws.mergeCells(`N${mR}:P${mR}`)
      ws.getCell(`N${mR}`).alignment = { horizontal: "left", vertical: "middle" }
      ws.getCell(`N${mR}`).font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF1E293B" } }

      const valCell = ws.getCell(`Q${mR}`)
      valCell.value = value
      valCell.alignment = { horizontal: "right", vertical: "middle" }
      valCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF0F2C59" } }
      valCell.numFmt = "#,##0"

      // All border pada sel ringkasan
      for (let c = 14; c <= 17; c++) {
        ws.getCell(mR, c).border = BORDER_THIN
        ws.getCell(mR, c).fill = FILL_TOTAL_SECTION
      }
    }

    addMetricRow("PENDAPATAN SAMPAI DENGAN HARI INI", cumulativeRevenue)
    addMetricRow("PENDAPATAN RATA RATA PERHARI", avgRev)
    addMetricRow("UPP HARI INI", dayUpp)

    ws.addRow([]) // Spacer antar hari
    ws.addRow([])
  })
}

/**
 * Membangun Sheet Rincian Ritase dengan ALL BORDERS dan tata letak rapi
 */
export function buildDynamicDetailWorksheet(
  ws: ExcelJS.Worksheet,
  reportDepartures: Departure[],
  masterSegments: Segment[],
  masterJalur: Jalur[]
) {
  ws.views = [{ showGridLines: true }]

  ws.columns = [
    { width: 6 },  // No
    { width: 14 }, // Tanggal
    { width: 10 }, // Jam
    { width: 22 }, // Segmen
    { width: 34 }, // Rute / Jalur
    { width: 16 }, // No. Armada (CB)
    { width: 16 }, // No. Plat
    { width: 22 }, // Pengemudi (Sopir)
    { width: 14 }, // KM Tempuh
    { width: 12 }, // KM Empty
    { width: 16 }, // Penumpang (Org)
    { width: 10 }, // P/M
    { width: 18 }, // Pendapatan (Rp)
    { width: 16 }, // Subsidi (Rp)
    { width: 14 }, // Bagasi (Rp)
    { width: 20 }, // Total Produksi (Rp)
    { width: 14 }, // UPP (Rp/km)
    { width: 18 }, // Status
  ]

  // Header Title
  const rTitle = ws.addRow(["RINCIAN RITASE KEBERANGKATAN OPERASIONAL DAMRI"])
  rTitle.height = 26
  ws.mergeCells("A1:R1")
  rTitle.font = { name: "Calibri", size: 13, bold: true, color: { argb: "FF0F2C59" } }
  rTitle.alignment = { horizontal: "center", vertical: "middle" }

  const headers = [
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
  ]

  const rHead = ws.addRow(headers)
  rHead.height = 24
  const headR = rHead.number

  for (let c = 1; c <= 18; c++) {
    const cell = ws.getCell(headR, c)
    cell.border = BORDER_THIN
    cell.fill = FILL_NAVY
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } }
    cell.alignment = { horizontal: "center", vertical: "middle" }
  }

  const sorted = reportDepartures
    .slice()
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))

  sorted.forEach((d, idx) => {
    const c = calc(d)
    const ruteNama = resolveRouteName(d, masterJalur)
    const segNama = resolveSegmentName(d.segmentId, masterSegments)

    const matchedJ = masterJalur.find((j) => j.id === d.jalurId || j.nama.toLowerCase() === ruteNama.toLowerCase())
    const rowKmTempuh = (d.kmTempuh != null && Number(d.kmTempuh) > 0)
      ? Number(d.kmTempuh)
      : (matchedJ?.kmTempuh != null && Number(matchedJ.kmTempuh) > 0 ? Number(matchedJ.kmTempuh) : 0)
    const rowKmEmpty = (d.kmEmpty != null && Number(d.kmEmpty) > 0)
      ? Number(d.kmEmpty)
      : (matchedJ?.kmEmpty != null ? Number(matchedJ.kmEmpty) : 0)

    const rData = ws.addRow([
      idx + 1,
      formatShortDate(d.date),
      d.time,
      segNama,
      ruteNama,
      d.cb,
      getPlat(d.cb) || d.cb,
      d.driver,
      rowKmTempuh,
      rowKmEmpty,
      d.penumpang || 0,
      d.pm || 0,
      d.pendapatan || 0,
      d.subsidi || 0,
      d.bagasi || 0,
      c.total,
      Math.round(c.upp),
      d.status === "disetujui"
        ? "Disetujui"
        : d.status === "dikirim"
          ? "Menunggu Verifikasi"
          : d.status,
    ])
    rData.height = 20
    const dataR = rData.number

    const isZebra = idx % 2 === 1
    for (let colIdx = 1; colIdx <= 18; colIdx++) {
      const cell = ws.getCell(dataR, colIdx)
      cell.border = BORDER_THIN
      cell.font = { name: "Calibri", size: 10 }
      if (isZebra) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } }
      }

      if (colIdx === 1 || colIdx === 2 || colIdx === 3 || colIdx === 6 || colIdx === 7 || colIdx === 18) {
        cell.alignment = { horizontal: "center", vertical: "middle" }
      } else if (colIdx === 4 || colIdx === 5 || colIdx === 8) {
        cell.alignment = { horizontal: "left", vertical: "middle" }
      } else {
        cell.alignment = { horizontal: "right", vertical: "middle" }
        if (typeof cell.value === "number") {
          cell.numFmt = "#,##0"
        }
      }
    }
  })
}

/**
 * Fungsi Utama: Membuat Workbook Excel DAMRI lengkap berbasis Data Master dan berformat All Borders rapi
 */
export async function createDamriExcelWorkbook(
  departures: Departure[],
  startDate: string,
  endDate: string,
  segments: Segment[] = SEGMENTS,
  jalurList: Jalur[] = JALUR
): Promise<ExcelJS.Workbook> {
  // Ambil keberangkatan yang valid (hanya yang sudah disetujui koordinator)
  const reportDepartures = departures.filter(
    (d) =>
      d.status === "disetujui" &&
      (!startDate || d.date >= startDate) &&
      (!endDate || d.date <= endDate)
  )

  const uniqueDates = Array.from(new Set(reportDepartures.map((d) => d.date))).sort()

  const wb = new ExcelJS.Workbook()
  wb.creator = "DAMRI Sistem Informasi Manajemen"
  wb.created = new Date()

  // Sheet 1: AK15 (Laporan Operasional Produksi RPP / AK 15)
  const wsAK = wb.addWorksheet("AK15")
  buildDynamicAK15Worksheet(wsAK, uniqueDates, reportDepartures, segments, jalurList)

  // Sheet 2: Rincian Ritase (Audit log per ritase)
  const wsDetail = wb.addWorksheet("Rincian Ritase")
  buildDynamicDetailWorksheet(wsDetail, reportDepartures, segments, jalurList)

  return wb
}

/**
 * Menghasilkan Buffer file Excel (.xlsx) untuk response server API
 */
export async function generateDamriExcelBuffer(
  departures: Departure[],
  startDate: string,
  endDate: string,
  segments?: Segment[],
  jalurList?: Jalur[]
): Promise<Buffer> {
  const wb = await createDamriExcelWorkbook(departures, startDate, endDate, segments, jalurList)
  const arrayBuf = await wb.xlsx.writeBuffer()
  return Buffer.from(arrayBuf)
}

/**
 * Adapter kompatibilitas ke belakang jika ada pemanggilan fungsi terdahulu
 */
export function populateDamriTemplate(
  _masterWorkbook: any,
  departures: Departure[],
  startDate: string,
  endDate: string,
  segments?: Segment[],
  jalurList?: Jalur[]
): any {
  // Dipanggil saat fallback SheetJS jika diperlukan
  return null
}
