"use client"

import { useState } from "react"
import { Download } from "lucide-react"
import { Btn, Dialog, Field, cx, inputCls } from "@/components/ui"
import { Title, th, td, tableWrap } from "./shared"

interface Props {
  toast: (t: string) => void
}

export default function ArsipBackup({ toast }: Props) {
  const months = [
    "Oktober 2026 (berjalan)",
    "September 2026",
    "Agustus 2026",
    "Juli 2026",
    "Juni 2026",
  ]
  const backups = [
    { id: "b1", t: "16 Okt 2026 02:00", ok: true, size: "48,6 MB" },
    { id: "b2", t: "15 Okt 2026 02:00", ok: true, size: "48,2 MB" },
    { id: "b3", t: "14 Okt 2026 02:00", ok: false, size: "–" },
    { id: "b4", t: "13 Okt 2026 02:00", ok: true, size: "47,9 MB" },
  ]
  const [pick, setPick] = useState<string | null>(null)
  const [dlg, setDlg] = useState(false)
  const [word, setWord] = useState("")
  const sel = backups.find((b) => b.id === pick)

  return (
    <>
      <Title sub="Unduh arsip bulanan, tinjau riwayat backup, atau pulihkan data.">
        Arsip & Backup
      </Title>
      <h2 className="mb-3 font-serif text-2xl">Arsip bulanan</h2>
      <ul className="divide-y divide-line rounded-xl border border-line">
        {months.map((m) => (
          <li key={m} className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-medium">{m}</span>
            <Btn
              variant="ghost"
              onClick={() =>
                toast(`Arsip ${m.split(" (")[0]} (.xlsx) siap diunduh`)
              }
            >
              <Download size={16} /> .xlsx
            </Btn>
          </li>
        ))}
      </ul>

      <h2 className="mb-3 mt-10 font-serif text-2xl">Riwayat backup</h2>
      <div className={tableWrap}>
        <table className="w-full min-w-[520px]">
          <thead className="border-b border-line bg-wash">
            <tr>
              {["", "Waktu", "Status", "Ukuran"].map((h, i) => (
                <th key={i} className={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {backups.map((b) => (
              <tr
                key={b.id}
                className={cx(
                  "border-b border-line last:border-0",
                  pick === b.id && "bg-navy-50",
                )}
              >
                <td className={cx(td, "w-10")}>
                  <input
                    type="radio"
                    name="bk"
                    aria-label={"Pilih " + b.t}
                    disabled={!b.ok}
                    checked={pick === b.id}
                    onChange={() => setPick(b.id)}
                    className="size-4 accent-[#0a2a66]"
                  />
                </td>
                <td className={cx(td, "num")}>{b.t}</td>
                <td className={td}>
                  <span
                    className={cx(
                      "rounded-full border px-2 py-0.5 text-xs font-semibold",
                      b.ok
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-red-200 bg-red-50 text-red-700",
                    )}
                  >
                    {b.ok ? "Berhasil" : "Gagal"}
                  </span>
                </td>
                <td className={cx(td, "num")}>{b.size}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Btn
        variant="danger"
        className="mt-4"
        disabled={!pick}
        onClick={() => (setWord(""), setDlg(true))}
      >
        Pulihkan dari backup terpilih
      </Btn>
      <Dialog
        open={dlg}
        danger
        title="Tindakan ini menimpa data saat ini"
        onClose={() => setDlg(false)}
        actions={
          <>
            <Btn variant="outline" onClick={() => setDlg(false)}>
              Batal
            </Btn>
            <Btn
              variant="danger"
              disabled={word !== "PULIHKAN"}
              onClick={() => {
                setDlg(false)
                toast("Pemulihan dari backup " + sel?.t + " dimulai")
              }}
            >
              Pulihkan
            </Btn>
          </>
        }
      >
        <p>
          Seluruh data akan dikembalikan ke titik{" "}
          <b className="num text-ink">{sel?.t}</b>. Perubahan setelah waktu
          tersebut hilang dan tidak dapat dibatalkan.
        </p>
        <Field label="Ketik PULIHKAN untuk melanjutkan">
          <input
            value={word}
            onChange={(e) => setWord(e.target.value)}
            className={cx(inputCls(), "num mt-3 text-ink")}
          />
        </Field>
      </Dialog>
    </>
  )
}

