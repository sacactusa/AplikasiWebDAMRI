"use client"

import { useEffect, useRef, useState } from "react"
import { AlertCircle, ChevronRight, Trash2 } from "lucide-react"
import type { Departure } from "@/lib/data"
import { fmtDate, jalur, plat, rupiah, seg } from "@/lib/data"
import { Btn, Dialog, Field, NumInput, StatusBadge, cx } from "@/components/ui"
import { TopBar } from "./shared"
import { supabase } from "@/lib/supabase"

interface Props {
  dep: Departure
  offline: boolean
  onBack: () => void
  onSave: (d: Departure) => void
  onSubmit: (d: Departure) => void
  onDeleteDraft?: (id: string) => void
  currentUser?: { nama: string; email: string; id?: string } | null
}

interface TarifItem {
  id: string
  nama: string
  tarif: number
}

export default function DetailKeberangkatan({
  dep,
  offline,
  onBack,
  onSave,
  onSubmit,
  onDeleteDraft,
  currentUser,
}: Props) {
  const isDemoDriver = currentUser?.email === "sopir@damri.co.id"
  const [d, setD] = useState(dep)
  const [tried, setTried] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const s = seg(d.segmentId)
  const isRevision = dep.status === "perbaikan" || Boolean(dep.rejectNote)
  const ro = dep.status === "dikirim" || dep.status === "disetujui"

  // Inisialisasi awal tarif berlaku untuk jalur ini (kosong jika belum ada di data master)
  const [tarifItems, setTarifItems] = useState<TarifItem[]>([])

  // State jumlah penumpang per jenis penumpang
  const [paxCounts, setPaxCounts] = useState<Record<string, number | null>>(() => {
    const init: Record<string, number | null> = {}
    if (dep.passengerCounts) {
      return { ...dep.passengerCounts }
    }
    if (dep.penumpang != null) init["umum"] = dep.penumpang
    if (dep.pm != null) init["pm"] = dep.pm
    return init
  })

  // Ambil data tarif dan jenis penumpang sesuai segmen & jalur dari database
  useEffect(() => {
    let active = true

    async function loadTarifDanPenumpang() {
      if (isDemoDriver) {
        const jObj = jalur(d.jalurId)
        if (jObj && active) {
          setD((prev) => ({
            ...prev,
            kmTempuh: prev.kmTempuh != null && Number(prev.kmTempuh) > 0 ? prev.kmTempuh : (jObj.kmTempuh ?? prev.kmTempuh),
            kmEmpty: prev.kmEmpty != null ? prev.kmEmpty : (jObj.kmEmpty ?? prev.kmEmpty),
          }))
        }
        const demoTarifs: Record<string, TarifItem[]> = {
          j1: [{ id: "umum", nama: "Umum", tarif: 140000 }],
          j2: [{ id: "umum", nama: "Umum", tarif: 150000 }],
          j5: [{ id: "umum", nama: "Umum", tarif: 80000 }],
        }
        const matched = demoTarifs[d.jalurId] || []
        if (active) {
          setTarifItems(matched)
          setPaxCounts((prev) => {
            const next = { ...prev }
            for (const it of matched) {
              if (next[it.id] === undefined) {
                if (it.id === "umum") next[it.id] = dep.penumpang ?? null
                else if (it.id === "pm") next[it.id] = dep.pm ?? null
                else next[it.id] = null
              }
            }
            return next
          })
        }
        return
      }

      try {
        const [paxsRes, tjRes, jalRes] = await Promise.all([
          supabase.from("jenis_penumpang").select("*").order("created_at"),
          supabase
            .from("tarif_jalur")
            .select("*")
            .eq("jalur_id", d.jalurId)
            .order("berlaku_mulai", { ascending: false }),
          supabase.from("jalur").select("id, nama, km_tempuh, km_empty").eq("id", d.jalurId).limit(1),
        ])

        if (!active) return

        if (jalRes.data?.[0]) {
          const jRow = jalRes.data[0]
          setD((prev) => ({
            ...prev,
            kmTempuh: prev.kmTempuh != null && Number(prev.kmTempuh) > 0 ? prev.kmTempuh : (jRow.km_tempuh != null ? Number(jRow.km_tempuh) : prev.kmTempuh),
            kmEmpty: prev.kmEmpty != null ? prev.kmEmpty : (jRow.km_empty != null ? Number(jRow.km_empty) : prev.kmEmpty),
          }))
        }

        let activePaxs = (paxsRes.data || []).filter((p) => p.aktif)
        if (paxsRes.error || activePaxs.length === 0) {
          const p2 = await supabase.from("penumpang").select("*").order("created_at")
          if (!p2.error && p2.data) {
            activePaxs = p2.data.filter((p) => p.aktif !== false)
          }
        }

        const items: TarifItem[] = []
        const seenPaxs = new Set<string>()

        // HANYA tampilkan jenis penumpang yang diatur pada Data Master Tarif untuk jalur ini.
        // Jika belum ada jenis penumpang di data master untuk jalur ini, items tetap kosong ([]).
        if (tjRes.data && tjRes.data.length > 0) {
          const defaultUmumPax = activePaxs.find((p) => p.nama.toLowerCase().includes("umum"))
          for (const row of tjRes.data) {
            const matchedPax =
              activePaxs.find(
                (p) =>
                  p.id === row.jenis_penumpang_id ||
                  p.nama.toLowerCase() === (row.jenis_penumpang || "").toLowerCase(),
              ) || defaultUmumPax
            const pName = matchedPax?.nama || row.jenis_penumpang || "Umum"
            const pId =
              matchedPax?.id ||
              row.jenis_penumpang_id ||
              (pName.toLowerCase().includes("pelajar") || pName.toLowerCase().includes("p/m")
                ? "pm"
                : "umum")

            if (!seenPaxs.has(pId) && !seenPaxs.has(pName.toLowerCase())) {
              seenPaxs.add(pId)
              seenPaxs.add(pName.toLowerCase())
              items.push({
                id: pId,
                nama: pName,
                tarif: Number(row.tarif) || 0,
              })
            }
          }
        }

        setTarifItems(items)

        // Sinkronisasi nilai penumpang yang sudah pernah disimpan
        setPaxCounts((prev) => {
          const next = { ...prev }
          for (const it of items) {
            if (next[it.id] === undefined) {
              if (dep.passengerCounts && dep.passengerCounts[it.id] !== undefined) {
                next[it.id] = dep.passengerCounts[it.id]
              } else if (it.id === "umum" || it.nama.toLowerCase().includes("umum")) {
                next[it.id] = dep.penumpang ?? null
              } else if (
                it.id === "pm" ||
                it.nama.toLowerCase().includes("pelajar") ||
                it.nama.toLowerCase().includes("p/m")
              ) {
                next[it.id] = dep.pm ?? null
              } else {
                next[it.id] = null
              }
            }
          }
          return next
        })
      } catch (err) {
        console.warn("Gagal memuat tarif_jalur dari Supabase:", err)
        setTarifItems([])
      }
    }

    loadTarifDanPenumpang()
    return () => {
      active = false
    }
  }, [d.jalurId, dep.passengerCounts, dep.penumpang, dep.pm, isDemoDriver])

  // Hitung total pendapatan (jalur/segmen yang belum ada tarifnya di data master bernilai 0)
  const totalPaxRevenue = tarifItems.reduce((acc, it) => {
    const count = Number(paxCounts[it.id]) || 0
    return acc + count * (it.tarif || 0)
  }, 0)

  // Nilai tetap kontrak: jika belum ada di data master nilainya 0
  const revenueFromPassengers = s.kontrak ? (s.nilaiTetap || 0) : totalPaxRevenue

  const handlePaxCountChange = (id: string, val: number | null) => {
    setPaxCounts((prev) => ({ ...prev, [id]: val }))

    const item = tarifItems.find((t) => t.id === id)
    const isUmum = id === "umum" || item?.nama.toLowerCase().includes("umum")
    const isPm =
      id === "pm" ||
      item?.nama.toLowerCase().includes("pelajar") ||
      item?.nama.toLowerCase().includes("p/m")

    setD((prev) => {
      const next = { ...prev }
      if (isUmum) {
        next.penumpang = val
      } else if (isPm) {
        next.pm = val
      } else if (next.penumpang == null && val != null) {
        next.penumpang = val
      }
      return next
    })
  }

  const set = (k: keyof Departure) => (v: number | null) =>
    setD((p) => ({ ...p, [k]: v }))

  // Jarak kini telah menjadi nilai tetap dari Master Data Jalur sehingga tidak diinput lagi oleh sopir
  const hasErrors = false

  const prepare = (status?: Departure["status"]): Departure => {
    let umumCount = 0
    let pmCount = 0
    const finalPaxCounts: Record<string, number> = {}

    for (const it of tarifItems) {
      const val = Number(paxCounts[it.id]) || 0
      finalPaxCounts[it.id] = val
      if (it.id === "umum" || it.nama.toLowerCase().includes("umum")) {
        umumCount = val
      } else if (
        it.id === "pm" ||
        it.nama.toLowerCase().includes("pelajar") ||
        it.nama.toLowerCase().includes("p/m")
      ) {
        pmCount = val
      }
    }

    if (tarifItems.length === 0) {
      umumCount = d.penumpang ?? 0
      pmCount = d.pm ?? 0
    }

    const jObj = jalur(d.jalurId)
    const fixedKmTempuh =
      d.kmTempuh != null && Number(d.kmTempuh) > 0
        ? Number(d.kmTempuh)
        : jObj?.kmTempuh != null && Number(jObj.kmTempuh) > 0
          ? Number(jObj.kmTempuh)
          : 0
    const fixedKmEmpty =
      d.kmEmpty != null
        ? Number(d.kmEmpty)
        : jObj?.kmEmpty != null
          ? Number(jObj.kmEmpty)
          : 0

    return {
      ...d,
      kmTempuh: fixedKmTempuh,
      kmEmpty: fixedKmEmpty,
      penumpang: umumCount,
      pm: pmCount,
      pendapatan: revenueFromPassengers ?? 0,
      subsidi: d.subsidi != null ? Number(d.subsidi) : 0,
      bagasi: d.bagasi != null ? Number(d.bagasi) : 0,
      passengerCounts: finalPaxCounts,
      ...(status ? { status, rejectNote: undefined } : {}),
    }
  }

  const send = async () => {
    setTried(true)
    if (hasErrors) {
      setTimeout(
        () =>
          ref.current
            ?.querySelector('[data-error="true"]')
            ?.scrollIntoView({ behavior: "smooth", block: "center" }),
        50,
      )
      return
    }
    setSubmitting(true)
    try {
      await onSubmit(prepare("dikirim"))
    } finally {
      setSubmitting(false)
    }
  }

  const num = (
    label: string,
    k: keyof Departure,
    o: { money?: boolean; suffix?: string; locked?: boolean } = {},
  ) => {
    return (
      <Field label={label} locked={o.locked}>
        <NumInput
          value={d[k] as number | null}
          onChange={set(k)}
          money={o.money}
          suffix={o.suffix}
          disabled={ro || o.locked}
        />
      </Field>
    )
  }

  const card = (t: string, body: React.ReactNode) => (
    <section className="rounded-xl border border-line p-4">
      <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-navy">
        {t}
      </h2>
      <div className="space-y-4">{body}</div>
    </section>
  )

  return (
    <>
      <TopBar
        title={isRevision ? "Perbaikan Keberangkatan" : ro ? "Detail Keberangkatan" : "Isi Hasil"}
        onBack={onBack}
        detail
      />
      <div ref={ref} className="space-y-4 px-5 py-5">
        {isRevision && (
          <div className="rounded-2xl border border-red-300 bg-red-50/90 p-4 shadow-xs">
            <div className="flex items-center gap-2 text-sm font-bold text-red-900">
              <AlertCircle size={18} className="shrink-0 text-red-600" />
              <span>Catatan Perbaikan dari Koordinator:</span>
            </div>
            <p className="mt-2 rounded-xl border border-red-200 bg-white/95 p-3 text-sm font-medium leading-relaxed text-red-950 shadow-2xs">
              {dep.rejectNote || "Silakan perbaiki data operasional lalu kirim kembali ke koordinator."}
            </p>
            <p className="mt-2.5 text-xs text-red-800">
              Silakan perbaiki data di bawah, lalu ketuk tombol <b>Kirim Ulang ke Koordinator</b>.
            </p>
          </div>
        )}
        <div className="rounded-xl bg-navy-50 p-4">
          <div className="flex items-center justify-between">
            <StatusBadge status={dep.status} rejected={!!dep.rejectNote} />
            <span className="num text-xs text-mute">
              {fmtDate(d.date)} · {d.time}
            </span>
          </div>
          <p className="mt-2 font-semibold">{d.jalurNama || jalur(d.jalurId).nama}</p>
          <p className="text-sm text-mute">
            {s.nama} · <span className="num">{plat(d.cb) || d.cb}</span>
          </p>
        </div>
        {ro && (
          <p className="text-xs text-mute">
            {dep.status === "dikirim"
              ? "Menunggu verifikasi — data tidak dapat diubah."
              : "Disetujui — data terkunci dan masuk rekap."}
          </p>
        )}

        {/* 1 · Penumpang - Dinamis sesuai jenis penumpang pada segmen & jalur */}
        {card(
          "1 · Penumpang",
          <>
            {tarifItems.length > 0 ? (
              tarifItems.map((item) => {
                const val = paxCounts[item.id]
                const labelText = item.nama.toLowerCase().startsWith("penumpang")
                  ? item.nama
                  : `Penumpang ${item.nama}`

                return (
                  <Field
                    key={item.id}
                    label={
                      <div className="flex items-center justify-between">
                        <span>{labelText}</span>
                        <span className="text-xs font-normal text-mute">
                          Tarif: {rupiah(item.tarif || 0)}
                        </span>
                      </div>
                    }
                  >
                    <NumInput
                      value={val ?? null}
                      onChange={(v) => handlePaxCountChange(item.id, v)}
                      suffix="orang"
                      disabled={ro}
                    />
                  </Field>
                )
              })
            ) : (
              <div className="rounded-xl border border-dashed border-line bg-wash/60 p-4 text-center">
                <p className="text-xs font-medium text-mute">
                  Belum ada jenis penumpang yang diatur untuk jalur ini pada Data Master Tarif.
                </p>
              </div>
            )}
          </>,
        )}

        {/* 2 · Pendapatan */}
        {card(
          "2 · Pendapatan",
          <>
            {num("Subsidi", "subsidi", { money: true, locked: s.kontrak })}
            {num("Bagasi", "bagasi", { money: true })}
          </>,
        )}

        {/* 3 · Total Pendapatan */}
        {card(
          "3 · Total Pendapatan",
          <>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between items-center py-1 border-b border-line/50">
                <span className="text-mute">Pendapatan tiket</span>
                <span className="num font-semibold text-ink">{rupiah(revenueFromPassengers)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-line/50">
                <span className="text-mute">Subsidi</span>
                <span className="num font-semibold text-ink">{rupiah(d.subsidi ?? 0)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-line/50">
                <span className="text-mute">Bagasi</span>
                <span className="num font-semibold text-ink">{rupiah(d.bagasi ?? 0)}</span>
              </div>
              <div className="flex justify-between items-baseline pt-2">
                <span className="text-sm font-bold text-ink">Total pendapatan</span>
                <span className="num text-xl font-bold text-navy">
                  {rupiah((revenueFromPassengers || 0) + (d.subsidi ?? 0) + (d.bagasi ?? 0))}
                </span>
              </div>
            </div>
          </>,
        )}

        {!ro && (
          <div className="space-y-3 pt-2">
            {offline && (
              <p className="text-center text-xs font-medium text-red-700">
                Tidak ada koneksi — simpan dan kirim dinonaktifkan.
              </p>
            )}
            <Btn className="h-12 w-full" disabled={offline || submitting} onClick={send}>
              {submitting ? "Mengirim ke koordinator..." : isRevision ? "Kirim Ulang ke Koordinator" : "Kirim"}
              <ChevronRight size={18} />
            </Btn>
            {tried && hasErrors && (
              <p className="text-center text-xs text-red-600">
                Kolom wajib belum terisi lengkap.
              </p>
            )}
            {!isRevision && dep.status === "draft" && (
              <Btn
                variant="outline"
                className="h-12 w-full"
                disabled={offline || submitting}
                onClick={() => onSave(prepare())}
              >
                Simpan Draft
              </Btn>
            )}
            {!isRevision && d.status === "draft" && onDeleteDraft && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => setConfirmDelete(true)}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50/70 text-xs font-semibold text-red-600 transition hover:bg-red-100 active:scale-98 cursor-pointer disabled:opacity-50"
              >
                <Trash2 size={15} />
                <span>Hapus Draft</span>
              </button>
            )}
          </div>
        )}
      </div>

      <Dialog
        open={confirmDelete}
        danger
        title="Hapus draft keberangkatan?"
        onClose={() => setConfirmDelete(false)}
        actions={
          <>
            <Btn variant="outline" onClick={() => setConfirmDelete(false)}>
              Batal
            </Btn>
            <Btn
              variant="danger"
              onClick={() => {
                setConfirmDelete(false)
                onDeleteDraft?.(d.id)
              }}
            >
              Ya, hapus draft
            </Btn>
          </>
        }
      >
        <p className="text-sm text-ink">
          Apakah Anda yakin ingin menghapus draft keberangkatan ini? Tindakan ini hanya berlaku untuk status draft dan tidak dapat dibatalkan.
        </p>
      </Dialog>
    </>
  )
}
