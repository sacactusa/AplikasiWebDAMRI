"use client"

import { useMemo, useRef, useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { History, List, Plus, User } from "lucide-react"
import type { Departure } from "@/lib/data"
import { ME } from "@/lib/data"
import { cx } from "@/components/ui"
import DaftarKeberangkatan from "./driver/DaftarKeberangkatan"
import RiwayatSopir from "./driver/RiwayatSopir"
import ProfilSopir from "./driver/ProfilSopir"
import InputKeberangkatan from "./driver/InputKeberangkatan"
import DetailKeberangkatan from "./driver/DetailKeberangkatan"
import { DRIVER_PHOTO, type DriverProfile } from "./driver/shared"
import { createDeparture, updateDeparture, deleteDraftDeparture, getDepartures } from "@/lib/supabaseService"

interface Props {
  deps: Departure[]
  setDeps: React.Dispatch<React.SetStateAction<Departure[]>>
  offline: boolean
  toast: (t: string, type?: "success" | "error") => void
  onLogout: () => void
  submitted: (d: Departure) => void
  currentUser?: { nama: string; email: string; id?: string } | null
}

type View =
  | { n: "list" }
  | { n: "riwayat" }
  | { n: "profil" }
  | { n: "add" }
  | { n: "detail"; id: string; dep?: Departure }

export default function Driver({
  deps,
  setDeps,
  offline,
  toast,
  onLogout,
  submitted,
  currentUser,
}: Props) {
  const [view, setView] = useState<View>({ n: "list" })
  const lastTabRef = useRef<"list" | "riwayat">("list")
  const [profile, setProfile] = useState<DriverProfile>(() => {
    if (typeof window !== "undefined") {
      try {
        const key = currentUser?.email ? "damri_driver_profile_" + currentUser.email : "damri_driver_profile"
        const saved = localStorage.getItem(key)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed.foto && parsed.foto.includes("images.unsplash.com")) {
            parsed.foto = DRIVER_PHOTO
          }
          return parsed
        }
      } catch {}
    }
    if (currentUser) {
      return {
        nama: currentUser.nama || (currentUser.email === "sopir@damri.co.id" ? ME : "Sopir"),
        email: currentUser.email || "sopir@damri.co.id",
        telepon: "0813 2456 7890",
        foto: DRIVER_PHOTO,
      }
    }
    return {
      nama: ME,
      email: "sopir@damri.co.id",
      telepon: "0813 2456 7890",
      foto: DRIVER_PHOTO,
    }
  })

  useEffect(() => {
    if (currentUser) {
      setProfile((prev) => ({
        ...prev,
        nama: currentUser.nama || prev.nama,
        email: currentUser.email || prev.email,
      }))
    }
  }, [currentUser])
  const [password, setPassword] = useState("damri123")
  const isDemoDriver = currentUser?.email === "sopir@damri.co.id"
  const mine = useMemo(
    () =>
      deps
        .filter((d) => {
          if (isDemoDriver) return d.driver === ME
          return (
            (currentUser?.id && d.driverId === currentUser.id) ||
            (currentUser?.email && d.driverEmail?.toLowerCase() === currentUser.email.toLowerCase()) ||
            d.driver === profile.nama ||
            (currentUser?.nama && d.driver.toLowerCase() === currentUser.nama.toLowerCase())
          )
        })
        .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)),
    [deps, profile.nama, currentUser, isDemoDriver],
  )
  const pendingRevisions = useMemo(
    () => mine.filter((d) => d.status === "perbaikan" || Boolean(d.rejectNote)).length,
    [mine],
  )
  const tab =
    view.n === "profil"
      ? "profil"
      : view.n === "riwayat"
        ? "riwayat"
        : "list"
  const showNav =
    view.n === "list" || view.n === "riwayat" || view.n === "profil"

  const handleDeleteDraft = async (id: string) => {
    const target = deps.find((d) => d.id === id)
    if (!target || target.status !== "draft") {
      toast("Hanya draft yang dapat dihapus")
      return
    }

    setDeps((prev) => prev.filter((d) => d.id !== id))
    toast("Draft keberangkatan berhasil dihapus")

    if (!isDemoDriver) {
      await deleteDraftDeparture(id, profile.nama)
    }

    if (view.n === "detail" && view.id === id) {
      setView({ n: lastTabRef.current })
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-white sm:border-x sm:border-line">
      <div className="flex-1 pb-28">
        {view.n === "list" && (
          <DaftarKeberangkatan
            mine={mine}
            nama={profile.nama}
            onOpen={(id) => {
              lastTabRef.current = "list"
              setView({ n: "detail", id })
            }}
            onAdd={() => setView({ n: "add" })}
            onDeleteDraft={handleDeleteDraft}
          />
        )}
        {view.n === "riwayat" && (
          <RiwayatSopir
            mine={mine}
            nama={profile.nama}
            onOpen={(id) => {
              lastTabRef.current = "riwayat"
              setView({ n: "detail", id })
            }}
          />
        )}
        {view.n === "profil" && (
          <ProfilSopir
            profile={profile}
            setProfile={(p) => {
              setProfile(p)
              if (typeof window !== "undefined") {
                try {
                  const key = currentUser?.email ? "damri_driver_profile_" + currentUser.email : "damri_driver_profile"
                  localStorage.setItem(key, JSON.stringify(p))
                  if (!isDemoDriver && currentUser?.id) {
                    supabase.from("profiles").update({ nama: p.nama, telepon: p.telepon }).eq("id", currentUser.id).then(() => {})
                  }
                } catch {}
              }
            }}
            password={password}
            setPassword={setPassword}
            offline={offline}
            toast={toast}
            onLogout={onLogout}
            count={mine.length}
          />
        )}
        {view.n === "add" && (
          <InputKeberangkatan
            deps={deps}
            offline={offline}
            driverName={profile.nama}
            currentUser={currentUser}
            onCancel={() => setView({ n: lastTabRef.current })}
            onSave={async (d) => {
              if (!isDemoDriver) {
                const res = await createDeparture(d, currentUser?.email)
                if (res.success && res.id) {
                  const saved = { ...d, id: res.id }
                  setDeps((p) => [saved, ...p.filter((x) => x.id !== d.id && x.id !== res.id)])
                  setView({ n: "detail", id: res.id, dep: saved })
                  toast("Jadwal tersimpan. Silakan isi hasil operasional lalu klik Kirim.")
                } else {
                  toast("Gagal menyimpan ke database Supabase", "error")
                }
              } else {
                setDeps((p) => [d, ...p])
                setView({ n: "detail", id: d.id, dep: d })
                toast("Jadwal tersimpan. Silakan isi hasil operasional lalu klik Kirim.")
              }
            }}
          />
        )}
        {view.n === "detail" && (() => {
          const targetDep = deps.find((d) => d.id === view.id) || view.dep
          if (!targetDep) {
            return (
              <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
                <p className="text-sm text-mute">Memuat detail keberangkatan...</p>
                <button
                  onClick={() => setView({ n: lastTabRef.current })}
                  className="mt-4 text-xs font-semibold text-navy underline cursor-pointer"
                >
                  Kembali ke daftar
                </button>
              </div>
            )
          }
          return (
            <DetailKeberangkatan
              key={view.id}
              dep={targetDep}
              offline={offline}
              currentUser={currentUser}
              onBack={() => setView({ n: lastTabRef.current })}
              onDeleteDraft={handleDeleteDraft}
              onSave={async (d) => {
                if (!isDemoDriver) {
                  await updateDeparture(d, profile.nama)
                  getDepartures(false).then((live) => setDeps(live)).catch(() => {})
                }
                setDeps((p) => p.map((x) => (x.id === d.id ? d : x)))
                setView({ n: lastTabRef.current })
                toast("Draft berhasil disimpan")
              }}
              onSubmit={async (d) => {
                if (!isDemoDriver) {
                  const ok = await updateDeparture(d, profile.nama)
                  if (!ok) {
                    toast("Gagal mengirim keberangkatan ke koordinator", "error")
                    return
                  }
                  getDepartures(false).then((live) => setDeps(live)).catch(() => {})
                }
                const sentDep = { ...d, status: "dikirim" as const, rejectNote: undefined }
                setDeps((p) => [sentDep, ...p.filter((x) => x.id !== d.id)])
                submitted(sentDep)
                setView({ n: lastTabRef.current })
                toast(targetDep?.rejectNote ? "Perbaikan berhasil dikirim ke koordinator!" : "Keberangkatan berhasil dikirim ke koordinator!", "success")
              }}
            />
          )
        })()}
      </div>

      {view.n === "list" && (
        <button
          onClick={() => setView({ n: "add" })}
          className="fixed bottom-24 right-[max(1rem,calc(50vw-14rem+1rem))] z-30 flex h-14 items-center gap-2 rounded-full bg-navy pl-4 pr-5 text-sm font-semibold text-white shadow-lg transition hover:bg-navy-700"
        >
          <Plus size={20} /> Tambah
        </button>
      )}

      {showNav && (
        <nav className="fixed bottom-0 left-1/2 z-40 grid w-full max-w-md -translate-x-1/2 grid-cols-3 border-t border-line bg-white pb-2 shadow-lg">
          {[
            {
              k: "list",
              l: "Keberangkatan",
              i: (
                <span className="relative inline-flex items-center justify-center">
                  <List size={22} />
                  {pendingRevisions > 0 && (
                    <span className="absolute -right-2 -top-1 grid size-4 place-items-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-xs">
                      {pendingRevisions}
                    </span>
                  )}
                </span>
              ),
              v: { n: "list" } as View,
            },
            {
              k: "riwayat",
              l: "Riwayat",
              i: <History size={22} />,
              v: { n: "riwayat" } as View,
            },
            {
              k: "profil",
              l: "Profil",
              i: <User size={22} />,
              v: { n: "profil" } as View,
            },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setView(t.v)}
              className={cx(
                "flex h-16 flex-col items-center justify-center gap-1 text-xs font-semibold",
                tab === t.k ? "text-navy" : "text-mute",
              )}
            >
              {t.i}
              {t.l}
              <span
                className={cx(
                  "h-0.5 w-8 rounded",
                  tab === t.k ? "bg-navy" : "bg-transparent",
                )}
              />
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}
