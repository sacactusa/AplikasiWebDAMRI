"use client"

import { useMemo, useState } from "react"
import {
  AlertCircle,
  Bus,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Plus,
} from "lucide-react"
import type { Departure } from "@/lib/data"
import { calc, fmtDate, jalur, plat, rupiah, seg } from "@/lib/data"
import { Empty, LiveDateTime, StatusBadge, cx } from "@/components/ui"
import { DRIVER_PHOTO } from "./shared"

interface Props {
  mine: Departure[]
  nama: string
  onOpen: (id: string) => void
  onAdd?: () => void
}

type TabFilter = "all" | "draft" | "dikirim" | "revisi" | "disetujui"

export default function DaftarKeberangkatan({ mine, nama, onOpen, onAdd }: Props) {
  const [f, setF] = useState<TabFilter>("all")

  // Hitung jumlah keberangkatan berdasarkan masing-masing status
  const draftCount = useMemo(
    () => mine.filter((d) => d.status === "draft" && !d.rejectNote).length,
    [mine],
  )
  const sentCount = useMemo(
    () => mine.filter((d) => d.status === "dikirim").length,
    [mine],
  )
  const revCount = useMemo(
    () => mine.filter((d) => Boolean(d.rejectNote)).length,
    [mine],
  )
  const accCount = useMemo(
    () => mine.filter((d) => d.status === "disetujui").length,
    [mine],
  )

  // Kembalikan menu-menu sebelumnya lengkap dengan kategori Perbaikan
  const tabs: { k: TabFilter; l: string; count: number }[] = [
    { k: "all", l: "Semua", count: mine.length },
    { k: "draft", l: "Draft", count: draftCount },
    { k: "dikirim", l: "Dikirim", count: sentCount },
    { k: "revisi", l: "Perbaikan", count: revCount },
    { k: "disetujui", l: "Disetujui", count: accCount },
  ]

  // Filter daftar keberangkatan
  const list = useMemo(() => {
    return mine.filter((d) => {
      if (f === "all") return true
      if (f === "draft") return d.status === "draft" && !d.rejectNote
      if (f === "dikirim") return d.status === "dikirim"
      if (f === "revisi") return Boolean(d.rejectNote)
      if (f === "disetujui") return d.status === "disetujui"
      return true
    })
  }, [mine, f])

  return (
    <>
      {/* Header Utama Beranda Sopir */}
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
          <circle cx="200" cy="10" r="5" fill="#fbbf24" />
        </svg>

        <div className="relative flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={DRIVER_PHOTO}
              alt={`Foto profil ${nama}`}
              className="size-12 shrink-0 rounded-xl border-2 border-white/80 object-cover shadow-md"
            />
            <div className="min-w-0">
              <p className="text-xs text-white/85">Halo,</p>
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
              Ringkasan perjalanan
            </p>
            <h1 className="font-serif text-3xl leading-tight sm:text-4xl">
              Keberangkatan Saya
            </h1>
          </div>
          {onAdd && (
            <button
              type="button"
              onClick={onAdd}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-400 px-4 py-2 text-xs font-bold text-navy shadow-md transition hover:bg-amber-300 active:scale-95 cursor-pointer"
            >
              <Plus size={16} /> Tambah
            </button>
          )}
        </div>

        {/* Card Status Ringkasan Beranda (Tata Letak Rapi, Seimbang & Vertikal) */}
        <div className="relative mt-4 grid grid-cols-4 gap-2">
          {/* Card Draft */}
          <button
            type="button"
            onClick={() => setF(f === "draft" ? "all" : "draft")}
            className={cx(
              "group flex flex-col items-center justify-center rounded-2xl py-3 px-1 text-center transition backdrop-blur shadow-sm cursor-pointer",
              f === "draft"
                ? "bg-white text-navy ring-2 ring-white"
                : "bg-white/15 text-white hover:bg-white/25",
            )}
          >
            <span
              className={cx(
                "grid size-7 place-items-center rounded-lg mb-1.5 transition",
                f === "draft"
                  ? "bg-navy/10 text-navy"
                  : "bg-white/20 text-white",
              )}
            >
              <FileText size={15} />
            </span>
            <p
              className={cx(
                "num text-2xl font-bold leading-none",
                f === "draft" ? "text-navy" : "text-white",
              )}
            >
              {draftCount}
            </p>
            <p
              className={cx(
                "mt-1.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider",
                f === "draft" ? "text-slate-600" : "text-white/80",
              )}
            >
              Draft
            </p>
          </button>

          {/* Card Dikirim */}
          <button
            type="button"
            onClick={() => setF(f === "dikirim" ? "all" : "dikirim")}
            className={cx(
              "group flex flex-col items-center justify-center rounded-2xl py-3 px-1 text-center transition backdrop-blur shadow-sm cursor-pointer",
              f === "dikirim"
                ? "bg-white text-amber-900 ring-2 ring-white"
                : "bg-white/15 text-white hover:bg-white/25",
            )}
          >
            <span
              className={cx(
                "grid size-7 place-items-center rounded-lg mb-1.5 transition",
                f === "dikirim"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-amber-400/25 text-amber-200",
              )}
            >
              <Clock size={15} />
            </span>
            <p
              className={cx(
                "num text-2xl font-bold leading-none",
                f === "dikirim" ? "text-amber-700" : "text-amber-300",
              )}
            >
              {sentCount}
            </p>
            <p
              className={cx(
                "mt-1.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider",
                f === "dikirim" ? "text-amber-800" : "text-white/80",
              )}
            >
              Dikirim
            </p>
          </button>

          {/* Card Perbaikan */}
          <button
            type="button"
            onClick={() => setF(f === "revisi" ? "all" : "revisi")}
            className={cx(
              "group flex flex-col items-center justify-center rounded-2xl py-3 px-1 text-center transition backdrop-blur shadow-sm cursor-pointer",
              f === "revisi"
                ? "bg-white text-red-900 ring-2 ring-white"
                : revCount > 0
                  ? "bg-red-500/25 border border-red-300/40 text-white hover:bg-red-500/35"
                  : "bg-white/15 text-white hover:bg-white/25",
            )}
          >
            <span
              className={cx(
                "grid size-7 place-items-center rounded-lg mb-1.5 transition",
                f === "revisi"
                  ? "bg-red-100 text-red-700"
                  : revCount > 0
                    ? "bg-red-400/35 text-red-100"
                    : "bg-white/20 text-white",
              )}
            >
              <AlertCircle size={15} />
            </span>
            <p
              className={cx(
                "num text-2xl font-bold leading-none",
                f === "revisi"
                  ? "text-red-700"
                  : revCount > 0
                    ? "text-red-300 font-extrabold"
                    : "text-white",
              )}
            >
              {revCount}
            </p>
            <p
              className={cx(
                "mt-1.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider",
                f === "revisi"
                  ? "text-red-800"
                  : revCount > 0
                    ? "text-red-200 font-bold"
                    : "text-white/80",
              )}
            >
              Perbaikan
            </p>
          </button>

          {/* Card Disetujui */}
          <button
            type="button"
            onClick={() => setF(f === "disetujui" ? "all" : "disetujui")}
            className={cx(
              "group flex flex-col items-center justify-center rounded-2xl py-3 px-1 text-center transition backdrop-blur shadow-sm cursor-pointer",
              f === "disetujui"
                ? "bg-white text-emerald-900 ring-2 ring-white"
                : "bg-white/15 text-white hover:bg-white/25",
            )}
          >
            <span
              className={cx(
                "grid size-7 place-items-center rounded-lg mb-1.5 transition",
                f === "disetujui"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-emerald-400/25 text-emerald-200",
              )}
            >
              <CheckCircle2 size={15} />
            </span>
            <p
              className={cx(
                "num text-2xl font-bold leading-none",
                f === "disetujui" ? "text-emerald-700" : "text-emerald-300",
              )}
            >
              {accCount}
            </p>
            <p
              className={cx(
                "mt-1.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider",
                f === "disetujui" ? "text-emerald-800" : "text-white/80",
              )}
            >
              Disetujui
            </p>
          </button>
        </div>
      </header>

      {/* Menu-Menu Tab Filter Sebelumnya Lengkap */}
      <div className="sticky top-0 z-20 flex gap-2 overflow-x-auto border-b border-line bg-white/95 px-5 py-3 backdrop-blur">
        {tabs.map((t) => (
          <button
            key={t.k}
            onClick={() => setF(t.k)}
            className={cx(
              "h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition flex items-center gap-1.5 cursor-pointer",
              f === t.k
                ? "border-navy bg-navy text-white shadow-xs"
                : "border-line text-mute hover:bg-wash",
            )}
          >
            <span>{t.l}</span>
            <span
              className={cx(
                "num rounded-full px-1.5 py-0.2 text-[11px] font-bold",
                f === t.k
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

      {/* Daftar Keberangkatan */}
      {list.length === 0 ? (
        <Empty
          title="Belum ada keberangkatan"
          hint={
            f !== "all"
              ? "Tidak ada data pada status ini."
              : "Ketuk tombol di bawah untuk mencatat keberangkatan baru."
          }
          action={
            f !== "all" ? (
              <button
                type="button"
                onClick={() => setF("all")}
                className="inline-flex items-center rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-navy shadow-xs hover:bg-navy-50 cursor-pointer"
              >
                Tampilkan Semua
              </button>
            ) : onAdd ? (
              <button
                type="button"
                onClick={onAdd}
                className="inline-flex items-center gap-2 rounded-xl bg-navy px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-navy-700 active:scale-95 cursor-pointer"
              >
                <Plus size={18} /> Tambah Keberangkatan
              </button>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-3 px-5 py-4">
          {list.map((d) => {
            const c = calc(d)
            return (
              <li key={d.id}>
                <button
                  onClick={() => onOpen(d.id)}
                  className={cx(
                    "w-full rounded-xl border border-line border-l-4 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer",
                    d.rejectNote
                      ? "border-l-red-500 bg-red-50/15"
                      : d.status === "draft"
                        ? "border-l-slate-300"
                        : d.status === "dikirim"
                          ? "border-l-amber-400"
                          : "border-l-emerald-500",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="num flex items-center gap-1.5 text-xs text-mute">
                      <CalendarDays size={13} /> {fmtDate(d.date)}{" "}
                      <Clock size={13} className="ml-1" /> {d.time}
                    </span>
                    <StatusBadge status={d.status} rejected={!!d.rejectNote} />
                  </div>

                  <p className="mt-2 font-semibold leading-snug">
                    {jalur(d.jalurId).nama}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-mute">
                    <Bus size={14} /> <span className="num">{d.cb}</span> ·{" "}
                    <span className="num">{plat(d.cb)}</span> ·{" "}
                    {seg(d.segmentId).nama}
                  </p>

                  {d.status === "dikirim" && (
                    <p className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50/70 px-2.5 py-1.5 text-xs text-amber-900">
                      <Clock size={13} className="shrink-0 text-amber-600" />
                      <span>Menunggu disetujui koordinator</span>
                    </p>
                  )}

                  {d.rejectNote && (
                    <p className="mt-3 line-clamp-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                      <b>Catatan perbaikan:</b> {d.rejectNote}
                    </p>
                  )}

                  <div className="mt-3 flex items-end justify-between border-t border-line pt-3">
                    <span className="text-xs text-mute">Pendapatan</span>
                    <span className="num text-base font-medium">
                      {d.pendapatan != null ? rupiah(c.total) : "Belum diisi"}
                    </span>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
