"use client"

import { useEffect, useRef, useState } from "react"
import {
  Archive,
  Camera,
  ClipboardCheck,
  Database,
  FileSpreadsheet,
  LayoutDashboard,
  Menu,
  ScrollText,
  Trash2,
  Users,
  X,
} from "lucide-react"
import type { Departure } from "@/lib/data"
import { Btn, Dialog, Field, Logo, cx, inputCls } from "@/components/ui"
import { PROFILE_PHOTO, type CoordinatorProfile, type Page } from "./coordinator/shared"
import VerifikasiKeberangkatan from "./coordinator/VerifikasiKeberangkatan"
import DashboardAnalitik from "./coordinator/DashboardAnalitik"
import LaporanOperasional from "./coordinator/LaporanOperasional"
import MasterData from "./coordinator/MasterData"
import ManajemenAkun from "./coordinator/ManajemenAkun"
import ArsipBackup from "./coordinator/ArsipBackup"
import AuditLog from "./coordinator/AuditLog"
import ProfilKoordinator from "./coordinator/ProfilKoordinator"
import { supabase } from "@/lib/supabase"
import {
  archiveRequestErrorMessage,
  createCoordinatorArchive,
} from "@/lib/archiveService"
import type { SavedArchive } from "./coordinator/shared"

interface Props {
  deps: Departure[]
  setDeps: React.Dispatch<React.SetStateAction<Departure[]>>
  offline: boolean
  toast: (t: string, type?: "success" | "error") => void
  onLogout: () => void
  clearNew: () => void
  currentUser?: { nama: string; email: string; id?: string } | null
}

export default function Coordinator({
  deps,
  setDeps,
  offline,
  toast,
  onLogout,
  clearNew,
  currentUser,
}: Props) {
  const [page, setPage] = useState<Page>("verifikasi")
  const [menu, setMenu] = useState(false)
  const [profileDialog, setProfileDialog] = useState(false)
  const [passwordDialog, setPasswordDialog] = useState(false)
  const [logoutDialog, setLogoutDialog] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [profile, setProfile] = useState<CoordinatorProfile>(() => {
    if (typeof window !== "undefined") {
      try {
        const key = currentUser?.email ? "damri_coord_profile_" + currentUser.email : "damri_coord_profile"
        const saved = localStorage.getItem(key)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed.foto && parsed.foto.includes("images.unsplash.com")) {
            parsed.foto = PROFILE_PHOTO
          }
          return parsed
        }
      } catch {}
    }
    if (currentUser) {
      return {
        nama: currentUser.nama || "Koordinator",
        email: currentUser.email || "koordinator@damri.co.id",
        telepon: "0812 3456 7890",
        foto: PROFILE_PHOTO,
      }
    }
    return {
      nama: "Rina Marlina",
      email: "koordinator@damri.co.id",
      telepon: "0812 3456 7890",
      foto: PROFILE_PHOTO,
    }
  })

  useEffect(() => {
    if (currentUser) {
      setProfile((prev) => ({
        ...prev,
        nama: currentUser.nama || prev.nama,
        email: currentUser.email || prev.email,
      }))
      setProfileDraft((prev) => ({
        ...prev,
        nama: currentUser.nama || prev.nama,
        email: currentUser.email || prev.email,
      }))
    }
  }, [currentUser])
  const [profileDraft, setProfileDraft] = useState<CoordinatorProfile>(profile)
  const [password, setPassword] = useState("damri123")
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    next: "",
    confirm: "",
  })
  const [passwordError, setPasswordError] = useState("")
  const waiting = deps.filter((d) => d.status === "dikirim").length
  const online = !offline

  const saveDashboardArchive = async (
    archive: Omit<SavedArchive, "id" | "createdAt">,
  ) => {
    if (!currentUser?.id) {
      toast(
        "Penyimpanan arsip memerlukan akun koordinator asli",
        "error",
      )
      return
    }

    try {
      await createCoordinatorArchive(currentUser.id, archive)
      toast(
        `Arsip ${archive.label} tersimpan di akun Anda. Silakan unduh di Arsip & Backup.`,
        "success",
      )
      setPage("arsip"      )
    } catch (error) {
      console.error("Gagal menyimpan arsip dashboard:", error)
      toast(`Arsip gagal disimpan: ${archiveRequestErrorMessage(error)}`, "error")
    }
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" })
  }, [page])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast("Format file harus berupa gambar", "error")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast("Ukuran foto maksimal 5 MB", "error")
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      if (result) {
        setProfileDraft((curr) => ({ ...curr, foto: result }))
        toast("Foto berhasil dipilih. Klik 'Simpan perubahan' untuk menerapkan.")
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

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
    <div className="flex h-full flex-col bg-gradient-to-b from-navy to-navy-900 p-4 text-white">
      <div className="mb-6 mt-1 flex items-center justify-between px-2">
        <Logo light />
        {menu && (
          <button
            onClick={() => setMenu(false)}
            aria-label="Tutup menu"
            className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X size={20} />
          </button>
        )}
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
              src={profile.foto || PROFILE_PHOTO}
              alt=""
              className="size-10 rounded-full object-cover"
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
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-wash text-ink">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto border-r border-navy-900/20 bg-navy shadow-sm lg:block">
        {nav}
      </aside>
      {menu && (
        <div
          className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={() => setMenu(false)}
        >
          <div
            className="h-full w-72 max-w-[85vw] shadow-2xl animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {nav}
          </div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-white/95 px-4 backdrop-blur-md shadow-2xs lg:hidden">
          <button
            aria-label="Buka menu navigasi"
            onClick={() => setMenu(true)}
            className="grid size-10 place-items-center rounded-lg text-navy hover:bg-wash active:scale-95 transition"
          >
            <Menu size={22} />
          </button>
          <Logo />
        </header>
        <main className="w-full max-w-[1280px] mx-auto px-4 py-6 sm:px-8 sm:py-8 flex-1 min-w-0">
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
            <DashboardAnalitik deps={deps} onExport={saveDashboardArchive} />
          )}
          {page === "laporan" && (
            <LaporanOperasional deps={deps} toast={toast} />
          )}
          {page === "master" && <MasterData toast={toast} />}
          {page === "akun" && <ManajemenAkun toast={toast} />}
          {page === "arsip" && (
            <ArsipBackup coordinatorId={currentUser?.id} toast={toast} />
          )}
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
              onLogout={() => setLogoutDialog(true)}
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
            <Btn
              variant="ghost"
              onClick={() => {
                setProfileDialog(false)
                setProfileDraft(profile)
              }}
            >
              Batal
            </Btn>
            <Btn
              onClick={() => {
                const updated: CoordinatorProfile = {
                  nama: profileDraft.nama.trim() || profile.nama,
                  email: profileDraft.email.trim() || profile.email,
                  telepon: profileDraft.telepon.trim(),
                  foto: profileDraft.foto || profile.foto || PROFILE_PHOTO,
                }
                setProfile(updated)
                if (typeof window !== "undefined") {
                  try {
                    const key = currentUser?.email ? "damri_coord_profile_" + currentUser.email : "damri_coord_profile"; localStorage.setItem(key, JSON.stringify(updated)); if (currentUser?.id) { supabase.from("profiles").update({ nama: updated.nama, telepon: updated.telepon }).eq("id", currentUser.id).then(() => {}); }
                  } catch {}
                }
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
          <div className="flex items-center gap-4 rounded-xl bg-wash p-3.5">
            <div className="relative group shrink-0">
              <img
                src={profileDraft.foto || PROFILE_PHOTO}
                alt=""
                className="size-16 rounded-full object-cover ring-2 ring-white shadow-sm"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Ganti foto profil"
                className="absolute inset-0 flex items-center justify-center rounded-full bg-navy/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Camera size={20} />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink">
                {profileDraft.nama || profile.nama}
              </p>
              <p className="text-xs text-mute">Koordinator (Admin)</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold text-navy shadow-xs transition hover:bg-navy-50"
                >
                  <Camera size={13} /> Ganti foto
                </button>
                {profileDraft.foto && profileDraft.foto !== PROFILE_PHOTO && (
                  <button
                    type="button"
                    onClick={() =>
                      setProfileDraft((curr) => ({
                        ...curr,
                        foto: PROFILE_PHOTO,
                      }))
                    }
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
                  >
                    <Trash2 size={12} /> Hapus foto
                  </button>
                )}
              </div>
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
      <Dialog
        open={logoutDialog}
        onClose={() => setLogoutDialog(false)}
        title="Keluar dari akun?"
        actions={
          <>
            <Btn variant="outline" onClick={() => setLogoutDialog(false)}>
              Batal
            </Btn>
            <Btn
              variant="danger"
              onClick={() => {
                setLogoutDialog(false)
                toast("Berhasil keluar dari akun")
                onLogout()
              }}
            >
              Ya, keluar
            </Btn>
          </>
        }
      >
        <p>
          Apakah Anda yakin ingin keluar dari akun Koordinator ({profile.nama})? Pastikan seluruh
          pemeriksaan dan perubahan data operasional telah disimpan sebelum
          mengakhiri sesi ini.
        </p>
      </Dialog>
    </div>
  )
}
