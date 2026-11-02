"use client"

import { useState } from "react"
import { Download, LoaderCircle } from "lucide-react"
import type { Departure } from "@/lib/data"
import { JALUR, SEGMENTS, nf, rupiah } from "@/lib/data"
import { Btn, Empty, cx } from "@/components/ui"
import { Title, th, td, tableWrap, useRange, RangePicker, agg } from "./shared"

interface Props {
  deps: Departure[]
  toast: (t: string) => void
}

export default function LaporanOperasional({ deps, toast }: Props) {
  const r = useRange()
  const [busy, setBusy] = useState(false)
  const approved = deps.filter(
    (d) =>
      d.status === "disetujui" && d.date >= r.range[0] && d.date <= r.range[1],
  )
  const t = agg(approved)
  const download = () => {
    setBusy(true)
    setTimeout(() => {
      setBusy(false)
      toast("AK15_" + r.range[0] + "_" + r.range[1] + ".xlsx siap diunduh")
    }, 1500)
  }

  return (
    <>
      <Title sub="Susunan mengikuti formulir AK 15. Struktur blok final akan dikonfirmasi dengan berkas contoh DAMRI.">
        Laporan / Ekspor
      </Title>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <RangePicker r={r} />
        <Btn disabled={busy || approved.length === 0} onClick={download}>
          {busy ? (
            <LoaderCircle size={16} className="animate-spin" />
          ) : (
            <Download size={16} />
          )}
          {busy ? "Menyiapkan…" : "Unduh .xlsx (susunan AK 15)"}
        </Btn>
      </div>
      <h2 className="mb-3 mt-8 text-xs font-bold uppercase tracking-widest text-navy">
        Pratinjau
      </h2>
      {approved.length === 0 ? (
        <div className="rounded-xl border border-line">
          <Empty title="Tidak ada data pada periode ini" />
        </div>
      ) : (
        <div className="space-y-4">
          {SEGMENTS.map((s) => {
            const l = approved.filter((d) => d.segmentId === s.id)
            if (!l.length) return null
            const a = agg(l)
            return (
              <div key={s.id} className={tableWrap}>
                <div className="border-b border-line bg-navy px-4 py-2 text-sm font-semibold text-white">
                  {s.nama}
                </div>
                <table className="w-full min-w-[640px]">
                  <thead className="bg-wash">
                    <tr>
                      {["Jalur", "RIT", "KM", "Penumpang", "Pendapatan"].map(
                        (h, i) => (
                          <th key={h} className={cx(th, i > 0 && "text-right")}>
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {JALUR.filter((j) => j.segmentId === s.id).map((j) => {
                      const x = agg(l.filter((d) => d.jalurId === j.id))
                      return x.rit ? (
                        <tr key={j.id} className="border-t border-line">
                          <td className={td}>{j.nama}</td>
                          <td className={cx(td, "num text-right")}>{x.rit}</td>
                          <td className={cx(td, "num text-right")}>
                            {nf(x.km)}
                          </td>
                          <td className={cx(td, "num text-right")}>
                            {nf(x.pnp)}
                          </td>
                          <td className={cx(td, "num text-right")}>
                            {rupiah(x.total)}
                          </td>
                        </tr>
                      ) : null
                    })}
                    <tr className="border-t border-line bg-wash font-semibold">
                      <td className={td}>Subtotal</td>
                      <td className={cx(td, "num text-right")}>{a.rit}</td>
                      <td className={cx(td, "num text-right")}>{nf(a.km)}</td>
                      <td className={cx(td, "num text-right")}>{nf(a.pnp)}</td>
                      <td className={cx(td, "num text-right")}>
                        {rupiah(a.total)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )
          })}
          <div className="flex flex-wrap justify-between gap-4 rounded-xl bg-ink p-5 text-white">
            <span className="font-serif text-2xl">Rekap total produksi</span>
            <span className="num text-sm leading-7 text-white/80">
              {t.rit} RIT · {nf(t.km)} km · {nf(t.pnp)} penumpang ·{" "}
              <b className="text-white">{rupiah(t.total)}</b>
            </span>
          </div>
        </div>
      )}
    </>
  )
}

