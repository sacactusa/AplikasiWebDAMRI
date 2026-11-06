import { supabase } from "./supabase"
import type { Departure, Jalur, Segment, Vehicle } from "@/types"
import { JALUR, SEGMENTS, VEHICLES, SEED, AUDIT } from "./data"

export interface AuditItem {
  id?: number | string
  t: string
  rawTime?: string
  u: string
  a: string
  o: string
  before: Record<string, any>
  after: Record<string, any>
}

// Helper untuk format timestamp audit log ke tampilan lokal
export function formatAuditTime(isoStr: string): string {
  try {
    const d = new Date(isoStr)
    const day = String(d.getDate()).padStart(2, "0")
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Agu",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ]
    const month = months[d.getMonth()]
    const year = d.getFullYear()
    const hours = String(d.getHours()).padStart(2, "0")
    const mins = String(d.getMinutes()).padStart(2, "0")
    return `${day} ${month} ${year} ${hours}:${mins}`
  } catch {
    return isoStr
  }
}

/**
 * Mengambil data Master (Segmen, Jalur, Kendaraan) dari Supabase
 * dengan fallback ke data lokal jika offline atau terjadi kendala jaringan.
 */
export async function getMasterData(): Promise<{
  segments: Segment[]
  jalurList: Jalur[]
  vehicles: Vehicle[]
}> {
  try {
    const [segRes, jalRes, vehRes, tarRes] = await Promise.all([
      supabase.from("segmen").select("*").order("nama"),
      supabase.from("jalur").select("*").order("nama"),
      supabase.from("kendaraan").select("*").order("kode_cb"),
      supabase
        .from("tarif_jalur")
        .select("*")
        .order("berlaku_mulai", { ascending: false }),
    ])

    if (segRes.error || !segRes.data || segRes.data.length === 0) {
      return { segments: SEGMENTS, jalurList: JALUR, vehicles: VEHICLES }
    }

    // Map Segmen
    const segMap = new Map<string, string>() // id (uuid) -> kode
    const segments: Segment[] = segRes.data.map((s) => {
      segMap.set(s.id, s.kode)
      return {
        id: s.kode || s.id,
        nama: s.nama,
        kontrak: Boolean(s.kontrak),
        nilaiTetap: s.nilai_tetap ? Number(s.nilai_tetap) : undefined,
        aktif: Boolean(s.aktif),
      }
    })

    // Map Tarif per jalur_id
    const tarifMap = new Map<string, number>()
    if (tarRes.data) {
      for (const t of tarRes.data) {
        if (!tarifMap.has(t.jalur_id)) {
          tarifMap.set(t.jalur_id, Number(t.tarif) || 0)
        }
      }
    }

    // Map Jalur
    const jalurList: Jalur[] = (jalRes.data || []).map((j) => {
      const segKode = segMap.get(j.segmen_id) || j.segmen_id
      return {
        id: j.id,
        nama: j.nama,
        segmentId: segKode,
        tarif: tarifMap.get(j.id) ?? 0,
        aktif: Boolean(j.aktif),
      }
    })

    // Map Kendaraan
    const vehicles: Vehicle[] = (vehRes.data || []).map((v) => ({
      cb: v.kode_cb,
      plat: v.plat,
      aktif: Boolean(v.aktif),
    }))

    return {
      segments: segments.length ? segments : SEGMENTS,
      jalurList: jalurList.length ? jalurList : JALUR,
      vehicles: vehicles.length ? vehicles : VEHICLES,
    }
  } catch (err) {
    console.warn(
      "Gagal memuat master data dari Supabase, menggunakan fallback lokal:",
      err,
    )
    return { segments: SEGMENTS, jalurList: JALUR, vehicles: VEHICLES }
  }
}

/**
 * Mengambil daftar keberangkatan.
 * Jika isDemo = true (akun demo sopir@damri.co.id / koordinator@damri.co.id):
 *   -> Menggunakan data demo (SEED).
 * Jika isDemo = false (akun riil terdaftar):
 *   -> Mengambil HANYA dari Supabase view v_keberangkatan (jika kosong, kembalikan []).
 */
export async function getDepartures(isDemo = false): Promise<Departure[]> {
  if (isDemo) {
    return SEED
  }

  try {
    const { data, error } = await supabase
      .from("v_keberangkatan")
      .select("*")
      .order("tanggal", { ascending: false })
      .order("jam", { ascending: false })

    if (error || !data) {
      console.warn("Gagal mengambil keberangkatan dari Supabase:", error)
      return []
    }

    return data.map((r): Departure => ({
      id: r.id,
      date: r.tanggal,
      time: typeof r.jam === "string" ? r.jam.slice(0, 5) : r.jam,
      segmentId: r.segmen_kode || r.segmen_id,
      jalurId: r.jalur_id,
      cb: r.cb,
      driver: r.sopir_nama || "Sopir",
      kmTempuh: r.km_tempuh != null ? Number(r.km_tempuh) : null,
      kmEmpty: r.km_empty != null ? Number(r.km_empty) : null,
      penumpang: r.penumpang != null ? Number(r.penumpang) : null,
      pm: r.pm != null ? Number(r.pm) : null,
      pendapatan: r.pendapatan != null ? Number(r.pendapatan) : null,
      subsidi: r.subsidi != null ? Number(r.subsidi) : null,
      bagasi: r.bagasi != null ? Number(r.bagasi) : null,
      status: (r.status as Departure["status"]) || "draft",
      rejectNote: r.catatan_penolakan || undefined,
    }))
  } catch (err) {
    console.warn("Gagal mengambil keberangkatan dari Supabase:", err)
    return []
  }
}

/**
 * Helper internal untuk mencari UUID id dari segmen, jalur, kendaraan, & profile
 */
async function resolveIds(d: Departure, driverEmail?: string) {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  // 1. Resolve Segmen (hindari syntax error 22P02 dengan mengecek regex UUID)
  const resolveSeg = async () => {
    if (UUID_REGEX.test(d.segmentId)) {
      const res = await supabase.from("segmen").select("id").eq("id", d.segmentId).limit(1)
      if (res.data?.[0]?.id) return res.data[0].id
    }
    const byKode = await supabase.from("segmen").select("id").eq("kode", d.segmentId).limit(1)
    if (byKode.data?.[0]?.id) return byKode.data[0].id
    const def = await supabase.from("segmen").select("id").limit(1)
    return def.data?.[0]?.id
  }

  // 2. Resolve Jalur
  const resolveJal = async () => {
    if (UUID_REGEX.test(d.jalurId)) {
      const res = await supabase.from("jalur").select("id").eq("id", d.jalurId).limit(1)
      if (res.data?.[0]?.id) return res.data[0].id
    }
    const legacyMap: Record<string, string> = {
      j1: "Dipatiukur",
      j2: "Parahyangan",
      j3: "Cicaheum",
      j4: "Garut",
      j5: "Cirebon",
      j6: "Jemputan",
      j7: "Borongan",
      j8: "Haji",
    }
    const qName = legacyMap[d.jalurId] || d.jalurId
    const byName = await supabase.from("jalur").select("id").ilike("nama", `%${qName}%`).limit(1)
    if (byName.data?.[0]?.id) return byName.data[0].id
    const def = await supabase.from("jalur").select("id").limit(1)
    return def.data?.[0]?.id
  }

  // 3. Resolve Kendaraan
  const resolveVeh = async () => {
    if (UUID_REGEX.test(d.cb)) {
      const res = await supabase.from("kendaraan").select("id").eq("id", d.cb).limit(1)
      if (res.data?.[0]?.id) return res.data[0].id
    }
    const byCb = await supabase.from("kendaraan").select("id").eq("kode_cb", d.cb).limit(1)
    if (byCb.data?.[0]?.id) return byCb.data[0].id
    const def = await supabase.from("kendaraan").select("id").limit(1)
    return def.data?.[0]?.id
  }

  // 4. Resolve Profil Sopir
  const resolveProf = async () => {
    if (driverEmail) {
      const byEmail = await supabase.from("profiles").select("id").eq("email", driverEmail).limit(1)
      if (byEmail.data?.[0]?.id) return byEmail.data[0].id
    }
    if (d.driver) {
      const byName = await supabase.from("profiles").select("id").eq("nama", d.driver).limit(1)
      if (byName.data?.[0]?.id) return byName.data[0].id
    }
    const anyProf = await supabase.from("profiles").select("id").limit(1)
    return anyProf.data?.[0]?.id
  }

  const [segId, jalId, vehId, profId] = await Promise.all([
    resolveSeg(),
    resolveJal(),
    resolveVeh(),
    resolveProf(),
  ])

  return {
    segmen_id: segId,
    jalur_id: jalId,
    kendaraan_id: vehId,
    sopir_id: profId,
  }
}

/**
 * Menyimpan keberangkatan baru ke Supabase
 * Mengembalikan ID UUID yang dihasilkan oleh database.
 */
export async function createDeparture(
  d: Departure,
  driverEmail?: string,
): Promise<{ success: boolean; id?: string }> {
  try {
    const ids = await resolveIds(d, driverEmail)

    const payload: Record<string, any> = {
      tanggal: d.date,
      jam: d.time.length === 5 ? `${d.time}:00` : d.time,
      segmen_id: ids.segmen_id,
      jalur_id: ids.jalur_id,
      kendaraan_id: ids.kendaraan_id,
      sopir_id: ids.sopir_id,
      km_tempuh: d.kmTempuh,
      km_empty: d.kmEmpty,
      penumpang: d.penumpang,
      pm: d.pm,
      pendapatan: d.pendapatan,
      subsidi: d.subsidi,
      bagasi: d.bagasi,
      status: d.status,
      catatan_penolakan: d.rejectNote || null,
      dikirim_at: d.status === "dikirim" ? new Date().toISOString() : null,
    }

    const { data, error } = await supabase
      .from("keberangkatan")
      .insert(payload)
      .select("id")
      .single()

    if (error || !data) {
      console.error("Error insert keberangkatan:", error)
      return { success: false }
    }

    const newId = data.id

    // Catat ke audit_log
    await logAudit({
      user_nama: d.driver,
      aksi: "Tambah",
      tabel: "keberangkatan",
      record_id: newId,
      objek: `keberangkatan · ${d.cb} (${d.time})`,
      sebelum: {},
      sesudah: { status: d.status, cb: d.cb, tanggal: d.date, rute: d.jalurId },
    })

    return { success: true, id: newId }
  } catch (err) {
    console.error("Gagal createDeparture ke Supabase:", err)
    return { success: false }
  }
}

/**
 * Memperbarui keberangkatan di Supabase
 */
export async function updateDeparture(
  d: Departure,
  driverName?: string,
): Promise<boolean> {
  try {
    const payload: Record<string, any> = {
      km_tempuh: d.kmTempuh,
      km_empty: d.kmEmpty,
      penumpang: d.penumpang,
      pm: d.pm,
      pendapatan: d.pendapatan,
      subsidi: d.subsidi,
      bagasi: d.bagasi,
      status: d.status,
      catatan_penolakan: d.rejectNote || null,
      updated_at: new Date().toISOString(),
    }
    if (d.status === "dikirim") {
      payload.dikirim_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from("keberangkatan")
      .update(payload)
      .eq("id", d.id)

    if (error) {
      console.error("Error update keberangkatan:", error)
      return false
    }

    await logAudit({
      user_nama: driverName || d.driver,
      aksi: d.status === "dikirim" ? "Kirim" : "Ubah",
      tabel: "keberangkatan",
      record_id: d.id,
      objek: `keberangkatan · ${d.id}`,
      sebelum: {},
      sesudah: { status: d.status, kmTempuh: d.kmTempuh, penumpang: d.penumpang },
    })

    return true
  } catch (err) {
    console.error("Gagal updateDeparture ke Supabase:", err)
    return false
  }
}

/**
 * Menyetujui keberangkatan (Koordinator)
 */
export async function approveDeparture(
  id: string,
  coordNama = "Koordinator",
): Promise<boolean> {
  try {
    const now = new Date().toISOString()
    const { error } = await supabase
      .from("keberangkatan")
      .update({
        status: "disetujui",
        disetujui_at: now,
        updated_at: now,
      })
      .eq("id", id)

    if (error) {
      console.error("Error approve keberangkatan:", error)
      return false
    }

    await logAudit({
      user_nama: coordNama,
      aksi: "Setujui",
      tabel: "keberangkatan",
      record_id: id,
      objek: `keberangkatan · ${id}`,
      sebelum: { status: "dikirim" },
      sesudah: { status: "disetujui" },
    })

    return true
  } catch (err) {
    console.error("Gagal approveDeparture ke Supabase:", err)
    return false
  }
}

/**
 * Menolak keberangkatan dengan catatan revisi (Koordinator)
 */
export async function rejectDeparture(
  id: string,
  note: string,
  coordNama = "Koordinator",
): Promise<boolean> {
  try {
    const now = new Date().toISOString()
    const { error } = await supabase
      .from("keberangkatan")
      .update({
        status: "draft",
        catatan_penolakan: note,
        ditolak_at: now,
        updated_at: now,
      })
      .eq("id", id)

    if (error) {
      console.error("Error reject keberangkatan:", error)
      return false
    }

    await logAudit({
      user_nama: coordNama,
      aksi: "Tolak",
      tabel: "keberangkatan",
      record_id: id,
      objek: `keberangkatan · ${id}`,
      sebelum: { status: "dikirim" },
      sesudah: { status: "draft", catatan: note },
    })

    return true
  } catch (err) {
    console.error("Gagal rejectDeparture ke Supabase:", err)
    return false
  }
}

/**
 * Mengambil riwayat Audit Log dari tabel audit_log Supabase
 */
export async function getAuditLogs(): Promise<AuditItem[]> {
  try {
    const { data, error } = await supabase
      .from("audit_log")
      .select("*")
      .order("waktu", { ascending: false })
      .limit(100)

    if (error || !data || data.length === 0) {
      return AUDIT
    }

    return data.map((row) => ({
      id: row.id,
      t: formatAuditTime(row.waktu),
      rawTime: row.waktu,
      u: row.user_nama || "Sistem",
      a: row.aksi,
      o: row.objek || `${row.tabel} #${row.record_id || ""}`.trim(),
      before: row.sebelum || {},
      after: row.sesudah || {},
    }))
  } catch (err) {
    console.warn("Gagal mengambil audit log dari Supabase:", err)
    return AUDIT
  }
}

/**
 * Menulis rekaman log baru ke tabel audit_log Supabase
 */
export async function logAudit(entry: {
  user_nama: string
  aksi: string
  tabel: string
  record_id?: string
  objek: string
  sebelum?: Record<string, any>
  sesudah?: Record<string, any>
}): Promise<void> {
  try {
    await supabase.from("audit_log").insert({
      user_nama: entry.user_nama,
      aksi: entry.aksi,
      tabel: entry.tabel,
      record_id: entry.record_id || null,
      objek: entry.objek,
      sebelum: entry.sebelum || {},
      sesudah: entry.sesudah || {},
    })
  } catch (err) {
    console.warn("Gagal menyimpan audit log ke Supabase:", err)
  }
}

/**
 * Memvalidasi kode registrasi koordinator dari Supabase
 */
export async function validateCoordinatorCode(code: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("kode_registrasi")
      .select("id")
      .eq("kode", code.trim())
      .eq("aktif", true)
      .limit(1)

    if (error || !data) {
      return code.trim() === "DAMRI-KOORD"
    }
    return data.length > 0
  } catch {
    return code.trim() === "DAMRI-KOORD"
  }
}
