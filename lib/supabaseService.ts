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
  return {
    segments: SEGMENTS,
    jalurList: JALUR,
    vehicles: VEHICLES,
    passengerTypes: JENIS_PENUMPANG,
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
      jalurNama: r.jalur_nama || undefined,
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

    const vehDisplay = d.cb && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(d.cb) ? d.cb : "Bus"
    const jalurDisplay = d.jalurNama && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(d.jalurNama)
      ? d.jalurNama
      : (d.jalurId && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(d.jalurId) ? d.jalurId : "")

    const objek = `Keberangkatan · ${vehDisplay}${jalurDisplay ? ` (${jalurDisplay})` : ""}`

    // Catat ke audit_log
    await logAudit({
      user_nama: d.driver,
      aksi: "Tambah",
      tabel: "keberangkatan",
      record_id: newId,
      objek,
      sebelum: {},
      sesudah: { status: d.status, cb: d.cb, tanggal: d.date, rute: jalurDisplay || d.jalurId },
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

    const vehDisplay = d.cb && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(d.cb) ? d.cb : "Bus"
    const jalurDisplay = d.jalurNama && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(d.jalurNama)
      ? d.jalurNama
      : (d.jalurId && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(d.jalurId) ? d.jalurId : "")

    const objek = `Keberangkatan · ${vehDisplay}${jalurDisplay ? ` (${jalurDisplay})` : ""}`

    await logAudit({
      user_nama: driverName || d.driver,
      aksi: d.status === "dikirim" ? "Kirim" : "Ubah",
      tabel: "keberangkatan",
      record_id: d.id,
      objek,
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
  depObj?: Departure,
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

    let vehDisplay = "Bus"
    let jalurDisplay = ""
    if (depObj) {
      vehDisplay = depObj.cb && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(depObj.cb) ? depObj.cb : "Bus"
      jalurDisplay = depObj.jalurNama && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(depObj.jalurNama)
        ? depObj.jalurNama
        : (depObj.jalurId && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(depObj.jalurId) ? depObj.jalurId : "")
    }

    const objek = `Keberangkatan · ${vehDisplay}${jalurDisplay ? ` (${jalurDisplay})` : ""}`

    await logAudit({
      user_nama: coordNama,
      aksi: "Setujui",
      tabel: "keberangkatan",
      record_id: id,
      objek,
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
  depObj?: Departure,
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

    let vehDisplay = "Bus"
    let jalurDisplay = ""
    if (depObj) {
      vehDisplay = depObj.cb && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(depObj.cb) ? depObj.cb : "Bus"
      jalurDisplay = depObj.jalurNama && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(depObj.jalurNama)
        ? depObj.jalurNama
        : (depObj.jalurId && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(depObj.jalurId) ? depObj.jalurId : "")
    }

    const objek = `Keberangkatan · ${vehDisplay}${jalurDisplay ? ` (${jalurDisplay})` : ""}`

    await logAudit({
      user_nama: coordNama,
      aksi: "Tolak",
      tabel: "keberangkatan",
      record_id: id,
      objek,
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
      .limit(200)

    if (error || !data || data.length === 0) {
      return AUDIT
    }

    // 1. Ambil data keberangkatan aktif untuk pemetaan UUID -> (Plat / CB & Nama Rute)
    const depMap = new Map<string, { cb: string; jalur: string }>()
    try {
      const { data: depList } = await supabase
        .from("v_keberangkatan")
        .select("id, cb, jalur_nama")
        .limit(200)

      if (depList) {
        for (const item of depList) {
          if (item.id) {
            depMap.set(item.id.toLowerCase(), {
              cb: item.cb || "Bus",
              jalur: item.jalur_nama || "",
            })
          }
        }
      }
    } catch {}

    // Tambahkan data demo/seed ke depMap
    for (const s of SEED) {
      depMap.set(s.id.toLowerCase(), {
        cb: s.cb,
        jalur: s.jalurNama || s.jalurId,
      })
    }

    // 2. Kumpulkan pemetaan dari entri audit yang sudah memiliki label jelas
    for (const row of data) {
      const recId = (row.record_id || "").toLowerCase()
      const obj = row.objek || ""
      const isDescriptive =
        obj.toLowerCase().includes("keberangkatan") &&
        !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(obj.replace(/^[a-z]+\s*·\s*/i, ""))

      if (recId && isDescriptive) {
        const cleanAfterPrefix = obj.replace(/^keberangkatan\s*·\s*/i, "")
        const parts = cleanAfterPrefix.split("(")
        const cb = parts[0].trim()
        const jalur = parts[1] ? parts[1].replace(/\)$/, "").trim() : ""
        depMap.set(recId, { cb: cb || "Bus", jalur })
      }
    }

    // Helper untuk mengubah objek kode/UUID menjadi nama yang sinkron dengan master data
    const resolveObjek = (row: typeof data[0]): string => {
      let obj = (row.objek || "").trim()
      const rawMatch = obj.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
      const uuid = rawMatch ? rawMatch[0].toLowerCase() : (row.record_id || "").toLowerCase()

      if (uuid && (obj.toLowerCase().startsWith("keberangkatan") || rawMatch)) {
        if (depMap.has(uuid)) {
          const info = depMap.get(uuid)!
          return `Keberangkatan · ${info.cb}${info.jalur ? ` (${info.jalur})` : ""}`
        }
        if (row.sesudah?.cb || row.sesudah?.plat || row.sebelum?.cb) {
          const cb = row.sesudah?.cb || row.sesudah?.plat || row.sebelum?.cb || "Bus"
          const rute = row.sesudah?.rute || row.sesudah?.jalur || ""
          return `Keberangkatan · ${cb}${rute ? ` (${rute})` : ""}`
        }
        // Cari pasangan entri di waktu yang sama yang memiliki deskripsi jelas
        const pair = data.find(
          (other) =>
            other.id !== row.id &&
            other.waktu &&
            row.waktu &&
            other.waktu.slice(0, 16) === row.waktu.slice(0, 16) &&
            other.objek &&
            !/[0-9a-f]{8}-[0-9a-f]{4}/i.test(other.objek) &&
            other.objek.toLowerCase().includes("keberangkatan"),
        )
        if (pair && pair.objek) {
          return pair.objek
        }
        return "Keberangkatan · Bus Operasional"
      }

      if (!obj) {
        return `${row.tabel || "Data"} #${row.record_id || ""}`.trim()
      }
      return obj
    }

    // 3. Bersihkan duplikasi antara database trigger dan client log
    const seen = new Map<string, typeof data[0] & { resolvedObjek: string }>()
    for (const row of data) {
      const resolved = resolveObjek(row)
      const minuteKey = row.waktu ? row.waktu.slice(0, 16) : ""
      const actionKey = (row.aksi || "").trim().toLowerCase()
      const rawMatch = (row.objek || "").match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
      const uuidKey = rawMatch ? rawMatch[0].toLowerCase() : (row.record_id || "").toLowerCase()

      // Buat dedupKey terpadu
      const dedupKey = uuidKey
        ? `${uuidKey}_${actionKey}_${minuteKey}`
        : `${resolved}_${actionKey}_${minuteKey}`

      if (!seen.has(dedupKey)) {
        seen.set(dedupKey, { ...row, resolvedObjek: resolved })
      } else {
        const existing = seen.get(dedupKey)!
        const isBetter =
          (row.objek && !/[0-9a-f]{8}-[0-9a-f]{4}/i.test(row.objek)) ||
          Object.keys(row.sesudah || {}).length > Object.keys(existing.sesudah || {}).length
        if (isBetter) {
          seen.set(dedupKey, { ...row, resolvedObjek: resolved })
        }
      }
    }

    const uniqueRows = Array.from(seen.values())

    return uniqueRows.map((row) => ({
      id: row.id,
      t: formatAuditTime(row.waktu),
      rawTime: row.waktu,
      u: row.user_nama || "Sistem",
      a: row.aksi,
      o: row.resolvedObjek,
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
