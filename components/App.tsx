"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Driver from "./Driver"
import Coordinator from "./Coordinator"
import FormLogin from "./auth/FormLogin"
import { OfflineBanner, Toasts, type ToastItem, type ToastType } from "./ui"
import { INCOMING, ME, SEED, Departure, jalur, uid } from "@/lib/data"
import type { Role } from "@/types"
import { getDepartures, approveDeparture } from "@/lib/supabaseService"

export default function App() {
  const [currentUser, setCurrentUser] = useState<{ nama: string; email: string; id?: string } | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const s = sessionStorage.getItem("damri_current_user")
        if (s) return JSON.parse(s)
      } catch {}
    }
    return null
  })
  const [role, setRole] = useState<Role>(() => {
    if (typeof window !== "undefined") {
      try {
        const s = sessionStorage.getItem("damri_auth_session")
        if (s === "sopir" || s === "koordinator") return s
      } catch {}
    }
    return null
  })
  const [deps, setDeps] = useState<Departure[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const s = sessionStorage.getItem("damri_current_user")
        if (s) {
          const user = JSON.parse(s)
          const isDemoUser = user.email === "koordinator@damri.co.id" || user.email === "sopir@damri.co.id"
          if (!isDemoUser) return []
        }
      } catch {}
    }
    return SEED
  })
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

  const handleLogin = useCallback((r: Role, u?: { nama: string; email: string; id?: string }) => {
    setRole(r)
    if (typeof window !== "undefined") {
      try {
        if (r) sessionStorage.setItem("damri_auth_session", r)
        if (u) sessionStorage.setItem("damri_current_user", JSON.stringify(u))
      } catch {}
    }
    if (u) {
      setCurrentUser(u)
      const userIsDemo = u.email === "koordinator@damri.co.id" || u.email === "sopir@damri.co.id"
      if (userIsDemo) {
        setDeps(SEED)
      } else {
        getDepartures(false).then((live) => setDeps(live))
      }
    }
  }, [])

  const handleLogout = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem("damri_auth_session")
        sessionStorage.removeItem("damri_current_user")
        window.history.replaceState(null, "", window.location.pathname)
      } catch {}
    }
    setCurrentUser(null)
    setRole(null)
  }, [])

  const approveMine = useCallback(
    (id: string) => {
      setDeps((p) => {
        const d = p.find((x) => x.id === id)
        if (!d || d.status !== "dikirim") return p

        return p.map((x) => (x.id === id ? { ...x, status: "disetujui" } : x))
      })
      approveDeparture(id, "Sistem")
    },
    [],
  )

  const isDemoCoordinator = currentUser?.email === "koordinator@damri.co.id"
  const isDemoDriver = currentUser?.email === "sopir@damri.co.id"
  const isDemo = isDemoCoordinator || isDemoDriver

  useEffect(() => {
    if (role === "sopir" && isDemoDriver) {
      const seeded = SEED.find((d) => d.driver === ME && d.status === "dikirim")
      const t = seeded && setTimeout(() => approveMine(seeded.id), 15000)
      return () => t && clearTimeout(t)
    }
    if (role === "koordinator" && isDemoCoordinator) {
      const i = setInterval(() => {
        const src = INCOMING[incoming.current % INCOMING.length]
        incoming.current++
        setDeps((p) => [{ ...src, id: uid(), isNew: true }, ...p])
      }, 20000)
      return () => clearInterval(i)
    }
  }, [role, currentUser, approveMine, isDemoCoordinator, isDemoDriver])

  // Initial fetch & background sync
  useEffect(() => {
    const userIsDemo = currentUser?.email === "koordinator@damri.co.id" || currentUser?.email === "sopir@damri.co.id"
    if (userIsDemo) {
      setDeps(SEED)
    } else {
      getDepartures(false).then((liveDeps) => {
        setDeps(liveDeps)
      })
    }
  }, [currentUser?.email])

  // Polling data Supabase untuk akun riil agar selalu sinkron
  useEffect(() => {
    if (!role || isDemo) return
    const interval = setInterval(() => {
      getDepartures(false).then((live) => {
        setDeps(live)
      })
    }, 10000)
    return () => clearInterval(interval)
  }, [role, isDemo])



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
      {!role && <FormLogin onLogin={handleLogin} />}
      {role === "sopir" && (
        <Driver
          deps={deps}
          setDeps={setDeps}
          offline={offline}
          toast={toast}
          onLogout={handleLogout}
          currentUser={currentUser}
          submitted={(d) => {
            if (isDemoDriver) {
              setTimeout(() => approveMine(d.id), 10000)
            }
          }}
        />
      )}
      {role === "koordinator" && (
        <Coordinator
          deps={deps}
          setDeps={setDeps}
          offline={offline}
          toast={toast}
          onLogout={handleLogout}
          currentUser={currentUser}
          clearNew={() =>
            setDeps((p) => p.map((d) => ({ ...d, isNew: false })))
          }
        />
      )}
    </>
  )
}
