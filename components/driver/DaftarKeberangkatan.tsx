"use client"

import { useState } from "react"
import { AlertTriangle, Bus, CalendarDays, ChevronRight, Clock } from "lucide-react"
import type { Departure, Status } from "@/lib/data"
import { calc, fmtDate, jalur, missing, plat, rupiah, seg } from "@/lib/data"
import { Empty, LiveDateTime, StatusBadge, cx } from "@/components/ui"
import { DRIVER_PHOTO } from "./shared"

interface Props {
  mine: Departure[]
  nama: string
  onOpen: (id: string) => void
}
export default function DaftarKeberangkatan({ mine, nama, onOpen }: Props) {
  const [f, setF] = useState<"all" | Status>("all")
  const tabs: ["all" | Status, string][] = [
    ["all", "Semua"],
    ["draft", "Draft"],
    ["dikirim", "Dikirim"],
    ["disetujui", "Disetujui"],
  ]
  const list = mine.filter((d) => f === "all" || d.status === f)
  return (
    <>
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
        </div>
        <div className="relative mt-4 grid grid-cols-3 gap-2">
          {[
            ["Draft", mine.filter((d) => d.status === "draft").length],
            ["Dikirim", mine.filter((d) => d.status === "dikirim").length],
            ["Disetujui", mine.filter((d) => d.status === "disetujui").length],
          ].map(([l, n]) => (
            <div
              key={l}
              className="rounded-xl bg-white/15 px-3 py-2.5 backdrop-blur"
            >
              <p className="num text-2xl leading-none">{n}</p>
              <p className="mt-1 text-[11px] uppercase tracking-wider text-white/85">
                {l}
              </p>
            </div>
          ))}
        </div>
      </header>
      <div className="sticky top-0 z-20 flex gap-2 overflow-x-auto border-b border-line bg-white/95 px-5 py-3 backdrop-blur">
        {tabs.map(([k, l]) => (
          <button
            key={k}
            onClick={() => setF(k)}
            className={cx(
              "h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition",
              f === k
                ? "border-navy bg-navy text-white"
                : "border-line text-mute hover:bg-wash",
            )}
          >
            {l}
            <span className="num ml-1.5 text-xs opacity-70">
              {k === "all"
                ? mine.length
                : mine.filter((d) => d.status === k).length}
            </span>
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <Empty title="Belum ada keberangkatan" hint="Ketuk + untuk mencatat." />
      ) : (
        <ul className="space-y-3 px-5 py-4">
          {list.map((d) => {
            const c = calc(d)
            return (
              <li key={d.id}>
                <button
                  onClick={() => onOpen(d.id)}
                  className={cx(
                    "w-full rounded-xl border border-line border-l-4 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                    d.rejectNote
                      ? "border-l-red-500"
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
                  {d.rejectNote && (
                    <p className="mt-3 line-clamp-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                      <b>Ditolak:</b> {d.rejectNote}
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