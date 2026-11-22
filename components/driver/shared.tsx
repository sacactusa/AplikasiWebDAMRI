"use client"

import { ArrowLeft } from "lucide-react"
import { cx } from "@/components/ui"

export const logoDamri = "/assets/logo-damri.png"
export const logoDamriFull = "/assets/logo-damri-full.png"

export type DriverProfile = {
  nama: string
  email: string
  telepon: string
  foto?: string
}

export const DRIVER_PHOTO =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3E%3Crect width='128' height='128' fill='%23E2E8F0'/%3E%3Cpath d='M64 68a22 22 0 1 0 0-44 22 22 0 0 0 0 44zm0 10c-24 0-44 14-44 32v6h88v-6c0-18-20-32-44-32z' fill='%2394A3B8'/%3E%3C/svg%3E"

export function DamriMark() {
  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/90 shadow-sm">
      <img
        src={logoDamri}
        alt="DAMRI"
        className="h-7 w-9 object-contain"
      />
    </span>
  )
}

export function DamriWordmark() {
  return (
    <span className="flex h-11 shrink-0 items-center rounded-xl bg-white/90 px-3 shadow-sm">
      <img
        src={logoDamriFull}
        alt="DAMRI"
        className="h-7 w-32 object-contain"
      />
    </span>
  )
}

export function TopBar({
  title,
  onBack,
  detail,
}: {
  title: string
  onBack: () => void
  detail?: boolean
}) {
  return (
    <header
      className={cx(
        "sticky top-0 z-20 flex items-center gap-2 border-b border-line px-3 py-3 shadow-md backdrop-blur-md",
        detail ? "bg-white/30" : "bg-white/55",
      )}
    >
      <button
        aria-label="Kembali"
        onClick={onBack}
        className="grid size-11 place-items-center rounded-lg text-navy hover:bg-navy/10"
      >
        <ArrowLeft size={20} stroke="var(--color-navy)" />
      </button>
      <h1 className="min-w-0 flex-1 truncate font-serif text-2xl text-navy">
        {title}
      </h1>
      <DamriMark />
    </header>
  )
}

