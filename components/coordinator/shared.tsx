import { useMemo, useState, type ReactNode } from "react"
import type { Departure } from "@/lib/data"
import { calc, TODAY } from "@/lib/data"
import { cx, inputCls } from "@/components/ui"

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
export const PROFILE_PHOTO =
  "https://images.unsplash.com/photo-1573497019236-17f8177b81e8?crop=faces&fit=crop&h=160&w=160&auto=format&q=85"

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
        className="inline-flex rounded-lg border border-line bg-wash p-1"
      >
        {(["harian", "mingguan", "bulanan", "rentang"] as Mode[]).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={r.mode === m}
            onClick={() => r.setMode(m)}
            className={cx(
              "h-9 rounded-md px-3.5 text-sm font-semibold capitalize transition",
              r.mode === m ? "bg-white text-navy shadow-sm" : "text-mute",
            )}
          >
            {m === "rentang" ? "Rentang bebas" : m}
          </button>
        ))}
      </div>
      <input
        type="date"
        aria-label="Tanggal"
        value={r.anchor}
        onChange={(e) => r.setAnchor(e.target.value)}
        className={cx(inputCls(), "num h-11 w-auto")}
      />
      {r.mode === "rentang" && (
        <>
          <span className="text-mute">s/d</span>
          <input
            type="date"
            aria-label="Sampai"
            value={r.to}
            onChange={(e) => r.setTo(e.target.value)}
            className={cx(inputCls(), "num h-11 w-auto")}
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
