"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { logAudit } from "@/lib/supabaseService"
import { Plus, ChevronDown, KeyRound, UserX, UserCheck, Trash2 } from "lucide-react"
import { DRIVERS } from "@/lib/data"
import { Btn, Dialog, Field, cx, inputCls } from "@/components/ui"
import { Title, th, td, tableWrap } from "./shared"

interface Props {
  toast: (t: string) => void
  currentUser?: { nama: string; email: string; id?: string } | null
}

export default function ManajemenAkun({ toast, currentUser }: Props) {
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
  const [deleteTarget, setDeleteTarget] = useState<{
    n: string
    e: string
  } | null>(null)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

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
      <div className={cx(tableWrap, "min-h-[280px]")}>
        <table className="w-full min-w-[720px]">
          <thead className="border-b border-line bg-wash">
            <tr>
              <th className={th}>Nama</th>
              <th className={th}>Email</th>
              <th className={cx(th, "w-48")}>Peran</th>
              <th className={cx(th, "w-28")}>Status</th>
              <th className={cx(th.replace("text-left", ""), "w-28 text-center")}>Aksi</th>
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
                          user_nama: currentUser?.nama || "Koordinator",
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
                <td className={cx(td, "w-28")}>
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
                <td className={cx(td, "w-28 whitespace-nowrap text-center")}>
                  <div className="relative inline-block text-left">
                    <button
                      type="button"
                      onClick={() => setActiveMenu(activeMenu === u.e ? null : u.e)}
                      className={cx(
                        "inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-ink shadow-2xs transition-colors hover:bg-wash focus:outline-hidden",
                        activeMenu === u.e && "border-navy/30 bg-wash ring-1 ring-navy/20",
                      )}
                    >
                      <span>Aksi</span>
                      <ChevronDown
                        size={13}
                        className={cx(
                          "text-mute transition-transform duration-150",
                          activeMenu === u.e && "rotate-180",
                        )}
                      />
                    </button>
                    {activeMenu === u.e && (
                      <>
                        <div
                          className="fixed inset-0 z-20"
                          onClick={() => setActiveMenu(null)}
                        />
                        <div
                          className={cx(
                            "absolute right-0 z-30 w-44 rounded-xl border border-line bg-white py-1 shadow-lg ring-1 ring-black/5 animate-in fade-in-0 zoom-in-95",
                            i >= users.length - 2 ? "bottom-full mb-1" : "top-full mt-1",
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenu(null)
                              setReset(u.n)
                            }}
                            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-ink transition-colors hover:bg-slate-50"
                          >
                            <KeyRound size={14} className="shrink-0 text-navy" />
                            <span>Reset Sandi</span>
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              setActiveMenu(null)
                              if (u.a) {
                                setDeactivateTarget({ n: u.n, e: u.e })
                              } else {
                                setUsers((p) => p.map((x, k) => (k === i ? { ...x, a: true } : x)))
                                toast(`Akun ${u.n} berhasil diaktifkan kembali`)
                                try {
                                  await supabase.from("profiles").update({ aktif: true }).eq("email", u.e)
                                  await logAudit({
                                    user_nama: currentUser?.nama || "Koordinator",
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
                            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-ink transition-colors hover:bg-slate-50"
                          >
                            {u.a ? (
                              <>
                                <UserX size={14} className="shrink-0 text-amber-600" />
                                <span>Nonaktifkan</span>
                              </>
                            ) : (
                              <>
                                <UserCheck size={14} className="shrink-0 text-emerald-600" />
                                <span>Aktifkan</span>
                              </>
                            )}
                          </button>
                          <div className="my-1 border-t border-line/60" />
                          <button
                            type="button"
                            disabled={Boolean(currentUser?.email && u.e.toLowerCase() === currentUser.email.toLowerCase())}
                            onClick={() => {
                              setActiveMenu(null)
                              if (currentUser?.email && u.e.toLowerCase() === currentUser.email.toLowerCase()) {
                                toast("Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif.")
                                return
                              }
                              setDeleteTarget({ n: u.n, e: u.e })
                            }}
                            className={cx(
                              "flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium transition-colors",
                              currentUser?.email && u.e.toLowerCase() === currentUser.email.toLowerCase()
                                ? "cursor-not-allowed text-slate-300 opacity-50"
                                : "text-red-600 hover:bg-red-50",
                            )}
                            title={
                              currentUser?.email && u.e.toLowerCase() === currentUser.email.toLowerCase()
                                ? "Tidak dapat menghapus akun sendiri"
                                : "Hapus akun permanen"
                            }
                          >
                            <Trash2 size={14} className="shrink-0" />
                            <span>Hapus Akun</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
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
                  options: {
                    data: {
                      nama: nu.n.trim(),
                      role: targetRole,
                      kode: targetRole === "koordinator" ? "DAMRI-KOORD" : undefined,
                    },
                  },
                }).catch(() => {})
                await logAudit({
                  user_nama: currentUser?.nama || "Koordinator",
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
                      user_nama: currentUser?.nama || "Koordinator",
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
      <Dialog
        open={!!deleteTarget}
        danger
        title="Hapus akun pengguna?"
        onClose={() => setDeleteTarget(null)}
        actions={
          <>
            <Btn variant="outline" onClick={() => setDeleteTarget(null)}>
              Batal
            </Btn>
            <Btn
              variant="danger"
              onClick={async () => {
                if (deleteTarget) {
                  const target = deleteTarget
                  try {
                    const { error } = await supabase
                      .from("profiles")
                      .delete()
                      .eq("email", target.e)

                    if (error) {
                      if (error.code === "23503") {
                        toast(
                          `Gagal menghapus: Akun ${target.n} memiliki data operasional terkait. Silakan gunakan opsi 'Nonaktifkan'.`,
                        )
                      } else {
                        toast(`Gagal menghapus akun: ${error.message}`)
                      }
                      setDeleteTarget(null)
                      return
                    }

                    setUsers((p) => p.filter((x) => x.e !== target.e))
                    toast(`Akun ${target.n} berhasil dihapus permanen`)
                    await logAudit({
                      user_nama: currentUser?.nama || "Koordinator",
                      aksi: "Hapus",
                      tabel: "profiles",
                      objek: `akun · ${target.n} (${target.e})`,
                      sebelum: { nama: target.n, email: target.e },
                      sesudah: {},
                    })
                  } catch (err) {
                    console.warn("Gagal hapus akun di Supabase:", err)
                    setUsers((p) => p.filter((x) => x.e !== target.e))
                    toast(`Akun ${target.n} berhasil dihapus`)
                  }
                  setDeleteTarget(null)
                }
              }}
            >
              Ya, hapus permanen
            </Btn>
          </>
        }
      >
        <p>
          Apakah Anda yakin ingin menghapus akun{" "}
          <b className="font-semibold text-ink">{deleteTarget?.n}</b> (
          <span className="font-mono text-xs text-ink">{deleteTarget?.e}</span>)
          secara permanen?
        </p>
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
          <strong>Peringatan:</strong> Tindakan ini akan menghapus akun dan data
          profil pengguna secara permanen dari sistem dan tidak dapat
          dibatalkan. Jika pengguna hanya sementara tidak bertugas, Anda
          disarankan memilih opsi <em>Nonaktifkan</em>.
        </p>
      </Dialog>
    </>
  )
}

