"use client"

import { useEffect, useState, type ReactNode } from "react"
import { AlertTriangle, CheckCircle2, Lock, X, Inbox, XCircle } from "lucide-react"
import type { Status } from "@/lib/data"

const logoDamri = "/assets/logo-damri.png"

export const cx = (...a: (string | false | undefined | null)[]) =>
  a.filter(Boolean).join(" ")

export function StatusBadge({
  status,
  rejected,
  label: customLabel,
}: {
  status: Status
  rejected?: boolean
  label?: string
}) {
  const map = {
    draft: ["Draft", "bg-slate-100 text-slate-700 border-slate-200"],
    dikirim: ["Dikirim", "bg-amber-50 text-amber-800 border-amber-200"],
    disetujui: [
      "Disetujui",
      "bg-emerald-50 text-emerald-800 border-emerald-200",
    ],
  } as const
  const [defaultLabel, cls] = map[status]
  const label = customLabel ?? defaultLabel
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cx(
          "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
          cls,
        )}
      >
        {status === "disetujui" && <Lock size={11} />}
        {label}
      </span>
      {rejected && (
        <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
          Perlu perbaikan
        </span>
      )}
    </span>
  )
}

export function Btn({
  variant = "primary",
  className,
  ...p
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "outline" | "ok" | "brand" | "signup"
}) {
  const v = {
    primary: "bg-navy text-white hover:bg-navy-700",
    ghost: "text-navy hover:bg-navy-50",
    outline: "border border-line bg-white text-ink hover:bg-wash",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ok: "bg-emerald-700 text-white hover:bg-emerald-800",
    brand:
      "bg-amber-400 text-navy shadow-md shadow-black/20 hover:bg-amber-300",
    signup:
      "bg-emerald-500 text-white shadow-md shadow-black/20 hover:bg-emerald-400",
  }[variant]
  return (
    <button
      {...p}
      className={cx(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40",
        v,
        className,
      )}
    />
  )
}

export function Dialog({
  open,
  title,
  children,
  onClose,
  danger,
  actions,
}: {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  danger?: boolean
  actions: ReactNode
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/30 backdrop-blur-sm p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={cx(
          "rise w-full max-w-md rounded-2xl bg-white p-6 shadow-xl",
          danger && "border-t-4 border-red-600",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          {danger && (
            <AlertTriangle className="mt-0.5 shrink-0 text-red-600" size={20} />
          )}
          <h2 className="font-serif text-2xl leading-tight">{title}</h2>
        </div>
        <div className="mt-3 text-sm leading-relaxed text-mute">{children}</div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {actions}
        </div>
      </div>
    </div>
  )
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/25 backdrop-blur-xs" onClick={onClose}>
      <aside
        className="slidein absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="font-serif text-2xl">{title}</h2>
          <button
            aria-label="Tutup"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-lg hover:bg-wash"
          >
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <footer className="flex gap-2 border-t border-line p-4">
            {footer}
          </footer>
        )}
      </aside>
    </div>
  )
}

export function Empty({
  title,
  hint,
  action,
}: {
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="grid size-20 place-items-center rounded-full bg-navy-50 text-navy">
        <Inbox size={34} strokeWidth={1.4} />
      </div>
      <p className="mt-5 font-serif text-2xl">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-sm text-mute">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export type ToastType = "success" | "error"

export interface ToastItem {
  id: number
  text: string
  type?: ToastType
}

export function Toasts({
  items,
  onClear,
}: {
  items: ToastItem[]
  onClear?: () => void
}) {
  if (items.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 p-4">
      {items.map((t) => {
        const isError =
          t.type === "error" ||
          (!t.type &&
            /(gagal|salah|error|tidak|batal|belum|harus|maksimal|minimal|tolak)/i.test(
              t.text,
            ))

        return (
          <div
            key={t.id}
            onClick={onClear}
            className="pop pointer-events-auto flex w-64 sm:w-72 min-h-56 sm:min-h-60 flex-col items-center justify-center rounded-3xl border border-white/80 bg-white/75 p-6 text-center text-ink shadow-2xl shadow-slate-900/15 backdrop-blur-xl ring-1 ring-black/10 cursor-pointer"
          >
            <div className="mb-4">
              {isError ? (
                <span className="grid size-20 place-items-center rounded-full bg-red-100 text-red-600 ring-4 ring-red-50 shadow-md shadow-red-500/10">
                  <XCircle size={48} strokeWidth={2.2} />
                </span>
              ) : (
                <span className="grid size-20 place-items-center rounded-full bg-emerald-100 text-emerald-600 ring-4 ring-emerald-50 shadow-md shadow-emerald-500/10">
                  <CheckCircle2 size={48} strokeWidth={2.2} />
                </span>
              )}
            </div>
            <p className="text-base sm:text-lg font-bold leading-snug text-ink">{t.text}</p>
          </div>
        )
      })}
    </div>
  )
}

export function useOnline() {
  const [on, setOn] = useState(true)
  return [on, setOn] as const
}

export function OfflineBanner() {
  return (
    <div
      role="alert"
      className="bg-red-700 px-4 py-2 text-center text-sm font-medium text-white"
    >
      Tidak ada koneksi. Data belum tersimpan.
    </div>
  )
}

export function LiveDateTime({
  light,
  align = "left",
}: {
  light?: boolean
  align?: "left" | "right"
}) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const date = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now)
  const time = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(now)
    .replace(/\./g, ":")

  return (
    <time
      dateTime={now.toISOString()}
      suppressHydrationWarning
      className={cx("block", align === "right" && "text-right")}
    >
      <span
        className={cx(
          "num block text-lg font-medium leading-none",
          light ? "text-white" : "text-ink",
        )}
      >
        {time}
      </span>
      <span
        className={cx(
          "mt-1 block text-xs capitalize",
          light ? "text-white/65" : "text-mute",
        )}
      >
        {date}
      </span>
    </time>
  )
}

export function Field({
  label,
  error,
  hint,
  locked,
  children,
}: {
  label: string
  error?: string
  hint?: string
  locked?: boolean
  children: ReactNode
}) {
  return (
    <label className="block" data-error={error ? "true" : undefined}>
      <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
        {label}
        {locked && (
          <Lock
            size={12}
            className="text-mute"
            aria-label="Nilai tetap kontrak"
          />
        )}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs font-medium text-red-600">
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-mute">{hint}</span>
      ) : null}
    </label>
  )
}

export const inputCls = (err?: boolean) =>
  cx(
    "h-12 w-full rounded-lg border bg-white px-3 text-base outline-none transition focus:border-navy-700 disabled:bg-wash disabled:text-mute",
    err ? "border-red-500" : "border-line",
  )

export function NumInput({
  value,
  onChange,
  money,
  suffix,
  error,
  disabled,
}: {
  value: number | null
  onChange: (v: number | null) => void
  money?: boolean
  suffix?: string
  error?: boolean
  disabled?: boolean
}) {
  return (
    <div className="relative">
      {money && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-mute">
          Rp
        </span>
      )}
      <input
        inputMode="numeric"
        disabled={disabled}
        value={value == null ? "" : value.toLocaleString("id-ID")}
        onChange={(e) => {
          const d = e.target.value.replace(/\D/g, "")
          onChange(d === "" ? null : Number(d))
        }}
        placeholder="0"
        className={cx(
          inputCls(error),
          "num",
          money && "pl-10",
          suffix && "pr-12",
        )}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-mute">
          {suffix}
        </span>
      )}
    </div>
  )
}

export function Logo({ light }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <img
        src={logoDamri}
        alt=""
        aria-hidden
        className="h-9 w-11 object-contain"
      />
      <div className="leading-tight">
        <div
          className={cx(
            "text-sm font-bold tracking-wide",
            light ? "text-white" : "text-navy",
          )}
        >
          DAMRI
        </div>
        <div
          className={cx("text-[11px]", light ? "text-white/70" : "text-mute")}
        >
          Soekarno-Hatta · Bandung
        </div>
      </div>
    </div>
  )
}
