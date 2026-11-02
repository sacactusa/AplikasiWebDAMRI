"use client"

import { useMemo, useState } from "react"
import { Check, ChevronRight, Download, LayoutDashboard, X } from "lucide-react"
import type { Departure } from "@/lib/data"
import {
  DRIVERS,
  JALUR,
  SEGMENTS,
  VEHICLES,
  calc,
  fmtDate,
  jalur,
  nf,
  plat,
  rupiah,
  seg,
} from "@/lib/data"
import {
  Btn,
  Dialog,
  Drawer,
  Empty,
  Field,
  StatusBadge,
  cx,
  inputCls,
} from "@/components/ui"
import { Title, th, td, tableWrap, type Page } from "./shared"

interface Props {
  deps: Departure[]
  setDeps: React.Dispatch<React.SetStateAction<Departure[]>>
  toast: (t: string) => void
  go: (p: Page) => void
  clearNew: () => void
}
export default function VerifikasiKeberangkatan({ deps, setDeps, toast, go, clearNew }: Props) {
  const [fd, setFd] = useState("")
  const [fs, setFs] = useState("")
  const [fj, setFj] = useState("")
  const [fdr, setFdr] = useState("")
  const [sel, setSel] = useState<string[]>([])
  const [open, setOpen] = useState<string | null>(null)
  const [bulk, setBulk] = useState(false)
  const [rej, setRej] = useState<string | null>(null)
  const [note, setNote] = useState("")

  const rows = useMemo(
    () =>
      deps
        .filter((d) => d.status === "dikirim")
        .filter(
          (d) =>
            (!fd || d.date === fd) &&
            (!fs || d.segmentId === fs) &&
            (!fj || d.jalurId === fj) &&
            (!fdr || d.driver === fdr),
        )
        .sort(
          (a, b) =>
            Number(!!b.isNew) - Number(!!a.isNew) ||
            (b.date + b.time).localeCompare(a.date + a.time),
        ),
    [deps, fd, fs, fj, fdr],
  )
  const newCount = deps.filter((d) => d.isNew && d.status === "dikirim").length
  const total = deps.filter((d) => d.status === "dikirim").length
  const selIds = sel.filter((id) => rows.some((r) => r.id === id))
  const allSel = rows.length > 0 && selIds.length === rows.length
  const scoped = !!(fd || fj)

  const approve = (ids: string[]) => {
    setDeps((p) =>
      p.map((d) =>
        ids.includes(d.id) ? { ...d, status: "disetujui", isNew: false } : d,
      ),
    )
    setSel((s) => s.filter((x) => !ids.includes(x)))
    setOpen(null)
    toast(
      ids.length === 1
        ? "Keberangkatan disetujui"
        : `${ids.length} keberangkatan disetujui`,
    )
  }
  const reject = () => {
    setDeps((p) =>
      p.map((d) =>
        d.id === rej
          ? { ...d, status: "draft", rejectNote: note.trim(), isNew: false }
          : d,
      ),
    )
    setRej(null)
    setOpen(null)
    setNote("")
    toast("Dikembalikan ke draft sopir")
  }
  const detail = deps.find((d) => d.id === open)

  return (
    <>
      <Title
        sub={`${total} keberangkatan menunggu verifikasi`}
        right={
          newCount > 0 && (
            <button
              onClick={clearNew}
              className="flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-200"
            >
              <span className="size-2 animate-pulse rounded-full bg-amber-600" />
              {newCount} baru
            </button>
          )
        }
      >
        Verifikasi
      </Title>

      <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-4">
        {[
          ["Menunggu", total, "text-amber-700"],
          ["Baru masuk", newCount, "text-navy"],
          [
            "Disetujui",
            deps.filter((d) => d.status === "disetujui").length,
            "text-emerald-700",
          ],
          [
            "Dikembalikan",
            deps.filter((d) => d.status === "draft" && d.rejectNote).length,
            "text-red-700",
          ],
        ].map(([l, n, c]) => (
          <div key={l as string} className="bg-white px-5 py-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-mute">
              {l}
            </p>
            <p className={cx("num mt-1 text-3xl", c as string)}>{n}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <input
          type="date"
          aria-label="Tanggal"
          value={fd}
          onChange={(e) => setFd(e.target.value)}
          className={cx(inputCls(), "num h-11")}
        />
        <select
          aria-label="Segmen"
          value={fs}
          onChange={(e) => (setFs(e.target.value), setFj(""))}
          className={cx(inputCls(), "h-11")}
        >
          <option value="">Semua segmen</option>
          {SEGMENTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nama}
            </option>
          ))}
        </select>
        <select
          aria-label="Jalur"
          value={fj}
          onChange={(e) => setFj(e.target.value)}
          className={cx(inputCls(), "h-11")}
        >
          <option value="">Semua jalur</option>
          {JALUR.filter((j) => !fs || j.segmentId === fs).map((j) => (
            <option key={j.id} value={j.id}>
              {j.nama}
            </option>
          ))}
        </select>
        <select
          aria-label="Sopir"
          value={fdr}
          onChange={(e) => setFdr(e.target.value)}
          className={cx(inputCls(), "h-11")}
        >
          <option value="">Semua sopir</option>
          {DRIVERS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-line">
          <Empty
            title="Tidak ada yang menunggu verifikasi"
            hint="Semua keberangkatan sudah diperiksa."
            action={<Btn onClick={() => go("dashboard")}>Buka Dashboard</Btn>}
          />
        </div>
      ) : (
        <div className={tableWrap}>
          <table className="w-full min-w-[980px]">
            <thead className="border-b border-line bg-wash">
              <tr>
                <th className={cx(th, "w-12")}>
                  <input
                    type="checkbox"
                    aria-label="Pilih semua"
                    className="size-4 accent-[#0a2a66]"
                    checked={allSel}
                    onChange={() => setSel(allSel ? [] : rows.map((r) => r.id))}
                  />
                </th>
                {[
                  "Tanggal / jam",
                  "Sopir",
                  "Segmen",
                  "Jalur",
                  "Kendaraan",
                  "KM",
                  "Pnp",
                  "Pendapatan",
                  "UPP",
                ].map((h, i) => (
                  <th key={h} className={cx(th, i >= 5 && "text-right")}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => {
                const c = calc(d)
                return (
                  <tr
                    key={d.id}
                    onClick={() => setOpen(d.id)}
                    className={cx(
                      "cursor-pointer border-b border-line last:border-0 hover:bg-navy-50/60",
                      d.isNew && "row-new",
                      selIds.includes(d.id) && "bg-navy-50",
                    )}
                  >
                    <td className={td} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label="Pilih baris"
                        className="size-4 accent-[#0a2a66]"
                        checked={selIds.includes(d.id)}
                        onChange={() =>
                          setSel((s) =>
                            s.includes(d.id)
                              ? s.filter((x) => x !== d.id)
                              : [...s, d.id],
                          )
                        }
                      />
                    </td>
                    <td className={cx(td, "num whitespace-nowrap")}>
                      {fmtDate(d.date)}{" "}
                      <span className="text-mute">{d.time}</span>
                      {d.isNew && (
                        <span className="ml-2 rounded bg-amber-400 px-1.5 py-0.5 font-sans text-[10px] font-bold text-ink">
                          BARU
                        </span>
                      )}
                    </td>
                    <td className={td}>{d.driver}</td>
                    <td className={td}>{seg(d.segmentId).nama}</td>
                    <td className={cx(td, "max-w-[220px] truncate")}>
                      {jalur(d.jalurId).nama}
                    </td>
                    <td className={cx(td, "num whitespace-nowrap")}>{d.cb}</td>
                    <td className={cx(td, "num text-right")}>
                      {nf(d.kmTempuh)}
                    </td>
                    <td className={cx(td, "num text-right")}>
                      {nf(d.penumpang)}
                    </td>
                    <td className={cx(td, "num whitespace-nowrap text-right")}>
                      {rupiah(c.total)}
                    </td>
                    <td className={cx(td, "num text-right")}>{nf(c.upp)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {(selIds.length > 0 || (scoped && rows.length > 1)) && (
        <div className="rise fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-2xl flex-wrap items-center gap-3 rounded-2xl bg-ink p-3 pl-5 text-white shadow-2xl">
          <span className="text-sm font-semibold">{selIds.length} dipilih</span>
          {scoped && !allSel && (
            <button
              onClick={() => setSel(rows.map((r) => r.id))}
              className="text-sm text-amber-300 underline underline-offset-2"
            >
              Pilih semua pada tanggal/jalur ini ({rows.length})
            </button>
          )}
          <div className="ml-auto flex gap-2">
            {selIds.length > 0 && (
              <>
                <Btn
                  variant="ghost"
                  className="text-white hover:bg-white/10"
                  onClick={() => setSel([])}
                >
                  Batal
                </Btn>
                <Btn variant="ok" onClick={() => setBulk(true)}>
                  <Check size={16} /> Setujui terpilih
                </Btn>
              </>
            )}
          </div>
        </div>
      )}

      <Drawer
        open={!!detail}
        onClose={() => setOpen(null)}
        title="Detail keberangkatan"
        footer={
          detail && (
            <>
              <Btn
                variant="outline"
                className="flex-1 text-red-700"
                onClick={() => {
                  setNote("")
                  setRej(detail.id)
                }}
              >
                <X size={16} /> Tolak
              </Btn>
              <Btn
                variant="ok"
                className="flex-[2]"
                onClick={() => approve([detail.id])}
              >
                <Check size={16} /> Setujui
              </Btn>
            </>
          )
        }
      >
        {detail && <DetailBody d={detail} />}
      </Drawer>

      <Dialog
        open={bulk}
        title={`Setujui ${selIds.length} keberangkatan?`}
        onClose={() => setBulk(false)}
        actions={
          <>
            <Btn variant="outline" onClick={() => setBulk(false)}>
              Batal
            </Btn>
            <Btn
              variant="ok"
              onClick={() => {
                approve(selIds)
                setBulk(false)
              }}
            >
              Ya, setujui
            </Btn>
          </>
        }
      >
        Data yang disetujui akan terkunci dan masuk rekap.
      </Dialog>

      <Dialog
        open={!!rej}
        title="Tolak keberangkatan"
        onClose={() => setRej(null)}
        actions={
          <>
            <Btn variant="outline" onClick={() => setRej(null)}>
              Batal
            </Btn>
            <Btn variant="danger" disabled={!note.trim()} onClick={reject}>
              Tolak & kembalikan
            </Btn>
          </>
        }
      >
        <Field label="Catatan penolakan (wajib)">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder="Jelaskan apa yang perlu diperbaiki sopir…"
            className="w-full rounded-lg border border-line p-3 text-base text-ink"
          />
        </Field>
      </Dialog>
    </>
  )
}

function DetailBody({ d }: { d: Departure }) {
  const c = calc(d)
  const rows: [string, string][] = [
    ["Tanggal", `${fmtDate(d.date)} · ${d.time}`],
    ["Sopir", d.driver],
    ["Segmen", seg(d.segmentId).nama],
    ["Jalur", jalur(d.jalurId).nama],
    ["Kendaraan", `${d.cb} · ${plat(d.cb)}`],
    ["KM tempuh", nf(d.kmTempuh) + " km"],
    ["KM empty", nf(d.kmEmpty) + " km"],
    ["Penumpang", nf(d.penumpang)],
    ["P/M", nf(d.pm)],
    ["Pendapatan", rupiah(d.pendapatan)],
    ["Subsidi", rupiah(d.subsidi)],
    ["Bagasi", rupiah(d.bagasi)],
  ]
  return (
    <>
      <StatusBadge status={d.status} />
      <dl className="mt-4">
        {rows.map(([a, b]) => (
          <div
            key={a}
            className="flex justify-between gap-4 border-b border-line py-2.5 text-sm"
          >
            <dt className="text-mute">{a}</dt>
            <dd className="num text-right">{b}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 rounded-xl bg-navy-50 p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-navy">
          Hasil hitung otomatis
        </p>
        {[
          [
            "Tarif berlaku",
            seg(d.segmentId).kontrak ? "Nilai tetap" : rupiah(c.tarif),
          ],
          ["Pendapatan umum", rupiah(c.umum)],
          ["Total pendapatan", rupiah(c.total)],
          ["UPP (Rp/km)", rupiah(c.upp)],
        ].map(([a, b]) => (
          <div key={a} className="flex justify-between py-1 text-sm">
            <span className="text-mute">{a}</span>
            <span className="num font-medium">{b}</span>
          </div>
        ))}
      </div>
    </>
  )
}