"use client"

import { useMemo, useState } from "react"
import {
  AlertCircle,
  ArrowDownUp,
  Bus,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react"
import type { Departure } from "@/lib/data"
import { calc, fmtDate, jalur, plat, rupiah, seg, TODAY } from "@/lib/data"
import { Empty, LiveDateTime, StatusBadge, cx } from "@/components/ui"
import { DRIVER_PHOTO } from "./shared"

interface Props {
  mine: Departure[]
  nama: string
  onOpen: (id: string) => void
}

type StatusFilter = "all" | "disetujui" | "revisi"
type SortOrder = "desc" | "asc"

export default function RiwayatSopir({ mine, nama, onOpen }: Props) {
  // Rentang kalender (ISO YYYY-MM-DD)
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false)

  // Quick preset helper
  const applyPreset = (preset: "all" | "today" | "7days" | "month") => {
    if (preset === "all") {
      setStartDate("")
      setEndDate("")
      return
    }
    const today = new Date(TODAY)
    const endStr = TODAY

    if (preset === "today") {
      setStartDate(TODAY)
      setEndDate(TODAY)
    } else if (preset === "7days") {
      const past = new Date(today)
      past.setDate(today.getDate() - 6)
      setStartDate(past.toISOString().slice(0, 10))
      setEndDate(endStr)
    } else if (preset === "month") {
      const yearMonth = TODAY.slice(0, 7) // '2026-10'
      setStartDate(`${yearMonth}-01`)
      setEndDate(endStr)
    }
  }

  // Active filter indicator
  const hasDateFilter = Boolean(startDate || endDate)

  // Filter & sortir data (Hanya data riwayat yang sudah disetujui atau perlu perbaikan)
  const filteredList = useMemo(() => {
    return mine
      .filter((d) => {
        // Keberangkatan yang masih menunggu persetujuan berada di laman Keberangkatan, bukan Riwayat
        if (d.status === "dikirim") return false

        // Filter rentang tanggal kalender
        if (startDate && d.date < startDate) return false
        if (endDate && d.date > endDate) return false

        // Filter status / notifikasi
        if (statusFilter === "disetujui") return d.status === "disetujui"
        if (statusFilter === "revisi") return Boolean(d.rejectNote)

        return true
      })
      .sort((a, b) => {
        const dtA = a.date + a.time
        const dtB = b.date + b.time
        return sortOrder === "desc"
          ? dtB.localeCompare(dtA)
          : dtA.localeCompare(dtB)
      })
  }, [mine, startDate, endDate, statusFilter, sortOrder])

  // Ringkasan metrik dalam rentang waktu yang dipilih
  const metrics = useMemo(() => {
    const inRange = mine.filter((d) => {
      if (d.status === "dikirim") return false
      if (startDate && d.date < startDate) return false
      if (endDate && d.date > endDate) return false
      return true
    })

    const acc = inRange.filter((d) => d.status === "disetujui")
    const rev = inRange.filter((d) => Boolean(d.rejectNote))

    const totalPendapatanAcc = acc.reduce(
      (sum, d) => sum + (calc(d).total || 0),
      0,
    )

    return {
      total: inRange.length,
      accCount: acc.length,
      revCount: rev.length,
      totalPendapatanAcc,
    }
  }, [mine, startDate, endDate])

  return (
    <>
      {/* Header Utama Riwayat */}
      <header className="relative overflow-hidden bg-navy/90 px-5 pb-6 pt-6 text-white shadow-md backdrop-blur-md">
        <svg
          aria-hidden
          className="absolute -right-6 top-4 w-56 text-white/15"
          viewBox="0 0 200 80"
          fill="none"
        >
          <path
            d="M0 70 C 50 70, 60 20, 110 30 S 170 60, 200 10"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="3 6"
          />
          <circle cx="200" cy="10" r="5" fill="#10b981" />
        </svg>

        <div className="relative flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={DRIVER_PHOTO}
              alt={`Foto profil ${nama}`}
              className="size-12 shrink-0 rounded-xl border-2 border-white/80 object-cover shadow-md"
            />
            <div className="min-w-0">
              <p className="text-xs text-white/85">Riwayat & Notifikasi</p>
              <p className="truncate font-semibold">{nama}</p>
            </div>
          </div>
          <div className="shrink-0 rounded-xl border border-white/25 bg-white/15 px-3 py-2 shadow-sm backdrop-blur">
            <LiveDateTime light align="right" />
          </div>
        </div>

        <div className="relative mt-5 flex items-end justify-between gap-3 border-t border-white/15 pt-5">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/80">
              Laporan Operasional
            </p>
            <h1 className="font-serif text-3xl leading-tight sm:text-4xl">
              Riwayat & Notifikasi
            </h1>
          </div>
        </div>
      </header>

      {/* Kontrol Kalender & Filter Rentang Waktu */}
      <section className="border-b border-line bg-wash/60 px-5 py-3">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setShowDatePicker((prev) => !prev)}
            className={cx(
              "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold shadow-xs transition",
              hasDateFilter
                ? "border-navy bg-navy text-white"
                : "border-line bg-white text-ink hover:bg-wash",
            )}
          >
            <Calendar size={14} />
            <span>
              {hasDateFilter
                ? `${startDate ? fmtDate(startDate) : "Awal"} – ${endDate ? fmtDate(endDate) : "Sekarang"}`
                : "Pilih Rentang Kalender"}
            </span>
            <SlidersHorizontal size={13} className="opacity-70" />
          </button>

          {/* Tombol Urutan Sortir */}
          <button
            type="button"
            onClick={() =>
              setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))
            }
            title={
              sortOrder === "desc"
                ? "Urutan: Terbaru ke Terlama"
                : "Urutan: Terlama ke Terbaru"
            }
            className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink shadow-xs transition hover:bg-wash"
          >
            <ArrowDownUp size={13} className="text-navy" />
            <span>{sortOrder === "desc" ? "Terbaru" : "Terlama"}</span>
          </button>

          {/* Reset filter jika aktif */}
          {hasDateFilter && (
            <button
              type="button"
              onClick={() => applyPreset("all")}
              title="Reset rentang waktu"
              className="grid size-9 place-items-center rounded-xl border border-line bg-white text-mute hover:bg-red-50 hover:text-red-600 transition"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>

        {/* Panel Input Kalender Rentang Waktu */}
        {showDatePicker && (
          <div className="rise mt-3 rounded-2xl border border-line bg-white p-3.5 shadow-md">
            <div className="flex items-center justify-between border-b border-line pb-2.5">
              <span className="flex items-center gap-1.5 text-xs font-bold text-ink">
                <CalendarDays size={14} className="text-navy" /> Rentang Tanggal
              </span>
              <button
                type="button"
                onClick={() => setShowDatePicker(false)}
                className="text-xs text-mute hover:text-ink font-medium"
              >
                Tutup
              </button>
            </div>

            {/* Input Kalender User: Dari dan Sampai */}
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-mute uppercase tracking-wider mb-1">
                  Dari Tanggal
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-line bg-wash/40 px-2.5 py-1.5 text-xs font-medium text-ink focus:border-navy focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-mute uppercase tracking-wider mb-1">
                  Sampai Tanggal
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-lg border border-line bg-wash/40 px-2.5 py-1.5 text-xs font-medium text-ink focus:border-navy focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Tombol Preset Cepat */}
            <div className="mt-3 flex flex-wrap gap-1.5 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => applyPreset("today")}
                className="rounded-lg border border-line bg-wash px-2.5 py-1 text-[11px] font-medium text-ink hover:bg-navy hover:text-white transition"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => applyPreset("7days")}
                className="rounded-lg border border-line bg-wash px-2.5 py-1 text-[11px] font-medium text-ink hover:bg-navy hover:text-white transition"
              >
                7 Hari Terakhir
              </button>
              <button
                type="button"
                onClick={() => applyPreset("month")}
                className="rounded-lg border border-line bg-wash px-2.5 py-1 text-[11px] font-medium text-ink hover:bg-navy hover:text-white transition"
              >
                Bulan Ini (Okt 2026)
              </button>
              <button
                type="button"
                onClick={() => applyPreset("all")}
                className="rounded-lg border border-line bg-wash px-2.5 py-1 text-[11px] font-medium text-mute hover:bg-red-50 hover:text-red-700 transition ml-auto"
              >
                Semua
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Tabs Kategori Status Laporan Riwayat (Seimbang kiri-kanan) */}
      <div className="sticky top-0 z-20 grid grid-cols-3 gap-2 border-b border-line bg-white/95 px-5 py-3 backdrop-blur">
        {[
          { k: "all", l: "Semua", count: metrics.total },
          { k: "disetujui", l: "Disetujui", count: metrics.accCount },
          { k: "revisi", l: "Perbaikan", count: metrics.revCount },
        ].map((t) => (
          <button
            key={t.k}
            type="button"
            onClick={() => setStatusFilter(t.k as StatusFilter)}
            className={cx(
              "flex h-10 w-full items-center justify-center gap-1.5 rounded-full border px-2 text-xs sm:text-sm font-semibold transition",
              statusFilter === t.k
                ? "border-navy bg-navy text-white shadow-xs"
                : "border-line text-mute hover:bg-wash",
            )}
          >
            <span className="truncate">{t.l}</span>
            <span
              className={cx(
                "num shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-bold leading-none",
                statusFilter === t.k
                  ? "bg-white/25 text-white"
                  : t.k === "revisi" && t.count > 0
                    ? "bg-red-100 text-red-700"
                    : "bg-slate-100 text-mute",
              )}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Daftar Item Riwayat & Notifikasi Status Laporan */}
      {filteredList.length === 0 ? (
        <Empty
          title="Tidak ada riwayat laporan"
          hint={
            hasDateFilter
              ? "Tidak ada laporan pada rentang tanggal yang dipilih. Ubah tanggal atau tekan tombol reset."
              : "Belum ada riwayat keberangkatan pada kategori ini."
          }
          action={
            hasDateFilter ? (
              <button
                type="button"
                onClick={() => applyPreset("all")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-navy shadow-xs hover:bg-navy-50"
              >
                <RotateCcw size={13} /> Tampilkan Semua Waktu
              </button>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-3.5 px-5 py-4">
          {filteredList.map((d) => {
            const c = calc(d)
            const isApproved = d.status === "disetujui"
            const isRevision = Boolean(d.rejectNote)

            return (
              <li key={d.id}>
                <div
                  className={cx(
                    "rounded-2xl border border-line bg-white p-4 shadow-sm transition hover:shadow-md",
                    isApproved && "border-l-4 border-l-emerald-500",
                    isRevision && "border-l-4 border-l-red-500 bg-red-50/20",
                  )}
                >
                  {/* Status Banner Notifikasi */}
                  <div className="flex items-center justify-between gap-2 border-b border-line/70 pb-2.5">
                    <span className="num flex items-center gap-1.5 text-xs font-medium text-mute">
                      <CalendarDays size={13} /> {fmtDate(d.date)}{" "}
                      <Clock size={13} className="ml-1" /> {d.time}
                    </span>
                    <StatusBadge status={d.status} rejected={isRevision} />
                  </div>

                  {/* Trayek & Armada Bus */}
                  <div className="mt-3">
                    <p className="text-base font-bold text-ink leading-snug">
                      {jalur(d.jalurId).nama}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-mute">
                      <Bus size={13} className="text-navy" />
                      <span className="num font-semibold text-ink">{d.cb}</span> ·{" "}
                      <span className="num">{plat(d.cb)}</span> ·{" "}
                      <span>{seg(d.segmentId).nama}</span>
                    </p>
                  </div>

                  {/* NOTIFIKASI KHUSUS PERBAIKAN KOORDINATOR */}
                  {isRevision && (
                    <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-900">
                      <div className="flex items-center gap-1.5 font-bold text-red-700">
                        <AlertCircle size={15} />
                        <span>Catatan Perbaikan dari Koordinator:</span>
                      </div>
                      <p className="mt-1.5 leading-relaxed text-red-800">
                        {d.rejectNote}
                      </p>
                      <div className="mt-2.5 flex justify-end">
                        <button
                          type="button"
                          onClick={() => onOpen(d.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-red-700"
                        >
                          Perbaiki Sekarang <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* NOTIFIKASI KHUSUS DISETUJUI KOORDINATOR */}
                  {isApproved && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-900">
                      <CheckCircle2
                        size={14}
                        className="shrink-0 text-emerald-600"
                      />
                      <span>
                        Laporan telah disetujui & diverifikasi resmi oleh
                        Koordinator.
                      </span>
                    </div>
                  )}

                  {/* Ringkasan Produksi & Pendapatan */}
                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-wash/60 p-2.5 text-xs">
                    <div>
                      <span className="text-mute block text-[11px]">
                        KM Tempuh / Penumpang
                      </span>
                      <span className="num font-semibold text-ink">
                        {d.kmTempuh != null ? `${d.kmTempuh} km` : "–"} ·{" "}
                        {d.penumpang != null ? `${d.penumpang} org` : "–"}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-mute block text-[11px]">
                        Total Pendapatan
                      </span>
                      <span className="num font-bold text-sm text-navy">
                        {d.pendapatan != null ? rupiah(c.total) : "–"}
                      </span>
                    </div>
                  </div>

                  {/* Tombol Buka Detail Laporan */}
                  <div className="mt-3 flex items-center justify-between border-t border-line/70 pt-2.5">
                    <span className="text-[11px] text-mute">
                      ID Keberangkatan:{" "}
                      <span className="num font-mono">{d.id}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpen(d.id)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-navy hover:underline"
                    >
                      Lihat rincian <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
