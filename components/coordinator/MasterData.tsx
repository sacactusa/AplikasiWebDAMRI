"use client"

import { useState, useEffect } from "react"
import { Lock, Plus, ChevronDown, Pencil, Eye, EyeOff, Trash2, LoaderCircle } from "lucide-react"
import type { Segment, Jalur, Vehicle, JenisPenumpang } from "@/lib/data"
import { SEGMENTS, JALUR, VEHICLES, JENIS_PENUMPANG, TODAY, rupiah, jalur, seg, fmtDate } from "@/lib/data"
import { Btn, Dialog, Field, cx, inputCls } from "@/components/ui"
import { Title, th, td, tableWrap } from "./shared"
import { getMasterData, logAudit } from "@/lib/supabaseService"
import { supabase } from "@/lib/supabase"

interface Props {
  toast: (t: string) => void
  currentUser?: { nama: string; email: string; id?: string } | null
}
interface Tarif {
  id?: string
  jalurId: string
  tarif: number
  mulai: string
  jenisPenumpangId?: string
  jenisPenumpangNama?: string
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const getTodayReal = () => {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export default function MasterData({ toast, currentUser }: Props) {
  const isDemo = currentUser?.email === "koordinator@damri.co.id"
  const [tab, setTab] = useState<"Segmen" | "Jalur" | "Tarif" | "Kendaraan" | "Penumpang">(
    "Segmen",
  )
  const [q, setQ] = useState("")
  const [segs, setSegs] = useState<Segment[]>(isDemo ? SEGMENTS : [])
  const [jals, setJals] = useState<Jalur[]>(isDemo ? JALUR : [])
  const [vehs, setVehs] = useState<Vehicle[]>(isDemo ? VEHICLES : [])
  const [paxs, setPaxs] = useState<JenisPenumpang[]>(isDemo ? JENIS_PENUMPANG : [])
  const [tarifs, setTarifs] = useState<Tarif[]>(
    isDemo
      ? [
          ...JALUR.filter((j) => j.tarif).map((j) => ({
            jalurId: j.id,
            tarif: j.tarif,
            mulai: "2026-10-01",
            jenisPenumpangId: "umum",
            jenisPenumpangNama: "Umum",
          })),
          { jalurId: "j1", tarif: 140000, mulai: "2026-01-01", jenisPenumpangId: "umum", jenisPenumpangNama: "Umum" },
          { jalurId: "j2", tarif: 150000, mulai: "2026-01-01", jenisPenumpangId: "umum", jenisPenumpangNama: "Umum" },
          { jalurId: "j5", tarif: 80000, mulai: "2025-07-01", jenisPenumpangId: "umum", jenisPenumpangNama: "Umum" },
        ]
      : [],
  )
  const [loading, setLoading] = useState(!isDemo)

  useEffect(() => {
    if (isDemo) return

    setLoading(true)
    Promise.all([
      getMasterData(false).then((m) => {
        setSegs(m.segments || [])
        setJals(m.jalurList || [])
        setVehs(m.vehicles || [])
        setPaxs(m.passengerTypes || [])
      }),
      supabase
        .from("tarif_jalur")
        .select("*")
        .order("berlaku_mulai", { ascending: false })
        .then(({ data, error }) => {
          if (!error && data) {
            setTarifs(
              data.map((t: any) => ({
                id: t.id,
                jalurId: t.jalur_id,
                tarif: Number(t.tarif),
                mulai: t.berlaku_mulai,
                jenisPenumpangId: t.jenis_penumpang_id || t.penumpang_id || "",
                jenisPenumpangNama: t.jenis_penumpang || "",
              })),
            )
          } else if (!error) {
            setTarifs([])
          }
        }),
    ]).finally(() => {
      setLoading(false)
    })
  }, [isDemo])
  const [form, setForm] = useState<null | Record<string, string>>(null)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "Segmen" | "Jalur" | "Tarif" | "Kendaraan" | "Penumpang"
    id: string
    name: string
    extra?: any
  } | null>(null)
  const f = (k: string) => form?.[k] ?? ""
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))
  const has = (s: string) => s.toLowerCase().includes(q.toLowerCase())
  const userNama = currentUser?.nama || "Koordinator"

  const toggle = async <T extends { id?: string; plat?: string; nama?: string; aktif: boolean },>(
    arr: T[],
    set_: (a: T[]) => void,
    target: T | number,
  ) => {
    const item = typeof target === "number" ? arr[target] : target
    const nextAktif = !item.aktif
    set_(
      arr.map((x) =>
        x === item || (x.id && item.id && x.id === item.id) || (x.plat && item.plat && x.plat === item.plat) || (x.nama && item.nama && x.nama === item.nama)
          ? { ...x, aktif: nextAktif }
          : x,
      ),
    )
    toast(item.aktif ? "Dinonaktifkan" : "Diaktifkan kembali")

    if (isDemo) return

    try {
      if (tab === "Segmen") {
        const segItem = item as unknown as { id: string; nama: string; rawId?: string }
        let q
        if (segItem.rawId && UUID_REGEX.test(segItem.rawId)) {
          q = supabase.from("segmen").update({ aktif: nextAktif }).eq("id", segItem.rawId)
        } else if (UUID_REGEX.test(segItem.id)) {
          q = supabase.from("segmen").update({ aktif: nextAktif }).eq("id", segItem.id)
        } else {
          q = supabase.from("segmen").update({ aktif: nextAktif }).eq("kode", segItem.id)
        }
        await q
        await logAudit({
          user_nama: userNama,
          aksi: nextAktif ? "Aktifkan" : "Nonaktifkan",
          tabel: "segmen",
          objek: `segmen · ${segItem.nama}`,
          sebelum: { aktif: item.aktif },
          sesudah: { aktif: nextAktif },
        })
      } else if (tab === "Jalur") {
        const jalItem = item as unknown as { id: string; nama: string }
        await supabase.from("jalur").update({ aktif: nextAktif }).eq("id", jalItem.id)
        await logAudit({
          user_nama: userNama,
          aksi: nextAktif ? "Aktifkan" : "Nonaktifkan",
          tabel: "jalur",
          objek: `jalur · ${jalItem.nama}`,
          sebelum: { aktif: item.aktif },
          sesudah: { aktif: nextAktif },
        })
      } else if (tab === "Kendaraan") {
        const vehItem = item as unknown as { cb: string; plat: string }
        const platVal = vehItem.plat || vehItem.cb
        await supabase.from("kendaraan").update({ aktif: nextAktif }).or(`plat.eq.${platVal},id.eq.${platVal}`)
        await logAudit({
          user_nama: userNama,
          aksi: nextAktif ? "Aktifkan" : "Nonaktifkan",
          tabel: "kendaraan",
          objek: `kendaraan · ${platVal}`,
          sebelum: { aktif: item.aktif },
          sesudah: { aktif: nextAktif },
        })
      } else if (tab === "Penumpang") {
        const paxItem = item as unknown as { id: string; nama: string; rawId?: string }
        let q
        if (paxItem.rawId && UUID_REGEX.test(paxItem.rawId)) {
          q = supabase.from("jenis_penumpang").update({ aktif: nextAktif, updated_at: new Date().toISOString() }).eq("id", paxItem.rawId)
        } else if (UUID_REGEX.test(paxItem.id)) {
          q = supabase.from("jenis_penumpang").update({ aktif: nextAktif, updated_at: new Date().toISOString() }).eq("id", paxItem.id)
        } else {
          q = supabase.from("jenis_penumpang").update({ aktif: nextAktif, updated_at: new Date().toISOString() }).ilike("nama", `%${paxItem.nama}%`)
        }
        await q
        await logAudit({
          user_nama: userNama,
          aksi: nextAktif ? "Aktifkan" : "Nonaktifkan",
          tabel: "jenis_penumpang",
          objek: `penumpang · ${paxItem.nama}`,
          sebelum: { aktif: item.aktif },
          sesudah: { aktif: nextAktif },
        })
      }
    } catch (err) {
      console.warn("Gagal sinkron toggle master data ke Supabase:", err)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const target = deleteTarget

    if (isDemo) {
      if (target.type === "Segmen") setSegs((p) => p.filter((s) => s.id !== target.id))
      else if (target.type === "Jalur") setJals((p) => p.filter((j) => j.id !== target.id))
      else if (target.type === "Kendaraan") setVehs((p) => p.filter((v) => v.cb !== target.id))
      else if (target.type === "Penumpang") setPaxs((p) => p.filter((x) => x.id !== target.id))
      else if (target.type === "Tarif") {
        setTarifs((p) =>
          target.extra?.id
            ? p.filter((t) => t.id !== target.extra.id)
            : p.filter((_, idx) => idx !== target.extra?.index),
        )
      }
      toast(`${target.type} '${target.name}' berhasil dihapus`)
      setDeleteTarget(null)
      return
    }

    try {
      if (target.type === "Segmen") {
        let q
        if (target.extra?.rawId && UUID_REGEX.test(target.extra.rawId)) {
          q = supabase.from("segmen").delete().eq("id", target.extra.rawId)
        } else if (UUID_REGEX.test(target.id)) {
          q = supabase.from("segmen").delete().eq("id", target.id)
        } else {
          q = supabase.from("segmen").delete().eq("kode", target.id)
        }
        const { error } = await q

        if (error) {
          if (error.code === "23503") {
            toast(
              `Gagal menghapus: Segmen '${target.name}' masih terhubung dengan data jalur operasional. Silakan nonaktifkan saja.`,
            )
          } else {
            toast(`Gagal menghapus segmen: ${error.message}`)
          }
          setDeleteTarget(null)
          return
        }

        setSegs((p) => p.filter((s) => s.id !== target.id))
        toast(`Segmen '${target.name}' berhasil dihapus permanen`)
        await logAudit({
          user_nama: userNama,
          aksi: "Hapus",
          tabel: "segmen",
          objek: `segmen · ${target.name}`,
          sebelum: { id: target.id, nama: target.name },
          sesudah: {},
        })
      } else if (target.type === "Jalur") {
        const { error } = await supabase
          .from("jalur")
          .delete()
          .eq("id", target.id)

        if (error) {
          if (error.code === "23503") {
            toast(
              `Gagal menghapus: Jalur '${target.name}' memiliki riwayat perjalanan atau tarif. Silakan nonaktifkan saja.`,
            )
          } else {
            toast(`Gagal menghapus jalur: ${error.message}`)
          }
          setDeleteTarget(null)
          return
        }

        setJals((p) => p.filter((j) => j.id !== target.id))
        toast(`Jalur '${target.name}' berhasil dihapus permanen`)
        await logAudit({
          user_nama: userNama,
          aksi: "Hapus",
          tabel: "jalur",
          objek: `jalur · ${target.name}`,
          sebelum: { id: target.id, nama: target.name },
          sesudah: {},
        })
      } else if (target.type === "Kendaraan") {
        const { error } = await supabase
          .from("kendaraan")
          .delete()
          .or(`plat.eq.${target.id},id.eq.${target.id}`)

        if (error) {
          if (error.code === "23503") {
            toast(
              `Gagal menghapus: Kendaraan '${target.name}' memiliki riwayat laporan perjalanan. Silakan nonaktifkan saja.`,
            )
          } else {
            toast(`Gagal menghapus kendaraan: ${error.message}`)
          }
          setDeleteTarget(null)
          return
        }

        setVehs((p) => p.filter((v) => v.cb !== target.id && v.plat !== target.id))
        toast(`Kendaraan '${target.name}' berhasil dihapus permanen`)
        await logAudit({
          user_nama: userNama,
          aksi: "Hapus",
          tabel: "kendaraan",
          objek: `kendaraan · ${target.name}`,
          sebelum: { plat: target.id },
          sesudah: {},
        })
      } else if (target.type === "Tarif") {
        const query =
          target.extra?.id && UUID_REGEX.test(target.extra.id)
            ? supabase.from("tarif_jalur").delete().eq("id", target.extra.id)
            : supabase
                .from("tarif_jalur")
                .delete()
                .match({ jalur_id: target.id, berlaku_mulai: target.extra?.mulai })
        const { error } = await query

        if (error) {
          toast(`Gagal menghapus tarif: ${error.message}`)
          setDeleteTarget(null)
          return
        }

        setTarifs((p) =>
          target.extra?.id
            ? p.filter((t) => t.id !== target.extra.id)
            : p.filter((_, idx) => idx !== target.extra?.index),
        )
        toast(`Tarif '${target.name}' berhasil dihapus permanen`)
        await logAudit({
          user_nama: userNama,
          aksi: "Hapus",
          tabel: "tarif_jalur",
          objek: `tarif · ${target.name}`,
          sebelum: { jalur: target.id, mulai: target.extra?.mulai },
          sesudah: {},
        })
      } else if (target.type === "Penumpang") {
        let q
        if (UUID_REGEX.test(target.id)) {
          q = supabase.from("jenis_penumpang").delete().eq("id", target.id)
        } else {
          q = supabase.from("jenis_penumpang").delete().ilike("nama", `%${target.name}%`)
        }
        const { error } = await q
        if (error) {
          toast(`Gagal menghapus jenis penumpang: ${error.message}`)
          setDeleteTarget(null)
          return
        }

        setPaxs((p) => p.filter((x) => x.id !== target.id && x.nama !== target.name))
        toast(`Jenis penumpang '${target.name}' berhasil dihapus permanen`)
        await logAudit({
          user_nama: userNama,
          aksi: "Hapus",
          tabel: "jenis_penumpang",
          objek: `penumpang · ${target.name}`,
          sebelum: { id: target.id, nama: target.name },
          sesudah: {},
        })
      }
    } catch (err) {
      console.warn("Gagal hapus data master di Supabase:", err)
      if (target.type === "Segmen") setSegs((p) => p.filter((s) => s.id !== target.id))
      else if (target.type === "Jalur") setJals((p) => p.filter((j) => j.id !== target.id))
      else if (target.type === "Kendaraan") setVehs((p) => p.filter((v) => v.cb !== target.id))
      else if (target.type === "Penumpang") setPaxs((p) => p.filter((x) => x.id !== target.id))
      else if (target.type === "Tarif") {
        setTarifs((p) =>
          target.extra?.id
            ? p.filter((t) => t.id !== target.extra.id)
            : p.filter((_, idx) => idx !== target.extra?.index),
        )
      }
      toast(`${target.type} '${target.name}' dihapus`)
    }
    setDeleteTarget(null)
  }

  const save = async () => {
    if (tab === "Segmen") {
      const nama = f("nama").trim()
      const isAktif = f("aktif") !== "tidak"
      const editId = f("id")
      const editRawId = f("rawId")
      const kode = (f("kode") || editId || nama.toLowerCase().replace(/\s+/g, "-")).trim()

      if (!nama) {
        toast("Nama segmen wajib diisi")
        return
      }

      if (isDemo) {
        if (editId) {
          setSegs((p) =>
            p.map((x) =>
              x.id === editId || (editRawId && x.rawId === editRawId)
                ? { ...x, nama, aktif: isAktif }
                : x,
            ),
          )
        } else {
          setSegs((p) => [...p, { id: kode, nama, kontrak: false, aktif: isAktif }])
        }
        setForm(null)
        toast("Segmen berhasil disimpan")
        return
      }

      try {
        let savedRawId = editRawId
        if (editId) {
          let updErr = null
          if (editRawId && UUID_REGEX.test(editRawId)) {
            const res = await supabase.from("segmen").update({
              nama,
              aktif: isAktif,
            }).eq("id", editRawId)
            updErr = res.error
          } else if (UUID_REGEX.test(editId)) {
            const res = await supabase.from("segmen").update({
              nama,
              aktif: isAktif,
            }).eq("id", editId)
            updErr = res.error
          } else {
            const res = await supabase.from("segmen").update({
              nama,
              aktif: isAktif,
            }).eq("kode", editId)
            updErr = res.error
          }

          if (updErr) {
            console.error("Gagal update segmen di Supabase:", updErr)
            toast(`Gagal mengubah segmen: ${updErr.message}`)
            return
          }

          setSegs((p) =>
            p.map((x) =>
              x.id === editId || (editRawId && x.rawId === editRawId)
                ? { ...x, nama, aktif: isAktif }
                : x,
            ),
          )
        } else {
          const { data: insData, error: insErr } = await supabase
            .from("segmen")
            .insert({
              kode,
              nama,
              aktif: isAktif,
            })
            .select("id")
            .single()

          if (insErr) {
            console.error("Gagal tambah segmen di Supabase:", insErr)
            toast(`Gagal menambah segmen: ${insErr.message}`)
            return
          }

          savedRawId = insData?.id
          setSegs((p) => [
            ...p,
            { id: kode, rawId: savedRawId, nama, kontrak: false, aktif: isAktif },
          ])
        }

        setForm(null)
        toast("Segmen berhasil disimpan")

        await logAudit({
          user_nama: userNama,
          aksi: editId ? "Ubah" : "Tambah",
          tabel: "segmen",
          objek: `segmen · ${nama}`,
          sebelum: {},
          sesudah: { nama, aktif: isAktif },
        })
      } catch (err: any) {
        console.error("Gagal simpan segmen ke Supabase:", err)
        toast(`Gagal simpan segmen: ${err?.message || "Terjadi kendala jaringan"}`)
      }
      return
    }

    if (tab === "Jalur") {
      const asal = f("asal").trim()
      const tujuan = f("tujuan").trim()
      const nama = asal && tujuan ? `${asal} - ${tujuan}` : (f("nama") || asal || tujuan).trim()
      const segmentKode = f("segmentId") || segs[0]?.id || ""

      if (!nama) {
        toast("Titik asal dan tujuan jalur wajib diisi")
        return
      }

      if (isDemo) {
        if (f("id")) {
          setJals((p) =>
            p.map((x) =>
              x.id === f("id") ? { ...x, nama, segmentId: segmentKode } : x,
            ),
          )
        } else {
          setJals((p) => [
            ...p,
            {
              id: "j_" + Date.now(),
              nama,
              segmentId: segmentKode,
              tarif: 0,
              aktif: true,
            },
          ])
        }
        setForm(null)
        toast("Jalur berhasil disimpan")
        return
      }

      try {
        let segId: string | undefined
        const segObj = segs.find((s) => s.id === segmentKode)
        if (segObj?.rawId && UUID_REGEX.test(segObj.rawId)) {
          segId = segObj.rawId
        } else if (UUID_REGEX.test(segmentKode)) {
          segId = segmentKode
        } else if (segmentKode) {
          const { data: segRow } = await supabase
            .from("segmen")
            .select("id")
            .eq("kode", segmentKode)
            .limit(1)
          segId = segRow?.[0]?.id
        }

        if (!segId) {
          const { data: firstSeg } = await supabase
            .from("segmen")
            .select("id")
            .limit(1)
          segId = firstSeg?.[0]?.id
        }

        if (!segId) {
          toast("Gagal: Belum ada Segmen di database. Silakan buat Segmen terlebih dahulu.")
          return
        }

        if (f("id")) {
          const { error: updErr } = await supabase
            .from("jalur")
            .update({ nama, segmen_id: segId })
            .eq("id", f("id"))

          if (updErr) {
            console.error("Gagal update jalur di Supabase:", updErr)
            toast(`Gagal mengubah jalur: ${updErr.message}`)
            return
          }

          setJals((p) =>
            p.map((x) =>
              x.id === f("id") ? { ...x, nama, segmentId: segmentKode } : x,
            ),
          )
        } else {
          const { data: ins, error: insErr } = await supabase
            .from("jalur")
            .insert({ nama, segmen_id: segId, aktif: true })
            .select()

          if (insErr || !ins?.[0]) {
            console.error("Gagal tambah jalur ke Supabase:", insErr)
            toast(`Gagal menyimpan jalur: ${insErr?.message || "Terjadi kesalahan"}`)
            return
          }

          const newJalurId = ins[0].id

          setJals((p) => [
            ...p,
            {
              id: newJalurId,
              nama,
              segmentId: segmentKode,
              tarif: 0,
              aktif: true,
            },
          ])
        }

        await logAudit({
          user_nama: userNama,
          aksi: f("id") ? "Ubah" : "Tambah",
          tabel: "jalur",
          objek: `jalur · ${nama}`,
          sebelum: {},
          sesudah: { nama, segmentKode },
        })

        setForm(null)
        toast("Jalur berhasil disimpan ke database")
        return
      } catch (err: any) {
        console.error("Gagal simpan jalur ke Supabase:", err)
        toast(`Gagal menyimpan jalur: ${err?.message || "Terjadi kesalahan"}`)
        return
      }
    }

    if (tab === "Kendaraan") {
      const plat = f("plat").trim()
      const editId = f("id")
      if (editId) {
        setVehs((p) => p.map((x) => x.cb === editId || x.plat === editId ? { ...x, plat, cb: plat } : x))
        if (!isDemo) {
          supabase.from("kendaraan").update({ plat }).or(`plat.eq.${editId},id.eq.${editId}`).then(() => {})
        }
      } else {
        setVehs((p) => [...p, { cb: plat, plat, aktif: true }])
        if (!isDemo) {
          supabase.from("kendaraan").insert({ plat, aktif: true }).then(() => {})
        }
      }
      setForm(null)
      toast("Kendaraan berhasil disimpan")
      if (isDemo) return

      logAudit({
        user_nama: userNama,
        aksi: editId ? "Ubah" : "Tambah",
        tabel: "kendaraan",
        objek: `kendaraan · ${plat}`,
        sebelum: {},
        sesudah: { plat }
      })
      return
    }

    if (tab === "Tarif") {
      const jalurId = f("jalurId")
      const tarif = Number(f("tarif").replace(/\D/g, ""))
      const mulai = f("mulai") || getTodayReal()
      const jenisPenumpangId =
        f("jenisPenumpangId") || paxs.find((p) => p.aktif)?.id || paxs[0]?.id || ""
      const matchedPax = paxs.find((p) => p.id === jenisPenumpangId)
      const jenisPenumpangNama = matchedPax?.nama || "Umum"
      const editId = f("id")
      const prevJalurId = f("prevJalurId")
      const prevMulai = f("prevMulai")

      if (!jalurId) {
        toast("Silakan pilih jalur terlebih dahulu")
        return
      }
      if (!tarif || isNaN(tarif)) {
        toast("Silakan isi nominal tarif")
        return
      }

      if (isDemo) {
        if (editId || prevJalurId) {
          setTarifs((p) =>
            p.map((t) =>
              (editId && t.id === editId) ||
              (!editId && t.jalurId === prevJalurId && t.mulai === prevMulai)
                ? { ...t, jalurId, tarif, mulai, jenisPenumpangId, jenisPenumpangNama }
                : t,
            ),
          )
        } else {
          setTarifs((p) => [
            { id: "t_" + Date.now(), jalurId, tarif, mulai, jenisPenumpangId, jenisPenumpangNama },
            ...p,
          ])
        }
        setJals((p) => p.map((j) => (j.id === jalurId ? { ...j, tarif } : j)))
        setForm(null)
        toast("Tarif berhasil disimpan")
        return
      }

      try {
        let resolvedJalurId = jalurId
        if (!UUID_REGEX.test(jalurId)) {
          const { data: jRow } = await supabase
            .from("jalur")
            .select("id")
            .eq("nama", jalurId)
            .limit(1)
          if (jRow?.[0]?.id) resolvedJalurId = jRow[0].id
        }

        const payloadWithPax: any = {
          jalur_id: resolvedJalurId,
          tarif,
          berlaku_mulai: mulai,
        }
        if (UUID_REGEX.test(jenisPenumpangId)) {
          payloadWithPax.jenis_penumpang_id = jenisPenumpangId
        } else if (jenisPenumpangNama) {
          payloadWithPax.jenis_penumpang = jenisPenumpangNama
        }

        const basicPayload = {
          jalur_id: resolvedJalurId,
          tarif,
          berlaku_mulai: mulai,
        }

        if (editId && UUID_REGEX.test(editId)) {
          let { error: updErr } = await supabase
            .from("tarif_jalur")
            .update(payloadWithPax)
            .eq("id", editId)

          if (updErr && (updErr.code === "PGRST204" || updErr.message?.includes("jenis_penumpang"))) {
            const fallback = await supabase
              .from("tarif_jalur")
              .update(basicPayload)
              .eq("id", editId)
            updErr = fallback.error
          }

          if (updErr) {
            console.error("Gagal update tarif ke Supabase:", updErr)
            toast(`Gagal mengubah tarif: ${updErr.message}`)
            return
          }

          setTarifs((p) =>
            p.map((t) =>
              t.id === editId
                ? { ...t, jalurId: resolvedJalurId, tarif, mulai, jenisPenumpangId, jenisPenumpangNama }
                : t,
            ),
          )
        } else if (prevJalurId) {
          let { error: updErr } = await supabase
            .from("tarif_jalur")
            .update(payloadWithPax)
            .match({ jalur_id: prevJalurId, berlaku_mulai: prevMulai })

          if (updErr && (updErr.code === "PGRST204" || updErr.message?.includes("jenis_penumpang"))) {
            const fallback = await supabase
              .from("tarif_jalur")
              .update(basicPayload)
              .match({ jalur_id: prevJalurId, berlaku_mulai: prevMulai })
            updErr = fallback.error
          }

          if (updErr) {
            console.error("Gagal update tarif ke Supabase:", updErr)
            toast(`Gagal mengubah tarif: ${updErr.message}`)
            return
          }

          setTarifs((p) =>
            p.map((t) =>
              t.jalurId === prevJalurId && t.mulai === prevMulai
                ? { ...t, jalurId: resolvedJalurId, tarif, mulai, jenisPenumpangId, jenisPenumpangNama }
                : t,
            ),
          )
        } else {
          let { data: insData, error: tarErr } = await supabase
            .from("tarif_jalur")
            .insert(payloadWithPax)
            .select()

          if (tarErr && (tarErr.code === "PGRST204" || tarErr.message?.includes("jenis_penumpang"))) {
            const fallback = await supabase
              .from("tarif_jalur")
              .insert(basicPayload)
              .select()
            insData = fallback.data
            tarErr = fallback.error
          }

          if (tarErr) {
            console.error("Gagal simpan tarif ke Supabase:", tarErr)
            toast(`Gagal simpan tarif: ${tarErr.message}`)
            return
          }

          const newTarId = insData?.[0]?.id
          setTarifs((p) => [
            { id: newTarId, jalurId: resolvedJalurId, tarif, mulai, jenisPenumpangId, jenisPenumpangNama },
            ...p,
          ])
        }

        setJals((p) => p.map((j) => (j.id === resolvedJalurId ? { ...j, tarif } : j)))
        setForm(null)
        toast("Tarif berhasil disimpan ke database")

        await logAudit({
          user_nama: userNama,
          aksi: editId || prevJalurId ? "Ubah" : "Tambah",
          tabel: "tarif_jalur",
          objek: `tarif · ${resolvedJalurId} (${jenisPenumpangNama})`,
          sebelum: {},
          sesudah: { tarif, berlaku_mulai: mulai, jenis_penumpang: jenisPenumpangNama },
        })
      } catch (err: any) {
        console.error("Gagal simpan tarif ke Supabase:", err)
        toast(`Gagal simpan tarif: ${err?.message || "Terjadi kesalahan"}`)
      }
      return
    }

    if (tab === "Penumpang") {
      const nama = f("nama").trim()
      const isAktif = f("aktif") !== "tidak"
      const editId = f("id")

      if (!nama) {
        toast("Jenis penumpang wajib diisi")
        return
      }

      if (isDemo) {
        if (editId) {
          setPaxs((p) =>
            p.map((x) =>
              x.id === editId ? { ...x, nama, aktif: isAktif } : x,
            ),
          )
        } else {
          setPaxs((p) => [...p, { id: "pax_" + Date.now(), nama, aktif: isAktif }])
        }
        setForm(null)
        toast("Jenis penumpang berhasil disimpan")
        return
      }

      try {
        if (editId && UUID_REGEX.test(editId)) {
          const { error: updErr } = await supabase
            .from("jenis_penumpang")
            .update({ nama, aktif: isAktif, updated_at: new Date().toISOString() })
            .eq("id", editId)
          if (updErr) {
            console.error("Gagal update jenis penumpang:", updErr)
            toast(`Gagal mengubah data: ${updErr.message}`)
            return
          }
          setPaxs((p) =>
            p.map((x) => (x.id === editId ? { ...x, nama, aktif: isAktif } : x)),
          )
        } else if (editId) {
          const { error: updErr } = await supabase
            .from("jenis_penumpang")
            .update({ nama, aktif: isAktif, updated_at: new Date().toISOString() })
            .ilike("nama", `%${editId}%`)
          if (updErr) {
            console.warn("Gagal update jenis penumpang by name:", updErr)
          }
          setPaxs((p) =>
            p.map((x) => (x.id === editId ? { ...x, nama, aktif: isAktif } : x)),
          )
        } else {
          const { data: insData, error: insErr } = await supabase
            .from("jenis_penumpang")
            .insert({ nama, aktif: isAktif })
            .select()
          if (insErr) {
            console.error("Gagal insert jenis penumpang ke Supabase:", insErr)
            toast(`Gagal simpan jenis penumpang: ${insErr.message}`)
            return
          }
          const newRow = insData?.[0]
          setPaxs((p) => [
            ...p,
            { id: newRow?.id || ("pax_" + Date.now()), nama, aktif: isAktif },
          ])
        }

        setForm(null)
        toast("Jenis penumpang berhasil disimpan ke database")
        await logAudit({
          user_nama: userNama,
          aksi: editId ? "Ubah" : "Tambah",
          tabel: "jenis_penumpang",
          objek: `penumpang · ${nama}`,
          sebelum: {},
          sesudah: { nama, aktif: isAktif },
        })
      } catch (err: any) {
        console.error("Gagal simpan jenis penumpang:", err)
        toast(`Gagal menyimpan: ${err?.message || "Terjadi kesalahan"}`)
      }
      return
    }

    setForm(null)
    toast("Tersimpan")
  }
  const valid =
    tab === "Segmen"
      ? !!f("nama")
      : tab === "Jalur"
        ? ((!!f("asal") && !!f("tujuan")) || !!f("nama")) && segs.length > 0
        : tab === "Kendaraan"
          ? !!f("plat")
          : tab === "Penumpang"
            ? !!f("nama")
            : !!f("tarif") && !!f("jalurId")

  const thCls =
    "whitespace-nowrap px-3.5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-mute sm:px-4"
  const thCenter =
    "whitespace-nowrap px-3.5 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-mute sm:px-4"
  const tdCls = "px-3.5 py-3 text-sm sm:px-4"
  const tdCenter = "px-3.5 py-3 text-center text-sm sm:px-4"

  const Aksi = ({
    rowKey,
    onEdit,
    onToggle,
    onDelete,
    aktif,
    isNearBottom,
    labelEdit,
    labelDelete,
  }: {
    rowKey: string
    onEdit?: () => void
    onToggle?: () => void
    onDelete?: () => void
    aktif?: boolean
    isNearBottom?: boolean
    labelEdit?: string
    labelDelete?: string
  }) => (
    <td className={cx(tdCenter, "w-28 whitespace-nowrap", activeMenuId === rowKey && "relative z-30")}>
      <div className={cx("relative inline-block text-left", activeMenuId === rowKey && "z-30")}>
        <button
          type="button"
          onClick={() => setActiveMenuId(activeMenuId === rowKey ? null : rowKey)}
          className={cx(
            "inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-ink shadow-2xs transition-colors hover:bg-wash focus:outline-hidden",
            activeMenuId === rowKey && "border-navy/30 bg-wash ring-1 ring-navy/20",
          )}
        >
          <span>Aksi</span>
          <ChevronDown
            size={13}
            className={cx(
              "text-mute transition-transform duration-150",
              activeMenuId === rowKey && "rotate-180",
            )}
          />
        </button>
        {activeMenuId === rowKey && (
          <>
            <div
              className="fixed inset-0 z-20"
              onClick={() => setActiveMenuId(null)}
            />
            <div
              className={cx(
                "absolute right-0 z-30 w-44 rounded-xl border border-line bg-white py-1 shadow-lg ring-1 ring-black/5 animate-in fade-in-0 zoom-in-95",
                isNearBottom ? "bottom-full mb-1" : "top-full mt-1",
              )}
            >
              {onEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenuId(null)
                    onEdit()
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-ink transition-colors hover:bg-slate-50"
                >
                  <Pencil size={14} className="shrink-0 text-navy" />
                  <span>{labelEdit || "Ubah"}</span>
                </button>
              )}
              {onToggle !== undefined && aktif !== undefined && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenuId(null)
                    onToggle()
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-ink transition-colors hover:bg-slate-50"
                >
                  {aktif ? (
                    <>
                      <EyeOff size={14} className="shrink-0 text-amber-600" />
                      <span>Nonaktifkan</span>
                    </>
                  ) : (
                    <>
                      <Eye size={14} className="shrink-0 text-emerald-600" />
                      <span>Aktifkan</span>
                    </>
                  )}
                </button>
              )}
              {onDelete && (
                <>
                  <div className="my-1 border-t border-line/60" />
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMenuId(null)
                      onDelete()
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                  >
                    <Trash2 size={14} className="shrink-0" />
                    <span>{labelDelete || "Hapus"}</span>
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </td>
  )
  const aktifBadge = (a: boolean) => (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        a
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-slate-200 bg-slate-100 text-slate-600",
      )}
    >
      {a ? "Aktif" : "Nonaktif"}
    </span>
  )

  return (
    <>
      <Title
        sub="Kelola data master operasional. Gunakan tombol Aksi untuk mengubah, menonaktifkan, atau menghapus data."
        right={
          <Btn
            onClick={() => {
              if (tab === "Segmen") {
                setForm({ aktif: "ya" })
              } else if (tab === "Jalur") {
                setForm({ segmentId: segs[0]?.id || "", asal: "", tujuan: "" })
              } else if (tab === "Tarif") {
                const initSeg = segs[0]?.id || ""
                const initJals = jals.filter(
                  (j) => j.segmentId === initSeg || (j as any).segmen_id === initSeg,
                )
                const defaultPax = paxs.find((p) => p.aktif)?.id || paxs[0]?.id || ""
                setForm({
                  segmentId: initSeg,
                  jalurId: initJals[0]?.id || jals[0]?.id || "",
                  jenisPenumpangId: defaultPax,
                  mulai: getTodayReal(),
                })
              } else if (tab === "Kendaraan") {
                setForm({})
              } else if (tab === "Penumpang") {
                setForm({ nama: "", aktif: "ya" })
              } else {
                setForm({})
              }
            }}
          >
            <Plus size={16} /> Tambah
          </Btn>
        }
      >
        Data Master
      </Title>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          className="inline-flex rounded-lg border border-line bg-wash p-1"
        >
          {(["Segmen", "Jalur", "Tarif", "Kendaraan", "Penumpang"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={tab === m}
              onClick={() => setTab(m)}
              className={cx(
                "h-9 rounded-md px-3.5 text-sm font-semibold",
                tab === m ? "bg-white text-navy shadow-sm" : "text-mute",
              )}
            >
              {m}
            </button>
          ))}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari…"
          className={cx(inputCls(), "h-11 w-full sm:w-64")}
        />
      </div>

      {tab === "Tarif" && (
        <p className="mb-3 rounded-lg bg-navy-50 px-4 py-3 text-sm text-navy">
          Tarif baru berlaku mulai tanggal yang dipilih dan tidak mengubah
          laporan lama.
        </p>
      )}

      <div
        className={cx(
          tableWrap,
          "min-h-[320px] bg-white shadow-xs transition-all",
          tab === "Segmen" && "max-w-2xl sm:max-w-3xl",
          tab === "Jalur" && "max-w-2xl sm:max-w-3xl",
          tab === "Tarif" && "max-w-4xl sm:max-w-5xl",
          tab === "Kendaraan" && "max-w-2xl sm:max-w-3xl",
          tab === "Penumpang" && "max-w-2xl sm:max-w-3xl min-h-[360px] pb-20",
        )}
      >
        <table
          className={cx(
            "w-full text-left",
            tab === "Tarif"
              ? "min-w-[760px]"
              : tab === "Jalur"
                ? "min-w-[500px]"
                : "min-w-full",
          )}
        >
          <thead className="border-b border-line bg-wash">
            <tr>
              {tab === "Segmen" && (
                <>
                  <th className={thCls}>Segmen</th>
                  <th className={cx(thCenter, "w-28 sm:w-32")}>Status</th>
                  <th className={cx(thCenter, "w-28")}>Aksi</th>
                </>
              )}
              {tab === "Jalur" && (
                <>
                  <th className={cx(thCls, "w-28 sm:w-36 whitespace-nowrap")}>Segmen</th>
                  <th className={thCls}>Jalur</th>
                  <th className={cx(thCenter, "w-28 sm:w-32")}>Status</th>
                  <th className={cx(thCenter, "w-28")}>Aksi</th>
                </>
              )}
              {tab === "Tarif" && (
                <>
                  <th className={cx(thCls, "w-32 sm:w-40")}>Segmen</th>
                  <th className={thCls}>Jalur</th>
                  <th className={cx(thCls, "w-36 sm:w-44 whitespace-nowrap")}>Jenis Penumpang</th>
                  <th className={cx(thCls, "w-28 sm:w-32 whitespace-nowrap")}>Tarif</th>
                  <th className={cx(thCls, "w-28 sm:w-32 whitespace-nowrap")}>Berlaku mulai</th>
                  <th className={cx(thCenter, "w-24 sm:w-28")}>Keterangan</th>
                  <th className={cx(thCenter, "w-28")}>Aksi</th>
                </>
              )}
              {tab === "Kendaraan" && (
                <>
                  <th className={thCls}>Plat Nomor</th>
                  <th className={cx(thCenter, "w-28 sm:w-32")}>Status</th>
                  <th className={cx(thCenter, "w-28")}>Aksi</th>
                </>
              )}
              {tab === "Penumpang" && (
                <>
                  <th className={thCls}>Jenis Penumpang</th>
                  <th className={cx(thCenter, "w-28 sm:w-32")}>Status</th>
                  <th className={cx(thCenter, "w-28")}>Aksi</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={tab === "Segmen" || tab === "Kendaraan" || tab === "Penumpang" ? 3 : tab === "Tarif" ? 7 : 4} className="py-14 text-center">
                  <div className="inline-flex items-center gap-2 text-sm text-mute">
                    <LoaderCircle size={18} className="animate-spin text-navy" />
                    <span>Memuat data {tab.toLowerCase()}...</span>
                  </div>
                </td>
              </tr>
            ) : (
              <>
                {tab === "Segmen" &&
                  (segs.filter((s) => has(s.nama)).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-sm text-mute">
                        {q ? (
                          <span>Tidak ada segmen yang sesuai dengan &ldquo;{q}&rdquo;.</span>
                        ) : (
                          <span>Belum ada data segmen di database. Klik tombol <strong>Tambah</strong> di atas untuk membuat segmen baru.</span>
                        )}
                      </td>
                    </tr>
                  ) : (
                    segs
                      .filter((s) => has(s.nama))
                      .map((s, i, arr) => {
                        const realIndex = segs.findIndex((x) => x.id === s.id)
                        return (
                          <tr key={s.id} className="border-b border-line last:border-0 hover:bg-wash/30 transition-colors">
                            <td className={cx(tdCls, "font-medium text-ink")}>{s.nama}</td>
                            <td className={cx(tdCenter, "w-28 sm:w-32")}>{aktifBadge(s.aktif)}</td>
                            <Aksi
                              rowKey={`seg_${s.id}`}
                              aktif={s.aktif}
                              isNearBottom={arr.length > 3 && i >= arr.length - 2}
                              labelEdit="Ubah Segmen"
                              labelDelete="Hapus Segmen"
                              onEdit={() => {
                                setTab("Segmen")
                                setForm({
                                  id: s.id,
                                  rawId: s.rawId || s.id,
                                  nama: s.nama,
                                  aktif: s.aktif ? "ya" : "tidak",
                                })
                              }}
                              onToggle={() => toggle(segs, setSegs, realIndex >= 0 ? realIndex : 0)}
                              onDelete={() =>
                                setDeleteTarget({
                                  type: "Segmen",
                                  id: s.id,
                                  name: s.nama,
                                  extra: { rawId: s.rawId },
                                })
                              }
                            />
                          </tr>
                        )
                      })
                  ))}

                {tab === "Jalur" &&
                  (jals.filter((j) => has(j.nama + (segs.find((s) => s.id === j.segmentId)?.nama || ""))).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-sm text-mute">
                        {q ? (
                          <span>Tidak ada jalur yang sesuai dengan &ldquo;{q}&rdquo;.</span>
                        ) : (
                          <span>Belum ada data jalur di database. Klik tombol <strong>Tambah</strong> di atas untuk membuat jalur baru.</span>
                        )}
                      </td>
                    </tr>
                  ) : (
                    jals
                      .filter((j) => has(j.nama + (segs.find((s) => s.id === j.segmentId)?.nama || "")))
                      .map((j, i, arr) => (
                        <tr key={j.id} className="border-b border-line last:border-0 hover:bg-wash/30 transition-colors">
                          <td className={cx(tdCls, "w-28 sm:w-36 whitespace-nowrap font-semibold text-ink")}>
                            {segs.find((s) => s.id === j.segmentId)?.nama || seg(j.segmentId).nama}
                          </td>
                          <td className={cx(tdCls, "font-medium text-slate-800")}>{j.nama}</td>
                          <td className={cx(tdCenter, "w-28 sm:w-32")}>{aktifBadge(j.aktif)}</td>
                          <Aksi
                            rowKey={`jal_${j.id}`}
                            aktif={j.aktif}
                            isNearBottom={arr.length > 3 && i >= arr.length - 2}
                            labelEdit="Ubah Jalur"
                            labelDelete="Hapus Jalur"
                            onEdit={() => {
                              const rawNama = j.nama || ""
                              const parts = rawNama.split(" - ")
                              const asal = parts.length > 1 ? parts[0].trim() : rawNama
                              const tujuan = parts.length > 1 ? parts.slice(1).join(" - ").trim() : ""
                              setForm({
                                id: j.id,
                                nama: j.nama,
                                asal,
                                tujuan,
                                segmentId: j.segmentId,
                              })
                            }}
                            onToggle={() => toggle(jals, setJals, i)}
                            onDelete={() => setDeleteTarget({ type: "Jalur", id: j.id, name: j.nama })}
                          />
                        </tr>
                      ))
                  ))}

                {tab === "Tarif" &&
                  (() => {
                    const sortedTarifs = [...tarifs]
                      .sort(
                        (a, b) =>
                          a.jalurId.localeCompare(b.jalurId) ||
                          b.mulai.localeCompare(a.mulai),
                      )
                      .filter((x) => {
                        const jal = jals.find((j) => j.id === x.jalurId)
                        const jalurNama = jal?.nama || jalur(x.jalurId).nama
                        const segNama =
                          segs.find(
                            (s) =>
                              s.id === jal?.segmentId ||
                              s.rawId === jal?.segmentId ||
                              (s as any).kode === jal?.segmentId,
                          )?.nama || ""
                        const matchedPax = paxs.find(
                          (p) =>
                            p.id === x.jenisPenumpangId ||
                            p.nama.toLowerCase() === (x.jenisPenumpangNama || "").toLowerCase(),
                        )
                        const paxNama = matchedPax?.nama || x.jenisPenumpangNama || "Umum"
                        return has(jalurNama + " " + segNama + " " + paxNama)
                      })

                    if (sortedTarifs.length === 0) {
                      return (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-sm text-mute">
                            {q ? (
                              <span>Tidak ada tarif yang sesuai dengan &ldquo;{q}&rdquo;.</span>
                            ) : (
                              <span>Belum ada data tarif di database. Klik tombol <strong>Tambah</strong> di atas untuk membuat tarif baru.</span>
                            )}
                          </td>
                        </tr>
                      )
                    }

                    return sortedTarifs.map((x, i, arr) => {
                      const jal = jals.find((j) => j.id === x.jalurId)
                      const jalurNama = jal?.nama || jalur(x.jalurId).nama
                      const segNama =
                        segs.find(
                          (s) =>
                            s.id === jal?.segmentId ||
                            s.rawId === jal?.segmentId ||
                            (s as any).kode === jal?.segmentId,
                        )?.nama ||
                        (jal?.segmentId ? seg(jal.segmentId).nama : "-")

                      const matchedPax = paxs.find(
                        (p) =>
                          p.id === x.jenisPenumpangId ||
                          p.nama.toLowerCase() === (x.jenisPenumpangNama || "").toLowerCase(),
                      )
                      const paxNama = matchedPax?.nama || x.jenisPenumpangNama || "Umum"

                      return (
                        <tr key={x.id || `tar_${x.jalurId}_${x.mulai}_${i}`} className="border-b border-line last:border-0 hover:bg-wash/30 transition-colors">
                          <td className={cx(tdCls, "w-32 sm:w-40 font-semibold text-ink")}>{segNama}</td>
                          <td className={cx(tdCls, "font-medium text-slate-800")}>{jalurNama}</td>
                          <td className={cx(tdCls, "w-36 sm:w-44 whitespace-nowrap text-slate-700 font-medium")}>
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-800">
                              {paxNama}
                            </span>
                          </td>
                          <td className={cx(tdCls, "w-28 sm:w-32 whitespace-nowrap num font-semibold text-navy")}>{rupiah(x.tarif)}</td>
                          <td className={cx(tdCls, "w-28 sm:w-32 whitespace-nowrap num text-slate-600")}>{fmtDate(x.mulai)}</td>
                          <td className={cx(tdCenter, "w-24 sm:w-28")}>
                            {arr.find((y) => y.jalurId === x.jalurId && (y.jenisPenumpangId || "umum") === (x.jenisPenumpangId || "umum"))?.mulai ===
                            x.mulai ? (
                              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                                Berlaku
                              </span>
                            ) : (
                              <span className="text-xs text-mute">Riwayat</span>
                            )}
                          </td>
                          <Aksi
                            rowKey={`tar_${x.id || x.jalurId}_${x.mulai}_${i}`}
                            isNearBottom={arr.length > 3 && i >= arr.length - 2}
                            labelEdit="Edit"
                            labelDelete="Hapus Tarif"
                            onEdit={() =>
                              setForm({
                                id: x.id || "",
                                segmentId: jal?.segmentId || "",
                                jalurId: x.jalurId,
                                jenisPenumpangId: x.jenisPenumpangId || matchedPax?.id || paxs[0]?.id || "",
                                tarif: String(x.tarif),
                                mulai: x.mulai,
                                prevJalurId: x.jalurId,
                                prevMulai: x.mulai,
                              })
                            }
                            onDelete={() =>
                              setDeleteTarget({
                                type: "Tarif",
                                id: x.jalurId,
                                name: `${segNama} · ${jalurNama} (${paxNama}) - ${rupiah(x.tarif)} (${fmtDate(x.mulai)})`,
                                extra: { id: x.id, mulai: x.mulai, index: i },
                              })
                            }
                          />
                        </tr>
                      )
                    })
                  })()}

                {tab === "Kendaraan" &&
                  (vehs.filter((v) => has(v.plat + (v.cb || ""))).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-sm text-mute">
                        {q ? (
                          <span>Tidak ada kendaraan yang sesuai dengan &ldquo;{q}&rdquo;.</span>
                        ) : (
                          <span>Belum ada data kendaraan di database. Klik tombol <strong>Tambah</strong> di atas untuk membuat kendaraan baru.</span>
                        )}
                      </td>
                    </tr>
                  ) : (
                    vehs
                      .filter((v) => has(v.plat + (v.cb || "")))
                      .map((v, i, arr) => (
                        <tr key={v.plat || v.cb} className="border-b border-line last:border-0 hover:bg-wash/30 transition-colors">
                          <td className={cx(tdCls, "num font-medium text-slate-800")}>{v.plat}</td>
                          <td className={cx(tdCenter, "w-28 sm:w-32")}>{aktifBadge(v.aktif)}</td>
                          <Aksi
                            rowKey={`veh_${v.plat || v.cb}`}
                            aktif={v.aktif}
                            isNearBottom={arr.length > 3 && i >= arr.length - 2}
                            labelEdit="Ubah Kendaraan"
                            labelDelete="Hapus Kendaraan"
                            onEdit={() =>
                              setForm({ id: v.plat || v.cb, plat: v.plat })
                            }
                            onToggle={() => toggle(vehs, setVehs, i)}
                            onDelete={() => setDeleteTarget({ type: "Kendaraan", id: v.plat || v.cb, name: v.plat })}
                          />
                        </tr>
                      ))
                  ))}

                {tab === "Penumpang" &&
                  (paxs.filter((p) => has(p.nama)).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-sm text-mute">
                        {q ? (
                          <span>Tidak ada jenis penumpang yang sesuai dengan &ldquo;{q}&rdquo;.</span>
                        ) : (
                          <span>Belum ada data jenis penumpang di database. Klik tombol <strong>Tambah</strong> di atas untuk membuat jenis penumpang baru.</span>
                        )}
                      </td>
                    </tr>
                  ) : (
                    paxs
                      .filter((p) => has(p.nama))
                      .map((p, i, arr) => (
                        <tr key={p.id || p.nama} className="border-b border-line last:border-0 hover:bg-wash/30 transition-colors">
                          <td className={cx(tdCls, "font-medium text-slate-800")}>{p.nama}</td>
                          <td className={cx(tdCenter, "w-28 sm:w-32")}>{aktifBadge(p.aktif)}</td>
                          <Aksi
                            rowKey={`pax_${p.id || i}`}
                            aktif={p.aktif}
                            isNearBottom={arr.length > 4 && i >= arr.length - 2}
                            labelEdit="Ubah Penumpang"
                            labelDelete="Hapus Penumpang"
                            onEdit={() =>
                              setForm({ id: p.id, nama: p.nama, aktif: p.aktif ? "ya" : "tidak" })
                            }
                            onToggle={() => toggle(paxs, setPaxs, p)}
                            onDelete={() => setDeleteTarget({ type: "Penumpang", id: p.id, name: p.nama })}
                          />
                        </tr>
                      ))
                  ))}
              </>
            )}
          </tbody>
        </table>
      </div>

      <Dialog
        open={!!form}
        title={`${f("id") || f("prevJalurId") ? (tab === "Tarif" ? "Edit" : "Ubah") : "Tambah"} ${tab === "Penumpang" ? "Jenis Penumpang" : tab === "Tarif" ? "Tarif" : tab.toLowerCase()}`}
        onClose={() => setForm(null)}
        actions={
          <>
            <Btn variant="outline" onClick={() => setForm(null)}>
              Batal
            </Btn>
            <Btn disabled={!valid} onClick={save}>
              Simpan
            </Btn>
          </>
        }
      >
        <div className="space-y-3 text-ink">
          {tab === "Segmen" && (
            <>
              <Field label="Nama Segmen">
                <input
                  value={f("nama")}
                  onChange={(e) => set("nama", e.target.value)}
                  placeholder="Contoh: Bus Kota, Pariwisata, AKDP"
                  className={inputCls()}
                  autoFocus
                />
              </Field>
              <Field label="Status Segmen">
                <select
                  value={f("aktif") || "ya"}
                  onChange={(e) => set("aktif", e.target.value)}
                  className={inputCls()}
                >
                  <option value="ya">Aktif</option>
                  <option value="tidak">Nonaktif</option>
                </select>
              </Field>
            </>
          )}

          {tab === "Jalur" && (
            <>
              <Field label="Segmen">
                <select
                  value={f("segmentId") || segs[0]?.id || ""}
                  onChange={(e) => set("segmentId", e.target.value)}
                  className={inputCls()}
                >
                  {segs.length === 0 ? (
                    <option value="">(Belum ada Segmen - buat Segmen terlebih dahulu)</option>
                  ) : (
                    segs.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nama}
                      </option>
                    ))
                  )}
                </select>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Dari (Jalur Asal)">
                  <input
                    value={f("asal")}
                    onChange={(e) => set("asal", e.target.value)}
                    placeholder="Contoh: Leuwi Panjang"
                    className={inputCls()}
                    autoFocus
                  />
                </Field>
                <Field label="Ke (Jalur Akhir)">
                  <input
                    value={f("tujuan")}
                    onChange={(e) => set("tujuan", e.target.value)}
                    placeholder="Contoh: Ledeng"
                    className={inputCls()}
                  />
                </Field>
              </div>
            </>
          )}

          {tab === "Kendaraan" && (
            <Field label="Plat Nomor">
              <input
                value={f("plat")}
                onChange={(e) => set("plat", e.target.value)}
                placeholder="Contoh: D 7080 AE"
                className={inputCls()}
                autoFocus
              />
            </Field>
          )}

          {tab === "Penumpang" && (
            <>
              <Field label="Jenis Penumpang">
                <input
                  value={f("nama")}
                  onChange={(e) => set("nama", e.target.value)}
                  placeholder="Contoh: Umum, Pelajar/Mahasiswa (P/M), Lansia"
                  className={inputCls()}
                  autoFocus
                />
              </Field>
              <Field label="Status">
                <select
                  value={f("aktif") || "ya"}
                  onChange={(e) => set("aktif", e.target.value)}
                  className={inputCls()}
                >
                  <option value="ya">Aktif</option>
                  <option value="tidak">Nonaktif</option>
                </select>
              </Field>
            </>
          )}

          {tab === "Tarif" && (
            <>
              <Field label="Segmen">
                <select
                  value={f("segmentId") || segs[0]?.id || ""}
                  onChange={(e) => {
                    const newSeg = e.target.value
                    const matchedJals = jals.filter(
                      (j) => j.segmentId === newSeg || (j as any).segmen_id === newSeg
                    )
                    setForm((p) => ({
                      ...p,
                      segmentId: newSeg,
                      jalurId: matchedJals[0]?.id || "",
                    }))
                  }}
                  className={inputCls()}
                >
                  {segs.length === 0 ? (
                    <option value="">(Belum ada Segmen)</option>
                  ) : (
                    segs.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nama}
                      </option>
                    ))
                  )}
                </select>
              </Field>

              <Field label="Jalur">
                <select
                  value={f("jalurId")}
                  onChange={(e) => set("jalurId", e.target.value)}
                  className={inputCls()}
                >
                  {(() => {
                    const activeSeg = f("segmentId") || segs[0]?.id || ""
                    const filteredJals = jals.filter(
                      (j) => !activeSeg || j.segmentId === activeSeg || (j as any).segmen_id === activeSeg
                    )
                    if (filteredJals.length === 0) {
                      return <option value="">(Belum ada Jalur pada segmen ini)</option>
                    }
                    return filteredJals.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.nama} {j.tarif ? `(Saat ini: ${rupiah(j.tarif)})` : `(Belum ada tarif)`}
                      </option>
                    ))
                  })()}
                </select>
              </Field>
              <Field label="Jenis Penumpang">
                <select
                  value={f("jenisPenumpangId") || paxs.find((p) => p.aktif)?.id || paxs[0]?.id || ""}
                  onChange={(e) => set("jenisPenumpangId", e.target.value)}
                  className={inputCls()}
                >
                  {paxs.length === 0 ? (
                    <option value="">(Belum ada jenis penumpang)</option>
                  ) : (
                    paxs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nama} {!p.aktif ? "(Nonaktif)" : ""}
                      </option>
                    ))
                  )}
                </select>
              </Field>
              <Field label="Tarif (Rp)">
                <input
                  inputMode="numeric"
                  value={f("tarif")}
                  onChange={(e) => set("tarif", e.target.value)}
                  placeholder="Contoh: 15.000"
                  className={cx(inputCls(), "num")}
                />
              </Field>
              <Field label="Berlaku mulai">
                <input
                  type="date"
                  value={f("mulai") || getTodayReal()}
                  onChange={(e) => set("mulai", e.target.value)}
                  className={inputCls()}
                />
              </Field>
            </>
          )}
        </div>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        danger
        title={`Hapus ${deleteTarget?.type === "Penumpang" ? "Jenis Penumpang" : deleteTarget?.type}?`}
        onClose={() => setDeleteTarget(null)}
        actions={
          <>
            <Btn variant="outline" onClick={() => setDeleteTarget(null)}>
              Batal
            </Btn>
            <Btn variant="danger" onClick={confirmDelete}>
              Ya, hapus permanen
            </Btn>
          </>
        }
      >
        <p>
          Apakah Anda yakin ingin menghapus {deleteTarget?.type === "Penumpang" ? "jenis penumpang" : deleteTarget?.type.toLowerCase()}{" "}
          <b className="font-semibold text-ink">{deleteTarget?.name}</b> secara permanen?
        </p>
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
          <strong>Peringatan:</strong> Tindakan ini akan menghapus data dari master operasional secara permanen dan tidak dapat dibatalkan. Jika data pernah digunakan dalam riwayat perjalanan terdahulu, disarankan untuk memilih opsi <em>Nonaktifkan</em> agar laporan masa lalu tetap utuh.
        </p>
      </Dialog>
    </>
  )
}