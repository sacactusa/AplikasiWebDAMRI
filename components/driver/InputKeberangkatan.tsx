"use client"

import { useState } from "react"
import type { Departure } from "@/lib/data"
import { JALUR, ME, SEGMENTS, TODAY, VEHICLES, seg, uid } from "@/lib/data"
import { Btn, Dialog, Field, cx, inputCls } from "@/components/ui"
import { TopBar } from "./shared"

interface Props {
  deps: Departure[]
  offline: boolean
  onCancel: () => void
  onSave: (d: Departure) => void
}
export default function InputKeberangkatan({ deps, offline, onCancel, onSave }: Props) {
  const [date, setDate] = useState(TODAY)
  const [time, setTime] = useState("08:00")
  const [segmentId, setSegmentId] = useState("bandara")
  const [jalurId, setJalurId] = useState("j1")
  const [veh, setVeh] = useState("")
  const [dup, setDup] = useState(false)
  const [tried, setTried] = useState(false)
  const cb = VEHICLES.find((v) => v.aktif && `${v.cb} · ${v.plat}` === veh)?.cb
  const jalurOpts = JALUR.filter((j) => j.segmentId === segmentId && j.aktif)

  const make = (): Departure => ({
    id: uid(),
    date,
    time,
    segmentId,
    jalurId,
    cb: cb!,
    driver: ME,
    kmTempuh: null,
    kmEmpty: null,
    penumpang: null,
    pm: null,
    pendapatan: seg(segmentId).kontrak ? seg(segmentId).nilaiTetap! : null,
    subsidi: seg(segmentId).kontrak ? 0 : null,
    bagasi: null,
    status: "draft",
  })
  const submit = () => {
    setTried(true)
    if (!cb || !date || !time) return
    if (
      deps.some((d) => d.cb === cb && d.time === time && d.jalurId === jalurId)
    )
      return setDup(true)
    onSave(make())
  }

  return (
    <>
      <TopBar title="Tambah Keberangkatan" onBack={onCancel} />
      <div className="space-y-5 px-5 py-6">
        <Field label="Nama sopir" locked>
          <input value={ME} disabled className={inputCls()} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tanggal">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
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
              setSegmentId(e.target.value)
              setJalurId(JALUR.find((j) => j.segmentId === e.target.value)!.id)
            }}
            className={inputCls()}
          >
            {SEGMENTS.filter((s) => s.aktif).map((s) => (
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
            className={inputCls()}
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
          hint="Ketik nomor CB atau plat untuk mencari"
          error={tried && !cb ? "Pilih kendaraan dari daftar" : undefined}
        >
          <input
            list="veh"
            value={veh}
            onChange={(e) => setVeh(e.target.value)}
            placeholder="Cari CB / plat…"
            className={inputCls(tried && !cb)}
          />
          <datalist id="veh">
            {VEHICLES.filter((v) => v.aktif).map((v) => (
              <option key={v.cb} value={`${v.cb} · ${v.plat}`} />
            ))}
          </datalist>
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
        Kendaraan, jam, dan jalur sama dengan data yang ada. Lanjutkan atau
        periksa kembali?
      </Dialog>
    </>
  )
}
