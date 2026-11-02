"use client"

import { useState } from "react"
import { ArrowLeft, Bus, ClipboardCheck, Eye, EyeOff } from "lucide-react"
import { Btn, Field, Logo, cx, inputCls } from "@/components/ui"

const busDamriPutih = "/assets/bus-damri-putih.jpg"
type Role = "sopir" | "koordinator" | null

interface Account {
  nama: string
  role: Exclude<Role, null>
  pw: string
}
const ACCOUNTS: Record<string, Account> = {
  "sopir@damri.co.id": { nama: "Asep Suryana", role: "sopir", pw: "damri123" },
  "koordinator@damri.co.id": {
    nama: "Rina Marlina",
    role: "koordinator",
    pw: "damri123",
  },
}
const KODE_KOORDINATOR = "DAMRI-KOORD"
const ROLES = {
  sopir: {
    label: "Sopir",
    icon: Bus,
    desc: "Catat keberangkatan, isi hasil perjalanan, dan kirim untuk diverifikasi.",
    hint: "Untuk pengemudi bus. Dipakai di ponsel.",
  },
  koordinator: {
    label: "Koordinator (Admin)",
    icon: ClipboardCheck,
    desc: "Verifikasi data sopir, lihat dashboard, ekspor AK 15, dan kelola data master serta akun.",
    hint: "Untuk petugas lapangan dan admin. Dipakai di laptop.",
  },
} as const

type Step = "pilih" | "masuk" | "daftar"

export default function FormLogin({ onLogin }: { onLogin: (r: Role) => void }) {
  const [step, setStep] = useState<Step>("pilih")
  const [role, setRole] = useState<Exclude<Role, null>>("sopir")
  const [nama, setNama] = useState("")
  const [email, setEmail] = useState("")
  const [pw, setPw] = useState("")
  const [pw2, setPw2] = useState("")
  const [kode, setKode] = useState("")
  const [show, setShow] = useState(false)
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")

  const go = (s: Step) => {
    setStep(s)
    setError("")
    setPw("")
    setPw2("")
  }

  const submitLogin = (e: React.FormEvent) => {
    e.preventDefault()
    const a = ACCOUNTS[email.trim().toLowerCase()]
    if (!a || a.pw !== pw) return setError("Email atau kata sandi salah")
    if (a.role !== role)
      return setError(
        `Akun ini terdaftar sebagai ${ROLES[a.role].label}. Ganti pilihan peran di atas.`,
      )
    onLogin(a.role)
  }

  const submitDaftar = (e: React.FormEvent) => {
    e.preventDefault()
    const key = email.trim().toLowerCase()
    if (ACCOUNTS[key])
      return setError("Email ini sudah terdaftar. Silakan masuk.")
    if (pw.length < 6) return setError("Kata sandi minimal 6 karakter.")
    if (pw !== pw2) return setError("Konfirmasi kata sandi tidak sama.")
    if (role === "koordinator" && kode.trim() !== KODE_KOORDINATOR)
      return setError("Kode registrasi koordinator tidak valid.")
    ACCOUNTS[key] = { nama: nama.trim(), role, pw }
    setInfo("Akun berhasil dibuat. Silakan masuk.")
    setStep("masuk")
    setError("")
    setPw("")
    setPw2("")
  }

  const R = ROLES[role]

  const roleSwitch = (
    <div
      role="radiogroup"
      aria-label="Masuk sebagai"
      className="grid grid-cols-2 gap-2"
    >
      {(Object.keys(ROLES) as (keyof typeof ROLES)[]).map((k) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={role === k}
          onClick={() => {
            setRole(k)
            setError("")
          }}
          className={cx(
            "flex h-11 items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition",
            role === k
              ? "border-white bg-white text-navy"
              : "border-white/30 bg-white/10 text-white hover:bg-white/15",
          )}
        >
          {k === "sopir" ? "Sopir" : "Koordinator"}
        </button>
      ))}
    </div>
  )

  const errBox = error && (
    <p
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700"
    >
      {error}
    </p>
  )

  const pwInput = (value: string, set: (v: string) => void, cur: boolean) => (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => set(e.target.value)}
        autoComplete={cur ? "current-password" : "new-password"}
        required
        className={cx(inputCls(!!error), "pr-12")}
      />
      <button
        type="button"
        aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
        onClick={() => setShow((x) => !x)}
        className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center text-mute"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  )

  return (
    <div className="relative grid min-h-screen lg:grid-cols-[2fr_3fr]">
      <img
        src={busDamriPutih}
        alt="Bus putih DAMRI"
        className="fixed inset-0 -z-10 size-full object-cover"
      />
      <div
        aria-hidden
        className="fixed inset-0 -z-10 bg-gradient-to-t from-navy/80 via-navy/45 to-navy/25 lg:from-navy/90 lg:via-navy/60 lg:to-navy/40"
      />
      <section className="relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex">
        <svg
          aria-hidden
          className="absolute inset-x-0 bottom-40 w-full text-white/30"
          viewBox="0 0 600 120"
          fill="none"
        >
          <path
            d="M0 90 C 120 90, 140 30, 260 40 S 420 100, 600 20"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="3 7"
          />
          <circle cx="260" cy="40" r="6" fill="#fff" />
          <circle cx="600" cy="20" r="6" fill="#fbbf24" />
        </svg>
        <div className="relative">
          <Logo light />
        </div>
        <div className="relative">
          <h1 className="max-w-md font-serif text-6xl leading-[1.02]">
            Laporan Produksi Bus
          </h1>
          <p className="mt-4 max-w-md text-lg font-medium text-white/90">
            Produksi operasional, tercatat rapi.
          </p>
          <p className="mt-2 max-w-sm text-sm text-white/60">
            Perum DAMRI Cabang Soekarno-Hatta Bandung
          </p>
          <div className="mt-8 flex gap-8 text-sm text-white/80">
            {[
              ["Dipatiukur", "Soekarno-Hatta"],
              ["5", "segmen layanan"],
              ["Realtime", "verifikasi"],
            ].map(([a, b]) => (
              <div key={a}>
                <p className="font-serif text-2xl text-white">{a}</p>
                <p className="text-xs">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <div
          className={cx(
            "w-full max-w-xl space-y-5 rounded-2xl border border-white/25 bg-navy/65 p-5 text-white shadow-xl backdrop-blur-md sm:p-8",
            "[&_input]:text-ink [&_label>span:last-child]:text-white/65",
          )}
        >
          <div className="lg:hidden">
            <Logo light />
          </div>

          {step === "pilih" && (
            <div className="rise space-y-5">
              <div>
                <h2 className="font-serif text-4xl">Selamat datang</h2>
                <p className="mt-1 text-sm text-white/70">
                  Pilih peran Anda terlebih dahulu agar kami menampilkan halaman
                  yang sesuai.
                </p>
              </div>
              <div className="space-y-3">
                {(Object.keys(ROLES) as (keyof typeof ROLES)[]).map((k) => {
                  const r = ROLES[k]
                  const Icon = r.icon
                  return (
                    <button
                      key={k}
                      onClick={() => {
                        setRole(k)
                        go("masuk")
                      }}
                      className="group flex min-h-40 w-full items-center gap-4 rounded-xl border border-white/25 bg-white/10 p-4 text-left transition hover:border-white/60 hover:bg-white/15 hover:shadow-md"
                    >
                      <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-white/15 text-white transition group-hover:bg-white/25">
                        <Icon size={24} />
                      </span>
                      <span>
                        <span className="block font-semibold">
                          Masuk sebagai {r.label}
                        </span>
                        <span className="mt-0.5 block text-sm text-white/70">
                          {r.desc}
                        </span>
                        <span className="mt-2 block text-xs font-medium text-white/90">
                          {r.hint}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
              <p className="text-center text-sm text-white/65">
                Belum punya akun?{" "}
                <button
                  onClick={() => go("daftar")}
                  className="font-semibold text-emerald-300 hover:text-emerald-200 hover:underline"
                >
                  Daftar
                </button>
              </p>
            </div>
          )}

          {step === "masuk" && (
            <form onSubmit={submitLogin} className="rise space-y-5">
              <button
                type="button"
                onClick={() => go("pilih")}
                className="flex items-center gap-1.5 text-sm font-medium text-white/70 hover:text-white"
              >
                <ArrowLeft size={16} /> Kembali
              </button>
              <div>
                <h2 className="font-serif text-4xl">Masuk</h2>
                <p className="mt-1 text-sm text-white/70">{R.desc}</p>
              </div>
              {roleSwitch}
              {info && (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-800">
                  {info}
                </p>
              )}
              {errBox}
              <Field label="Email / username">
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  required
                  className={inputCls(!!error)}
                />
              </Field>
              <Field label="Kata sandi">{pwInput(pw, setPw, true)}</Field>
              <Btn type="submit" variant="brand" className="h-12 w-full">
                Masuk sebagai {R.label}
              </Btn>
              <p className="text-center text-sm text-white/65">
                Belum punya akun?{" "}
                <button
                  type="button"
                  onClick={() => go("daftar")}
                  className="font-semibold text-emerald-300 hover:text-emerald-200 hover:underline"
                >
                  Daftar
                </button>
              </p>
              <div className="rounded-lg bg-white/10 p-3 text-xs text-white/70">
                <p className="mb-2 font-semibold text-white">
                  Akun demo (sandi: damri123)
                </p>
                <div className="flex gap-2">
                  {(["sopir", "koordinator"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        setRole(k)
                        setEmail(`${k}@damri.co.id`)
                        setPw("damri123")
                        setError("")
                      }}
                      className="rounded-md border border-line bg-white px-3 py-1.5 font-semibold capitalize text-navy hover:bg-navy-50"
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>
            </form>
          )}

          {step === "daftar" && (
            <form onSubmit={submitDaftar} className="rise space-y-4">
              <button
                type="button"
                onClick={() => go("pilih")}
                className="flex items-center gap-1.5 text-sm font-medium text-white/70 hover:text-white"
              >
                <ArrowLeft size={16} /> Kembali
              </button>
              <div>
                <h2 className="font-serif text-4xl">Buat akun</h2>
                <p className="mt-1 text-sm text-white/70">
                  Pilih peran yang sesuai dengan tugas Anda di DAMRI.
                </p>
              </div>
              {roleSwitch}
              <p className="rounded-lg bg-white/10 px-3 py-2.5 text-sm text-white/85">
                <b>{R.label}:</b> {R.desc}
              </p>
              {errBox}
              <Field label="Nama lengkap">
                <input
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  autoComplete="name"
                  required
                  className={inputCls()}
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  className={inputCls()}
                />
              </Field>
              <Field label="Kata sandi" hint="Minimal 6 karakter">
                {pwInput(pw, setPw, false)}
              </Field>
              <Field label="Ulangi kata sandi">
                {pwInput(pw2, setPw2, false)}
              </Field>
              {role === "koordinator" && (
                <Field
                  label="Kode registrasi koordinator"
                  hint="Diberikan oleh admin cabang. Demo: DAMRI-KOORD"
                >
                  <input
                    value={kode}
                    onChange={(e) => setKode(e.target.value)}
                    required
                    className={cx(inputCls(), "num")}
                  />
                </Field>
              )}
              <Btn type="submit" variant="signup" className="h-12 w-full">
                Daftar sebagai {R.label}
              </Btn>
              <p className="text-center text-sm text-white/65">
                Sudah punya akun?{" "}
                <button
                  type="button"
                  onClick={() => go("masuk")}
                  className="font-semibold text-amber-300 hover:text-amber-200 hover:underline"
                >
                  Masuk
                </button>
              </p>
            </form>
          )}
        </div>
      </section>
    </div>
  )
}