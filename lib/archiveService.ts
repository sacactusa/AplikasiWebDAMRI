import { supabase } from "@/lib/supabase"
import type { Departure, DownloadHistoryItem, SavedArchive } from "@/types"

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export function archiveRequestErrorMessage(error: unknown): string {
  if (!isObjectRecord(error)) {
    return "Kesalahan tidak dikenal saat menghubungi Supabase."
  }

  if (error.code === "42P01" || error.code === "PGRST205") {
    return "Tabel arsip belum tersedia. Jalankan migrasi supabase/migrations/20261108160000_coordinator_archives.sql melalui Supabase SQL Editor."
  }
  if (error.code === "42501") {
    return "Akses ditolak oleh Row Level Security. Pastikan sesi Supabase aktif dan ID akun cocok dengan pemilik arsip."
  }

  const message =
    typeof error.message === "string"
      ? error.message
      : "Kesalahan tidak dikenal saat menghubungi Supabase."
  const details =
    typeof error.details === "string" ? ` (${error.details})` : ""
  const hint = typeof error.hint === "string" ? ` ${error.hint}` : ""
  return `${message}${details}${hint}`
}

interface ArchiveRow {
  id: string
  label: string
  start_date: string
  end_date: string
  segment: string
  created_at: string
  departures: Departure[]
}

interface DownloadRow {
  id: string
  archive_id: string
  archive_label: string
  downloaded_at: string
  size_bytes: number
  successful: boolean
}

function mapArchive(row: ArchiveRow): SavedArchive {
  return {
    id: row.id,
    label: row.label,
    startDate: row.start_date,
    endDate: row.end_date,
    segment: row.segment,
    createdAt: row.created_at,
    departures: row.departures,
  }
}

function mapDownload(row: DownloadRow): DownloadHistoryItem {
  return {
    id: row.id,
    archiveId: row.archive_id,
    archiveLabel: row.archive_label,
    downloadedAt: row.downloaded_at,
    size: row.size_bytes,
    successful: row.successful,
  }
}

export async function getCoordinatorArchives(
  coordinatorId: string,
): Promise<SavedArchive[]> {
  const { data, error } = await supabase
    .from("coordinator_archives")
    .select("id, label, start_date, end_date, segment, created_at, departures")
    .eq("coordinator_id", coordinatorId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return ((data ?? []) as ArchiveRow[]).map(mapArchive)
}

export async function createCoordinatorArchive(
  coordinatorId: string,
  archive: Omit<SavedArchive, "id" | "createdAt">,
): Promise<SavedArchive> {
  const { data, error } = await supabase
    .from("coordinator_archives")
    .insert({
      coordinator_id: coordinatorId,
      label: archive.label,
      start_date: archive.startDate,
      end_date: archive.endDate,
      segment: archive.segment,
      departures: archive.departures,
    })
    .select("id, label, start_date, end_date, segment, created_at, departures")
    .single()

  if (error) throw error
  return mapArchive(data as ArchiveRow)
}

export async function getCoordinatorDownloadHistory(
  coordinatorId: string,
): Promise<DownloadHistoryItem[]> {
  const { data, error } = await supabase
    .from("coordinator_archive_downloads")
    .select("id, archive_id, archive_label, downloaded_at, size_bytes, successful")
    .eq("coordinator_id", coordinatorId)
    .order("downloaded_at", { ascending: false })

  if (error) throw error
  return ((data ?? []) as DownloadRow[]).map(mapDownload)
}

export async function recordCoordinatorArchiveDownload(
  coordinatorId: string,
  archive: SavedArchive,
  size: number,
): Promise<DownloadHistoryItem> {
  const { data, error } = await supabase
    .from("coordinator_archive_downloads")
    .insert({
      coordinator_id: coordinatorId,
      archive_id: archive.id,
      archive_label: archive.label,
      size_bytes: size,
      successful: true,
    })
    .select("id, archive_id, archive_label, downloaded_at, size_bytes, successful")
    .single()

  if (error) throw error
  return mapDownload(data as DownloadRow)
}
