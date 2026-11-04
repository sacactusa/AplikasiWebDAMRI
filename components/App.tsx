"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Driver from "./Driver"
import Coordinator from "./Coordinator"
import FormLogin from "./auth/FormLogin"
import { OfflineBanner, Toasts, type ToastItem, type ToastType } from "./ui"
import { INCOMING, ME, SEED, Departure, jalur, uid } from "@/lib/data"
import type { Role } from "@/types"

export default function App() {
  const [role, setRole] = useState<Role>(null)
  const [deps, setDeps] = useState<Departure[]>(SEED)
  const [offline, setOffline] = useState(() =>
    typeof navigator !== "undefined" ? !navigator.onLine : false,
  )
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const tid = useRef(0)
  const incoming = useRef(0)

  const toast = useCallback((text: string, type?: ToastType) => {
    const id = ++tid.current
    setToasts((t) => [...t, { id, text, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800)
  }, [])

  const handleLogout = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem("damri_auth_session")
        window.history.replaceState(null, "", window.location.pathname)
      } catch {}
    }
    setRole(null)
  }, [])

  const approveMine = useCallback(
    (id: string) => {
      setDeps((p) => {
        const d = p.find((x) => x.id === id)
        if (!d || d.status !== "dikirim") return p

        return p.map((x) => (x.id === id ? { ...x, status: "disetujui" } : x))
      })
    },
    [toast],
  )

  useEffect(() => {
    if (role === "sopir") {
      const seeded = SEED.find((d) => d.driver === ME && d.status === "dikirim")
      const t = seeded && setTimeout(() => approveMine(seeded.id), 15000)
      return () => t && clearTimeout(t)
    }
    if (role === "koordinator") {
      const i = setInterval(() => {
        const src = INCOMING[incoming.current % INCOMING.length]
        incoming.current++
        setDeps((p) => [{ ...src, id: uid(), isNew: true }, ...p])
      }, 20000)
      return () => clearInterval(i)
    }
  }, [role, approveMine])

  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener("online", on)
    window.addEventListener("offline", off)
    return () => {
      window.removeEventListener("online", on)
      window.removeEventListener("offline", off)
    }
  }, [])

  return (
    <>
      {offline && role && <OfflineBanner />}
      <Toasts items={toasts} onClear={() => setToasts([])} />
      {!role && <FormLogin onLogin={setRole} />}
      {role === "sopir" && (
        <Driver
          deps={deps}
          setDeps={setDeps}
          offline={offline}
          toast={toast}
          onLogout={handleLogout}
          submitted={(d) => setTimeout(() => approveMine(d.id), 10000)}
        />
      )}
      {role === "koordinator" && (
        <Coordinator
          deps={deps}
          setDeps={setDeps}
          offline={offline}
          toast={toast}
          onLogout={handleLogout}
          clearNew={() =>
            setDeps((p) => p.map((d) => ({ ...d, isNew: false })))
          }
        />
      )}
    </>
  )
}
