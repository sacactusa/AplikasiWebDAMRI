"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { logAudit } from "@/lib/supabaseService"
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
  useEffect(() => {
    supabase.from("profiles").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      if (data && data.length > 0) {
        setUsers(
          data.map((p) => ({
            n: p.nama,
            e: p.email,
            p: p.role === "koordinator" ? "Koordinator/Admin" : "Sopir",
            a: p.aktif ?? true,
          }))
        )
      }
    })
  }, [])

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
                    onChange={async (e) => {
                      const newRoleText = e.target.value
                      const prevRole = u.p
                      const targetRole = newRoleText.includes("Koordinator") ? "koordinator" : "sopir"
                      setUsers((p) =>
                        p.map((x, k) =>
                          k === i ? { ...x, p: newRoleText } : x,
                        ),
                      )
                      try {
                        await supabase.from("profiles").update({ role: targetRole }).eq("email", u.e)
                        await logAudit({
                          user_nama: "Koordinator",
                          aksi: "Ubah",
                          tabel: "profiles",
                          objek: `peran · ${u.n} (${u.e})`,
                          sebelum: { peran: prevRole },
                          sesudah: { peran: newRoleText },
                        })
                      } catch (err) {
                        console.warn("Gagal sinkron peran akun ke Supabase:", err)
                      }
                    }}
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
                    onClick={async () => {
                      if (u.a) {
                        setDeactivateTarget({ n: u.n, e: u.e })
                      } else {
                        setUsers((p) => p.map((x, k) => (k === i ? { ...x, a: true } : x)))
                        toast(`Akun ${u.n} berhasil diaktifkan kembali`)
                        try {
                          await supabase.from("profiles").update({ aktif: true }).eq("email", u.e)
                          await logAudit({
                            user_nama: "Koordinator",
                            aksi: "Aktifkan",
                            tabel: "profiles",
                            objek: `akun · ${u.n} (${u.e})`,
                            sebelum: { aktif: false },
                            sesudah: { aktif: true },
                          })
                        } catch (err) {
                          console.warn("Gagal aktifkan akun di Supabase:", err)
                        }
                      }
                    }}
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
              onClick={async () => {
                setUsers((p) => [...p, { ...nu, a: true }])
                const targetRole = nu.p.includes("Koordinator") ? "koordinator" : "sopir"
                await supabase.auth.signUp({
                  email: nu.e.trim().toLowerCase(),
                  password: "damri" + Math.floor(1000 + Math.random() * 9000),
                  options: { data: { nama: nu.n.trim(), role: targetRole } }
                }).catch(() => {})
                await logAudit({
                  user_nama: "Koordinator",
                  aksi: "Tambah",
                  tabel: "profiles",
                  objek: `akun · ${nu.n} (${nu.e})`,
                  sebelum: {},
                  sesudah: { email: nu.e, peran: nu.p, aktif: true }
                })
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
              onClick={async () => {
                const targetEmail = reset
                setReset(null)
                toast("Tautan reset dikirim ke " + targetEmail)
                if (targetEmail) {
                  try {
                    await supabase.auth.resetPasswordForEmail(targetEmail).catch(() => {})
                  } catch {}
                }
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
              onClick={async () => {
                if (deactivateTarget) {
                  const target = deactivateTarget
                  setUsers((p) =>
                    p.map((x) =>
                      x.e === target.e ? { ...x, a: false } : x,
                    ),
                  )
                  toast(`Akun ${target.n} dinonaktifkan`)
                  try {
                    await supabase.from("profiles").update({ aktif: false }).eq("email", target.e)
                    await logAudit({
                      user_nama: "Koordinator",
                      aksi: "Nonaktifkan",
                      tabel: "profiles",
                      objek: `akun · ${target.n} (${target.e})`,
                      sebelum: { aktif: true },
                      sesudah: { aktif: false },
                    })
                  } catch (err) {
                    console.warn("Gagal nonaktifkan akun di Supabase:", err)
                  }
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

