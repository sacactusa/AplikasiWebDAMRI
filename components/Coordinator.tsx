"use client"

import { useState } from "react"
import {
  Archive,
  ClipboardCheck,
  Database,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Users,
  X,
} from "lucide-react"
import type { Departure } from "@/lib/data"
import { Btn, Dialog, Field, Logo, cx, inputCls } from "@/components/ui"
import { PROFILE_PHOTO, type Page } from "./coordinator/shared"
import VerifikasiKeberangkatan from "./coordinator/VerifikasiKeberangkatan"
import DashboardAnalitik from "./coordinator/DashboardAnalitik"
import LaporanOperasional from "./coordinator/LaporanOperasional"
import MasterData from "./coordinator/MasterData"
import ManajemenAkun from "./coordinator/ManajemenAkun"
import ArsipBackup from "./coordinator/ArsipBackup"
import AuditLog from "./coordinator/AuditLog"
import ProfilKoordinator from "./coordinator/ProfilKoordinator"

interface Props {
  deps: Departure[]
  setDeps: React.Dispatch<React.SetStateAction<Departure[]>>
  offline: boolean
  toast: (t: string) => void
  onLogout: () => void
  clearNew: () => void
}

export default function Coordinator({
  deps,
  setDeps,
  offline,
  toast,
  onLogout,
  clearNew,
}: Props) {
  const [page, setPage] = useState<Page>("verifikasi")
  const [menu, setMenu] = useState(false)
  const [profileDialog, setProfileDialog] = useState(false)
  const [passwordDialog, setPasswordDialog] = useState(false)
  const [profile, setProfile] = useState({
    nama: "Rina Marlina",
    email: "koordinator@damri.co.id",
    telepon: "0812 3456 7890",
  })
  const [profileDraft, setProfileDraft] = useState(profile)
  const [password, setPassword] = useState("damri123")
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    next: "",
    confirm: "",
  })
  const [passwordError, setPasswordError] = useState("")
  const waiting = deps.filter((d) => d.status === "dikirim").length
  const online = !offline

  const items: [Page, string, React.ReactNode][] = [
    ["verifikasi", "Verifikasi", <ClipboardCheck size={18} key="v" />],
    ["dashboard", "Dashboard", <LayoutDashboard size={18} key="d" />],
    ["laporan", "Laporan / Ekspor", <FileSpreadsheet size={18} key="l" />],
    ["master", "Data Master", <Database size={18} key="m" />],
    ["akun", "Akun", <Users size={18} key="ak" />],
    ["arsip", "Arsip & Backup", <Archive size={18} key="ar" />],
    ["audit", "Audit Log", <ScrollText size={18} key="au" />],
  ]

  const nav = (
    <div className="flex h-full flex-col bg-gradient-to-b from-navy to-[#06173a] p-4 text-white">
      <div className="mb-8 mt-1 px-2">
        <Logo light />
      </div>
      <nav className="space-y-1">
        {items.map(([k, l, i]) => (
          <button
            key={k}
            onClick={() => {
              setPage(k)
              setMenu(false)
            }}
            className={cx(
              "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold transition",
              page === k
                ? "bg-white text-navy shadow-sm"
                : "text-white/80 hover:bg-white/10 hover:text-white",
            )}
          >
            <span className="flex items-center gap-3">
              {i}
              {l}
            </span>
            {k === "verifikasi" && waiting > 0 && (
              <span
                className={cx(
                  "num rounded-full px-2 py-0.5 text-xs font-bold",
                  page === "verifikasi"
                    ? "bg-amber-400 text-navy"
                    : "bg-amber-400/20 text-amber-300",
                )}
              >
                {waiting}
              </span>
            )}
          </button>
        ))}
      </nav>
      <div className="mt-auto border-t border-white/15 pt-4">
        <button
          onClick={() => {
            setPage("profil")
            setMenu(false)
          }}
          className={cx(
            "group flex w-full items-center gap-3 rounded-xl p-2 text-left transition",
            page === "profil"
              ? "bg-white text-navy shadow-sm"
              : "hover:bg-white/10",
          )}
        >
          <span className="relative shrink-0">
            <img
              src={PROFILE_PHOTO}
              alt=""
              className="size-10 rounded-xl object-cover"
            />
            <span
              className={cx(
                "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2",
                page === "profil" ? "border-white" : "border-navy",
                online ? "bg-emerald-400" : "bg-slate-400",
              )}
            />
          </span>
          <div className="min-w-0 flex-1">
            <p
              className={cx(
                "truncate text-sm font-semibold",
                page === "profil" ? "text-navy" : "text-white",
              )}
            >
              {profile.nama}
            </p>
            <p
              className={cx(
                "text-xs",
                page === "profil" ? "text-navy/70" : "text-white/60",
              )}
            >
              Koordinator (Admin)
            </p>
          </div>
        </button>
        <button
          onClick={onLogout}
          className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white"
        >
          <LogOut size={16} /> Keluar
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-wash text-ink">
      <aside className="hidden w-64 shrink-0 lg:block">{nav}</aside>
      {menu && (
        <div
          className="fixed inset-0 z-50 bg-ink/40 lg:hidden"
          onClick={() => setMenu(false)}
        >
          <div
            className="h-full w-72 max-w-[80vw]"
            onClick={(e) => e.stopPropagation()}
          >
            {nav}
          </div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-line bg-white px-4 lg:hidden">
          <button
            aria-label="Buka menu navigasi"
            onClick={() => setMenu(true)}
            className="grid size-10 place-items-center rounded-lg hover:bg-wash"
          >
            <Menu size={22} />
          </button>
          <Logo />
        </header>
        <main className="mx-auto max-w-[1180px] px-4 py-6 sm:px-8 sm:py-10">
          {page === "verifikasi" && (
            <VerifikasiKeberangkatan
              deps={deps}
              setDeps={setDeps}
              toast={toast}
              go={setPage}
              clearNew={clearNew}
            />
          )}
          {page === "dashboard" && (
            <DashboardAnalitik deps={deps} go={setPage} />
          )}
          {page === "laporan" && (
            <LaporanOperasional deps={deps} toast={toast} />
          )}
          {page === "master" && <MasterData toast={toast} />}
          {page === "akun" && <ManajemenAkun toast={toast} />}
          {page === "arsip" && <ArsipBackup toast={toast} />}
          {page === "audit" && <AuditLog />}
          {page === "profil" && (
            <ProfilKoordinator
              profile={profile}
              online={online}
              onEdit={() => {
                setProfileDraft(profile)
                setProfileDialog(true)
              }}
              onPassword={() => {
                setPasswordForm({ current: "", next: "", confirm: "" })
                setPasswordError("")
                setPasswordDialog(true)
              }}
              onLogout={onLogout}
            />
          )}
        </main>
      </div>
      <Dialog
        open={profileDialog}
        onClose={() => setProfileDialog(false)}
        title="Edit profil"
        actions={
          <>
            <Btn variant="ghost" onClick={() => setProfileDialog(false)}>
              Batal
            </Btn>
            <Btn
              onClick={() => {
                setProfile({
                  nama: profileDraft.nama.trim() || profile.nama,
                  email: profileDraft.email.trim() || profile.email,
                  telepon: profileDraft.telepon.trim(),
                })
                setProfileDialog(false)
                toast("Profil berhasil diperbarui")
              }}
            >
              Simpan perubahan
            </Btn>
          </>
        }
      >
        <div className="space-y-5">
          <div className="flex items-center gap-4 rounded-xl bg-wash p-3">
            <img
              src={PROFILE_PHOTO}
              alt=""
              className="size-16 rounded-full object-cover"
            />
            <div>
              <p className="font-semibold text-ink">
                {profileDraft.nama || profile.nama}
              </p>
              <p className="text-xs text-mute">Koordinator (Admin)</p>
            </div>
          </div>
          <Field label="Nama lengkap">
            <input
              value={profileDraft.nama}
              onChange={(e) =>
                setProfileDraft((current) => ({
                  ...current,
                  nama: e.target.value,
                }))
              }
              className={inputCls()}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={profileDraft.email}
              onChange={(e) =>
                setProfileDraft((current) => ({
                  ...current,
                  email: e.target.value,
                }))
              }
              className={inputCls()}
            />
          </Field>
          <Field label="Nomor telepon">
            <input
              type="tel"
              value={profileDraft.telepon}
              onChange={(e) =>
                setProfileDraft((current) => ({
                  ...current,
                  telepon: e.target.value,
                }))
              }
              className={inputCls()}
            />
          </Field>
        </div>
      </Dialog>
      <Dialog
        open={passwordDialog}
        onClose={() => setPasswordDialog(false)}
        title="Ganti kata sandi"
        actions={
          <>
            <Btn variant="ghost" onClick={() => setPasswordDialog(false)}>
              Batal
            </Btn>
            <Btn
              onClick={() => {
                if (passwordForm.current !== password) {
                  setPasswordError("Kata sandi saat ini tidak sesuai.")
                  return
                }
                if (passwordForm.next.length < 8) {
                  setPasswordError("Kata sandi baru minimal 8 karakter.")
                  return
                }
                if (passwordForm.next !== passwordForm.confirm) {
                  setPasswordError("Konfirmasi kata sandi belum sama.")
                  return
                }
                setPassword(passwordForm.next)
                setPasswordDialog(false)
                toast("Kata sandi berhasil diperbarui")
              }}
            >
              Perbarui kata sandi
            </Btn>
          </>
        }
      >
        <div className="space-y-4">
          <p>Gunakan minimal 8 karakter untuk menjaga keamanan akun Anda.</p>
          {passwordError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 font-medium text-red-700">
              {passwordError}
            </p>
          )}
          <Field label="Kata sandi saat ini">
            <input
              type="password"
              autoComplete="current-password"
              value={passwordForm.current}
              onChange={(e) => {
                setPasswordForm((current) => ({
                  ...current,
                  current: e.target.value,
                }))
                setPasswordError("")
              }}
              className={inputCls(!!passwordError)}
            />
          </Field>
          <Field label="Kata sandi baru">
            <input
              type="password"
              autoComplete="new-password"
              value={passwordForm.next}
              onChange={(e) => {
                setPasswordForm((current) => ({
                  ...current,
                  next: e.target.value,
                }))
                setPasswordError("")
              }}
              className={inputCls(!!passwordError)}
            />
          </Field>
          <Field label="Konfirmasi kata sandi baru">
            <input
              type="password"
              autoComplete="new-password"
              value={passwordForm.confirm}
              onChange={(e) => {
                setPasswordForm((current) => ({
                  ...current,
                  confirm: e.target.value,
                }))
                setPasswordError("")
              }}
              className={inputCls(!!passwordError)}
            />
          </Field>
        </div>
      </Dialog>
    </div>
  )
}
