"use client"

import { ChevronRight, KeyRound, LogOut, Mail, Pencil, Phone } from "lucide-react"
import { Btn, cx } from "@/components/ui"
import { Title, PROFILE_PHOTO } from "./shared"

const logoDamriFull = "/assets/logo-damri-full.png"

interface Props {
  profile: { nama: string; email: string; telepon: string }
  online: boolean
  onEdit: () => void
  onPassword: () => void
  onLogout: () => void
}

export default function ProfilKoordinator({
  profile,
  online,
  onEdit,
  onPassword,
  onLogout,
}: Props) {
  return (
    <div className="mx-auto max-w-5xl">
      <Title sub="Kelola informasi pribadi dan keamanan akun.">Profil</Title>
      <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        <div className="bg-navy p-6 text-white sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <span className="relative shrink-0">
              <img
                src={PROFILE_PHOTO}
                alt={`Foto profil ${profile.nama}`}
                className="size-24 rounded-2xl border-2 border-white/80 object-cover shadow-lg sm:size-28"
              />
              <span
                className={cx(
                  "absolute -bottom-1 -right-1 size-4 rounded-full border-[3px] border-navy",
                  online ? "bg-emerald-400" : "bg-slate-400",
                )}
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-serif text-3xl">{profile.nama}</p>
              <p className="mt-1 text-sm text-white/70">Koordinator (Admin)</p>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold">
                <span
                  className={cx(
                    "size-2 rounded-full",
                    online ? "bg-emerald-400" : "bg-slate-400",
                  )}
                />
                {online ? "Online" : "Offline"}
              </span>
            </div>
            <div className="flex items-center border-t border-white/15 pt-5 sm:border-l sm:border-t-0 sm:py-3 sm:pl-7 sm:pr-3">
              <span className="flex h-11 shrink-0 items-center rounded-xl bg-white/90 px-3 shadow-sm">
                <img
                  src={logoDamriFull}
                  alt="DAMRI"
                  className="h-7 w-32 object-contain"
                />
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-7 p-5 sm:p-7">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-mute">
              Informasi akun
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex min-w-0 items-center gap-4 rounded-xl bg-wash p-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-white text-navy shadow-sm">
                  <Mail size={19} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-mute">Email</p>
                  <p className="truncate font-medium">{profile.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-xl bg-wash p-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-white text-navy shadow-sm">
                  <Phone size={19} />
                </span>
                <div>
                  <p className="text-xs text-mute">Nomor telepon</p>
                  <p className="num font-medium">{profile.telepon}</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-mute">
              Pengaturan akun
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              <Btn
                variant="outline"
                onClick={onEdit}
                className="min-h-20 justify-start gap-3 rounded-xl px-4 text-left"
              >
                <span className="grid size-10 place-items-center rounded-lg bg-navy-50 text-navy">
                  <Pencil size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">
                    Edit profil
                  </span>
                  <span className="block text-xs text-mute">
                    Ubah nama dan informasi kontak
                  </span>
                </span>
                <ChevronRight size={18} className="text-mute" />
              </Btn>
              <Btn
                variant="outline"
                onClick={onPassword}
                className="min-h-20 justify-start gap-3 rounded-xl px-4 text-left"
              >
                <span className="grid size-10 place-items-center rounded-lg bg-navy-50 text-navy">
                  <KeyRound size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">
                    Ganti kata sandi
                  </span>
                  <span className="block text-xs text-mute">
                    Perbarui keamanan akun Anda
                  </span>
                </span>
                <ChevronRight size={18} className="text-mute" />
              </Btn>
              <Btn
                variant="outline"
                className="min-h-20 justify-start gap-3 rounded-xl px-4 text-left text-red-700 hover:border-red-200 hover:bg-red-50"
                onClick={onLogout}
              >
                <span className="grid size-10 place-items-center rounded-lg bg-red-50 text-red-700">
                  <LogOut size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">
                    Keluar dari akun
                  </span>
                  <span className="block text-xs font-normal text-mute">
                    Akhiri sesi pada perangkat ini
                  </span>
                </span>
                <ChevronRight size={18} className="text-mute" />
              </Btn>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

