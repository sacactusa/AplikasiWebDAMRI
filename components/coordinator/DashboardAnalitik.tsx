"use client"

import { useState } from "react"
import { Clock3, Download } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { Departure } from "@/lib/data"
import { JALUR, SEGMENTS, fmtDate, nf, rupiah, seg } from "@/lib/data"
import { Btn, Empty, LiveDateTime, cx } from "@/components/ui"
import {
  Title,
  th,
  td,
  tableWrap,
  useRange,
  RangePicker,
  agg,
  type SavedArchive,
} from "./shared"

interface Props {
  deps: Departure[]
  onExport: (archive: Omit<SavedArchive, "id" | "createdAt">) => Promise<void>
}

export default function DashboardAnalitik({ deps, onExport }: Props) {
  const r = useRange()
  const [sg, setSg] = useState("all")
  const [savingArchive, setSavingArchive] = useState(false)
  const approved = deps.filter(
    (d) =>
      d.status === "disetujui" && d.date >= r.range[0] && d.date <= r.range[1],
  )
  const scoped =
    sg === "all" ? approved : approved.filter((d) => d.segmentId === sg)
  const t = agg(approved)
  const bySeg = SEGMENTS.map((s) => ({
    id: s.id,
    nama: s.nama,
    ...agg(approved.filter((d) => d.segmentId === s.id)),
  }))
  const days = [...new Set(scoped.map((d) => d.date))].sort()
  const trend = days.map((day) => ({
    tgl: fmtDate(day).slice(0, 6),
    pendapatan: agg(scoped.filter((d) => d.date === day)).total,
  }))
  const perJalur = JALUR.map((j) => ({
    j,
    ...agg(scoped.filter((d) => d.jalurId === j.id)),
  })).filter((x) => x.rit > 0)

  const formatPeriodDate = (date: string) =>
    new Date(date + "T00:00:00").toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  const periodLabel =
    r.mode === "bulanan"
      ? `Bulanan · ${new Date(r.anchor + "T00:00:00").toLocaleDateString("id-ID", {
          month: "long",
          year: "numeric",
        })}`
      : `${r.mode === "harian" ? "Harian" : r.mode === "mingguan" ? "Mingguan" : "Rentang"} · ${
          r.range[0] === r.range[1]
            ? formatPeriodDate(r.range[0])
            : `${formatPeriodDate(r.range[0])} – ${formatPeriodDate(r.range[1])}`
        }`

  const kpi: [string, string][] = [
    ["KM tempuh", nf(t.km)],
    ["Penumpang", nf(t.pnp)],
    ["Pendapatan umum", rupiah(t.umum)],
    ["UPP (Rp/km)", nf(t.upp)],
    ["SO", nf(t.so)],
    ["RIT", nf(t.rit)],
  ]

  return (
    <>
      <Title
        sub="Hanya keberangkatan berstatus Disetujui yang dihitung."
        right={
          <div className="flex w-full items-center gap-2.5 sm:w-auto">
            <div className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-line bg-white px-3 shadow-2xs sm:w-auto sm:flex-initial sm:px-3.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-navy-50 text-navy">
                <Clock3 size={15} />
              </span>
              <LiveDateTime compact />
            </div>
            <Btn
              disabled={savingArchive || scoped.length === 0}
              onClick={async () => {
                setSavingArchive(true)
                try {
                  await onExport({
                    label: periodLabel,
                    startDate: r.range[0],
                    endDate: r.range[1],
                    segment: sg === "all" ? "Semua segmen" : seg(sg).nama,
                    departures: scoped,
                  })
                } finally {
                  setSavingArchive(false)
                }
              }}
              className="h-11 shrink-0 px-4"
            >
              <Download size={16} /> {savingArchive ? "Menyimpan…" : "Ekspor"}
            </Btn>
          </div>
        }
      >
        Dashboard
      </Title>
      <RangePicker r={r} />
      {approved.length === 0 ? (
        <div className="mt-6 rounded-xl border border-line">
          <Empty
            title="Belum ada data disetujui"
            hint="Ubah periode untuk melihat rekap produksi."
          />
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-6">
            {kpi.map(([a, b]) => (
              <div key={a} className="bg-white p-4 transition hover:bg-navy-50">
                <p className="text-[11px] font-bold uppercase tracking-wider text-navy/70">
                  {a}
                </p>
                <p className="num mt-2 truncate text-xl font-medium sm:text-2xl">
                  {b}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex gap-2 overflow-x-auto">
            {[
              { id: "all", nama: "Semua segmen", total: t.total, rit: t.rit },
              ...bySeg,
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setSg(s.id)}
                className={cx(
                  "min-w-36 shrink-0 rounded-xl border p-3 text-left transition",
                  sg === s.id
                    ? "border-navy bg-navy text-white"
                    : "border-line hover:bg-wash",
                )}
              >
                <p className="text-sm font-semibold">{s.nama}</p>
                <p className="num mt-1 text-xs opacity-75">{rupiah(s.total)}</p>
                <p className="num text-xs opacity-75">{s.rit} RIT</p>
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-line p-5">
              <h2 className="mb-4 text-sm font-semibold">
                Pendapatan per segmen
              </h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={bySeg}>
                  <CartesianGrid vertical={false} stroke="#e4e8ef" />
                  <XAxis
                    dataKey="nama"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    width={44}
                    tickFormatter={(v) => v / 1e6 + " jt"}
                  />
                  <Tooltip
                    formatter={(v) => rupiah(Number(v))}
                    cursor={{ fill: "#eef3fb" }}
                  />
                  <Bar
                    dataKey="total"
                    name="Pendapatan"
                    fill="#0a2a66"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-xl border border-line p-5">
              <h2 className="mb-4 text-sm font-semibold">
                Tren harian · {sg === "all" ? "Semua segmen" : seg(sg).nama}
              </h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={trend}>
                  <CartesianGrid vertical={false} stroke="#e4e8ef" />
                  <XAxis
                    dataKey="tgl"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    width={44}
                    tickFormatter={(v) => v / 1e6 + " jt"}
                  />
                  <Tooltip
                    formatter={(v) => rupiah(Number(v))}
                    cursor={{ fill: "#eef3fb" }}
                  />
                  <Bar
                    dataKey="pendapatan"
                    name="Pendapatan"
                    fill="#3a6bc4"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <h2 className="mb-3 mt-8 font-serif text-2xl">Rincian per jalur</h2>
          <div className={tableWrap}>
            <table className="w-full min-w-[640px]">
              <thead className="border-b border-line bg-wash">
                <tr>
                  {["Jalur", "SO", "RIT", "Penumpang", "UPP (Rp/km)"].map(
                    (h, i) => (
                      <th key={h} className={cx(th, i > 0 && "text-right")}>
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {perJalur.map((x) => (
                  <tr
                    key={x.j.id}
                    className="border-b border-line last:border-0"
                  >
                    <td className={td}>
                      {x.j.nama}{" "}
                      <span className="text-xs text-mute">
                        · {seg(x.j.segmentId).nama}
                      </span>
                    </td>
                    <td className={cx(td, "num text-right")}>{x.so}</td>
                    <td className={cx(td, "num text-right")}>{x.rit}</td>
                    <td className={cx(td, "num text-right")}>{nf(x.pnp)}</td>
                    <td className={cx(td, "num text-right")}>{nf(x.upp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-mute">
            SO = kendaraan yang beroperasi · RIT = jumlah keberangkatan · UPP =
            total pendapatan ÷ KM tempuh. Rumus final menunggu berkas AK 15 dari
            DAMRI.
          </p>
        </>
      )}
    </>
  )
}
