import type { Departure, Jalur, Segment } from "./data"
import { JALUR, SEGMENTS } from "./data"
import { createDamriExcelWorkbook } from "./excelTemplatePopulator"

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
 * Segmen dan Jalur menyesuaikan Data Master dengan ALL BORDERS rapi.
 */
export async function exportLaporanAK15(
  deps: Departure[],
  startDate: string,
  endDate: string,
  segments: Segment[] = SEGMENTS,
  jalurList: Jalur[] = JALUR,
) {
  const fileName = `Laporan_Pendapatan_${startDate || "awal"}_${endDate || "akhir"}.xlsx`

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
    console.warn("Gagal via /api/export-excel, menggunakan fallback client-side ExcelJS:", apiErr)
  }

  // 2. Fallback: Buat langsung via ExcelJS di client-side dengan ALL BORDERS
  try {
    const wb = await createDamriExcelWorkbook(deps, startDate, endDate, segments, jalurList)
    const arrayBuffer = await wb.xlsx.writeBuffer()
    const blob = new Blob([arrayBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    downloadBlob(blob, fileName)
  } catch (err: any) {
    console.error("Gagal mengekspor laporan AK 15:", err)
    alert("Gagal mengunduh laporan Excel: " + (err?.message || "Kesalahan tidak diketahui"))
  }
}

/**
 * Ekspor Arsip Bulanan ke format Excel (.xlsx) dengan susunan Data Master dan ALL BORDERS
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
    console.warn("Gagal via /api/export-excel, fallback client-side ExcelJS:", apiErr)
  }

  try {
    const wb = await createDamriExcelWorkbook(deps, "", "", segments, jalurList)
    const arrayBuffer = await wb.xlsx.writeBuffer()
    const blob = new Blob([arrayBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    downloadBlob(blob, fileName)
  } catch (err: any) {
    console.error("Gagal mengekspor arsip bulanan:", err)
    alert("Gagal mengunduh arsip Excel: " + (err?.message || "Kesalahan tidak diketahui"))
  }
}
