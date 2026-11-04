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
  "https://images.unsplash.com/photo-1649768870222-17848797d6b4?crop=faces&fit=crop&h=240&w=240&auto=format&q=85"

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

