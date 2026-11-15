import { NextRequest, NextResponse } from "next/server"
import * as fs from "fs"
import * as path from "path"
import * as XLSX from "xlsx"
import { populateDamriTemplate } from "@/lib/excelTemplatePopulator"
import { supabase } from "@/lib/supabase"
import type { Jalur, Segment } from "@/lib/data"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { departures = [], startDate = "", endDate = "", segments: rawSegments = [], jalurList: rawJalurList = [] } = body

    // 1. Lengkapi master data jalur & segmen jika tidak dikirim dari client
    let segments: Segment[] = rawSegments
    let jalurList: Jalur[] = rawJalurList

    if (!jalurList || jalurList.length === 0) {
      const { data: dbJalur } = await supabase.from("jalur").select("*")
      if (dbJalur && dbJalur.length > 0) {
        jalurList = dbJalur.map((j: any) => ({
          id: j.id,
          nama: j.nama,
          segmentId: j.segmen_id,
          tarif: 0,
          aktif: Boolean(j.aktif),
        }))
      }
    }

    if (!segments || segments.length === 0) {
      const { data: dbSeg } = await supabase.from("segmen").select("*")
      if (dbSeg && dbSeg.length > 0) {
        segments = dbSeg.map((s: any) => ({
          id: s.kode || s.id,
          nama: s.nama,
          kontrak: Boolean(s.kontrak),
          aktif: Boolean(s.aktif),
        }))
      }
    }

    // 2. Ambil berkas template master AK15
    const templatePath = path.join(process.cwd(), "public", "template_laporan_excel.xlsx")
    let templateBuf: Buffer | null = null

    if (fs.existsSync(templatePath)) {
      templateBuf = fs.readFileSync(templatePath)
    } else {
      const fallbackPath = path.join(process.cwd(), "template laporan excel.xlsx")
      if (fs.existsSync(fallbackPath)) {
        templateBuf = fs.readFileSync(fallbackPath)
      }
    }

    if (!templateBuf) {
      return NextResponse.json(
        { error: "Template Excel laporan tidak ditemukan di server" },
        { status: 404 }
      )
    }

    const wbMaster = XLSX.read(templateBuf, { cellFormula: true })

    // 3. Bangun workbook Excel yang HANYA memuat 2 sheet: 'AK15' dan 'Rincian Ritase'
    const outWb = populateDamriTemplate(wbMaster, departures, startDate, endDate, segments, jalurList)

    const outputBuf = XLSX.write(outWb, { type: "buffer", bookType: "xlsx" })
    const fileName = `AK15_${startDate || "awal"}_${endDate || "akhir"}.xlsx`

    return new Response(outputBuf as any, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (err: any) {
    console.error("Gagal mengekspor laporan Excel:", err)
    return NextResponse.json(
      { error: err?.message || "Terjadi kesalahan saat memproses laporan Excel" },
      { status: 500 }
    )
  }
}
