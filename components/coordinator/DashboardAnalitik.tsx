"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { getMasterData } from "@/lib/supabaseService"
import type { Segment, Jalur } from "@/lib/data"
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
import { JALUR, SEGMENTS, fmtDate, jalur, nf, rupiah, seg } from "@/lib/data"
import { Btn, Empty, LiveDateTime, cx } from "@/components/ui"
import {
  Title,
  th,
  td,
  tableWrap,
  useRange,
  RangePicker,
  agg,
  addDays,
  type Page,
} from "./shared"

interface Props {
  deps: Departure[]
  go: (p: Page) => void
  currentUser?: { nama: string; email: string; id?: string } | null
}

export default function DashboardAnalitik({ deps, go, currentUser }: Props) {
  const isDemo = currentUser?.email === "koordinator@damri.co.id"
  const r = useRange("harian")
  const [sg, setSg] = useState("all")
  const [segments, setSegments] = useState<Segment[]>(isDemo ? SEGMENTS : [])
  const [jalurList, setJalurList] = useState<Jalur[]>(isDemo ? JALUR : [])

  // Cari tanggal keberangkatan disetujui terbaru
  const latestApprovedDate = useMemo(() => {
    const approvedDates = deps
      .filter((d) => d.status === "disetujui")
      .map((d) => d.date)
      .sort((a, b) => b.localeCompare(a))
    return approvedDates[0] || null
  }, [deps])

  // Sinkronisasi otomatis ke tanggal data disetujui terbaru jika pada tanggal hari ini belum ada data
  const hasAutoAdjusted = useRef(false)
  useEffect(() => {
    if (!hasAutoAdjusted.current && latestApprovedDate) {
      const currentAnchorHasData = deps.some(
        (d) => d.status === "disetujui" && d.date === r.anchor,
      )
      if (!currentAnchorHasData) {
        r.setAnchor(latestApprovedDate)
        r.setTo(latestApprovedDate)
      }
      hasAutoAdjusted.current = true
    }
  }, [latestApprovedDate, deps, r])

  useEffect(() => {
    getMasterData(isDemo).then((m) => {
      setSegments(m.segments || [])
      setJalurList(m.jalurList || [])
    })
  }, [isDemo])
  const approved = deps.filter(
    (d) =>
      d.status === "disetujui" && d.date >= r.range[0] && d.date <= r.range[1],
  )
  const scoped =
    sg === "all"
      ? approved
      : approved.filter(
          (d) =>
            d.segmentId === sg ||
            segments.some(
              (s) =>
                s.id === sg &&
                ((s as any).rawId === d.segmentId ||
                  (s as any).kode === d.segmentId),
            ),
        )
  const t = agg(approved)
  const bySeg = segments.map((s) => ({
    id: s.id,
    nama: s.nama,
    ...agg(
      approved.filter(
        (d) =>
          d.segmentId === s.id ||
          ((s as any).rawId && d.segmentId === (s as any).rawId) ||
          ((s as any).kode && d.segmentId === (s as any).kode),
      ),
    ),
  }))
  const trendDays = useMemo(() => {
    if (r.mode === "harian" || r.mode === "mingguan") {
      const list: string[] = []
      for (let i = 6; i >= 0; i--) {
        list.push(addDays(r.anchor, -i))
      }
      return list
    }
    const uniq = [...new Set(scoped.map((d) => d.date))].sort()
    return uniq.length > 0 ? uniq : [r.anchor]
  }, [r.mode, r.anchor, scoped])

  const trend = trendDays.map((day) => ({
    tgl: fmtDate(day).slice(0, 6),
    pendapatan: agg(scoped.filter((d) => d.date === day)).total,
  }))

  const perJalur = useMemo(() => {
    const map = new Map<string, { id: string; nama: string; segmentId: string }>()
    for (const j of jalurList) {
      map.set(j.id, { id: j.id, nama: j.nama, segmentId: j.segmentId })
    }
    for (const d of scoped) {
      if (d.jalurId && !map.has(d.jalurId)) {
        map.set(d.jalurId, {
          id: d.jalurId,
          nama: d.jalurNama || jalur(d.jalurId).nama,
          segmentId: d.segmentId,
        })
      }
    }
    return Array.from(map.values())
      .map((j) => {
        const list = scoped.filter(
          (d) =>
            d.jalurId === j.id ||
            (d.jalurNama && d.jalurNama.toLowerCase() === j.nama.toLowerCase()),
        )
        return {
          j,
          ...agg(list),
        }
      })
      .filter((x) => x.rit > 0)
  }, [jalurList, scoped])

  // KPI Dashboard: tanpa UPP, menampilkan Total Pendapatan yang akurat
  const kpi: [string, string, boolean?][] = [
    ["KM tempuh", nf(t.km) + " km"],
    ["Penumpang", nf(t.pnp) + " orang"],
    ["Total pendapatan", rupiah(t.total), true],
    ["SO (Kendaraan)", nf(t.so)],
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
            <Btn onClick={() => go("laporan")} className="h-11 shrink-0 px-4">
              <Download size={16} /> Ekspor
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
            title={
              r.mode === "harian"
                ? `Tidak ada data disetujui pada ${fmtDate(r.anchor)}`
                : "Tidak ada data disetujui pada periode ini"
            }
            hint={
              latestApprovedDate ? (
                <span>
                  Keberangkatan terakhir yang disetujui ada pada tanggal{" "}
                  <strong className="font-semibold text-ink">{fmtDate(latestApprovedDate)}</strong>.
                </span>
              ) : (
                "Keberangkatan yang disetujui oleh Koordinator di menu Verifikasi akan tampil di sini."
              )
            }
            action={
              latestApprovedDate && latestApprovedDate !== r.anchor ? (
                <Btn
                  variant="outline"
                  onClick={() => {
                    r.setAnchor(latestApprovedDate)
                    r.setMode("harian")
                  }}
                >
                  Lihat data {fmtDate(latestApprovedDate)}
                </Btn>
              ) : (
                <Btn onClick={() => r.setMode("mingguan")}>
                  Beralih ke Mingguan
                </Btn>
              )
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3 lg:grid-cols-5">
            {kpi.map(([a, b, isSpecial]) => (
              <div key={a} className="bg-white p-4 transition hover:bg-navy-50">
                <p className="text-[11px] font-bold uppercase tracking-wider text-navy/70">
                  {a}
                </p>
                <p
                  className={cx(
                    "num mt-2 truncate text-xl font-medium sm:text-2xl",
                    isSpecial ? "font-bold text-emerald-600" : "text-ink",
                  )}
                >
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
                Tren pendapatan ·{" "}
                {sg === "all"
                  ? "Semua segmen"
                  : segments.find(
                      (s) =>
                        s.id === sg ||
                        (s as any).rawId === sg ||
                        (s as any).kode === sg,
                    )?.nama || seg(sg).nama}
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
                  {["Jalur", "SO", "RIT", "Penumpang", "Pendapatan"].map(
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
                        ·{" "}
                        {segments.find(
                          (s) =>
                            s.id === x.j.segmentId ||
                            (s as any).rawId === x.j.segmentId ||
                            (s as any).kode === x.j.segmentId,
                        )?.nama || seg(x.j.segmentId).nama}
                      </span>
                    </td>
                    <td className={cx(td, "num text-right")}>{x.so}</td>
                    <td className={cx(td, "num text-right")}>{x.rit}</td>
                    <td className={cx(td, "num text-right")}>{nf(x.pnp)}</td>
                    <td className={cx(td, "num text-right font-medium text-emerald-700")}>
                      {rupiah(x.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-mute">
            SO = kendaraan yang beroperasi · RIT = jumlah keberangkatan · Pendapatan =
            akumulasi pendapatan tiket/kontrak, subsidi, dan bagasi.
          </p>
        </>
      )}
    </>
  )
}

