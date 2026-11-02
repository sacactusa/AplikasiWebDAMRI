"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, List, Plus, User } from "lucide-react"
import type { Departure } from "@/lib/data"
import { ME } from "@/lib/data"
import { cx } from "@/components/ui"
import DaftarKeberangkatan from "./driver/DaftarKeberangkatan"
import ProfilSopir from "./driver/ProfilSopir"
import InputKeberangkatan from "./driver/InputKeberangkatan"
import DetailKeberangkatan from "./driver/DetailKeberangkatan"
import type { DriverProfile } from "./driver/shared"

interface Props {
  deps: Departure[]
  setDeps: React.Dispatch<React.SetStateAction<Departure[]>>
  offline: boolean
  toast: (t: string) => void
  onLogout: () => void
  submitted: (d: Departure) => void
}

type View =
  | { n: "list" }
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
}: Props) {
  const [view, setView] = useState<View>({ n: "list" })
  const [profile, setProfile] = useState<DriverProfile>({
    nama: ME,
    email: "sopir@damri.co.id",
    telepon: "0813 2456 7890",
  })
  const [password, setPassword] = useState("damri123")
  const mine = useMemo(
    () =>
      deps
        .filter((d) => d.driver === ME)
        .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)),
    [deps],
  )
  const tab = view.n === "profil" ? "profil" : "list"
  const showNav = view.n === "list" || view.n === "profil"

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-white sm:border-x sm:border-line">
      <div className="flex-1 pb-28">
        {view.n === "list" && (
          <DaftarKeberangkatan
            mine={mine}
            nama={profile.nama}
            onOpen={(id) => setView({ n: "detail", id })}
          />
        )}
        {view.n === "profil" && (
          <ProfilSopir
            profile={profile}
            setProfile={setProfile}
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
            onCancel={() => setView({ n: "list" })}
            onSave={(d) => {
              setDeps((p) => [d, ...p])
              setView({ n: "detail", id: d.id })
            }}
          />
        )}
        {view.n === "detail" && (
          <DetailKeberangkatan
            key={view.id}
            dep={deps.find((d) => d.id === view.id)!}
            offline={offline}
            onBack={() => setView({ n: "list" })}
            onSave={(d) => {
              setDeps((p) => p.map((x) => (x.id === d.id ? d : x)))
              setView({ n: "list" })
            }}
            onSubmit={(d) => {
              setDeps((p) => p.map((x) => (x.id === d.id ? d : x)))
              submitted(d)
              setView({ n: "success" })
              setTimeout(
                () => setView((v) => (v.n === "success" ? { n: "list" } : v)),
                2200,
              )
            }}
          />
        )}
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
        <nav className="fixed bottom-0 left-1/2 z-40 grid w-full max-w-md -translate-x-1/2 grid-cols-2 border-t border-line bg-white pb-2">
          {[
            {
              k: "list",
              l: "Keberangkatan",
              i: <List size={22} />,
              v: { n: "list" } as View,
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
