"use client"

import { useState } from "react"
import { AUDIT } from "@/lib/data"
import { Drawer, Empty, cx, inputCls } from "@/components/ui"
import { Title, th, td, tableWrap } from "./shared"

export default function AuditLog() {
  const [u, setU] = useState("")
  const [a, setA] = useState("")
  const [from, setFrom] = useState("")
  const [until, setUntil] = useState("")
  const [open, setOpen] = useState<typeof AUDIT[number] | null>(null)
  const iso = (t: string) => "2026-10-" + t.slice(0, 2)
  const list = AUDIT.filter(
    (x) =>
      (!u || x.u === u) &&
      (!a || x.a === a) &&
      (!from || iso(x.t) >= from) &&
      (!until || iso(x.t) <= until),
  )
  const users = [...new Set(AUDIT.map((x) => x.u))]
  const acts = [...new Set(AUDIT.map((x) => x.a))]
  const keys = (o: typeof AUDIT[number]) => [
    ...new Set([...Object.keys(o.before), ...Object.keys(o.after)]),
  ]

  return (
    <>
      <Title sub="Hanya baca. Catatan tidak dapat diubah atau dihapus.">
        Audit Log
      </Title>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <input
          type="date"
          aria-label="Dari tanggal"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className={cx(inputCls(), "num h-11")}
        />
        <input
          type="date"
          aria-label="Sampai tanggal"
          value={until}
          onChange={(e) => setUntil(e.target.value)}
          className={cx(inputCls(), "num h-11")}
        />
        <select
          aria-label="Pengguna"
          value={u}
          onChange={(e) => setU(e.target.value)}
          className={cx(inputCls(), "h-11")}
        >
          <option value="">Semua pengguna</option>
          {users.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select
          aria-label="Aksi"
          value={a}
          onChange={(e) => setA(e.target.value)}
          className={cx(inputCls(), "h-11")}
        >
          <option value="">Semua aksi</option>
          {acts.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </div>
      <div className={tableWrap}>
        <table className="w-full min-w-[640px]">
          <thead className="border-b border-line bg-wash">
            <tr>
              {["Waktu", "Pengguna", "Aksi", "Data terkait"].map((h) => (
                <th key={h} className={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((x, i) => (
              <tr
                key={i}
                onClick={() => setOpen(x)}
                className="cursor-pointer border-b border-line last:border-0 hover:bg-navy-50/60"
              >
                <td className={cx(td, "num whitespace-nowrap")}>{x.t}</td>
                <td className={td}>{x.u}</td>
                <td className={cx(td, "font-semibold")}>{x.a}</td>
                <td className={td}>{x.o}</td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={4}>
                  <Empty
                    title="Tidak ada catatan"
                    hint="Ubah filter untuk melihat aktivitas lain."
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Drawer
        open={!!open}
        onClose={() => setOpen(null)}
        title="Sebelum & sesudah"
      >
        {open && (
          <>
            <p className="text-sm text-mute">
              {open.a} · {open.o}
            </p>
            <p className="num mt-1 text-xs text-mute">
              {open.t} · {open.u}
            </p>
            <div className="num mt-5 overflow-hidden rounded-lg border border-line text-sm">
              {keys(open).map((k) => {
                const b =
                  (open.before as unknown as Record<string, string | number>)[k]
                const n =
                  (open.after as unknown as Record<string, string | number>)[k]
                return (
                  <div key={k}>
                    {b !== undefined && (
                      <div className="bg-red-50 px-3 py-1.5 text-red-800">
                        <span className="mr-2 font-bold">−</span>
                        {k}: {String(b)}
                      </div>
                    )}
                    {n !== undefined && (
                      <div className="bg-emerald-50 px-3 py-1.5 text-emerald-800">
                        <span className="mr-2 font-bold">+</span>
                        {k}: {String(n)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </Drawer>
    </>
  )
}

