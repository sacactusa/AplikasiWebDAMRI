import { NextRequest, NextResponse } from "next/server"
import { generateDamriExcelBuffer } from "@/lib/excelTemplatePopulator"
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
      const { data: dbJalur } = await supabase.from("jalur").select("*").order("created_at")
      if (dbJalur && dbJalur.length > 0) {
        jalurList = dbJalur.map((j: any) => ({
          id: j.id,
          nama: j.nama,
          segmentId: j.segmen_id,
          tarif: 0,
          aktif: Boolean(j.aktif),
          kmTempuh: j.km_tempuh != null ? Number(j.km_tempuh) : null,
          kmEmpty: j.km_empty != null ? Number(j.km_empty) : null,
        }))
      }
    }

    if (!segments || segments.length === 0) {
      const { data: dbSeg } = await supabase.from("segmen").select("*").order("created_at")
      if (dbSeg && dbSeg.length > 0) {
        segments = dbSeg.map((s: any) => ({
          id: s.kode || s.id,
          nama: s.nama,
          kontrak: Boolean(s.kontrak),
          aktif: Boolean(s.aktif),
        }))
      }
    }

    // 2. Bangun workbook Excel dinamis berbasis Data Master dengan ALL BORDERS
    const outputBuf = await generateDamriExcelBuffer(departures, startDate, endDate, segments, jalurList)
    const fileName = `Laporan_AK15_${startDate || "awal"}_${endDate || "akhir"}.xlsx`

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
