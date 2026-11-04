"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { DRIVERS } from "@/lib/data"
import { Btn, Dialog, Field, cx, inputCls } from "@/components/ui"
import { Title, th, td, tableWrap } from "./shared"

interface Props {
  toast: (t: string) => void
}

export default function ManajemenAkun({ toast }: Props) {
  const [users, setUsers] = useState([
    {
      n: "Rina Marlina",
      e: "rina.marlina@damri.co.id",
      p: "Koordinator/Admin",
      a: true,
    },
    {
      n: "Budi Hartono",
      e: "budi.hartono@damri.co.id",
      p: "Koordinator/Admin",
      a: true,
    },
    ...DRIVERS.map((d) => ({
      n: d,
      e: d.toLowerCase().replace(" ", ".") + "@damri.co.id",
      p: "Sopir",
      a: true,
    })),
    {
      n: "Cecep Hidayat",
      e: "cecep.hidayat@damri.co.id",
      p: "Sopir",
      a: false,
    },
  ])
  const [add, setAdd] = useState(false)
  const [nu, setNu] = useState({ n: "", e: "", p: "Sopir" })
  const [reset, setReset] = useState<string | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<{
    n: string
    e: string
  } | null>(null)

  return (
    <>
      <Title
        sub="Peran dibatasi pada dua nilai: Sopir dan Koordinator/Admin."
        right={
          <Btn onClick={() => setAdd(true)}>
            <Plus size={16} /> Tambah akun
          </Btn>
        }
      >
        Akun
      </Title>
      <div className={tableWrap}>
        <table className="w-full min-w-[720px]">
          <thead className="border-b border-line bg-wash">
            <tr>
              {["Nama", "Email", "Peran", "Status", ""].map((h, i) => (
                <th key={i} className={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.e} className="border-b border-line last:border-0">
                <td className={cx(td, "font-medium")}>{u.n}</td>
                <td className={cx(td, "text-mute")}>{u.e}</td>
                <td className={td}>
                  <select
                    aria-label="Peran"
                    value={u.p}
                    onChange={(e) =>
                      setUsers((p) =>
                        p.map((x, k) =>
                          k === i ? { ...x, p: e.target.value } : x,
                        ),
                      )
                    }
                    className="h-9 rounded-md border border-line bg-white px-2 text-sm"
                  >
                    <option>Sopir</option>
                    <option>Koordinator/Admin</option>
                  </select>
                </td>
                <td className={td}>
                  <span
                    className={cx(
                      "rounded-full border px-2 py-0.5 text-xs font-semibold",
                      u.a
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-slate-100 text-slate-600",
                    )}
                  >
                    {u.a ? "Aktif" : "Nonaktif"}
                  </span>
                </td>
                <td className={cx(td, "whitespace-nowrap text-right")}>
                  <button
                    onClick={() => setReset(u.n)}
                    className="mr-3 text-sm font-semibold text-navy hover:underline"
                  >
                    Reset sandi
                  </button>
                  <button
                    onClick={() => { if (u.a) { setDeactivateTarget({ n: u.n, e: u.e }) } else { setUsers((p) => p.map((x, k) => (k === i ? { ...x, a: true } : x))); toast(`Akun ${u.n} berhasil diaktifkan kembali`) } }}
                    className={cx(
                      "text-sm font-semibold hover:underline",
                      u.a ? "text-red-700" : "text-emerald-700",
                    )}
                  >
                    {u.a ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog
        open={add}
        title="Tambah akun"
        onClose={() => setAdd(false)}
        actions={
          <>
            <Btn variant="outline" onClick={() => setAdd(false)}>
              Batal
            </Btn>
            <Btn
              disabled={!nu.n || !nu.e}
              onClick={() => {
                setUsers((p) => [...p, { ...nu, a: true }])
                setNu({ n: "", e: "", p: "Sopir" })
                setAdd(false)
                toast("Akun ditambahkan")
              }}
            >
              Simpan
            </Btn>
          </>
        }
      >
        <div className="space-y-3 text-ink">
          <Field label="Nama lengkap">
            <input
              value={nu.n}
              onChange={(e) => setNu({ ...nu, n: e.target.value })}
              className={inputCls()}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={nu.e}
              onChange={(e) => setNu({ ...nu, e: e.target.value })}
              className={inputCls()}
            />
          </Field>
          <Field label="Peran">
            <select
              value={nu.p}
              onChange={(e) => setNu({ ...nu, p: e.target.value })}
              className={inputCls()}
            >
              <option>Sopir</option>
              <option>Koordinator/Admin</option>
            </select>
          </Field>
        </div>
      </Dialog>
      <Dialog
        open={!!reset}
        title="Reset kata sandi?"
        onClose={() => setReset(null)}
        actions={
          <>
            <Btn variant="outline" onClick={() => setReset(null)}>
              Batal
            </Btn>
            <Btn
              onClick={() => {
                setReset(null)
                toast("Tautan reset dikirim ke " + reset)
              }}
            >
              Kirim tautan reset
            </Btn>
          </>
        }
      >
        Tautan untuk membuat kata sandi baru akan dikirim ke email {reset}.
      </Dialog>
      <Dialog
        open={!!deactivateTarget}
        danger
        title="Nonaktifkan akun?"
        onClose={() => setDeactivateTarget(null)}
        actions={
          <>
            <Btn variant="outline" onClick={() => setDeactivateTarget(null)}>
              Batal
            </Btn>
            <Btn
              variant="danger"
              onClick={() => {
                if (deactivateTarget) {
                  setUsers((p) =>
                    p.map((x) =>
                      x.e === deactivateTarget.e ? { ...x, a: false } : x,
                    ),
                  )
                  toast(`Akun ${deactivateTarget.n} dinonaktifkan`)
                  setDeactivateTarget(null)
                }
              }}
            >
              Ya, nonaktifkan
            </Btn>
          </>
        }
      >
        <p>
          Apakah Anda yakin ingin menonaktifkan akun{" "}
          <b className="font-semibold text-ink">{deactivateTarget?.n}</b>?
          Pengguna ini tidak akan dapat masuk atau mengakses sistem selama akun
          dinonaktifkan.
        </p>
      </Dialog>
    </>
  )
}

