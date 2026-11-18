"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronRight, Trash2 } from "lucide-react"
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
}

interface TarifItem {
  id: string
  nama: string
  tarif: number
}

export default function DetailKeberangkatan({ dep, offline, onBack, onSave, onSubmit, onDeleteDraft }: Props) {
  const [d, setD] = useState(dep)
  const [tried, setTried] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const s = seg(d.segmentId)
  const ro = dep.status !== "draft"

  // Inisialisasi awal tarif berlaku untuk jalur ini
  const [tarifItems, setTarifItems] = useState<TarifItem[]>(() => {
    const defaultTarif = jalur(d.jalurId)?.tarif || 0
    return [{ id: "umum", nama: "Umum", tarif: defaultTarif }]
  })

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
      try {
        const [paxsRes, tjRes] = await Promise.all([
          supabase.from("jenis_penumpang").select("*").order("created_at"),
          supabase
            .from("tarif_jalur")
            .select("*")
            .eq("jalur_id", d.jalurId)
            .order("berlaku_mulai", { ascending: false }),
        ])

        if (!active) return

        const activePaxs = (paxsRes.data || []).filter((p) => p.aktif)
        const items: TarifItem[] = []

        if (tjRes.data && tjRes.data.length > 0) {
          const seenPaxs = new Set<string>()

          for (const row of tjRes.data) {
            const paxId = row.jenis_penumpang_id || "umum"
            if (!seenPaxs.has(paxId)) {
              seenPaxs.add(paxId)
              const matchedPax = activePaxs.find((p) => p.id === row.jenis_penumpang_id)
              const paxNama = matchedPax?.nama || row.jenis_penumpang || "Umum"
              items.push({
                id: paxId,
                nama: paxNama,
                tarif: Number(row.tarif) || 0,
              })
            }
          }
        }

        // Jika tidak ada data spesifik di tarif_jalur, gunakan fallback tarif jalur
        if (items.length === 0) {
          const defaultTarif = jalur(d.jalurId)?.tarif || 0
          items.push({
            id: "umum",
            nama: "Umum",
            tarif: defaultTarif,
          })
        }

        setTarifItems(items)

        // Sinkronisasi nilai penumpang yang sudah pernah disimpan
        setPaxCounts((prev) => {
          const next = { ...prev }
          for (const it of items) {
            if (next[it.id] === undefined) {
              if (it.id === "umum" || it.nama.toLowerCase().includes("umum")) {
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
      }
    }

    loadTarifDanPenumpang()
    return () => {
      active = false
    }
  }, [d.jalurId, d.segmentId, dep.penumpang, dep.pm])

  // Hitung total pendapatan
  const totalPaxRevenue = tarifItems.reduce((acc, it) => {
    const count = paxCounts[it.id] ?? 0
    return acc + count * it.tarif
  }, 0)

  const revenueFromPassengers = s.kontrak ? (s.nilaiTetap || 0) : totalPaxRevenue
  const totalRevenue = revenueFromPassengers + (d.subsidi ?? 0) + (d.bagasi ?? 0)

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

  // Cek apakah ada field wajib yang belum diisi
  const isKmTempuhMissing = d.kmTempuh == null
  const isKmEmptyMissing = d.kmEmpty == null
  const isPaxMissing =
    tarifItems.length > 0
      ? tarifItems.some((it) => paxCounts[it.id] == null)
      : d.penumpang == null

  const hasErrors = isKmTempuhMissing || isKmEmptyMissing || isPaxMissing

  const prepare = (status?: Departure["status"]): Departure => {
    let umumCount = d.penumpang
    let pmCount = d.pm

    for (const it of tarifItems) {
      const val = paxCounts[it.id]
      if (it.id === "umum" || it.nama.toLowerCase().includes("umum")) {
        if (val != null) umumCount = val
      } else if (
        it.id === "pm" ||
        it.nama.toLowerCase().includes("pelajar") ||
        it.nama.toLowerCase().includes("p/m")
      ) {
        if (val != null) pmCount = val
      }
    }

    if (tarifItems.length === 1 && pmCount == null) {
      pmCount = 0
    }

    return {
      ...d,
      penumpang: umumCount,
      pm: pmCount,
      pendapatan: revenueFromPassengers,
      subsidi: d.subsidi ?? 0,
      bagasi: d.bagasi ?? 0,
      passengerCounts: paxCounts as Record<string, number>,
      ...(status ? { status, rejectNote: undefined } : {}),
    }
  }

  const send = () => {
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
    setConfirm(true)
  }

  const num = (
    label: string,
    k: keyof Departure,
    o: { money?: boolean; suffix?: string; locked?: boolean } = {},
  ) => {
    const isFieldMissing =
      tried &&
      ((k === "kmTempuh" && isKmTempuhMissing) ||
        (k === "kmEmpty" && isKmEmptyMissing))

    return (
      <Field label={label} error={isFieldMissing ? "Wajib diisi" : undefined} locked={o.locked}>
        <NumInput
          value={d[k] as number | null}
          onChange={set(k)}
          money={o.money}
          suffix={o.suffix}
          error={!!isFieldMissing}
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
        title={ro ? "Detail Keberangkatan" : "Isi Hasil"}
        onBack={onBack}
        detail
      />
      <div ref={ref} className="space-y-4 px-5 py-5">
        {dep.rejectNote && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-bold text-red-800">
              Catatan koordinator
            </p>
            <p className="mt-1 text-sm text-red-900">{dep.rejectNote}</p>
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

        {/* 1 · Jarak */}
        {card(
          "1 · Jarak",
          <>
            {num("KM tempuh", "kmTempuh", { suffix: "km" })}
            {num("KM empty", "kmEmpty", { suffix: "km" })}
          </>,
        )}

        {/* 2 · Penumpang - Dinamis sesuai jenis penumpang pada segmen & jalur */}
        {card(
          "2 · Penumpang",
          <>
            {tarifItems.length > 0 ? (
              tarifItems.map((item) => {
                const val = paxCounts[item.id]
                const isErr = tried && val == null
                const labelText = item.nama.toLowerCase().startsWith("penumpang")
                  ? item.nama
                  : `Penumpang ${item.nama}`

                return (
                  <Field
                    key={item.id}
                    label={labelText}
                    error={isErr ? "Wajib diisi" : undefined}
                  >
                    <NumInput
                      value={val ?? null}
                      onChange={(v) => handlePaxCountChange(item.id, v)}
                      suffix="orang"
                      error={isErr}
                      disabled={ro}
                    />
                  </Field>
                )
              })
            ) : (
              <Field
                label="Penumpang Umum"
                error={tried && d.penumpang == null ? "Wajib diisi" : undefined}
              >
                <NumInput
                  value={d.penumpang}
                  onChange={(v) => {
                    set("penumpang")(v)
                    handlePaxCountChange("umum", v)
                  }}
                  suffix="orang"
                  error={tried && d.penumpang == null}
                  disabled={ro}
                />
              </Field>
            )}
          </>,
        )}

        {/* 3 · Pendapatan */}
        {card(
          "3 · Pendapatan",
          <>
            {num("Subsidi", "subsidi", { money: true, locked: s.kontrak })}
            {num("Bagasi", "bagasi", { money: true })}
          </>,
        )}

        {/* 4 · Jumlah Pendapatan (Tanpa UPP, Tarif Berlaku per Jenis Penumpang + Total Pendapatan) */}
        <section className="rounded-xl bg-ink p-4 text-white">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-white/60">
            4 · Jumlah Pendapatan
          </h2>
          <div className="space-y-3">
            {/* Tarif berlaku */}
            <div className="border-b border-white/10 pb-3">
              <span className="text-sm font-medium text-white/70">
                Tarif berlaku
              </span>
              <div className="mt-2 space-y-1.5 pl-1">
                {s.kontrak ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/80">Nilai tetap (Kontrak)</span>
                    <span className="num font-semibold text-white">
                      {rupiah(s.nilaiTetap)}
                    </span>
                  </div>
                ) : tarifItems.length > 0 ? (
                  tarifItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-white/80">{item.nama}</span>
                      <span className="num font-semibold text-white">
                        {rupiah(item.tarif)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/80">Umum</span>
                    <span className="num font-semibold text-white">
                      {rupiah(jalur(d.jalurId)?.tarif || 0)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Total pendapatan */}
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-sm font-semibold text-white/90">
                Total pendapatan
              </span>
              <span className="num text-xl font-bold text-emerald-400">
                {rupiah(totalRevenue)}
              </span>
            </div>
          </div>
        </section>

        {!ro && (
          <div className="space-y-3 pt-2">
            {offline && (
              <p className="text-center text-xs font-medium text-red-700">
                Tidak ada koneksi — simpan dan kirim dinonaktifkan.
              </p>
            )}
            <Btn className="h-12 w-full" disabled={offline} onClick={send}>
              {dep.rejectNote ? "Perbaiki dan kirim ulang" : "Kirim"}
              <ChevronRight size={18} />
            </Btn>
            {tried && hasErrors && (
              <p className="text-center text-xs text-red-600">
                Kolom wajib belum terisi lengkap.
              </p>
            )}
            <Btn
              variant="outline"
              className="h-12 w-full"
              disabled={offline}
              onClick={() => onSave(prepare())}
            >
              Simpan Draft
            </Btn>
            {d.status === "draft" && onDeleteDraft && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50/70 text-xs font-semibold text-red-600 transition hover:bg-red-100 active:scale-98 cursor-pointer"
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

      <Dialog
        open={confirm}
        title="Kirim keberangkatan?"
        onClose={() => setConfirm(false)}
        actions={
          <>
            <Btn variant="outline" onClick={() => setConfirm(false)}>
              Batal
            </Btn>
            <Btn onClick={() => onSubmit(prepare("dikirim"))}>
              Ya, kirim
            </Btn>
          </>
        }
      >
        Setelah dikirim, data tidak dapat diubah sampai diverifikasi.
      </Dialog>
    </>
  )
}
