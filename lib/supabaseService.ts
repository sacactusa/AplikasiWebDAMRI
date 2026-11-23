import { supabase } from "./supabase"
import type { Departure, Jalur, Segment, Vehicle, JenisPenumpang } from "@/types"
import { JALUR, SEGMENTS, VEHICLES, SEED, AUDIT, JENIS_PENUMPANG } from "./data"

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
export async function getMasterData(isDemo = false): Promise<{
  segments: Segment[]
  jalurList: Jalur[]
  vehicles: Vehicle[]
  passengerTypes: JenisPenumpang[]
}> {
  if (isDemo) {
    return {
      segments: SEGMENTS,
      jalurList: JALUR,
      vehicles: VEHICLES,
      passengerTypes: JENIS_PENUMPANG,
    }
  }

  try {
    const [segRes, jalRes, vehRes, tarRes, paxRes] = await Promise.all([
      supabase.from("segmen").select("*").order("nama"),
      supabase.from("jalur").select("*").order("nama"),
      supabase.from("kendaraan").select("*").order("plat"),
      supabase
        .from("tarif_jalur")
        .select("*")
        .order("berlaku_mulai", { ascending: false }),
      supabase.from("jenis_penumpang").select("*").order("created_at"),
    ])

    if (segRes.error) {
      console.warn("Gagal memuat segmen dari Supabase:", segRes.error)
    }
    if (jalRes.error) {
      console.warn("Gagal memuat jalur dari Supabase:", jalRes.error)
    }
    if (vehRes.error) {
      console.warn("Gagal memuat kendaraan dari Supabase:", vehRes.error)
    }
    if (tarRes.error) {
      console.warn("Gagal memuat tarif dari Supabase:", tarRes.error)
    }

    // Map Segmen (jika kosong, tetap kembalikan array kosong [])
    const segMap = new Map<string, string>() // id (uuid) -> kode
    const segments: Segment[] = (segRes.data || []).map((s) => {
      segMap.set(s.id, s.kode || s.id)
      if (s.kode) segMap.set(s.kode, s.kode)
      return {
        id: s.kode || s.id,
        rawId: s.id,
        nama: s.nama,
        kontrak: Boolean(s.kontrak),
        nilaiTetap: s.nilai_tetap != null ? Number(s.nilai_tetap) : 0,
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
        kmTempuh: j.km_tempuh != null ? Number(j.km_tempuh) : null,
        kmEmpty: j.km_empty != null ? Number(j.km_empty) : null,
      }
    })

    // Map Kendaraan
    const vehicles: Vehicle[] = (vehRes.data || []).map((v) => ({
      cb: v.plat || v.id,
      plat: v.plat,
      aktif: v.aktif !== undefined ? Boolean(v.aktif) : true,
      rawId: v.id,
    }))

    // Map Jenis Penumpang
    let paxData: any[] = paxRes.data || []
    if (paxRes.error) {
      const p2 = await supabase.from("penumpang").select("*").order("created_at")
      if (!p2.error && p2.data) {
        paxData = p2.data
      }
    }

    const passengerTypes: JenisPenumpang[] = paxData.length > 0
      ? paxData.map((p) => ({
          id: p.id,
          nama: p.nama || p.jenis || "Umum",
          aktif: p.aktif !== undefined ? Boolean(p.aktif) : true,
          rawId: p.id,
        }))
      : (isDemo ? JENIS_PENUMPANG : [
          { id: "umum", nama: "Umum", aktif: true },
          { id: "pm", nama: "Pelajar / Mahasiswa (P/M)", aktif: true },
        ])

    return {
      segments,
      jalurList,
      vehicles,
      passengerTypes,
    }
  } catch (err) {
    console.warn("Gagal memuat master data dari Supabase:", err)
    return isDemo
      ? { segments: SEGMENTS, jalurList: JALUR, vehicles: VEHICLES, passengerTypes: JENIS_PENUMPANG }
      : { segments: [], jalurList: [], vehicles: [], passengerTypes: JENIS_PENUMPANG }
  }
}

/**
 * Mengambil daftar keberangkatan.
 * Jika isDemo = true (akun demo sopir@damri.co.id / koordinator@damri.co.id):
 *   -> Menggunakan data demo (SEED).
 * Jika isDemo = false (akun riil terdaftar):
 *   -> Mengambil dari tabel keberangkatan Supabase dengan relasi lengkap.
 */
export async function getDepartures(isDemo = false): Promise<Departure[]> {
  if (isDemo) {
    return SEED
  }

  try {
    const { data, error } = await supabase
      .from("keberangkatan")
      .select(`
        *,
        segmen:segmen_id(id, nama, kode),
        jalur:jalur_id(id, nama),
        kendaraan:kendaraan_id(id, plat),
        sopir:sopir_id(id, nama, email)
      `)
      .order("tanggal", { ascending: false })
      .order("jam", { ascending: false })

    if (error || !data) {
      console.warn("Gagal mengambil keberangkatan dari Supabase:", error)
      return []
    }

    return data.map((r: any): Departure => {
      const rawStatus = (r.status as Departure["status"]) || "draft"
      const isPerbaikan = (rawStatus === "draft" && Boolean(r.catatan_penolakan)) || Boolean(r.ditolak_at && rawStatus === "draft")
      const finalStatus: Departure["status"] = isPerbaikan ? "perbaikan" : rawStatus

      return {
        id: r.id,
        date: r.tanggal,
        time: typeof r.jam === "string" ? r.jam.slice(0, 5) : r.jam,
        segmentId: r.segmen?.kode || r.segmen_id,
        jalurId: r.jalur_id,
        jalurNama: r.jalur?.nama || undefined,
        cb: r.kendaraan?.plat || r.kendaraan_id || "D 7021 AB",
        driver: r.sopir?.nama || "Sopir",
        driverId: r.sopir?.id || r.sopir_id,
        driverEmail: r.sopir?.email,
        kmTempuh: r.km_tempuh != null ? Number(r.km_tempuh) : null,
        kmEmpty: r.km_empty != null ? Number(r.km_empty) : null,
        penumpang: r.penumpang != null ? Number(r.penumpang) : null,
        pm: r.pm != null ? Number(r.pm) : null,
        pendapatan: r.pendapatan != null ? Number(r.pendapatan) : null,
        subsidi: r.subsidi != null ? Number(r.subsidi) : null,
        bagasi: r.bagasi != null ? Number(r.bagasi) : null,
        status: finalStatus,
        rejectNote: r.catatan_penolakan || undefined,
        isRevised: Boolean(r.ditolak_at && r.status === "dikirim"),
      }
    })
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
    const cleanPlat = (d.cb || "").trim().replace(/\s+/g, " ")
    if (cleanPlat) {
      const byPlat = await supabase.from("kendaraan").select("id").ilike("plat", `%${cleanPlat}%`).limit(1)
      if (byPlat.data?.[0]?.id) return byPlat.data[0].id
    }
    const def = await supabase.from("kendaraan").select("id").limit(1)
    return def.data?.[0]?.id
  }

  // 4. Resolve Profil Sopir
  const resolveProf = async () => {
    if (d.driverId && UUID_REGEX.test(d.driverId)) {
      return d.driverId
    }
    if (driverEmail) {
      const byEmail = await supabase.from("profiles").select("id").eq("email", driverEmail).limit(1)
      if (byEmail.data?.[0]?.id) return byEmail.data[0].id
    }
    if (d.driver) {
      const byName = await supabase.from("profiles").select("id").ilike("nama", d.driver).limit(1)
      if (byName.data?.[0]?.id) return byName.data[0].id
    }
    const anySopir = await supabase.from("profiles").select("id").eq("role", "sopir").limit(1)
    if (anySopir.data?.[0]?.id) return anySopir.data[0].id
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

    let finalKmTempuh = d.kmTempuh != null && Number(d.kmTempuh) > 0 ? Number(d.kmTempuh) : null
    let finalKmEmpty = d.kmEmpty != null ? Number(d.kmEmpty) : null
    if (finalKmTempuh == null && ids.jalur_id) {
      const { data: jRow } = await supabase.from("jalur").select("km_tempuh, km_empty").eq("id", ids.jalur_id).limit(1)
      if (jRow?.[0]?.km_tempuh != null) {
        finalKmTempuh = Number(jRow[0].km_tempuh)
        if (finalKmEmpty == null) {
          finalKmEmpty = jRow[0].km_empty != null ? Number(jRow[0].km_empty) : 0
        }
      }
    }

    const isDikirim = d.status === "dikirim"
    const payload: Record<string, any> = {
      tanggal: d.date,
      jam: d.time.length === 5 ? `${d.time}:00` : d.time,
      segmen_id: ids.segmen_id,
      jalur_id: ids.jalur_id,
      kendaraan_id: ids.kendaraan_id,
      sopir_id: ids.sopir_id,
      km_tempuh: finalKmTempuh != null ? finalKmTempuh : (isDikirim ? 0 : null),
      km_empty: finalKmEmpty != null ? finalKmEmpty : (isDikirim ? 0 : null),
      penumpang: d.penumpang != null ? Number(d.penumpang) : (isDikirim ? 0 : null),
      pm: d.pm != null ? Number(d.pm) : (isDikirim ? 0 : null),
      pendapatan: d.pendapatan != null ? Number(d.pendapatan) : (isDikirim ? 0 : null),
      subsidi: d.subsidi != null ? Number(d.subsidi) : (isDikirim ? 0 : null),
      bagasi: d.bagasi != null ? Number(d.bagasi) : (isDikirim ? 0 : null),
      status: d.status,
      catatan_penolakan: d.rejectNote || null,
      dikirim_at: isDikirim ? new Date().toISOString() : null,
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

    const ruteLabel = d.jalurNama || d.jalurId || ""
    const detail = ruteLabel ? `${d.cb} (${ruteLabel} · ${d.time})` : `${d.cb} (${d.time})`

    // Catat ke audit_log
    await logAudit({
      user_nama: d.driver,
      aksi: "Tambah",
      tabel: "keberangkatan",
      record_id: newId,
      objek: `Keberangkatan · ${detail}`,
      sebelum: {},
      sesudah: { status: d.status, cb: d.cb, tanggal: d.date, rute: ruteLabel },
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
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  try {
    const isDikirim = d.status === "dikirim"

    // Jika ID bukan UUID (misal draft lokal id "d101"), insert langsung ke Supabase
    if (!UUID_REGEX.test(d.id)) {
      const createRes = await createDeparture(d, d.driverEmail)
      return createRes.success
    }

    let finalKmTempuh = d.kmTempuh != null && Number(d.kmTempuh) > 0 ? Number(d.kmTempuh) : null
    let finalKmEmpty = d.kmEmpty != null ? Number(d.kmEmpty) : null
    if (finalKmTempuh == null && d.jalurId) {
      const { data: jRow } = await supabase.from("jalur").select("km_tempuh, km_empty").eq("id", d.jalurId).limit(1)
      if (jRow?.[0]?.km_tempuh != null) {
        finalKmTempuh = Number(jRow[0].km_tempuh)
        if (finalKmEmpty == null) {
          finalKmEmpty = jRow[0].km_empty != null ? Number(jRow[0].km_empty) : 0
        }
      }
    }

    const dbStatus = d.status === "perbaikan" ? "draft" : d.status
    const payload: Record<string, any> = {
      km_tempuh: finalKmTempuh != null ? finalKmTempuh : (isDikirim ? 0 : null),
      km_empty: finalKmEmpty != null ? finalKmEmpty : (isDikirim ? 0 : null),
      penumpang: d.penumpang != null ? Number(d.penumpang) : (isDikirim ? 0 : null),
      pm: d.pm != null ? Number(d.pm) : (isDikirim ? 0 : null),
      pendapatan: d.pendapatan != null ? Number(d.pendapatan) : (isDikirim ? 0 : null),
      subsidi: d.subsidi != null ? Number(d.subsidi) : (isDikirim ? 0 : null),
      bagasi: d.bagasi != null ? Number(d.bagasi) : (isDikirim ? 0 : null),
      status: dbStatus,
      catatan_penolakan: isDikirim ? null : (d.rejectNote || null),
      updated_at: new Date().toISOString(),
    }
    if (isDikirim) {
      payload.dikirim_at = new Date().toISOString()
    }

    const { data: updatedRows, error } = await supabase
      .from("keberangkatan")
      .update(payload)
      .eq("id", d.id)
      .select("id")

    if (error) {
      if (error.code === "P0001" && error.message?.includes("sudah dikirim")) {
        return true
      }
      console.warn("Gagal update keberangkatan, mencoba createDeparture:", error)
      const createRes = await createDeparture(d, d.driverEmail)
      return createRes.success
    }

    if (!updatedRows || updatedRows.length === 0) {
      const createRes = await createDeparture(d, d.driverEmail)
      return createRes.success
    }

    try {
      const ruteLabel = d.jalurNama || d.jalurId || ""
      const detail = ruteLabel ? `${d.cb} (${ruteLabel} · ${d.time})` : `${d.cb} (${d.time})`
      await logAudit({
        user_nama: driverName || d.driver,
        aksi: isDikirim ? "Kirim" : "Ubah",
        tabel: "keberangkatan",
        record_id: d.id,
        objek: `Keberangkatan · ${detail}`,
        sebelum: {},
        sesudah: { status: d.status, cb: d.cb, rute: ruteLabel, kmTempuh: payload.km_tempuh, penumpang: payload.penumpang },
      })
    } catch {}

    return true
  } catch (err) {
    console.error("Gagal updateDeparture ke Supabase:", err)
    return false
  }
}

/**
 * Menghapus keberangkatan bertatus draft (Sopir)
 * Hanya draft yang dapat dihapus.
 */
export async function deleteDraftDeparture(
  id: string,
  userNama = "Sopir",
): Promise<boolean> {
  try {
    let detail = id
    try {
      const { data: dep } = await supabase
        .from("keberangkatan")
        .select("jam, kendaraan(plat), jalur(nama)")
        .eq("id", id)
        .maybeSingle()
      if (dep) {
        const plat = (dep as any)?.kendaraan?.plat || "Bus"
        const jNama = (dep as any)?.jalur?.nama || ""
        const jam = dep?.jam ? dep.jam.slice(0, 5) : ""
        detail = jNama ? `${plat} (${jNama} · ${jam})` : `${plat} (${jam})`
      }
    } catch {}

    const { error } = await supabase
      .from("keberangkatan")
      .delete()
      .eq("id", id)
      .eq("status", "draft")

    if (error) {
      console.error("Error delete draft keberangkatan:", error)
      return false
    }

    await logAudit({
      user_nama: userNama,
      aksi: "Hapus",
      tabel: "keberangkatan",
      record_id: id,
      objek: `Keberangkatan draft · ${detail}`,
      sebelum: { status: "draft" },
      sesudah: {},
    })

    return true
  } catch (err) {
    console.error("Gagal deleteDraftDeparture ke Supabase:", err)
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
        catatan_penolakan: null,
        ditolak_at: null,
        disetujui_at: now,
        updated_at: now,
      })
      .eq("id", id)

    if (error) {
      console.error("Error approve keberangkatan:", error)
      return false
    }

    let detail = id
    try {
      const { data: dep } = await supabase
        .from("keberangkatan")
        .select("jam, kendaraan(plat), jalur(nama)")
        .eq("id", id)
        .maybeSingle()
      if (dep) {
        const plat = (dep as any)?.kendaraan?.plat || "Bus"
        const jNama = (dep as any)?.jalur?.nama || ""
        const jam = dep?.jam ? dep.jam.slice(0, 5) : ""
        detail = jNama ? `${plat} (${jNama} · ${jam})` : `${plat} (${jam})`
      }
    } catch {}

    await logAudit({
      user_nama: coordNama,
      aksi: "Setujui",
      tabel: "keberangkatan",
      record_id: id,
      objek: `Keberangkatan · ${detail}`,
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
        disetujui_at: null,
        updated_at: now,
      })
      .eq("id", id)

    if (error) {
      console.error("Error reject keberangkatan:", error)
      return false
    }

    let detail = id
    try {
      const { data: dep } = await supabase
        .from("keberangkatan")
        .select("jam, kendaraan(plat), jalur(nama)")
        .eq("id", id)
        .maybeSingle()
      if (dep) {
        const plat = (dep as any)?.kendaraan?.plat || "Bus"
        const jNama = (dep as any)?.jalur?.nama || ""
        const jam = dep?.jam ? dep.jam.slice(0, 5) : ""
        detail = jNama ? `${plat} (${jNama} · ${jam})` : `${plat} (${jam})`
      }
    } catch {}

    await logAudit({
      user_nama: coordNama,
      aksi: "Tolak",
      tabel: "keberangkatan",
      record_id: id,
      objek: `Keberangkatan · ${detail}`,
      sebelum: { status: "dikirim" },
      sesudah: { status: "perbaikan", catatan: note },
    })

    return true
  } catch (err) {
    console.error("Gagal rejectDeparture ke Supabase:", err)
    return false
  }
}

/**
 * Mengambil riwayat Audit Log dari tabel audit_log Supabase
 * Dilengkapi dengan resolusi ID referensi (keberangkatan, rute, kendaraan, profil)
 * agar riwayat terbaca jelas oleh manusia, serta deduplikasi entri ganda dari trigger DB & client.
 */
export async function getAuditLogs(isDemo = false): Promise<AuditItem[]> {
  if (isDemo) {
    return AUDIT
  }

  try {
    const { data, error } = await supabase
      .from("audit_log")
      .select("*")
      .order("waktu", { ascending: false })
      .limit(100)

    if (error || !data) {
      return []
    }

    // 1. Ambil data referensi secara paralel untuk resolusi nama & plat
    const [
      { data: deps },
      { data: vehicles },
      { data: routes },
      { data: profs },
      { data: segs },
    ] = await Promise.all([
      supabase
        .from("keberangkatan")
        .select("id, jam, kendaraan_id, jalur_id, kendaraan(plat), jalur(nama)"),
      supabase.from("kendaraan").select("id, plat"),
      supabase.from("jalur").select("id, nama"),
      supabase.from("profiles").select("id, nama"),
      supabase.from("segmen").select("id, nama"),
    ])

    const vehicleMap = new Map((vehicles || []).map((v) => [v.id, v.plat]))
    const routeMap = new Map((routes || []).map((r) => [r.id, r.nama]))
    const profileMap = new Map((profs || []).map((p) => [p.id, p.nama]))
    const segmenMap = new Map((segs || []).map((s) => [s.id, s.nama]))

    const depMap = new Map<string, string>()
    ;(deps || []).forEach((d: any) => {
      const plat = d.kendaraan?.plat || vehicleMap.get(d.kendaraan_id) || "Bus"
      const jalur = d.jalur?.nama || routeMap.get(d.jalur_id) || ""
      const jam = d.jam ? d.jam.slice(0, 5) : ""
      const parts = [jalur, jam].filter(Boolean)
      const label = parts.length > 0 ? `${plat} (${parts.join(" · ")})` : plat
      depMap.set(d.id, label)
    })

    // 2. Deduplikasi log ganda yang tercatat bersamaan (< 4 detik) oleh client & trigger Postgres
    const deduped: typeof data = []
    for (let i = 0; i < data.length; i++) {
      const cur = data[i]
      const prev = deduped[deduped.length - 1]
      if (prev) {
        const timeDiff = Math.abs(
          new Date(cur.waktu).getTime() - new Date(prev.waktu).getTime()
        )
        const sameAction = cur.aksi === prev.aksi
        const sameUser =
          cur.user_nama === prev.user_nama ||
          cur.user_nama === "Sistem" ||
          prev.user_nama === "Sistem"
        const sameRec =
          cur.record_id && prev.record_id && cur.record_id === prev.record_id

        if (sameAction && sameUser && sameRec && timeDiff <= 4000) {
          // Gabungkan payload: utamakan detail yang lebih lengkap
          if (
            Object.keys(cur.sesudah || {}).length >
            Object.keys(prev.sesudah || {}).length
          ) {
            prev.sesudah = { ...(prev.sesudah || {}), ...(cur.sesudah || {}) }
          }
          if (
            Object.keys(cur.sebelum || {}).length >
            Object.keys(prev.sebelum || {}).length
          ) {
            prev.sebelum = { ...(prev.sebelum || {}), ...(cur.sebelum || {}) }
          }
          if (cur.user_nama !== "Sistem" && prev.user_nama === "Sistem") {
            prev.user_nama = cur.user_nama
          }
          // Jika salah satu sudah memiliki format objek deskriptif, gunakan itu
          if (
            !cur.objek.includes("-") &&
            prev.objek.match(/[0-9a-f]{8}-[0-9a-f]{4}/i)
          ) {
            prev.objek = cur.objek
          }
          continue
        }
      }
      deduped.push({ ...cur })
    }

    // Helper untuk merapikan UUID dan data foto besar pada Sebelum & Sesudah di drawer
    const sanitizePayload = (obj: Record<string, any> | null | undefined) => {
      if (!obj || typeof obj !== "object") return {}
      const cleaned: Record<string, any> = {}
      for (const [k, v] of Object.entries(obj)) {
        if (k === "foto_url" && typeof v === "string" && v.length > 100) {
          cleaned[k] = "[Foto Profil]"
        } else if (
          (k === "jalur_id" || k === "rute") &&
          typeof v === "string" &&
          routeMap.has(v)
        ) {
          cleaned["jalur"] = routeMap.get(v)
        } else if (
          k === "kendaraan_id" &&
          typeof v === "string" &&
          vehicleMap.has(v)
        ) {
          cleaned["kendaraan"] = vehicleMap.get(v)
        } else if (
          (k === "sopir_id" ||
            k === "disetujui_oleh" ||
            k === "ditolak_oleh") &&
          typeof v === "string" &&
          profileMap.has(v)
        ) {
          cleaned[k.replace("_id", "")] = profileMap.get(v)
        } else if (
          k === "segmen_id" &&
          typeof v === "string" &&
          segmenMap.has(v)
        ) {
          cleaned["segmen"] = segmenMap.get(v)
        } else {
          cleaned[k] = v
        }
      }
      return cleaned
    }

    return deduped.map((row) => {
      let objek = row.objek || `${row.tabel} #${row.record_id || ""}`.trim()
      const recId = row.record_id || ""

      // Resolusi deskripsi keberangkatan jika masih berupa UUID
      if (depMap.has(recId)) {
        objek = `Keberangkatan · ${depMap.get(recId)}`
      } else {
        const uuidMatch = objek.match(
          /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
        )
        if (uuidMatch && depMap.has(uuidMatch[0])) {
          objek = `Keberangkatan · ${depMap.get(uuidMatch[0])}`
        } else if (
          objek.toLowerCase().startsWith("keberangkatan · ") &&
          uuidMatch
        ) {
          // Fallback dari sesudah/sebelum jika data record sudah terhapus
          const ses = row.sesudah || {}
          const seb = row.sebelum || {}
          const plat =
            ses.cb ||
            seb.cb ||
            vehicleMap.get(ses.kendaraan_id || seb.kendaraan_id)
          const rute = routeMap.get(
            ses.jalur_id || seb.jalur_id || ses.rute || seb.rute
          )
          const jam = ses.jam || seb.jam
          if (plat) {
            const detail = [rute, jam ? String(jam).slice(0, 5) : ""]
              .filter(Boolean)
              .join(" · ")
            objek = `Keberangkatan · ${plat}${detail ? ` (${detail})` : ""}`
          }
        }
      }

      // Resolusi nama profil jika tabel profiles
      if (row.tabel === "profiles" && profileMap.has(recId)) {
        objek = `Profil · ${profileMap.get(recId)}`
      } else if (row.tabel === "kendaraan" && vehicleMap.has(recId)) {
        objek = `Kendaraan · ${vehicleMap.get(recId)}`
      } else if (row.tabel === "jalur" && routeMap.has(recId)) {
        objek = `Jalur · ${routeMap.get(recId)}`
      }

      return {
        id: row.id,
        t: formatAuditTime(row.waktu),
        rawTime: row.waktu,
        u: row.user_nama || "Sistem",
        a: row.aksi,
        o: objek,
        before: sanitizePayload(row.sebelum),
        after: sanitizePayload(row.sesudah),
      }
    })
  } catch (err) {
    console.warn("Gagal mengambil audit log dari Supabase:", err)
    return []
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
