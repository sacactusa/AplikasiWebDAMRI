"use client"

import { useEffect, useState } from "react"
import { Download } from "lucide-react"
import { Btn, cx } from "@/components/ui"
import {
  Title,
  th,
  td,
  tableWrap,
  type DownloadHistoryItem,
  type SavedArchive,
} from "./shared"
import { jalur, seg } from "@/lib/data"
import {
  archiveRequestErrorMessage,
  getCoordinatorArchives,
  getCoordinatorDownloadHistory,
  recordCoordinatorArchiveDownload,
} from "@/lib/archiveService"

interface Props {
  coordinatorId?: string
  toast: (t: string, type?: "success" | "error") => void
}

export default function ArsipBackup({ coordinatorId, toast }: Props) {
  const [archives, setArchives] = useState<SavedArchive[]>([])
  const [history, setHistory] = useState<DownloadHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    if (!coordinatorId) {
      setArchives([])
      setHistory([])
      setLoading(false)
      return
    }

    setLoading(true)
    Promise.all([
      getCoordinatorArchives(coordinatorId),
      getCoordinatorDownloadHistory(coordinatorId),
    ])
      .then(([loadedArchives, loadedHistory]) => {
        if (!active) return
        setArchives(loadedArchives)
        setHistory(loadedHistory)
      })
      .catch((error) => {
        console.error("Gagal membaca arsip dan riwayat unduhan dari Supabase:", error)
        if (active) {
          toast(
            `Arsip tidak dapat dimuat: ${archiveRequestErrorMessage(error)}`,
            "error",
          )
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [coordinatorId, toast])

  const downloadArchive = async (archive: SavedArchive) => {
    if (!coordinatorId) {
      toast(
        "Untuk mengunduh arsip, masuk menggunakan akun koordinator asli yang terdaftar di Supabase. Akun demo tidak dapat digunakan.",
        "error",
      )
      return
    }

    let downloadStarted = false
    setDownloading(archive.id)
    try {
      const csvCell = (value: string | number | null | undefined) => {
        let text = value == null ? "" : String(value)
        if (/^[=+\-@\t\r]/.test(text)) text = "'" + text
        return `"${text.replaceAll('"', '""')}"`
      }
      const rows = [
        [
          "Tanggal",
          "Waktu",
          "Segmen",
          "Jalur",
          "Kendaraan",
          "Pengemudi",
          "KM Tempuh",
          "KM Kosong",
          "Penumpang",
          "PM",
          "Pendapatan",
          "Subsidi",
          "Bagasi",
          "Status",
        ],
        ...archive.departures.map((d) => [
          d.date,
          d.time,
          seg(d.segmentId).nama,
          jalur(d.jalurId).nama,
          d.cb,
          d.driver,
          d.kmTempuh,
          d.kmEmpty,
          d.penumpang,
          d.pm,
          d.pendapatan,
          d.subsidi,
          d.bagasi,
          d.status,
        ]),
      ]
      const blob = new Blob(
        ["\uFEFF", rows.map((row) => row.map(csvCell).join(",")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      )
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `Arsip_${archive.startDate}_${archive.endDate}.csv`
      document.body.appendChild(link)
      link.click()
      downloadStarted = true
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)

      const item = await recordCoordinatorArchiveDownload(
        coordinatorId,
        archive,
        blob.size,
      )
      setHistory((previous) => [item, ...previous])
      toast(`Arsip ${archive.label} berhasil diunduh.`, "success")
    } catch (error) {
      console.error("Gagal mengunduh arsip atau menyimpan riwayatnya:", error)
      toast(
        downloadStarted
          ? `File sudah dikirim untuk diunduh, tetapi riwayat gagal disimpan: ${archiveRequestErrorMessage(error)}`
          : `Unduhan gagal dibuat: ${archiveRequestErrorMessage(error)}`,
        "error",
      )
    } finally {
      setDownloading(null)
    }
  }

  return (
    <>
      <Title sub="Unduh data yang diekspor dari Dashboard dan tinjau riwayat unduhan.">
        Arsip & Backup
      </Title>
      <h2 className="mb-3 font-serif text-2xl">Arsip tersimpan</h2>
      {!coordinatorId ? (
        <p className="rounded-xl border border-line px-4 py-6 text-sm text-mute">
          Penyimpanan arsip memerlukan akun koordinator asli yang terdaftar dan masuk melalui Supabase. Akun demo tidak dapat digunakan.
        </p>
      ) : loading ? (
        <p className="rounded-xl border border-line px-4 py-6 text-sm text-mute">
          Memuat arsip tersimpan…
        </p>
      ) : archives.length === 0 ? (
        <p className="rounded-xl border border-line px-4 py-6 text-sm text-mute">
          Belum ada arsip. Pilih periode di Dashboard, lalu tekan Ekspor.
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {archives.map((archive) => (
            <li
              key={archive.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium">{archive.label}</p>
                <p className="mt-1 text-xs text-mute">
                  {archive.segment} · {archive.departures.length} keberangkatan · Disimpan{" "}
                  {new Date(archive.createdAt).toLocaleString("id-ID")}
                </p>
              </div>
              <Btn
                variant="ghost"
                disabled={downloading === archive.id}
                onClick={() => downloadArchive(archive)}
              >
                <Download size={16} />{" "}
                {downloading === archive.id ? "Mengunduh…" : ".csv"}
              </Btn>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-3 mt-10 font-serif text-2xl">Riwayat unduhan</h2>
      {loading ? (
        <p className="rounded-xl border border-line px-4 py-6 text-sm text-mute">
          Memuat riwayat unduhan…
        </p>
      ) : history.length === 0 ? (
        <p className="rounded-xl border border-line px-4 py-6 text-sm text-mute">
          Belum ada unduhan.
        </p>
      ) : (
        <div className={tableWrap}>
          <table className="w-full min-w-[520px]">
            <thead className="border-b border-line bg-wash">
              <tr>
                {["Arsip", "Waktu unduh", "Status", "Ukuran"].map((h) => (
                  <th key={h} className={th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-line last:border-0"
                >
                  <td className={td}>{item.archiveLabel}</td>
                  <td className={cx(td, "num")}>
                    {new Date(item.downloadedAt).toLocaleString("id-ID")}
                  </td>
                  <td className={td}>
                    <span
                      className={cx(
                        "rounded-full border px-2 py-0.5 text-xs font-semibold",
                        item.successful
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-red-200 bg-red-50 text-red-700",
                      )}
                    >
                      {item.successful ? "Berhasil" : "Gagal"}
                    </span>
                  </td>
                  <td className={cx(td, "num")}>
                    {(item.size / 1024).toFixed(1)} KB
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
