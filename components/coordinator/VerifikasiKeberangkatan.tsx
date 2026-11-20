"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, ChevronRight, Download, LayoutDashboard, X } from "lucide-react"
import type { Departure, Segment, Jalur } from "@/lib/data"
import {
  DRIVERS,
  SEGMENTS,
  JALUR,
  JENIS_PENUMPANG,
  calc,
  fmtDate,
  jalur,
  nf,
  plat,
  rupiah,
  seg,
} from "@/lib/data"
import type { JenisPenumpang } from "@/types"
import { supabase } from "@/lib/supabase"
import {
  Btn,
  DateInput,
  Dialog,
  Drawer,
  Empty,
  Field,
  StatusBadge,
  cx,
  inputCls,
} from "@/components/ui"
import { Title, th, td, tableWrap, type Page } from "./shared"
import { approveDeparture, rejectDeparture, getMasterData } from "@/lib/supabaseService"

interface Props {
  deps: Departure[]
  setDeps: React.Dispatch<React.SetStateAction<Departure[]>>
  toast: (t: string, type?: "success" | "error") => void
  go: (p: Page) => void
  clearNew: () => void
  currentUser?: { nama: string; email: string; id?: string } | null
}
export default function VerifikasiKeberangkatan({ deps, setDeps, toast, go, clearNew, currentUser }: Props) {
  const isDemo = currentUser?.email === "koordinator@damri.co.id"
  const [fd, setFd] = useState("")
  const [fs, setFs] = useState("")
  const [fj, setFj] = useState("")
  const [fdr, setFdr] = useState("")
  const [sel, setSel] = useState<string[]>([])
  const [open, setOpen] = useState<string | null>(null)
  const [bulk, setBulk] = useState(false)
  const [rej, setRej] = useState<string | null>(null)
  const [note, setNote] = useState("")
  const [segments, setSegments] = useState<Segment[]>(isDemo ? SEGMENTS : [])
  const [jalurList, setJalurList] = useState<Jalur[]>(isDemo ? JALUR : [])
  const [passengerTypes, setPassengerTypes] = useState<JenisPenumpang[]>(
    isDemo ? JENIS_PENUMPANG : [],
  )

  useEffect(() => {
    getMasterData(isDemo).then((m) => {
      setSegments(m.segments || [])
      setJalurList(m.jalurList || [])
      if (m.passengerTypes && m.passengerTypes.length > 0) {
        setPassengerTypes(m.passengerTypes)
      }
    })
  }, [isDemo])

  const driverOptions = useMemo(
    () => Array.from(new Set([...(isDemo ? DRIVERS : []), ...deps.map((d) => d.driver).filter(Boolean)])),
    [deps, isDemo],
  )

  const rows = useMemo(
    () =>
      deps
        .filter((d) => d.status === "dikirim")
        .filter(
          (d) =>
            (!fd || d.date === fd) &&
            (!fs ||
              d.segmentId === fs ||
              segments.some(
                (s) =>
                  s.id === fs &&
                  ((s as any).rawId === d.segmentId ||
                    (s as any).kode === d.segmentId),
              )) &&
            (!fj || d.jalurId === fj) &&
            (!fdr || d.driver === fdr),
        )
        .sort(
          (a, b) =>
            Number(!!b.isNew) - Number(!!a.isNew) ||
            (b.date + b.time).localeCompare(a.date + a.time),
        ),
    [deps, fd, fs, fj, fdr, segments],
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
    if (!isDemo) {
      ids.forEach((id) => approveDeparture(id, "Koordinator"))
    }
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
    if (!isDemo && rej) {
      rejectDeparture(rej, note.trim(), "Koordinator")
    }
    setRej(null)
    setOpen(null)
    setNote("")
    toast("Keberangkatan ditolak & dikembalikan ke draft", "error")
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
        <DateInput
          aria-label="Tanggal"
          placeholder="dd/mm/yyyy"
          value={fd}
          onChange={setFd}
        />
        <select
          aria-label="Segmen"
          value={fs}
          onChange={(e) => (setFs(e.target.value), setFj(""))}
          className={cx(inputCls(), "h-11")}
        >
          <option value="">Semua segmen</option>
          {segments.map((s) => (
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
          {jalurList.filter((j) => !fs || j.segmentId === fs).map((j) => (
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
          {driverOptions.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-line">
          <Empty
            title="Tidak ada yang menunggu verifikasi"
            hint={
              deps.some((d) => d.status === "draft")
                ? "Semua keberangkatan yang telah dikirim sudah diverifikasi. Terdapat keberangkatan yang masih berstatus Draft pada sopir (belum diklik 'Kirim')."
                : "Semua keberangkatan sudah diperiksa."
            }
            action={<Btn onClick={() => go("dashboard")}>Buka Dashboard</Btn>}
          />
        </div>
      ) : (
        <div className={tableWrap}>
          <table className="w-full min-w-[880px]">
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
                ].map((h, i) => (
                  <th key={h} className={cx(th, i >= 5 && "text-right")}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => {
                const segmentObj =
                  segments.find(
                    (s) =>
                      s.id === d.segmentId ||
                      (s as any).rawId === d.segmentId ||
                      (s as any).kode === d.segmentId,
                  ) || seg(d.segmentId)

                const jalurObj =
                  jalurList.find((j) => j.id === d.jalurId) || jalur(d.jalurId)

                // Total penumpang dari semua jenis penumpang yang diinput sopir
                const totalPax = (() => {
                  if (
                    d.passengerCounts &&
                    Object.keys(d.passengerCounts).length > 0
                  ) {
                    return Object.values(d.passengerCounts).reduce(
                      (acc, v) => acc + (Number(v) || 0),
                      0,
                    )
                  }
                  if (d.penumpang == null && d.pm == null) return null
                  return (d.penumpang || 0) + (d.pm || 0)
                })()

                // Hitung total pendapatan sesuai perhitungan sopir & data master
                let paxRev = d.pendapatan
                if (segmentObj.kontrak) {
                  paxRev = segmentObj.nilaiTetap || 0
                } else if (paxRev == null) {
                  paxRev = (d.penumpang || 0) * (jalurObj.tarif || 0)
                }
                const totalRevenue =
                  (paxRev || 0) + (d.subsidi || 0) + (d.bagasi || 0)

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
                    <td className={td}>{segmentObj.nama}</td>
                    <td className={cx(td, "max-w-[220px] truncate")}>
                      {d.jalurNama || jalurObj.nama}
                    </td>
                    <td className={cx(td, "num whitespace-nowrap")}>
                      {plat(d.cb) || d.cb}
                    </td>
                    <td className={cx(td, "num text-right")}>
                      {nf(d.kmTempuh)}
                    </td>
                    <td className={cx(td, "num text-right")}>
                      <span className="font-semibold">{nf(totalPax)}</span>
                      {d.pm != null && d.pm > 0 && d.penumpang != null && (
                        <div className="text-[10px] font-sans text-mute">
                          U: {d.penumpang} · P/M: {d.pm}
                        </div>
                      )}
                    </td>
                    <td className={cx(td, "num whitespace-nowrap text-right font-medium")}>
                      {rupiah(totalRevenue)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {(selIds.length > 0 || (scoped && rows.length > 1)) && (
        <div className="rise fixed inset-x-4 bottom-6 z-40 mx-auto flex max-w-2xl flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-navy-900/95 p-3.5 pl-5 text-white shadow-2xl backdrop-blur-md lg:left-[calc(16rem+1rem)] lg:right-6 lg:mx-auto">
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
        {detail && (
          <DetailBody
            d={detail}
            segments={segments}
            jalurList={jalurList}
            passengerTypes={passengerTypes}
            isDemo={isDemo}
          />
        )}
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

function DetailBody({
  d,
  segments,
  jalurList,
  passengerTypes,
  isDemo,
}: {
  d: Departure
  segments: Segment[]
  jalurList: Jalur[]
  passengerTypes: JenisPenumpang[]
  isDemo?: boolean
}) {
  const segmentObj =
    segments.find(
      (s) =>
        s.id === d.segmentId ||
        (s as any).rawId === d.segmentId ||
        (s as any).kode === d.segmentId,
    ) || seg(d.segmentId)
  const jalurObj =
    jalurList.find((j) => j.id === d.jalurId) || jalur(d.jalurId)

  const [tarifItems, setTarifItems] = useState<
    Array<{ id: string; nama: string; tarif: number }>
  >([])

  useEffect(() => {
    let active = true

    async function loadTarifDanPenumpang() {
      if (isDemo) {
        const demoTarifs: Record<string, Array<{ id: string; nama: string; tarif: number }>> = {
          j1: [{ id: "umum", nama: "Umum", tarif: 140000 }],
          j2: [{ id: "umum", nama: "Umum", tarif: 150000 }],
          j5: [{ id: "umum", nama: "Umum", tarif: 80000 }],
        }
        setTarifItems(demoTarifs[d.jalurId] || [])
        return
      }

      try {
        const [paxsRes, tjRes] = await Promise.all([
          supabase.from("jenis_penumpang").select("*").order("created_at"),
          supabase
            .from("tarif_jalur")
            .select("*")
            .eq("jalur_id", d.jalurId)
            .order("berlaku_mulai", { ascending: false }),
        ])

        if (!active) return

        let activePaxs = (paxsRes.data || []).filter((p: any) => p.aktif)
        if (paxsRes.error || activePaxs.length === 0) {
          const p2 = await supabase.from("penumpang").select("*").order("created_at")
          if (!p2.error && p2.data) {
            activePaxs = p2.data.filter((p: any) => p.aktif !== false)
          }
        }
        if (activePaxs.length === 0) {
          activePaxs = (passengerTypes && passengerTypes.length > 0)
            ? passengerTypes.filter((p) => p.aktif)
            : [
                { id: "umum", nama: "Umum", aktif: true },
                { id: "pm", nama: "Pelajar / Mahasiswa (P/M)", aktif: true },
              ]
        }

        const items: Array<{ id: string; nama: string; tarif: number }> = []
        const seenPaxs = new Set<string>()

        // HANYA ambil jenis penumpang yang benar-benar diatur di Data Master Tarif untuk jalur ini
        if (tjRes.data && tjRes.data.length > 0) {
          const defaultUmumPax = activePaxs.find((p: any) => p.nama?.toLowerCase().includes("umum"))
          for (const row of tjRes.data) {
            const matchedPax =
              activePaxs.find(
                (p: any) =>
                  p.id === row.jenis_penumpang_id ||
                  p.nama?.toLowerCase() === (row.jenis_penumpang || "").toLowerCase(),
              ) || defaultUmumPax
            const pName = matchedPax?.nama || row.jenis_penumpang || "Umum"
            const pId =
              matchedPax?.id ||
              row.jenis_penumpang_id ||
              (pName.toLowerCase().includes("pelajar") || pName.toLowerCase().includes("p/m")
                ? "pm"
                : "umum")

            if (!seenPaxs.has(pId) && !seenPaxs.has(pName.toLowerCase())) {
              seenPaxs.add(pId)
              seenPaxs.add(pName.toLowerCase())
              items.push({
                id: pId,
                nama: pName,
                tarif: Number(row.tarif) || 0,
              })
            }
          }
        }

        setTarifItems(items)
      } catch (e) {
        console.warn("Gagal memuat tarif:", e)
        setTarifItems([])
      }
    }

    loadTarifDanPenumpang()
    return () => {
      active = false
    }
  }, [d.jalurId, isDemo, passengerTypes])

  const getCount = (it: { id: string; nama: string }) => {
    if (d.passengerCounts && d.passengerCounts[it.id] !== undefined) {
      return Number(d.passengerCounts[it.id]) || 0
    }
    const isPm =
      it.id === "pm" ||
      it.nama.toLowerCase().includes("pelajar") ||
      it.nama.toLowerCase().includes("p/m")
    const isUmum = it.id === "umum" || it.nama.toLowerCase().includes("umum")
    if (isUmum) return d.penumpang != null ? Number(d.penumpang) : 0
    if (isPm) return d.pm != null ? Number(d.pm) : 0
    return 0
  }

  const totalPax = (() => {
    if (d.passengerCounts && Object.keys(d.passengerCounts).length > 0) {
      return Object.values(d.passengerCounts).reduce(
        (acc, v) => acc + (Number(v) || 0),
        0,
      )
    }
    if (d.penumpang == null && d.pm == null) return null
    return (d.penumpang || 0) + (d.pm || 0)
  })()

  // Perhitungan pendapatan tiket penumpang:
  // 1. Jika segmen kontrak: pendapatan tiket = nilai tetap kontrak (atau 0 jika belum diset)
  // 2. Jika bukan kontrak dan ada jenis penumpang di data master untuk jalur ini:
  //    hitung langsung dari rumus: sum(jumlah_penumpang * tarif)
  // 3. Jika belum diatur di data master (tarifItems kosong):
  //    gunakan nilai d.pendapatan yang dikirim sopir (atau 0)
  const calculatedPaxRev = segmentObj.kontrak
    ? (segmentObj.nilaiTetap || 0)
    : tarifItems.length > 0
      ? tarifItems.reduce((acc, it) => acc + getCount(it) * (it.tarif || 0), 0)
      : (d.pendapatan || 0)

  const paxRevenue = calculatedPaxRev
  const totalRevenue = paxRevenue + (d.subsidi || 0) + (d.bagasi || 0)

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <StatusBadge status={d.status} rejected={!!d.rejectNote} />
        <span className="num text-xs text-mute">
          {fmtDate(d.date)} · {d.time}
        </span>
      </div>

      {d.rejectNote && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3.5">
          <p className="text-xs font-bold text-red-800">
            Catatan penolakan sebelumnya
          </p>
          <p className="mt-1 text-sm text-red-900">{d.rejectNote}</p>
        </div>
      )}

      {/* Rute & Kendaraan */}
      <div className="rounded-xl bg-wash p-4 border border-line">
        <p className="font-semibold text-ink">
          {d.jalurNama || jalurObj.nama}
        </p>
        <p className="mt-0.5 text-sm text-mute">
          {segmentObj.nama} ·{" "}
          <span className="num font-medium text-ink">
            {plat(d.cb) || d.cb}
          </span>
        </p>
        <div className="mt-2.5 flex items-center justify-between border-t border-line/60 pt-2.5 text-xs text-mute">
          <span>
            Sopir: <strong className="font-semibold text-ink">{d.driver}</strong>
          </span>
        </div>
      </div>

      {/* 1 · Jarak */}
      <div className="rounded-xl border border-line p-4">
        <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-mute">
          1 · Jarak
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-mute">KM tempuh</span>
            <span className="num font-medium">{nf(d.kmTempuh)} km</span>
          </div>
          <div className="flex justify-between">
            <span className="text-mute">KM empty</span>
            <span className="num font-medium">{nf(d.kmEmpty)} km</span>
          </div>
        </div>
      </div>

      {/* 2 · Penumpang */}
      <div className="rounded-xl border border-line p-4">
        <div className="mb-2.5 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-mute">
            2 · Penumpang
          </h3>
          {totalPax != null && (
            <span className="text-xs font-semibold text-navy">
              Total: {nf(totalPax)} orang
            </span>
          )}
        </div>
        <div className="space-y-2.5 text-sm">
          {tarifItems.length > 0 ? (
            tarifItems.map((item) => {
              const count = getCount(item)
              const subtotal = count * (item.tarif || 0)
              const labelText = item.nama.toLowerCase().startsWith("penumpang")
                ? item.nama
                : `Penumpang ${item.nama}`
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between border-b border-line/50 pb-2.5 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium text-ink">{labelText}</p>
                    {!segmentObj.kontrak && (
                      <p className="text-xs text-mute">
                        {nf(count)} orang × {rupiah(item.tarif)}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="num font-semibold text-ink">
                      {segmentObj.kontrak ? `${nf(count)} orang` : rupiah(subtotal)}
                    </p>
                    {!segmentObj.kontrak && (
                      <p className="text-xs text-mute">{nf(count)} orang</p>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="rounded-lg border border-dashed border-line bg-wash/60 p-3.5 text-center text-xs text-mute">
              {d.penumpang != null && d.penumpang > 0 ? (
                <div className="flex justify-between text-sm text-ink">
                  <span className="text-mute">Penumpang</span>
                  <span className="num font-medium">{nf(d.penumpang)} orang</span>
                </div>
              ) : (
                "Belum ada jenis penumpang yang diatur untuk jalur ini pada Data Master Tarif."
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3 · Pendapatan & Biaya Tambahan */}
      <div className="rounded-xl border border-line p-4">
        <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-mute">
          3 · Pendapatan & Biaya Tambahan
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-mute">
              {segmentObj.kontrak
                ? "Pendapatan kontrak"
                : "Pendapatan tiket (penumpang)"}
            </span>
            <span className="num font-medium">{rupiah(paxRevenue)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-mute">Subsidi</span>
            <span className="num font-medium">{rupiah(d.subsidi ?? 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-mute">Bagasi</span>
            <span className="num font-medium">{rupiah(d.bagasi ?? 0)}</span>
          </div>
        </div>
      </div>

      {/* 4 · Jumlah Pendapatan */}
      <div className="rounded-xl bg-ink p-4 text-white">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-white/60">
          4 · Jumlah Pendapatan
        </h3>
        <div className="space-y-3">
          {/* Rincian Perhitungan */}
          <div className="border-b border-white/10 pb-3">
            <span className="text-xs font-medium uppercase tracking-wider text-white/70">
              Rincian Perhitungan
            </span>
            <div className="mt-2 space-y-1.5 pl-1">
              {segmentObj.kontrak ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/80">Nilai tetap (Kontrak)</span>
                  <span className="num font-semibold text-white">
                    {rupiah(segmentObj.nilaiTetap)}
                  </span>
                </div>
              ) : tarifItems.length > 0 ? (
                tarifItems.map((item) => {
                  const count = getCount(item)
                  const subtotal = count * (item.tarif || 0)
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-white/80">
                        {item.nama} ({nf(count)} × {rupiah(item.tarif)})
                      </span>
                      <span className="num font-semibold text-white">
                        {rupiah(subtotal)}
                      </span>
                    </div>
                  )
                })
              ) : (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/80">Pendapatan tiket</span>
                  <span className="num font-semibold text-white">
                    {rupiah(paxRevenue)}
                  </span>
                </div>
              )}
              {d.subsidi != null && d.subsidi > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/80">Subsidi</span>
                  <span className="num font-semibold text-white">
                    {rupiah(d.subsidi)}
                  </span>
                </div>
              )}
              {d.bagasi != null && d.bagasi > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/80">Bagasi</span>
                  <span className="num font-semibold text-white">
                    {rupiah(d.bagasi)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Total pendapatan */}
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-sm font-semibold text-white/90">
              Total pendapatan
            </span>
            <span className="num text-xl font-bold text-emerald-400">
              {rupiah(totalRevenue)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}