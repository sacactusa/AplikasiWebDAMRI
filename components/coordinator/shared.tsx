import { useMemo, useState, type ReactNode } from "react"
import type { Departure } from "@/lib/data"
import { calc, TODAY } from "@/lib/data"
import { DateInput, cx, inputCls } from "@/components/ui"

export type Page =
  | "verifikasi"
  | "dashboard"
  | "laporan"
  | "master"
  | "akun"
  | "arsip"
  | "audit"
  | "profil"

export const th =
  "whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-mute"
export const td = "px-4 py-3 text-sm"
export const tableWrap = "overflow-x-auto rounded-xl border border-line"
export type CoordinatorProfile = {
  nama: string
  email: string
  telepon: string
  foto?: string
}
export const PROFILE_PHOTO =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3E%3Crect width='128' height='128' fill='%23E2E8F0'/%3E%3Cpath d='M64 68a22 22 0 1 0 0-44 22 22 0 0 0 0 44zm0 10c-24 0-44 14-44 32v6h88v-6c0-18-20-32-44-32z' fill='%2394A3B8'/%3E%3C/svg%3E"

export function Title({
  children,
  sub,
  right,
}: {
  children: ReactNode
  sub?: string
  right?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-serif text-4xl leading-none sm:text-5xl">
          {children}
        </h1>
        {sub && <p className="mt-2 text-sm text-mute">{sub}</p>}
      </div>
      {right}
    </div>
  )
}

export type Mode = "harian" | "mingguan" | "bulanan" | "rentang"

export const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00")
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export function useRange() {
  const [mode, setMode] = useState<Mode>("mingguan")
  const [anchor, setAnchor] = useState(TODAY)
  const [to, setTo] = useState(TODAY)
  const range = useMemo<[string, string]>(() => {
    if (mode === "harian") return [anchor, anchor]
    if (mode === "mingguan") return [addDays(anchor, -6), anchor]
    if (mode === "bulanan")
      return [anchor.slice(0, 8) + "01", anchor.slice(0, 8) + "31"]
    return [anchor, to]
  }, [mode, anchor, to])
  return { mode, setMode, anchor, setAnchor, to, setTo, range }
}

export function RangePicker({ r }: { r: ReturnType<typeof useRange> }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        role="tablist"
        className="inline-flex max-w-full overflow-x-auto no-scrollbar rounded-lg border border-line bg-wash p-1"
      >
        {(["harian", "mingguan", "bulanan", "rentang"] as Mode[]).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={r.mode === m}
            onClick={() => r.setMode(m)}
            className={cx(
              "h-9 shrink-0 rounded-md px-3 text-xs sm:px-3.5 sm:text-sm font-semibold capitalize transition",
              r.mode === m ? "bg-white text-navy shadow-sm" : "text-mute",
            )}
          >
            {m === "rentang" ? "Rentang bebas" : m}
          </button>
        ))}
      </div>
      <DateInput
        aria-label="Tanggal"
        value={r.anchor}
        onChange={r.setAnchor}
        className="w-auto min-w-[140px]"
      />
      {r.mode === "rentang" && (
        <>
          <span className="text-mute">s/d</span>
          <DateInput
            aria-label="Sampai"
            value={r.to}
            onChange={r.setTo}
            className="w-auto min-w-[140px]"
          />
        </>
      )}
    </div>
  )
}

export function agg(list: Departure[]) {
  let km = 0,
    pnp = 0,
    umum = 0,
    total = 0
  const cbs = new Set<string>()
  list.forEach((d) => {
    const c = calc(d)
    km += d.kmTempuh ?? 0
    pnp += d.penumpang ?? 0
    umum += c.umum
    total += c.total
    cbs.add(d.cb)
  })
  return {
    km,
    pnp,
    umum,
    total,
    upp: km ? total / km : 0,
    so: cbs.size,
    rit: list.length,
  }
}
