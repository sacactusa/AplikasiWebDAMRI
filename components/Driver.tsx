"use client"

import { useMemo, useRef, useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { CheckCircle2, History, List, Plus, User } from "lucide-react"
import type { Departure } from "@/lib/data"
import { ME } from "@/lib/data"
import { cx } from "@/components/ui"
import DaftarKeberangkatan from "./driver/DaftarKeberangkatan"
import RiwayatSopir from "./driver/RiwayatSopir"
import ProfilSopir from "./driver/ProfilSopir"
import InputKeberangkatan from "./driver/InputKeberangkatan"
import DetailKeberangkatan from "./driver/DetailKeberangkatan"
import { DRIVER_PHOTO, type DriverProfile } from "./driver/shared"
import { createDeparture, updateDeparture } from "@/lib/supabaseService"

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
  | { n: "detail"; id: string }
  | { n: "success" }

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
        nama: currentUser.nama || ME,
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
        .filter((d) => (isDemoDriver ? d.driver === ME : d.driver === profile.nama))
        .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)),
    [deps, profile.nama, isDemoDriver],
  )
  const pendingRevisions = useMemo(
    () => mine.filter((d) => Boolean(d.rejectNote)).length,
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
                  const key = currentUser?.email ? "damri_driver_profile_" + currentUser.email : "damri_driver_profile"; localStorage.setItem(key, JSON.stringify(p)); if (currentUser?.id) { supabase.from("profiles").update({ nama: p.nama, telepon: p.telepon }).eq("id", currentUser.id).then(() => {}); }
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
            onCancel={() => setView({ n: lastTabRef.current })}
            onSave={async (d) => {
              setDeps((p) => [d, ...p])
              setView({ n: "detail", id: d.id })
              toast("Berhasil disimpan")
              const res = await createDeparture(d, currentUser?.email)
              if (res.id && res.id !== d.id) {
                setDeps((p) => p.map((x) => (x.id === d.id ? { ...x, id: res.id! } : x)))
                setView((v) => (v.n === "detail" && v.id === d.id ? { n: "detail", id: res.id! } : v))
              }
            }}
          />
        )}
        {view.n === "detail" && (() => {
          const targetDep = deps.find((d) => d.id === view.id)
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
              onBack={() => setView({ n: lastTabRef.current })}
              onSave={(d) => {
                setDeps((p) => p.map((x) => (x.id === d.id ? d : x)))
                updateDeparture(d, profile.nama)
                setView({ n: lastTabRef.current })
                toast("Berhasil disimpan")
              }}
              onSubmit={(d) => {
                setDeps((p) => p.map((x) => (x.id === d.id ? d : x)))
                updateDeparture(d, profile.nama)
                submitted(d)
                setView({ n: "success" })
                setTimeout(
                  () =>
                    setView((v) =>
                      v.n === "success" ? { n: lastTabRef.current } : v,
                    ),
                  2200,
                )
              }}
            />
          )
        })()}
        {view.n === "success" && (
          <div className="rise flex min-h-[80vh] flex-col items-center justify-center px-8 text-center">
            <div className="grid size-24 place-items-center rounded-full bg-emerald-50 text-emerald-700">
              <CheckCircle2 size={48} strokeWidth={1.4} />
            </div>
            <h1 className="mt-6 font-serif text-3xl">Terkirim</h1>
            <p className="mt-2 text-sm text-mute">
              Keberangkatan menunggu verifikasi koordinator.
            </p>
          </div>
        )}
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
              i: <List size={22} />,
              v: { n: "list" } as View,
            },
            {
              k: "riwayat",
              l: "Riwayat",
              i: (
                <span className="relative inline-flex items-center justify-center">
                  <History size={22} />
                  {pendingRevisions > 0 && (
                    <span className="absolute -right-2 -top-1 grid size-4 place-items-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-xs">
                      {pendingRevisions}
                    </span>
                  )}
                </span>
              ),
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
