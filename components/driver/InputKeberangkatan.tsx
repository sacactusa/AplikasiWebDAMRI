"use client"

import { useEffect, useMemo, useState } from "react"
import type { Departure, Jalur, Segment, Vehicle } from "@/lib/data"
import { JALUR, ME, SEGMENTS, VEHICLES, seg, uid } from "@/lib/data"
import { Btn, Dialog, Field, cx, inputCls } from "@/components/ui"
import { TopBar } from "./shared"
import { getMasterData } from "@/lib/supabaseService"

interface Props {
  deps: Departure[]
  offline: boolean
  onCancel: () => void
  onSave: (d: Departure) => void
  driverName?: string
  currentUser?: { nama: string; email: string; id?: string } | null
}

export default function InputKeberangkatan({
  deps,
  offline,
  onCancel,
  onSave,
  driverName,
  currentUser,
}: Props) {
  const isDemoDriver = currentUser?.email === "sopir@damri.co.id"
  const currentDriver = driverName || (isDemoDriver ? ME : "Sopir")
  // Tanggal hari ini real-time (format YYYY-MM-DD sesuai zona waktu lokal perangkat/browser pengguna)
  const getTodayLocal = () => {
    const d = new Date()
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }
  const todayReal = getTodayLocal()
  const [date, setDate] = useState(todayReal)
  const [time, setTime] = useState(() => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
  })
  const [segments, setSegments] = useState<Segment[]>(isDemoDriver ? SEGMENTS : [])
  const [jalurList, setJalurList] = useState<Jalur[]>(isDemoDriver ? JALUR : [])
  const [vehicles, setVehicles] = useState<Vehicle[]>(isDemoDriver ? VEHICLES : [])

  const [segmentId, setSegmentId] = useState(isDemoDriver ? "bandara" : "")
  const [jalurId, setJalurId] = useState(isDemoDriver ? "j1" : "")
  const [veh, setVeh] = useState("")
  const [dup, setDup] = useState(false)
  const [tried, setTried] = useState(false)

  // Ambil data master terkini dari Supabase
  useEffect(() => {
    getMasterData(isDemoDriver).then((m) => {
      setSegments(m.segments || [])
      if (m.segments?.length) {
        setSegmentId((prev) => m.segments.find((s) => s.id === prev)?.id || m.segments[0].id)
      } else {
        setSegmentId("")
      }
      setJalurList(m.jalurList || [])
      setVehicles(m.vehicles || [])
    })
  }, [isDemoDriver])

  const jalurOpts = useMemo(() => {
    const filtered = jalurList.filter(
      (j) => (j.segmentId === segmentId || (j as any).segmen_id === segmentId) && j.aktif,
    )
    return filtered.length > 0 ? filtered : jalurList.filter((j) => j.aktif)
  }, [jalurList, segmentId])

  useEffect(() => {
    if (jalurOpts.length > 0 && !jalurOpts.some((j) => j.id === jalurId)) {
      setJalurId(jalurOpts[0].id)
    }
  }, [jalurOpts, jalurId])

  const matchedVeh = useMemo(() => {
    if (!veh) return undefined
    const clean = veh.trim().toLowerCase()
    return vehicles.find((v) => {
      if (!v.aktif) return false
      const full = `${v.cb} · ${v.plat}`.toLowerCase()
      return (
        full === clean ||
        v.cb.toLowerCase() === clean ||
        v.plat.toLowerCase() === clean ||
        clean.includes(v.cb.toLowerCase())
      )
    })
  }, [vehicles, veh])

  const cb = matchedVeh?.cb

  const make = (): Departure => {
    const s = segments.find((x) => x.id === segmentId) || seg(segmentId)
    return {
      id: uid(),
      date,
      time,
      segmentId,
      jalurId,
      cb: cb || vehicles.find((v) => v.aktif)?.cb || "CB-1021",
      driver: currentDriver,
      kmTempuh: null,
      kmEmpty: null,
      penumpang: null,
      pm: null,
      pendapatan: s?.kontrak ? (s?.nilaiTetap || null) : null,
      subsidi: s?.kontrak ? 0 : null,
      bagasi: null,
      status: "draft",
    }
  }

  const submit = () => {
    setTried(true)
    if (!cb || !date || !time) return
    if (
      deps.some((d) => d.cb === cb && d.time === time && d.jalurId === jalurId && d.date === date)
    ) {
      return setDup(true)
    }
    onSave(make())
  }

  return (
    <>
      <TopBar title="Tambah Keberangkatan" onBack={onCancel} />
      <div className="space-y-5 px-5 py-6">
        <Field label="Nama sopir" locked>
          <input value={currentDriver} disabled className={inputCls()} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tanggal">
            <input
              type="date"
              value={date}
              min={todayReal}
              onChange={(e) => {
                const val = e.target.value
                if (val && val < todayReal) {
                  setDate(todayReal)
                } else {
                  setDate(val)
                }
              }}
              className={inputCls()}
            />
          </Field>
          <Field label="Jam berangkat">
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={cx(inputCls(), "num")}
            />
          </Field>
        </div>
        <Field label="Segmen">
          <select
            value={segmentId}
            onChange={(e) => {
              const newSegId = e.target.value
              setSegmentId(newSegId)
              const firstJal = jalurList.find(
                (j) => (j.segmentId === newSegId || (j as any).segmen_id === newSegId) && j.aktif,
              )
              if (firstJal) setJalurId(firstJal.id)
            }}
            className={cx(inputCls(), "bg-white")}
          >
            {segments
              .filter((s) => s.aktif)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Jalur">
          <select
            value={jalurId}
            onChange={(e) => setJalurId(e.target.value)}
            className={cx(inputCls(), "bg-white")}
          >
            {jalurOpts.map((j) => (
              <option key={j.id} value={j.id}>
                {j.nama}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Kendaraan"
          hint="Pilih nomor CB dan plat kendaraan"
          error={tried && !cb ? "Pilih kendaraan dari daftar" : undefined}
        >
          <select
            value={veh}
            onChange={(e) => setVeh(e.target.value)}
            className={cx(inputCls(tried && !cb), "bg-white")}
          >
            <option value="">-- Pilih Kendaraan (CB / Plat) --</option>
            {vehicles
              .filter((v) => v.aktif)
              .map((v) => (
                <option key={v.cb} value={`${v.cb} · ${v.plat}`}>
                  {v.cb} · {v.plat}
                </option>
              ))}
          </select>
        </Field>
        <div className="flex gap-3 pt-2">
          <Btn variant="outline" className="flex-1" onClick={onCancel}>
            Batal
          </Btn>
          <Btn className="h-12 flex-[2]" disabled={offline} onClick={submit}>
            Simpan
          </Btn>
        </div>
      </div>
      <Dialog
        open={dup}
        title="Data serupa sudah ada"
        onClose={() => setDup(false)}
        actions={
          <>
            <Btn variant="outline" onClick={() => setDup(false)}>
              Periksa
            </Btn>
            <Btn
              onClick={() => {
                setDup(false)
                onSave(make())
              }}
            >
              Tetap simpan
            </Btn>
          </>
        }
      >
        Kendaraan, jam, dan jalur sama dengan data yang ada pada tanggal ini.
        Lanjutkan atau periksa kembali?
      </Dialog>
    </>
  )
}
