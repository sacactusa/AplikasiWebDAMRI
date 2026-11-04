"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { AlertTriangle, CalendarDays, CheckCircle2, Lock, X, Inbox, XCircle } from "lucide-react"
import type { Status } from "@/lib/data"

const logoDamri = "/assets/logo-damri.png"

export const cx = (...a: (string | false | undefined | null)[]) =>
  a.filter(Boolean).join(" ")

export function StatusBadge({
  status,
  rejected,
}: {
  status: Status
  rejected?: boolean
}) {
  const map = {
    draft: ["Draft", "bg-slate-100 text-slate-700 border-slate-200"],
    dikirim: ["Dikirim", "bg-amber-50 text-amber-800 border-amber-300"],
    disetujui: [
      "Disetujui",
      "bg-emerald-50 text-emerald-800 border-emerald-300",
    ],
  } as const
  const [label, cls] = map[status]
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cx(
          "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-2xs",
          cls,
        )}
      >
        {status === "disetujui" && <Lock size={11} />}
        {label}
      </span>
      {rejected && (
        <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 shadow-2xs">
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
    primary: "bg-navy text-white hover:bg-navy-700 shadow-xs",
    ghost: "text-navy hover:bg-navy-50",
    outline: "border border-line bg-white text-ink hover:bg-wash shadow-xs",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-xs",
    ok: "bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs",
    brand:
      "bg-amber-400 text-navy shadow-md shadow-black/10 hover:bg-amber-300 font-bold",
    signup:
      "bg-emerald-500 text-white shadow-md shadow-black/10 hover:bg-emerald-400 font-bold",
  }[variant]
  return (
    <button
      {...p}
      className={cx(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100",
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
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/50 p-4 backdrop-blur-xs transition-opacity"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={cx(
          "rise w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-line bg-white p-6 shadow-2xl",
          danger && "border-t-4 border-red-600",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          {danger && (
            <AlertTriangle className="mt-0.5 shrink-0 text-red-600" size={20} />
          )}
          <h2 className="font-serif text-2xl leading-tight text-ink">{title}</h2>
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
    <div className="fixed inset-0 z-[60] bg-ink/40 backdrop-blur-xs transition-opacity" onClick={onClose}>
      <aside
        className="slidein absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white/95 px-6 py-4 backdrop-blur-md">
          <h2 className="font-serif text-2xl text-ink">{title}</h2>
          <button
            aria-label="Tutup"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-lg text-mute hover:bg-wash hover:text-ink transition-colors"
          >
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <footer className="sticky bottom-0 z-10 flex gap-2 border-t border-line bg-white/95 p-4 backdrop-blur-md">
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
      <div className="grid size-20 place-items-center rounded-full bg-navy-50 text-navy shadow-inner">
        <Inbox size={34} strokeWidth={1.4} />
      </div>
      <p className="mt-5 font-serif text-2xl text-ink">{title}</p>
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
  if (!items || items.length === 0) return null

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
            className="pop pointer-events-auto flex w-64 sm:w-72 min-h-56 sm:min-h-60 flex-col items-center justify-center rounded-3xl border border-white/80 bg-white/85 p-6 text-center text-ink shadow-2xl shadow-slate-900/15 backdrop-blur-xl ring-1 ring-black/10 cursor-pointer"
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
      className="bg-red-700 px-4 py-2 text-center text-xs font-semibold tracking-wide text-white shadow-sm"
    >
      Tidak ada koneksi. Data belum tersimpan.
    </div>
  )
}

export function LiveDateTime({
  light,
  align = "left",
  compact,
}: {
  light?: boolean
  align?: "left" | "right"
  compact?: boolean
}) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const shortDate = new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(now)
  const fullDate = new Intl.DateTimeFormat("id-ID", {
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

  if (compact) {
    return (
      <time
        dateTime={now.toISOString()}
        suppressHydrationWarning
        className={cx(
          "flex min-w-0 flex-col leading-tight",
          align === "right" && "items-end text-right",
        )}
      >
        <span
          className={cx(
            "num block truncate text-xs font-semibold sm:text-sm",
            light ? "text-white" : "text-ink",
          )}
        >
          {time}
        </span>
        <span
          className={cx(
            "block truncate text-[10px] capitalize sm:text-xs",
            light ? "text-white/70" : "text-mute",
          )}
        >
          {shortDate}
        </span>
      </time>
    )
  }

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
          light ? "text-white/70" : "text-mute",
        )}
      >
        {fullDate}
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
  light,
}: {
  label: string
  error?: string
  hint?: string
  locked?: boolean
  children: ReactNode
  light?: boolean
}) {
  return (
    <label className="block" data-error={error ? "true" : undefined}>
      <span
        className={cx(
          "mb-1.5 flex items-center gap-1.5 text-sm font-medium",
          light ? "text-white" : "text-ink",
        )}
      >
        {label}
        {locked && (
          <Lock
            size={12}
            className={light ? "text-white/70" : "text-mute"}
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
        <span
          className={cx(
            "mt-1 block text-xs",
            light ? "text-white/70" : "text-mute",
          )}
        >
          {hint}
        </span>
      ) : null}
    </label>
  )
}

export const inputCls = (err?: boolean) =>
  cx(
    "h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none transition focus:border-navy-700 disabled:bg-wash disabled:text-mute shadow-2xs",
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
        alt="DAMRI"
        className="h-9 w-auto max-w-[44px] shrink-0 object-contain"
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

export function DateInput({
  value,
  onChange,
  className,
  placeholder = "dd/mm/yyyy",
  "aria-label": ariaLabel = "Tanggal",
}: {
  value: string
  onChange: (val: string) => void
  className?: string
  placeholder?: string
  "aria-label"?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const openPicker = () => {
    try {
      inputRef.current?.showPicker?.()
    } catch {
      inputRef.current?.focus()
    }
  }

  const formatted = value
    ? value.split("-").reverse().join("/")
    : placeholder

  return (
    <div
      onClick={openPicker}
      className={cx(
        "group relative flex h-11 w-full cursor-pointer items-center justify-between rounded-lg border border-line bg-white px-3 text-sm shadow-2xs transition focus-within:border-navy-700 hover:border-slate-300",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span
          className={cx(
            "num truncate text-sm select-none",
            value ? "font-medium text-ink" : "text-mute",
          )}
        >
          {formatted}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 text-mute">
        {value ? (
          <button
            type="button"
            aria-label="Hapus tanggal"
            onClick={(e) => {
              e.stopPropagation()
              onChange("")
            }}
            className="grid size-6 place-items-center rounded hover:bg-wash hover:text-ink active:scale-90 transition"
          >
            <X size={14} />
          </button>
        ) : null}
        <CalendarDays size={16} className="pointer-events-none group-hover:text-ink transition-colors" />
      </div>

      <input
        ref={inputRef}
        type="date"
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
      />
    </div>
  )
}
