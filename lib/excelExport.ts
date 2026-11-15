import * as XLSX from "xlsx"
import type { Departure, Jalur, Segment } from "./data"
import { JALUR, SEGMENTS } from "./data"
import { populateDamriTemplate } from "./excelTemplatePopulator"

/**
 * Memicu unduhan file Excel (.xlsx) langsung di browser pengguna
 */
function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Ekspor Laporan Operasional Produksi AK 15 ke format Excel (.xlsx)
 * Susunan baris dan kolom 100% mengikuti template 'template laporan excel.xlsx'.
 * Baris/kolom yang tidak memiliki data dikosongkan.
 */
export async function exportLaporanAK15(
  deps: Departure[],
  startDate: string,
  endDate: string,
  segments: Segment[] = SEGMENTS,
  jalurList: Jalur[] = JALUR,
) {
  const fileName = `AK15_${startDate || "awal"}_${endDate || "akhir"}.xlsx`

  try {
    // 1. Coba lewat API endpoint server (lebih cepat & ringan bagi memori browser)
    const res = await fetch("/api/export-excel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        departures: deps,
        startDate,
        endDate,
        segments,
        jalurList,
      }),
    })

    if (res.ok) {
      const blob = await res.blob()
      downloadBlob(blob, fileName)
      return
    }
  } catch (apiErr) {
    console.warn("Gagal via /api/export-excel, menggunakan fallback client-side:", apiErr)
  }

  // 2. Fallback: Ambil file template statis dari public/ dan proses di client-side
  try {
    const resTemplate = await fetch("/template_laporan_excel.xlsx")
    if (!resTemplate.ok) {
      throw new Error("Berkas template laporan excel tidak dapat dimuat")
    }

    const arrayBuffer = await resTemplate.arrayBuffer()
    const wb = XLSX.read(arrayBuffer, { cellFormula: true })

    const outWb = populateDamriTemplate(wb, deps, startDate, endDate, segments, jalurList)

    const outBuf = XLSX.write(outWb, { type: "array", bookType: "xlsx" })
    const blob = new Blob([outBuf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    downloadBlob(blob, fileName)
  } catch (err: any) {
    console.error("Gagal mengekspor laporan AK 15:", err)
    alert("Gagal mengunduh laporan Excel: " + (err?.message || "Kesalahan tidak diketahui"))
  }
}

/**
 * Ekspor Arsip Bulanan ke format Excel (.xlsx) dengan susunan template DAMRI
 */
export async function exportArsipBulanan(
  monthLabel: string,
  deps: Departure[],
  segments: Segment[] = SEGMENTS,
  jalurList: Jalur[] = JALUR,
) {
  const cleanMonth = monthLabel.replace(/[\/\\?%*:|"<>]/g, "_")
  const fileName = `Arsip_Operasional_DAMRI_${cleanMonth}.xlsx`

  try {
    const res = await fetch("/api/export-excel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        departures: deps,
        startDate: "",
        endDate: "",
        segments,
        jalurList,
      }),
    })

    if (res.ok) {
      const blob = await res.blob()
      downloadBlob(blob, fileName)
      return
    }
  } catch (apiErr) {
    console.warn("Gagal via /api/export-excel, fallback client-side:", apiErr)
  }

  try {
    const resTemplate = await fetch("/template_laporan_excel.xlsx")
    if (!resTemplate.ok) throw new Error("Template tidak ditemukan")

    const arrayBuffer = await resTemplate.arrayBuffer()
    const wb = XLSX.read(arrayBuffer, { cellFormula: true })

    const outWb = populateDamriTemplate(wb, deps, "", "", segments, jalurList)

    const outBuf = XLSX.write(outWb, { type: "array", bookType: "xlsx" })
    const blob = new Blob([outBuf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    downloadBlob(blob, fileName)
  } catch (err: any) {
    console.error("Gagal mengekspor arsip bulanan:", err)
    alert("Gagal mengunduh arsip Excel: " + (err?.message || "Kesalahan tidak diketahui"))
  }
}
