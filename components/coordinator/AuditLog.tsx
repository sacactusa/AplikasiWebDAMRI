"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Bus,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Database,
  Download,
  Edit3,
  FileSpreadsheet,
  HardDrive,
  Info,
  PlusCircle,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react"
import { AUDIT } from "@/lib/data"
import { DateInput, Drawer, Empty, cx, inputCls } from "@/components/ui"
import { Title, th, td, tableWrap } from "./shared"
import { getAuditLogs, type AuditItem } from "@/lib/supabaseService"

type CategoryFilter =
  | "all"
  | "laporan"
  | "verifikasi"
  | "keberangkatan"
  | "master"
  | "akun"
  | "backup"

const cleanDisplayObjek = (obj: string) => {
  if (!obj) return "Data Sistem"
  if (/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(obj.replace(/^[a-z]+\s*·\s*/i, ""))) {
    return "Keberangkatan · Bus Operasional"
  }
  return obj
}

interface Props {
  currentUser?: { nama: string; email: string; id?: string } | null
}

export default function AuditLog({ currentUser }: Props) {
  const [logs, setLogs] = useState<AuditItem[]>(AUDIT)
  const [loading, setLoading] = useState(false)
  const [category, setCategory] = useState<CategoryFilter>("all")
  const [search, setSearch] = useState("")
  const [a, setA] = useState("")
  const [from, setFrom] = useState("")
  const [until, setUntil] = useState("")
  const [open, setOpen] = useState<AuditItem | null>(null)

  const reloadLogs = () => {
    setLoading(true)
    getAuditLogs()
      .then((res) => {
        if (res && res.length > 0) {
          setLogs(res)
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reloadLogs()
  }, [])

  const getIsoDate = (x: AuditItem) => {
    if (x.rawTime) return x.rawTime.slice(0, 10)
    const parts = x.t.split(" ")
    if (parts.length >= 3) {
      const day = parts[0].padStart(2, "0")
      const monthMap: Record<string, string> = {
        Jan: "01", Feb: "02", Mar: "03", Apr: "04", Mei: "05", Jun: "06",
        Jul: "07", Agu: "08", Sep: "09", Okt: "10", Nov: "11", Des: "12",
      }
      const m = monthMap[parts[1]] || "10"
      const y = parts[2]
      return `${y}-${m}-${day}`
    }
    return "2026-10-16"
  }

  // Pengelompokan kategori aksi
  const matchCategory = (x: AuditItem, cat: CategoryFilter): boolean => {
    if (cat === "all") return true
    const act = (x.a || "").toLowerCase()
    const obj = (x.o || "").toLowerCase()

    if (cat === "laporan") {
      return (
        act.includes("unduh laporan") ||
        act.includes("laporan") ||
        obj.includes("laporan") ||
        act.includes("ekspor")
      )
    }
    if (cat === "verifikasi") {
      return act.includes("setujui") || act.includes("tolak")
    }
    if (cat === "keberangkatan") {
      return (
        act.includes("kirim") ||
        (act.includes("tambah") && obj.includes("keberangkatan")) ||
        obj.includes("keberangkatan")
      )
    }
    if (cat === "master") {
      return (
        obj.includes("tarif") ||
        obj.includes("kendaraan") ||
        obj.includes("jalur") ||
        obj.includes("segmen")
      )
    }
    if (cat === "akun") {
      return (
        obj.includes("akun") ||
        obj.includes("profil") ||
        act.includes("nonaktifkan") ||
        act.includes("aktifkan") ||
        act.includes("reset")
      )
    }
    if (cat === "backup") {
      return act.includes("backup") || obj.includes("backup") || obj.includes("database")
    }
    return true
  }

  // Hitung jumlah aktivitas per kategori untuk badges tab
  const categoryCounts = useMemo(() => {
    return {
      all: logs.length,
      laporan: logs.filter((x) => matchCategory(x, "laporan")).length,
      verifikasi: logs.filter((x) => matchCategory(x, "verifikasi")).length,
      keberangkatan: logs.filter((x) => matchCategory(x, "keberangkatan")).length,
      master: logs.filter((x) => matchCategory(x, "master")).length,
      akun: logs.filter((x) => matchCategory(x, "akun")).length,
      backup: logs.filter((x) => matchCategory(x, "backup")).length,
    }
  }, [logs])

  // Filter list
  const filteredList = useMemo(() => {
    return logs.filter((x) => {
      if (category !== "all" && !matchCategory(x, category)) return false
      if (a && x.a !== a) return false
      const iso = getIsoDate(x)
      if (from && iso < from) return false
      if (until && iso > until) return false

      if (search.trim()) {
        const q = search.toLowerCase()
        const text = `${x.o} ${x.a} ${x.u}`.toLowerCase()
        if (!text.includes(q)) return false
      }

      return true
    })
  }, [logs, category, a, from, until, search])

  // Urutkan riwayat secara otomatis dari yang terbaru ke terlama
  const sortedList = useMemo(() => {
    const copy = [...filteredList]
    copy.sort((itemA, itemB) => {
      const timeA = itemA.rawTime || itemA.t
      const timeB = itemB.rawTime || itemB.t
      return timeB.localeCompare(timeA)
    })
    return copy
  }, [filteredList])

  const acts = useMemo(() => [...new Set(logs.map((x) => x.a))].filter(Boolean), [logs])

  const hasFilterActive = Boolean(
    category !== "all" || a || from || until || search
  )

  const resetFilters = () => {
    setCategory("all")
    setA("")
    setFrom("")
    setUntil("")
    setSearch("")
  }

  const renderActionBadge = (aksi: string) => {
    const act = (aksi || "").toLowerCase()
    if (act.includes("unduh") || act.includes("laporan") || act.includes("ekspor")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 shadow-2xs">
          <Download size={11} className="shrink-0" />
          {aksi}
        </span>
      )
    }
    if (act.includes("setujui") || act.includes("approve")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 shadow-2xs">
          <CheckCircle2 size={11} className="shrink-0" />
          {aksi}
        </span>
      )
    }
    if (act.includes("tolak") || act.includes("reject")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 shadow-2xs">
          <XCircle size={11} className="shrink-0" />
          {aksi}
        </span>
      )
    }
    if (act.includes("kirim") || act.includes("submit")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 shadow-2xs">
          <Clock size={11} className="shrink-0" />
          {aksi}
        </span>
      )
    }
    if (act.includes("tambah") || act.includes("create")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-0.5 text-xs font-semibold text-cyan-800 shadow-2xs">
          <PlusCircle size={11} className="shrink-0" />
          {aksi}
        </span>
      )
    }
    if (act.includes("ubah") || act.includes("edit") || act.includes("update")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 shadow-2xs">
          <Edit3 size={11} className="shrink-0" />
          {aksi}
        </span>
      )
    }
    if (act.includes("backup")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-800 shadow-2xs">
          <HardDrive size={11} className="shrink-0" />
          {aksi}
        </span>
      )
    }
    if (act.includes("nonaktif") || act.includes("hapus") || act.includes("delete")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 shadow-2xs">
          <ShieldAlert size={11} className="shrink-0" />
          {aksi}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center rounded-full border border-line bg-wash px-2.5 py-0.5 text-xs font-semibold text-ink shadow-2xs">
        {aksi}
      </span>
    )
  }

  const renderSourceBadge = (item: AuditItem) => {
    const act = (item.a || "").toLowerCase()
    const user = (item.u || "").toLowerCase()

    // Jika aktivitas merupakan inputan kirim dari sopir
    if (act === "kirim" || user.includes("sopir")) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50/80 px-2.5 py-0.5 text-xs font-semibold text-amber-800 shadow-2xs">
          <Bus size={12} className="shrink-0 text-amber-700" />
          <span>Input Sopir ({item.u})</span>
        </span>
      )
    }

    // Aktivitas dilakukan oleh Koordinator
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-navy-200 bg-navy-50/80 px-2.5 py-0.5 text-xs font-semibold text-navy shadow-2xs">
        <ShieldCheck size={12} className="shrink-0 text-navy" />
        <span>Koordinator</span>
      </span>
    )
  }

  const keys = (o: AuditItem) => [
    ...new Set([...Object.keys(o.before || {}), ...Object.keys(o.after || {})]),
  ]

  return (
    <>
      <Title
        sub="Rekapitulasi aktivitas akun Koordinator (verifikasi, unduh laporan, data master, backup) dan data inputan sopir."
        right={
          <button
            type="button"
            onClick={reloadLogs}
            disabled={loading}
            title="Segarkan data log"
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-line bg-white px-3.5 text-xs font-semibold text-navy shadow-xs transition hover:bg-wash active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={15} className={cx(loading && "animate-spin")} />
            <span>Segarkan</span>
          </button>
        }
      >
        Audit Log
      </Title>

      {/* Tabs Filter Kategori Cepat (Rata Kiri Kanan & Berjarak Seimbang) */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7 w-full border-b border-line pb-3">
        {[
          { id: "all", label: "Semua", count: categoryCounts.all, icon: null },
          { id: "laporan", label: "Unduh Laporan", count: categoryCounts.laporan, icon: Download },
          { id: "verifikasi", label: "Verifikasi", count: categoryCounts.verifikasi, icon: ClipboardCheck },
          { id: "keberangkatan", label: "Input Sopir", count: categoryCounts.keberangkatan, icon: Bus },
          { id: "master", label: "Data Master", count: categoryCounts.master, icon: Database },
          { id: "akun", label: "Akun", count: categoryCounts.akun, icon: Users },
          { id: "backup", label: "Backup", count: categoryCounts.backup, icon: HardDrive },
        ].map((tab) => {
          const active = category === tab.id
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategory(tab.id as CategoryFilter)}
              className={cx(
                "inline-flex w-full items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-xs font-semibold transition active:scale-95 cursor-pointer text-center",
                active
                  ? "bg-navy text-white shadow-xs"
                  : "border border-line bg-white text-ink hover:border-slate-300 hover:bg-wash"
              )}
            >
              {Icon && <Icon size={12} className={active ? "text-white" : "text-mute"} />}
              <span className="truncate">{tab.label}</span>
              <span
                className={cx(
                  "num ml-0.5 shrink-0 rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                  active
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-600"
                )}
              >
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Filter Bar Tanpa Role Pengguna */}
      <div className="mb-4 rounded-xl border border-line bg-white p-3.5 shadow-2xs">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Dari Tanggal */}
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-mute">
              Dari Tanggal
            </label>
            <DateInput
              aria-label="Dari tanggal"
              placeholder="dd/mm/yyyy"
              value={from}
              onChange={setFrom}
            />
          </div>

          {/* Sampai Tanggal */}
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-mute">
              Sampai Tanggal
            </label>
            <DateInput
              aria-label="Sampai tanggal"
              placeholder="dd/mm/yyyy"
              value={until}
              onChange={setUntil}
            />
          </div>

          {/* Filter Aksi Spesifik */}
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-mute">
              Jenis Aksi
            </label>
            <select
              aria-label="Aksi"
              value={a}
              onChange={(e) => setA(e.target.value)}
              className={cx(inputCls(), "h-11 cursor-pointer")}
            >
              <option value="">Semua aksi</option>
              {acts.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>

          {/* Pencarian Kata Kunci */}
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-mute">
              Cari Keterangan / Data
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Cari plat, rute, dokumen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={cx(inputCls(), "h-11 pl-9")}
              />
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute"
              />
            </div>
          </div>
        </div>

        {/* Ringkasan status filter & tombol reset */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-2.5 text-xs text-mute">
          <div className="flex items-center gap-1.5">
            <Clock size={13} className="text-navy" />
            <span>
              Menampilkan <b>{sortedList.length}</b> dari <b>{logs.length}</b> aktivitas akun koordinator & input sopir
            </span>
          </div>

          {hasFilterActive && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 font-semibold text-red-600 transition hover:text-red-700 hover:underline cursor-pointer"
            >
              <RotateCcw size={12} />
              Reset Semua Filter
            </button>
          )}
        </div>
      </div>

      {/* Tabel Data Audit Log */}
      <div className={tableWrap}>
        <table className="w-full min-w-[680px]">
          <thead className="border-b border-line bg-wash">
            <tr>
              <th className={cx(th, "w-44")}>Waktu</th>
              <th className={cx(th, "w-36")}>Aksi</th>
              <th className={th}>Data Terkait</th>
              <th className={cx(th, "w-48")}>Pelaksana / Sumber</th>
              <th className="w-12 px-2 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {sortedList.map((x, i) => (
              <tr
                key={x.id || i}
                onClick={() => setOpen(x)}
                className="group cursor-pointer border-b border-line last:border-0 hover:bg-navy-50/50 transition-colors"
              >
                <td className={cx(td, "num whitespace-nowrap text-xs text-slate-700")}>
                  {x.t}
                </td>
                <td className={td}>{renderActionBadge(x.a)}</td>
                <td className={cx(td, "text-xs font-medium text-ink")}>
                  {cleanDisplayObjek(x.o)}
                </td>
                <td className={td}>{renderSourceBadge(x)}</td>
                <td className={cx(td, "w-12 px-2 text-center text-mute group-hover:text-navy")}>
                  <ChevronRight size={16} className="inline transition-transform group-hover:translate-x-0.5" />
                </td>
              </tr>
            ))}
            {sortedList.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <Empty
                    title="Tidak ada catatan aktivitas"
                    hint="Sesuaikan filter atau kata kunci pencarian untuk melihat aktivitas lainnya."
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Drawer Detail Aktivitas */}
      <Drawer
        open={!!open}
        onClose={() => setOpen(null)}
        title="Detail Aktivitas Sistem"
      >
        {open && (
          <div className="space-y-5">
            {/* Header info */}
            <div className="rounded-xl border border-line bg-wash p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-mute">Jenis Aksi</span>
                {renderActionBadge(open.a)}
              </div>
              <h3 className="mt-2 text-base font-bold text-ink">{cleanDisplayObjek(open.o)}</h3>
              <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-line/60 pt-2 text-xs text-mute">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-600">Pelaksana:</span>
                  {renderSourceBadge(open)}
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={13} className="text-navy" />
                  <span className="num font-medium text-ink">{open.t}</span>
                </div>
              </div>
            </div>

            {/* Khusus aktivitas Unduh Laporan */}
            {open.a.toLowerCase().includes("laporan") && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-900">
                <div className="flex items-center gap-2 font-bold text-blue-800 mb-2">
                  <FileSpreadsheet size={16} />
                  <span>Detail Berkas Laporan Yang Diunduh</span>
                </div>
                <div className="space-y-1.5 text-blue-900/90 leading-relaxed">
                  {Object.entries(open.after || {}).map(([key, val]) => (
                    <div key={key} className="flex justify-between border-b border-blue-100 py-1 last:border-0">
                      <span className="capitalize text-blue-700">{key.replace(/_/g, " ")}</span>
                      <span className="font-semibold text-blue-950 font-mono">{String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Diff Sebelum & Sesudah jika ada */}
            {keys(open).length > 0 && !open.a.toLowerCase().includes("laporan") && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-mute">
                  Perubahan Data (Sebelum & Sesudah)
                </p>
                <div className="num overflow-hidden rounded-xl border border-line text-xs divide-y divide-line">
                  {keys(open).map((k) => {
                    const b =
                      (open.before as unknown as Record<string, string | number>)[k]
                    const n =
                      (open.after as unknown as Record<string, string | number>)[k]
                    return (
                      <div key={k} className="p-3">
                        <p className="font-mono text-[11px] font-bold text-mute uppercase mb-1">
                          {k}
                        </p>
                        {b !== undefined && (
                          <div className="rounded-md bg-red-50 px-2.5 py-1 text-red-800 font-medium mb-1">
                            <span className="mr-2 font-bold">− Sebelum:</span>
                            {String(b)}
                          </div>
                        )}
                        {n !== undefined && (
                          <div className="rounded-md bg-emerald-50 px-2.5 py-1 text-emerald-800 font-medium">
                            <span className="mr-2 font-bold">+ Sesudah:</span>
                            {String(n)}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex items-start gap-2.5 rounded-lg border border-line bg-slate-50 p-3 text-[11px] text-mute">
              <Info size={14} className="mt-0.5 shrink-0 text-slate-500" />
              <span>
                Catatan audit log bersifat permanen (*immutable*) dan tidak dapat diedit atau dihapus untuk menjaga kepatuhan dan integritas data operasional DAMRI.
              </span>
            </div>
          </div>
        )}
      </Drawer>
    </>
  )
}
