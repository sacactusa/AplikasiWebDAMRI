"use client"

import { useState, useEffect } from "react"
import { Download } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { formatAuditTime } from "@/lib/supabaseService"
import { Btn, cx } from "@/components/ui"
import { Title, th, td, tableWrap } from "./shared"

interface Props {
  toast: (t: string) => void
}

export default function ArsipBackup({ toast }: Props) {
  const [months, setMonths] = useState([
    "Oktober 2026 (berjalan)",
    "September 2026",
    "Agustus 2026",
    "Juli 2026",
    "Juni 2026",
  ])
  const [backups, setBackups] = useState([
    { id: "b1", t: "16 Okt 2026 02:00", ok: true, size: "48,6 MB" },
    { id: "b2", t: "15 Okt 2026 02:00", ok: true, size: "48,2 MB" },
    { id: "b3", t: "14 Okt 2026 02:00", ok: false, size: "–" },
    { id: "b4", t: "13 Okt 2026 02:00", ok: true, size: "47,9 MB" },
  ])

  useEffect(() => {
    supabase.from("backup_log").select("*").order("waktu", { ascending: false }).limit(20).then(({ data }) => {
      if (data && data.length > 0) {
        setBackups(data.map((b) => ({
          id: b.id,
          t: formatAuditTime(b.waktu),
          ok: b.berhasil,
          size: b.ukuran_byte ? (b.ukuran_byte / (1024 * 1024)).toFixed(1) + " MB" : "–"
        })))
      }
    })

    supabase.from("arsip_bulanan").select("*").order("periode", { ascending: false }).limit(12).then(({ data }) => {
      if (data && data.length > 0) {
        setMonths(data.map((a) => {
          const d = new Date(a.periode)
          const mNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
          return `${mNames[d.getMonth()]} ${d.getFullYear()}`
        }))
      }
    })
  }, [])

  return (
    <>
      <Title sub="Unduh arsip bulanan dan tinjau riwayat backup.">
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
              {["Waktu", "Status", "Ukuran"].map((h, i) => (
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
                className="border-b border-line last:border-0"
              >
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
    </>
  )
}
