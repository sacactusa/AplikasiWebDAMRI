"use client"

import { useState, useEffect } from "react"
import { Lock, Plus, ChevronDown, Pencil, Eye, EyeOff, Trash2, LoaderCircle } from "lucide-react"
import type { Segment, Jalur, Vehicle } from "@/lib/data"
import { SEGMENTS, JALUR, VEHICLES, TODAY, rupiah, jalur, seg, fmtDate } from "@/lib/data"
import { Btn, Dialog, Field, cx, inputCls } from "@/components/ui"
import { Title, th, td, tableWrap } from "./shared"
import { getMasterData, logAudit } from "@/lib/supabaseService"
import { supabase } from "@/lib/supabase"

interface Props {
  toast: (t: string) => void
  currentUser?: { nama: string; email: string; id?: string } | null
}
interface Tarif {
  jalurId: string
  tarif: number
  mulai: string
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
  const [tab, setTab] = useState<"Segmen" | "Jalur" | "Tarif" | "Kendaraan">(
    "Segmen",
  )
  const [q, setQ] = useState("")
  const [segs, setSegs] = useState<Segment[]>(isDemo ? SEGMENTS : [])
  const [jals, setJals] = useState<Jalur[]>(isDemo ? JALUR : [])
  const [vehs, setVehs] = useState<Vehicle[]>(isDemo ? VEHICLES : [])
  const [tarifs, setTarifs] = useState<Tarif[]>(
    isDemo
      ? [
          ...JALUR.filter((j) => j.tarif).map((j) => ({
            jalurId: j.id,
            tarif: j.tarif,
            mulai: "2026-10-01",
          })),
          { jalurId: "j1", tarif: 140000, mulai: "2026-01-01" },
          { jalurId: "j2", tarif: 150000, mulai: "2026-01-01" },
          { jalurId: "j5", tarif: 80000, mulai: "2025-07-01" },
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
      }),
      supabase
        .from("tarif_jalur")
        .select("*")
        .order("berlaku_mulai", { ascending: false })
        .then(({ data, error }) => {
          if (!error && data) {
            setTarifs(
              data.map((t) => ({
                jalurId: t.jalur_id,
                tarif: Number(t.tarif),
                mulai: t.berlaku_mulai,
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
    type: "Segmen" | "Jalur" | "Tarif" | "Kendaraan"
    id: string
    name: string
    extra?: any
  } | null>(null)
  const f = (k: string) => form?.[k] ?? ""
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))
  const has = (s: string) => s.toLowerCase().includes(q.toLowerCase())
  const userNama = currentUser?.nama || "Koordinator"

  const toggle = async <T extends { aktif: boolean },>(
    arr: T[],
    set_: (a: T[]) => void,
    i: number,
  ) => {
    const item = arr[i]
    const nextAktif = !item.aktif
    set_(arr.map((x, k) => (k === i ? { ...x, aktif: nextAktif } : x)))
    toast(item.aktif ? "Dinonaktifkan" : "Diaktifkan kembali")

    if (isDemo) return

    try {
      if (tab === "Segmen") {
        const segItem = item as unknown as { id: string; nama: string }
        const q = UUID_REGEX.test(segItem.id)
          ? supabase.from("segmen").update({ aktif: nextAktif }).eq("id", segItem.id)
          : supabase.from("segmen").update({ aktif: nextAktif }).eq("kode", segItem.id)
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
        await supabase.from("kendaraan").update({ aktif: nextAktif }).eq("kode_cb", vehItem.cb)
        await logAudit({
          user_nama: userNama,
          aksi: nextAktif ? "Aktifkan" : "Nonaktifkan",
          tabel: "kendaraan",
          objek: `kendaraan · ${vehItem.cb}`,
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
      else if (target.type === "Tarif") setTarifs((p) => p.filter((_, idx) => idx !== target.extra?.index))
      toast(`${target.type} '${target.name}' berhasil dihapus`)
      setDeleteTarget(null)
      return
    }

    try {
      if (target.type === "Segmen") {
        const q = UUID_REGEX.test(target.id)
          ? supabase.from("segmen").delete().eq("id", target.id)
          : supabase.from("segmen").delete().eq("kode", target.id)
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
          .eq("kode_cb", target.id)

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

        setVehs((p) => p.filter((v) => v.cb !== target.id))
        toast(`Kendaraan '${target.name}' berhasil dihapus permanen`)
        await logAudit({
          user_nama: userNama,
          aksi: "Hapus",
          tabel: "kendaraan",
          objek: `kendaraan · ${target.name}`,
          sebelum: { cb: target.id },
          sesudah: {},
        })
      } else if (target.type === "Tarif") {
        const { error } = await supabase
          .from("tarif_jalur")
          .delete()
          .match({ jalur_id: target.id, berlaku_mulai: target.extra?.mulai })

        if (error) {
          toast(`Gagal menghapus tarif: ${error.message}`)
          setDeleteTarget(null)
          return
        }

        setTarifs((p) => p.filter((_, idx) => idx !== target.extra?.index))
        toast(`Tarif '${target.name}' berhasil dihapus permanen`)
        await logAudit({
          user_nama: userNama,
          aksi: "Hapus",
          tabel: "tarif_jalur",
          objek: `tarif · ${target.name}`,
          sebelum: { jalur: target.id, mulai: target.extra?.mulai },
          sesudah: {},
        })
      }
    } catch (err) {
      console.warn("Gagal hapus data master di Supabase:", err)
      if (target.type === "Segmen") setSegs((p) => p.filter((s) => s.id !== target.id))
      else if (target.type === "Jalur") setJals((p) => p.filter((j) => j.id !== target.id))
      else if (target.type === "Kendaraan") setVehs((p) => p.filter((v) => v.cb !== target.id))
      else if (target.type === "Tarif") setTarifs((p) => p.filter((_, idx) => idx !== target.extra?.index))
      toast(`${target.type} '${target.name}' dihapus`)
    }
    setDeleteTarget(null)
  }

  const save = async () => {
    if (tab === "Segmen") {
      const nama = f("nama").trim()
      const kode = (f("kode") || f("id") || nama.toLowerCase().replace(/\s+/g, "-")).trim()
      const kontrak = f("kontrak") === "ya"
      const nilaiTetap = kontrak ? Number(f("nilai").replace(/\D/g, "")) : undefined
      const item = { id: kode, nama, kontrak, nilaiTetap, aktif: true }
      setSegs((p) => f("id") ? p.map((x) => x.id === item.id ? { ...x, ...item, aktif: x.aktif } : x) : [...p, item])
      setForm(null)
      toast("Segmen berhasil disimpan")
      if (isDemo) return
      
      try {
        if (f("id") && UUID_REGEX.test(f("id"))) {
          await supabase.from("segmen").update({
            nama,
            kontrak,
            nilai_tetap: nilaiTetap || null,
          }).eq("id", f("id"))
        } else {
          await supabase.from("segmen").upsert({
            kode,
            nama,
            kontrak,
            nilai_tetap: nilaiTetap || null,
            aktif: true
          }, { onConflict: "kode" })
        }
        await logAudit({
          user_nama: userNama,
          aksi: f("id") ? "Ubah" : "Tambah",
          tabel: "segmen",
          objek: `segmen · ${nama}`,
          sebelum: {},
          sesudah: { nama, kontrak, nilaiTetap }
        })
      } catch (err) {
        console.warn("Gagal simpan segmen ke Supabase:", err)
      }
      return
    }

    if (tab === "Jalur") {
      const nama = f("nama").trim()
      const segmentKode = f("segmentId") || segs[0]?.id || ""
      const tarifAwal = Number(f("tarif")?.replace(/\D/g, "") || 0)

      if (!nama) {
        toast("Nama jalur tidak boleh kosong")
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
              tarif: tarifAwal,
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

          if (tarifAwal > 0) {
            const todayStr = getTodayReal()
            const { error: tarErr } = await supabase.from("tarif_jalur").insert({
              jalur_id: newJalurId,
              tarif: tarifAwal,
              berlaku_mulai: todayStr,
            })
            if (!tarErr) {
              setTarifs((p) => [
                {
                  jalurId: newJalurId,
                  tarif: tarifAwal,
                  mulai: todayStr,
                },
                ...p,
              ])
            }
          }

          setJals((p) => [
            ...p,
            {
              id: newJalurId,
              nama,
              segmentId: segmentKode,
              tarif: tarifAwal,
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
          sesudah: { nama, segmentKode, tarif: tarifAwal },
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
      const cb = f("cb").trim()
      const plat = f("plat").trim()
      if (f("id")) {
        setVehs((p) => p.map((x) => x.cb === f("id") ? { ...x, cb, plat } : x))
        if (!isDemo) {
          supabase.from("kendaraan").update({ kode_cb: cb, plat }).eq("kode_cb", f("id")).then(() => {})
        }
      } else {
        setVehs((p) => [...p, { cb, plat, aktif: true }])
        if (!isDemo) {
          supabase.from("kendaraan").insert({ kode_cb: cb, plat, aktif: true }).then(() => {})
        }
      }
      setForm(null)
      toast("Kendaraan berhasil disimpan")
      if (isDemo) return

      logAudit({
        user_nama: userNama,
        aksi: f("id") ? "Ubah" : "Tambah",
        tabel: "kendaraan",
        objek: `kendaraan · ${cb}`,
        sebelum: {},
        sesudah: { cb, plat }
      })
      return
    }

    if (tab === "Tarif") {
      const jalurId = f("jalurId") || jals[0]?.id || ""
      const tarif = Number(f("tarif").replace(/\D/g, ""))
      const mulai = f("mulai") || getTodayReal()

      if (!jalurId) {
        toast("Silakan pilih jalur terlebih dahulu")
        return
      }
      if (!tarif || isNaN(tarif)) {
        toast("Silakan isi nominal tarif")
        return
      }

      setTarifs((p) => [{ jalurId, tarif, mulai }, ...p])
      setJals((p) => p.map((j) => (j.id === jalurId ? { ...j, tarif } : j)))
      setForm(null)
      toast("Tarif berhasil disimpan")
      if (isDemo) return

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

        const { error: tarErr } = await supabase.from("tarif_jalur").insert({
          jalur_id: resolvedJalurId,
          tarif,
          berlaku_mulai: mulai,
        })

        if (tarErr) {
          console.error("Gagal simpan tarif ke Supabase:", tarErr)
          toast(`Gagal simpan tarif: ${tarErr.message}`)
          return
        }

        await logAudit({
          user_nama: userNama,
          aksi: "Tambah",
          tabel: "tarif_jalur",
          objek: `tarif · ${resolvedJalurId}`,
          sebelum: {},
          sesudah: { tarif, berlaku_mulai: mulai },
        })
      } catch (err: any) {
        console.error("Gagal simpan tarif ke Supabase:", err)
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
        ? !!f("nama") && segs.length > 0
        : tab === "Kendaraan"
          ? !!f("cb") && !!f("plat")
          : !!f("tarif")

  const Aksi = ({
    rowKey,
    onEdit,
    onToggle,
    onDelete,
    aktif,
    isNearBottom,
    labelDelete,
  }: {
    rowKey: string
    onEdit?: () => void
    onToggle?: () => void
    onDelete?: () => void
    aktif?: boolean
    isNearBottom?: boolean
    labelDelete?: string
  }) => (
    <td className={cx(td, "w-28 whitespace-nowrap text-center")}>
      <div className="relative inline-block text-left">
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
                  <span>Ubah</span>
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
        "rounded-full border px-2 py-0.5 text-xs font-semibold",
        a
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-slate-200 bg-slate-100 text-slate-600",
      )}
    >
      {a ? "Aktif" : "Nonaktif"}
    </span>
  )

  const thCenter = cx(th.replace("text-left", ""), "text-center")

  return (
    <>
      <Title
        sub="Kelola data master operasional. Gunakan tombol Aksi untuk mengubah, menonaktifkan, atau menghapus data."
        right={
          <Btn
            onClick={() => {
              if (tab === "Jalur") {
                setForm({ segmentId: segs[0]?.id || "" })
              } else if (tab === "Tarif") {
                setForm({ jalurId: jals[0]?.id || "", mulai: getTodayReal() })
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
          {(["Segmen", "Jalur", "Tarif", "Kendaraan"] as const).map((m) => (
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

      <div className={cx(tableWrap, "min-h-[280px]")}>
        <table className="w-full min-w-[640px]">
          <thead className="border-b border-line bg-wash">
            <tr>
              {tab === "Segmen" && (
                <>
                  <th className={th}>Segmen</th>
                  <th className={cx(th, "w-32")}>Jenis</th>
                  <th className={cx(th, "w-48 whitespace-nowrap")}>Nilai tetap</th>
                  <th className={cx(th, "w-28")}>Status</th>
                  <th className={cx(thCenter, "w-28")}>Aksi</th>
                </>
              )}
              {tab === "Jalur" && (
                <>
                  <th className={th}>Jalur</th>
                  <th className={cx(th, "w-48")}>Segmen</th>
                  <th className={cx(th, "w-40 whitespace-nowrap")}>Tarif aktif</th>
                  <th className={cx(th, "w-28")}>Status</th>
                  <th className={cx(thCenter, "w-28")}>Aksi</th>
                </>
              )}
              {tab === "Tarif" && (
                <>
                  <th className={th}>Jalur</th>
                  <th className={cx(th, "w-40 whitespace-nowrap")}>Tarif</th>
                  <th className={cx(th, "w-40 whitespace-nowrap")}>Berlaku mulai</th>
                  <th className={cx(th, "w-28")}>Keterangan</th>
                  <th className={cx(thCenter, "w-28")}>Aksi</th>
                </>
              )}
              {tab === "Kendaraan" && (
                <>
                  <th className={th}>Nomor CB</th>
                  <th className={cx(th, "w-56")}>Plat</th>
                  <th className={cx(th, "w-28")}>Status</th>
                  <th className={cx(thCenter, "w-28")}>Aksi</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={tab === "Kendaraan" ? 4 : 5} className="py-14 text-center">
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
                      <td colSpan={5} className="py-12 text-center text-sm text-mute">
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
                      .map((s, i, arr) => (
                        <tr key={s.id} className="border-b border-line last:border-0">
                          <td className={cx(td, "font-medium")}>{s.nama}</td>
                          <td className={cx(td, "w-32")}>{s.kontrak ? "Kontrak" : "Reguler"}</td>
                          <td className={cx(td, "w-48 whitespace-nowrap num")}>
                            {s.kontrak ? (
                              <span className="inline-flex items-center gap-1.5 font-medium text-ink">
                                <Lock size={12} className="shrink-0 text-slate-400" />
                                <span>{rupiah(s.nilaiTetap)}</span>
                              </span>
                            ) : (
                              <span className="text-mute font-sans">–</span>
                            )}
                          </td>
                          <td className={cx(td, "w-28")}>{aktifBadge(s.aktif)}</td>
                          <Aksi
                            rowKey={`seg_${s.id}`}
                            aktif={s.aktif}
                            isNearBottom={i >= arr.length - 2}
                            labelDelete="Hapus Segmen"
                            onEdit={() => (
                              setTab("Segmen"),
                              setForm({
                                id: s.id,
                                nama: s.nama,
                                kontrak: s.kontrak ? "ya" : "tidak",
                                nilai: String(s.nilaiTetap ?? ""),
                              })
                            )}
                            onToggle={() => toggle(segs, setSegs, i)}
                            onDelete={() => setDeleteTarget({ type: "Segmen", id: s.id, name: s.nama })}
                          />
                        </tr>
                      ))
                  ))}

                {tab === "Jalur" &&
                  (jals.filter((j) => has(j.nama)).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-sm text-mute">
                        {q ? (
                          <span>Tidak ada jalur yang sesuai dengan &ldquo;{q}&rdquo;.</span>
                        ) : (
                          <span>Belum ada data jalur di database. Klik tombol <strong>Tambah</strong> di atas untuk membuat jalur baru.</span>
                        )}
                      </td>
                    </tr>
                  ) : (
                    jals
                      .filter((j) => has(j.nama))
                      .map((j, i, arr) => (
                        <tr key={j.id} className="border-b border-line last:border-0">
                          <td className={cx(td, "font-medium")}>{j.nama}</td>
                          <td className={cx(td, "w-48")}>{segs.find((s) => s.id === j.segmentId)?.nama || seg(j.segmentId).nama}</td>
                          <td className={cx(td, "w-40 whitespace-nowrap num")}>
                            {j.tarif ? rupiah(j.tarif) : <span className="text-mute font-sans">Nilai tetap</span>}
                          </td>
                          <td className={cx(td, "w-28")}>{aktifBadge(j.aktif)}</td>
                          <Aksi
                            rowKey={`jal_${j.id}`}
                            aktif={j.aktif}
                            isNearBottom={i >= arr.length - 2}
                            labelDelete="Hapus Jalur"
                            onEdit={() =>
                              setForm({
                                id: j.id,
                                nama: j.nama,
                                segmentId: j.segmentId,
                              })
                            }
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
                      .filter((x) => has(jals.find((j) => j.id === x.jalurId)?.nama || jalur(x.jalurId).nama))

                    if (sortedTarifs.length === 0) {
                      return (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-sm text-mute">
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
                      const jalurNama = jals.find((j) => j.id === x.jalurId)?.nama || jalur(x.jalurId).nama
                      return (
                        <tr key={i} className="border-b border-line last:border-0">
                          <td className={cx(td, "font-medium")}>{jalurNama}</td>
                          <td className={cx(td, "w-40 whitespace-nowrap num")}>{rupiah(x.tarif)}</td>
                          <td className={cx(td, "w-40 whitespace-nowrap num")}>{fmtDate(x.mulai)}</td>
                          <td className={cx(td, "w-28")}>
                            {arr.find((y) => y.jalurId === x.jalurId)?.mulai ===
                            x.mulai ? (
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                                Berlaku
                              </span>
                            ) : (
                              <span className="text-xs text-mute">Riwayat</span>
                            )}
                          </td>
                          <Aksi
                            rowKey={`tar_${x.jalurId}_${x.mulai}_${i}`}
                            isNearBottom={i >= arr.length - 2}
                            labelDelete="Hapus Tarif"
                            onEdit={() =>
                              setForm({
                                jalurId: x.jalurId,
                                tarif: String(x.tarif),
                                mulai: x.mulai,
                              })
                            }
                            onDelete={() =>
                              setDeleteTarget({
                                type: "Tarif",
                                id: x.jalurId,
                                name: `${jalurNama} - ${rupiah(x.tarif)} (${fmtDate(x.mulai)})`,
                                extra: { mulai: x.mulai, index: i },
                              })
                            }
                          />
                        </tr>
                      )
                    })
                  })()}

                {tab === "Kendaraan" &&
                  (vehs.filter((v) => has(v.cb + v.plat)).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-sm text-mute">
                        {q ? (
                          <span>Tidak ada kendaraan yang sesuai dengan &ldquo;{q}&rdquo;.</span>
                        ) : (
                          <span>Belum ada data kendaraan di database. Klik tombol <strong>Tambah</strong> di atas untuk membuat kendaraan baru.</span>
                        )}
                      </td>
                    </tr>
                  ) : (
                    vehs
                      .filter((v) => has(v.cb + v.plat))
                      .map((v, i, arr) => (
                        <tr key={v.cb} className="border-b border-line last:border-0">
                          <td className={cx(td, "num font-medium")}>{v.cb}</td>
                          <td className={cx(td, "w-56 num")}>{v.plat}</td>
                          <td className={cx(td, "w-28")}>{aktifBadge(v.aktif)}</td>
                          <Aksi
                            rowKey={`veh_${v.cb}`}
                            aktif={v.aktif}
                            isNearBottom={i >= arr.length - 2}
                            labelDelete="Hapus Kendaraan"
                            onEdit={() =>
                              setForm({ id: v.cb, cb: v.cb, plat: v.plat })
                            }
                            onToggle={() => toggle(vehs, setVehs, i)}
                            onDelete={() => setDeleteTarget({ type: "Kendaraan", id: v.cb, name: `${v.cb} (${v.plat})` })}
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
        title={`${f("id") ? "Ubah" : "Tambah"} ${tab.toLowerCase()}`}
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
                />
              </Field>
              <Field label="Jenis">
                <select
                  value={f("kontrak") || "tidak"}
                  onChange={(e) => set("kontrak", e.target.value)}
                  className={inputCls()}
                >
                  <option value="tidak">Reguler</option>
                  <option value="ya">Kontrak (nilai tetap)</option>
                </select>
              </Field>
              {f("kontrak") === "ya" && (
                <Field label="Nilai tetap (Rp)">
                  <input
                    inputMode="numeric"
                    value={f("nilai")}
                    onChange={(e) => set("nilai", e.target.value)}
                    placeholder="Contoh: 50.000.000"
                    className={cx(inputCls(), "num")}
                  />
                </Field>
              )}
            </>
          )}

          {tab === "Jalur" && (
            <>
              <Field label="Nama Jalur">
                <input
                  value={f("nama")}
                  onChange={(e) => set("nama", e.target.value)}
                  placeholder="Contoh: Terminal Ledeng - Leuwipanjang"
                  className={inputCls()}
                />
              </Field>
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
              {!f("id") && (
                <Field label="Tarif Tiket Awal (Rp, opsional)">
                  <input
                    inputMode="numeric"
                    value={f("tarif")}
                    onChange={(e) => set("tarif", e.target.value)}
                    placeholder="Contoh: 15.000 (biarkan kosong jika kontrak / Rp 0)"
                    className={cx(inputCls(), "num")}
                  />
                </Field>
              )}
            </>
          )}

          {tab === "Kendaraan" && (
            <>
              <Field label="Nomor CB">
                <input
                  value={f("cb")}
                  onChange={(e) => set("cb", e.target.value)}
                  placeholder="CB-1080"
                  className={inputCls()}
                />
              </Field>
              <Field label="Plat">
                <input
                  value={f("plat")}
                  onChange={(e) => set("plat", e.target.value)}
                  placeholder="D 7080 AE"
                  className={inputCls()}
                />
              </Field>
            </>
          )}

          {tab === "Tarif" && (
            <>
              <Field label="Jalur">
                <select
                  value={f("jalurId") || jals[0]?.id || ""}
                  onChange={(e) => set("jalurId", e.target.value)}
                  className={inputCls()}
                >
                  {jals.length === 0 ? (
                    <option value="">(Belum ada Jalur - buat Jalur terlebih dahulu)</option>
                  ) : (
                    jals.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.nama} {j.tarif ? `(Saat ini: ${rupiah(j.tarif)})` : `(Belum ada tarif)`}
                      </option>
                    ))
                  )}
                </select>
              </Field>
              <Field label="Tarif baru (Rp)">
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
        title={`Hapus ${deleteTarget?.type}?`}
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
          Apakah Anda yakin ingin menghapus {deleteTarget?.type.toLowerCase()}{" "}
          <b className="font-semibold text-ink">{deleteTarget?.name}</b> secara permanen?
        </p>
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
          <strong>Peringatan:</strong> Tindakan ini akan menghapus data dari master operasional secara permanen dan tidak dapat dibatalkan. Jika data pernah digunakan dalam riwayat perjalanan terdahulu, disarankan untuk memilih opsi <em>Nonaktifkan</em> agar laporan masa lalu tetap utuh.
        </p>
      </Dialog>
    </>
  )
}