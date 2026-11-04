"use client"

import { useRef, useState } from "react"
import {
  Bus,
  Camera,
  ChevronRight,
  KeyRound,
  LogOut,
  Mail,
  Pencil,
  Phone,
  Trash2,
  User,
} from "lucide-react"
import { Btn, Dialog, Field, cx, inputCls } from "@/components/ui"
import { DRIVER_PHOTO, DamriWordmark, type DriverProfile } from "./shared"

interface Props {
  profile: DriverProfile
  setProfile: (p: DriverProfile) => void
  password: string
  setPassword: React.Dispatch<React.SetStateAction<string>>
  offline: boolean
  toast: (t: string, type?: "success" | "error") => void
  onLogout: () => void
  count: number
}

export default function ProfilSopir({
  profile,
  setProfile,
  password,
  setPassword,
  offline,
  toast,
  onLogout,
  count,
}: Props) {
  const [editOpen, setEditOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [logoutDialog, setLogoutDialog] = useState(false)
  const [draft, setDraft] = useState(profile)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    next: "",
    confirm: "",
  })
  const [passwordError, setPasswordError] = useState("")
  const online = !offline

  const openEdit = () => {
    setDraft(profile)
    setEditOpen(true)
  }

  const openPassword = () => {
    setPasswordForm({ current: "", next: "", confirm: "" })
    setPasswordError("")
    setPasswordOpen(true)
  }

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
        setDraft((curr) => ({ ...curr, foto: result }))
        toast("Foto berhasil dipilih. Klik 'Simpan perubahan' untuk menerapkan.")
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  return (
    <>
      <header className="relative overflow-hidden bg-navy/90 px-5 pb-8 pt-8 text-white shadow-md backdrop-blur-md">
        <div
          aria-hidden
          className="absolute -right-14 -top-20 size-56 rounded-full border border-white/10"
        />
        <div
          aria-hidden
          className="absolute -right-8 -top-10 size-36 rounded-full border border-white/10"
        />
        <div className="relative flex items-center justify-between gap-3">
          <h1 className="font-serif text-4xl">Profil</h1>
          <DamriWordmark />
        </div>
        <div className="relative mt-6 flex items-center gap-4">
          <span className="relative shrink-0">
            <img
              src={profile.foto || DRIVER_PHOTO}
              alt={`Foto profil ${profile.nama}`}
              className="size-20 rounded-2xl border-2 border-white/80 object-cover shadow-lg"
            />
            <button
              type="button"
              onClick={openEdit}
              title="Ganti foto profil"
              className="absolute -bottom-2 -left-2 grid size-7 place-items-center rounded-lg border border-line bg-white text-navy shadow-md transition hover:bg-navy-50"
            >
              <Camera size={14} />
            </button>
            <span
              className={cx(
                "absolute -bottom-1 -right-1 size-4 rounded-full border-[3px] border-navy",
                online ? "bg-emerald-400" : "bg-slate-400",
              )}
            />
          </span>
          <div className="min-w-0">
            <p className="truncate font-serif text-2xl">{profile.nama}</p>
            <p className="mt-0.5 text-sm text-white/85">Sopir DAMRI</p>
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">
              <span
                className={cx(
                  "size-2 rounded-full",
                  online ? "bg-emerald-400" : "bg-slate-400",
                )}
              />
              {online ? "Online" : "Offline"}
            </span>
          </div>
        </div>
      </header>

      <div className="space-y-5 px-5 py-6">
        <section className="overflow-hidden rounded-2xl border border-line bg-white">
          <div className="border-b border-line px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wider text-mute">
              Informasi akun
            </p>
          </div>
          <div className="divide-y divide-line">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <Mail size={18} className="shrink-0 text-navy" />
              <div className="min-w-0">
                <p className="text-xs text-mute">Email</p>
                <p className="truncate text-sm font-medium">{profile.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <Phone size={18} className="shrink-0 text-navy" />
              <div>
                <p className="text-xs text-mute">Nomor telepon</p>
                <p className="num text-sm font-medium">{profile.telepon}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <Bus size={18} className="shrink-0 text-navy" />
              <div>
                <p className="text-xs text-mute">Aktivitas</p>
                <p className="text-sm font-medium">
                  {count} keberangkatan tercatat
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <p className="px-1 text-xs font-bold uppercase tracking-wider text-mute">
            Pengaturan akun
          </p>
          <button
            onClick={openEdit}
            className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-line px-4 text-left transition hover:bg-wash"
          >
            <span className="grid size-9 place-items-center rounded-lg bg-navy-50 text-navy">
              <Pencil size={17} />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold">Edit profil</span>
              <span className="block text-xs text-mute">
                Ubah nama, kontak & foto
              </span>
            </span>
            <ChevronRight size={18} className="text-mute" />
          </button>
          <button
            onClick={openPassword}
            className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-line px-4 text-left transition hover:bg-wash"
          >
            <span className="grid size-9 place-items-center rounded-lg bg-navy-50 text-navy">
              <KeyRound size={17} />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold">
                Ganti kata sandi
              </span>
              <span className="block text-xs text-mute">
                Perbarui keamanan akun Anda
              </span>
            </span>
            <ChevronRight size={18} className="text-mute" />
          </button>
        </section>

        <Btn
          variant="outline"
          className="w-full text-red-700"
          onClick={() => setLogoutDialog(true)}
        >
          <LogOut size={18} /> Keluar dari akun
        </Btn>
      </div>

      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit profil"
        actions={
          <>
            <Btn variant="ghost" onClick={() => setEditOpen(false)}>
              Batal
            </Btn>
            <Btn
              onClick={() => {
                setProfile({
                  nama: draft.nama.trim() || profile.nama,
                  email: draft.email.trim() || profile.email,
                  telepon: draft.telepon.trim(),
                  foto: draft.foto || profile.foto || DRIVER_PHOTO,
                })
                setEditOpen(false)
                toast("Profil & foto berhasil diperbarui")
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
                src={draft.foto || DRIVER_PHOTO}
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
                {draft.nama || profile.nama}
              </p>
              <p className="text-xs text-mute">Sopir DAMRI</p>
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
                {draft.foto && draft.foto !== DRIVER_PHOTO && (
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((curr) => ({
                        ...curr,
                        foto: DRIVER_PHOTO,
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
              value={draft.nama}
              onChange={(e) =>
                setDraft((current) => ({ ...current, nama: e.target.value }))
              }
              className={inputCls()}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={draft.email}
              onChange={(e) =>
                setDraft((current) => ({ ...current, email: e.target.value }))
              }
              className={inputCls()}
            />
          </Field>
          <Field label="Nomor telepon">
            <input
              type="tel"
              value={draft.telepon}
              onChange={(e) =>
                setDraft((current) => ({ ...current, telepon: e.target.value }))
              }
              className={inputCls()}
            />
          </Field>
        </div>
      </Dialog>

      <Dialog
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        title="Ganti kata sandi"
        actions={
          <>
            <Btn variant="ghost" onClick={() => setPasswordOpen(false)}>
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
                setPasswordOpen(false)
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
          Apakah Anda yakin ingin keluar dari akun Sopir ({profile.nama})? Pastikan seluruh
          pencatatan dan keberangkatan Anda telah tersimpan sebelum mengakhiri sesi ini.
        </p>
      </Dialog>
    </>
  )
}
