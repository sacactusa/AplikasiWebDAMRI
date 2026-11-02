"use client"

import { useRef, useState } from "react"
import { AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react"
import type { Departure } from "@/lib/data"
import { calc, fmtDate, jalur, missing, nf, plat, rupiah, seg } from "@/lib/data"
import { Btn, Dialog, Field, NumInput, StatusBadge, cx } from "@/components/ui"
import { TopBar } from "./shared"

interface Props {
  dep: Departure
  offline: boolean
  onBack: () => void
  onSave: (d: Departure) => void
  onSubmit: (d: Departure) => void
}
export default function DetailKeberangkatan({ dep, offline, onBack, onSave, onSubmit }: Props) {
  const [d, setD] = useState(dep)
  const [tried, setTried] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const s = seg(d.segmentId)
  const ro = dep.status !== "draft"
  const miss = missing(d)
  const c = calc(d)
  const set = (k: keyof Departure) => (v: number | null) =>
    setD((p) => ({ ...p, [k]: v }))
  const err = (k: string) =>
    tried && miss.includes(k) ? "Wajib diisi" : undefined

  const send = () => {
    setTried(true)
    if (miss.length) {
      setTimeout(
        () =>
          ref.current
            ?.querySelector('[data-error="true"]')
            ?.scrollIntoView({ behavior: "smooth", block: "center" }),
        50,
      )
      return
    }
    setConfirm(true)
  }

  const num = (
    label: string,
    k: keyof Departure,
    o: { money?: boolean; suffix?: string; locked?: boolean } = {},
  ) => (
    <Field label={label} error={err(k as string)} locked={o.locked}>
      <NumInput
        value={d[k] as number | null}
        onChange={set(k)}
        money={o.money}
        suffix={o.suffix}
        error={!!err(k as string)}
        disabled={ro || o.locked}
      />
    </Field>
  )

  const card = (t: string, body: React.ReactNode) => (
    <section className="rounded-xl border border-line p-4">
      <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-navy">
        {t}
      </h2>
      <div className="space-y-4">{body}</div>
    </section>
  )

  return (
    <>
      <TopBar
        title={ro ? "Detail Keberangkatan" : "Isi Hasil"}
        onBack={onBack}
        detail
      />
      <div ref={ref} className="space-y-4 px-5 py-5">
        {dep.rejectNote && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-bold text-red-800">
              Catatan koordinator
            </p>
            <p className="mt-1 text-sm text-red-900">{dep.rejectNote}</p>
          </div>
        )}
        <div className="rounded-xl bg-navy-50 p-4">
          <div className="flex items-center justify-between">
            <StatusBadge status={dep.status} rejected={!!dep.rejectNote} />
            <span className="num text-xs text-mute">
              {fmtDate(d.date)} · {d.time}
            </span>
          </div>
          <p className="mt-2 font-semibold">{jalur(d.jalurId).nama}</p>
          <p className="text-sm text-mute">
            {s.nama} · <span className="num">{d.cb}</span> ·{" "}
            <span className="num">{plat(d.cb)}</span>
          </p>
        </div>
        {ro && (
          <p className="text-xs text-mute">
            {dep.status === "dikirim"
              ? "Menunggu verifikasi — data tidak dapat diubah."
              : "Disetujui — data terkunci dan masuk rekap."}
          </p>
        )}
        {card(
          "1 · Jarak",
          <>
            {num("KM tempuh", "kmTempuh", { suffix: "km" })}
            {num("KM empty", "kmEmpty", { suffix: "km" })}
          </>,
        )}
        {card(
          "2 · Penumpang",
          <>
            {num("Jumlah penumpang", "penumpang", { suffix: "org" })}
            {num("P/M", "pm")}
          </>,
        )}
        {card(
          "3 · Pendapatan",
          <>
            {num("Pendapatan", "pendapatan", {
              money: true,
              locked: s.kontrak,
            })}
            {num("Subsidi", "subsidi", { money: true, locked: s.kontrak })}
            {num("Bagasi", "bagasi", { money: true })}
          </>,
        )}
        <section className="rounded-xl bg-ink p-4 text-white">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-white/60">
            4 · Ringkasan otomatis
          </h2>
          {[
            ["Tarif berlaku", s.kontrak ? "Nilai tetap" : rupiah(c.tarif)],
            ["Pendapatan umum", rupiah(c.umum)],
            ["UPP (Rp/km)", rupiah(c.upp)],
          ].map(([a, b]) => (
            <div
              key={a}
              className="flex items-baseline justify-between border-t border-white/10 py-2.5 first:border-0"
            >
              <span className="text-sm text-white/70">{a}</span>
              <span className="num text-lg">{b}</span>
            </div>
          ))}
        </section>
        {!ro && (
          <div className="space-y-3 pt-2">
            {offline && (
              <p className="text-center text-xs font-medium text-red-700">
                Tidak ada koneksi — simpan dan kirim dinonaktifkan.
              </p>
            )}
            <Btn className="h-12 w-full" disabled={offline} onClick={send}>
              {dep.rejectNote ? "Perbaiki dan kirim ulang" : "Kirim"}
              <ChevronRight size={18} />
            </Btn>
            {tried && miss.length > 0 && (
              <p className="text-center text-xs text-red-600">
                {miss.length} kolom wajib belum terisi.
              </p>
            )}
            <Btn
              variant="outline"
              className="h-12 w-full"
              disabled={offline}
              onClick={() => onSave(d)}
            >
              Simpan Draft
            </Btn>
          </div>
        )}
      </div>
      <Dialog
        open={confirm}
        title="Kirim keberangkatan?"
        onClose={() => setConfirm(false)}
        actions={
          <>
            <Btn variant="outline" onClick={() => setConfirm(false)}>
              Batal
            </Btn>
            <Btn
              onClick={() =>
                onSubmit({ ...d, status: "dikirim", rejectNote: undefined })
              }
            >
              Ya, kirim
            </Btn>
          </>
        }
      >
        Setelah dikirim, data tidak dapat diubah sampai diverifikasi.
      </Dialog>
    </>
  )
}