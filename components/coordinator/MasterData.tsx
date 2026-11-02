"use client"

import { useState } from "react"
import { Lock, Plus } from "lucide-react"
import { SEGMENTS, JALUR, VEHICLES, TODAY, rupiah, jalur, seg, fmtDate } from "@/lib/data"
import { Btn, Dialog, Field, cx, inputCls } from "@/components/ui"
import { Title, th, td, tableWrap } from "./shared"

interface Props {
  toast: (t: string) => void
}
interface Tarif {
  jalurId: string
  tarif: number
  mulai: string
}

export default function MasterData({ toast }: Props) {
  const [tab, setTab] = useState<"Segmen" | "Jalur" | "Tarif" | "Kendaraan">(
    "Segmen",
  )
  const [q, setQ] = useState("")
  const [segs, setSegs] = useState(SEGMENTS)
  const [jals, setJals] = useState(JALUR)
  const [vehs, setVehs] = useState(VEHICLES)
  const [tarifs, setTarifs] = useState<Tarif[]>([
    ...JALUR.filter((j) => j.tarif).map((j) => ({
      jalurId: j.id,
      tarif: j.tarif,
      mulai: "2026-10-01",
    })),
    { jalurId: "j1", tarif: 140000, mulai: "2026-01-01" },
    { jalurId: "j2", tarif: 150000, mulai: "2026-01-01" },
    { jalurId: "j5", tarif: 80000, mulai: "2025-07-01" },
  ])
  const [form, setForm] = useState<null | Record<string, string>>(null)
  const f = (k: string) => form?.[k] ?? ""
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))
  const has = (s: string) => s.toLowerCase().includes(q.toLowerCase())
  const toggle = <T extends { aktif: boolean },>(
    arr: T[],
    set_: (a: T[]) => void,
    i: number,
  ) => {
    set_(arr.map((x, k) => (k === i ? { ...x, aktif: !x.aktif } : x)))
    toast(arr[i].aktif ? "Dinonaktifkan" : "Diaktifkan kembali")
  }
  const save = () => {
    if (tab === "Segmen")
      setSegs((p) => {
        const nilai =
          f("kontrak") === "ya"
            ? Number(f("nilai").replace(/\D/g, ""))
            : undefined
        const item = {
          id: f("id") || f("nama").toLowerCase(),
          nama: f("nama"),
          kontrak: f("kontrak") === "ya",
          nilaiTetap: nilai,
          aktif: true,
        }
        return f("id")
          ? p.map((x) =>
              x.id === item.id ? { ...x, ...item, aktif: x.aktif } : x,
            )
          : [...p, item]
      })
    if (tab === "Jalur")
      setJals((p) =>
        f("id")
          ? p.map((x) =>
              x.id === f("id")
                ? {
                    ...x,
                    nama: f("nama"),
                    segmentId: f("segmentId") || x.segmentId,
                  }
                : x,
            )
          : [
              ...p,
              {
                id: "jx" + p.length,
                nama: f("nama"),
                segmentId: f("segmentId") || "bandara",
                tarif: 0,
                aktif: true,
              },
            ],
      )
    if (tab === "Kendaraan")
      setVehs((p) =>
        f("id")
          ? p.map((x) =>
              x.cb === f("id") ? { ...x, cb: f("cb"), plat: f("plat") } : x,
            )
          : [...p, { cb: f("cb"), plat: f("plat"), aktif: true }],
      )
    if (tab === "Tarif")
      setTarifs((p) => [
        ...p,
        {
          jalurId: f("jalurId") || "j1",
          tarif: Number(f("tarif").replace(/\D/g, "")),
          mulai: f("mulai") || TODAY,
        },
      ])
    setForm(null)
    toast("Tersimpan")
  }
  const valid =
    tab === "Segmen"
      ? !!f("nama")
      : tab === "Jalur"
        ? !!f("nama")
        : tab === "Kendaraan"
          ? !!f("cb") && !!f("plat")
          : !!f("tarif")

  const Aksi = ({
    onEdit,
    onToggle,
    aktif,
  }: {
    onEdit?: () => void
    onToggle: () => void
    aktif: boolean
  }) => (
    <td className={cx(td, "whitespace-nowrap text-right")}>
      {onEdit && (
        <button
          onClick={onEdit}
          className="mr-3 text-sm font-semibold text-navy hover:underline"
        >
          Ubah
        </button>
      )}
      <button
        onClick={onToggle}
        className={cx(
          "text-sm font-semibold hover:underline",
          aktif ? "text-red-700" : "text-emerald-700",
        )}
      >
        {aktif ? "Nonaktifkan" : "Aktifkan"}
      </button>
    </td>
  )
  const aktifBadge = (a: boolean) => (
    <span
      className={cx(
        "rounded-full border px-2 py-0.5 text-xs font-semibold",
        a
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-slate-200 bg-slate-100 text-slate-600",
      )}
    >
      {a ? "Aktif" : "Nonaktif"}
    </span>
  )

  return (
    <>
      <Title
        sub="Nonaktifkan menggantikan hapus agar riwayat data tetap utuh."
        right={
          <Btn onClick={() => setForm({})}>
            <Plus size={16} /> Tambah
          </Btn>
        }
      >
        Data Master
      </Title>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          className="inline-flex rounded-lg border border-line bg-wash p-1"
        >
          {(["Segmen", "Jalur", "Tarif", "Kendaraan"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={tab === m}
              onClick={() => setTab(m)}
              className={cx(
                "h-9 rounded-md px-3.5 text-sm font-semibold",
                tab === m ? "bg-white text-navy shadow-sm" : "text-mute",
              )}
            >
              {m}
            </button>
          ))}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari…"
          className={cx(inputCls(), "h-11 w-full sm:w-64")}
        />
      </div>

      {tab === "Tarif" && (
        <p className="mb-3 rounded-lg bg-navy-50 px-4 py-3 text-sm text-navy">
          Tarif baru berlaku mulai tanggal yang dipilih dan tidak mengubah
          laporan lama.
        </p>
      )}

      <div className={tableWrap}>
        <table className="w-full min-w-[640px]">
          <thead className="border-b border-line bg-wash">
            <tr>
              {(tab === "Segmen"
                ? ["Segmen", "Jenis", "Nilai tetap", "Status", ""]
                : tab === "Jalur"
                  ? ["Jalur", "Segmen", "Tarif aktif", "Status", ""]
                  : tab === "Tarif"
                    ? ["Jalur", "Tarif", "Berlaku mulai", "Keterangan"]
                    : ["Nomor CB", "Plat", "Status", ""]
              ).map((h, i) => (
                <th key={i} className={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tab === "Segmen" &&
              segs.map((s, i) =>
                has(s.nama) ? (
                  <tr key={s.id} className="border-b border-line last:border-0">
                    <td className={cx(td, "font-medium")}>{s.nama}</td>
                    <td className={td}>{s.kontrak ? "Kontrak" : "Reguler"}</td>
                    <td className={cx(td, "num")}>
                      {s.kontrak ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Lock size={12} /> {rupiah(s.nilaiTetap)}
                        </span>
                      ) : (
                        "–"
                      )}
                    </td>
                    <td className={td}>{aktifBadge(s.aktif)}</td>
                    <Aksi
                      aktif={s.aktif}
                      onEdit={() => (
                        setTab("Segmen"),
                        setForm({
                          id: s.id,
                          nama: s.nama,
                          kontrak: s.kontrak ? "ya" : "tidak",
                          nilai: String(s.nilaiTetap ?? ""),
                        })
                      )}
                      onToggle={() => toggle(segs, setSegs, i)}
                    />
                  </tr>
                ) : null,
              )}
            {tab === "Jalur" &&
              jals.map((j, i) =>
                has(j.nama) ? (
                  <tr key={j.id} className="border-b border-line last:border-0">
                    <td className={cx(td, "font-medium")}>{j.nama}</td>
                    <td className={td}>{seg(j.segmentId).nama}</td>
                    <td className={cx(td, "num")}>
                      {j.tarif ? rupiah(j.tarif) : "Nilai tetap"}
                    </td>
                    <td className={td}>{aktifBadge(j.aktif)}</td>
                    <Aksi
                      aktif={j.aktif}
                      onEdit={() =>
                        setForm({
                          id: j.id,
                          nama: j.nama,
                          segmentId: j.segmentId,
                        })
                      }
                      onToggle={() => toggle(jals, setJals, i)}
                    />
                  </tr>
                ) : null,
              )}
            {tab === "Tarif" &&
              [...tarifs]
                .sort(
                  (a, b) =>
                    a.jalurId.localeCompare(b.jalurId) ||
                    b.mulai.localeCompare(a.mulai),
                )
                .filter((x) => has(jalur(x.jalurId).nama))
                .map((x, i, arr) => (
                  <tr key={i} className="border-b border-line last:border-0">
                    <td className={td}>{jalur(x.jalurId).nama}</td>
                    <td className={cx(td, "num")}>{rupiah(x.tarif)}</td>
                    <td className={cx(td, "num")}>{fmtDate(x.mulai)}</td>
                    <td className={td}>
                      {arr.find((y) => y.jalurId === x.jalurId)?.mulai ===
                      x.mulai ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                          Berlaku
                        </span>
                      ) : (
                        <span className="text-xs text-mute">Riwayat</span>
                      )}
                    </td>
                  </tr>
                ))}
            {tab === "Kendaraan" &&
              vehs.map((v, i) =>
                has(v.cb + v.plat) ? (
                  <tr key={v.cb} className="border-b border-line last:border-0">
                    <td className={cx(td, "num font-medium")}>{v.cb}</td>
                    <td className={cx(td, "num")}>{v.plat}</td>
                    <td className={td}>{aktifBadge(v.aktif)}</td>
                    <Aksi
                      aktif={v.aktif}
                      onEdit={() =>
                        setForm({ id: v.cb, cb: v.cb, plat: v.plat })
                      }
                      onToggle={() => toggle(vehs, setVehs, i)}
                    />
                  </tr>
                ) : null,
              )}
          </tbody>
        </table>
      </div>

      <Dialog
        open={!!form}
        title={`${f("id") ? "Ubah" : "Tambah"} ${tab.toLowerCase()}`}
        onClose={() => setForm(null)}
        actions={
          <>
            <Btn variant="outline" onClick={() => setForm(null)}>
              Batal
            </Btn>
            <Btn disabled={!valid} onClick={save}>
              Simpan
            </Btn>
          </>
        }
      >
        <div className="space-y-3 text-ink">
          {(tab === "Segmen" || tab === "Jalur") && (
            <Field label="Nama">
              <input
                value={f("nama")}
                onChange={(e) => set("nama", e.target.value)}
                className={inputCls()}
              />
            </Field>
          )}
          {tab === "Segmen" && (
            <>
              <Field label="Jenis">
                <select
                  value={f("kontrak") || "tidak"}
                  onChange={(e) => set("kontrak", e.target.value)}
                  className={inputCls()}
                >
                  <option value="tidak">Reguler</option>
                  <option value="ya">Kontrak (nilai tetap)</option>
                </select>
              </Field>
              {f("kontrak") === "ya" && (
                <Field label="Nilai tetap (Rp)">
                  <input
                    inputMode="numeric"
                    value={f("nilai")}
                    onChange={(e) => set("nilai", e.target.value)}
                    className={cx(inputCls(), "num")}
                  />
                </Field>
              )}
            </>
          )}
          {tab === "Jalur" && (
            <Field label="Segmen">
              <select
                value={f("segmentId") || "bandara"}
                onChange={(e) => set("segmentId", e.target.value)}
                className={inputCls()}
              >
                {segs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nama}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {tab === "Kendaraan" && (
            <>
              <Field label="Nomor CB">
                <input
                  value={f("cb")}
                  onChange={(e) => set("cb", e.target.value)}
                  placeholder="CB-1080"
                  className={inputCls()}
                />
              </Field>
              <Field label="Plat">
                <input
                  value={f("plat")}
                  onChange={(e) => set("plat", e.target.value)}
                  placeholder="D 7080 AE"
                  className={inputCls()}
                />
              </Field>
            </>
          )}
          {tab === "Tarif" && (
            <>
              <Field label="Jalur">
                <select
                  value={f("jalurId") || "j1"}
                  onChange={(e) => set("jalurId", e.target.value)}
                  className={inputCls()}
                >
                  {jals
                    .filter((j) => j.tarif > 0)
                    .map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.nama}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Tarif baru (Rp)">
                <input
                  inputMode="numeric"
                  value={f("tarif")}
                  onChange={(e) => set("tarif", e.target.value)}
                  className={cx(inputCls(), "num")}
                />
              </Field>
              <Field label="Berlaku mulai">
                <input
                  type="date"
                  value={f("mulai") || TODAY}
                  onChange={(e) => set("mulai", e.target.value)}
                  className={inputCls()}
                />
              </Field>
            </>
          )}
        </div>
      </Dialog>
    </>
  )
}