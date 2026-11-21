export type Status = 'draft' | 'dikirim' | 'disetujui'

export interface Segment {
  id: string
  nama: string
  kontrak: boolean
  nilaiTetap?: number
  aktif: boolean
  rawId?: string
}
export interface Jalur {
  id: string
  nama: string
  segmentId: string
  tarif: number
  aktif: boolean
  kmTempuh?: number | null
  kmEmpty?: number | null
}
export interface Vehicle {
  cb: string
  plat: string
  aktif: boolean
  rawId?: string
}
export interface JenisPenumpang {
  id: string
  nama: string
  aktif: boolean
  rawId?: string
}
export interface Departure {
  id: string
  date: string
  time: string
  segmentId: string
  jalurId: string
  jalurNama?: string
  cb: string
  driver: string
  driverId?: string
  driverEmail?: string
  kmTempuh: number | null
  kmEmpty: number | null
  penumpang: number | null
  pm: number | null
  pendapatan: number | null
  subsidi: number | null
  bagasi: number | null
  status: Status
  rejectNote?: string
  isNew?: boolean
  passengerCounts?: Record<string, number>
}

export const getTodayReal = () => {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const TODAY = getTodayReal()
export const ME = 'Asep Suryana'

export const SEGMENTS: Segment[] = [
  { id: 'bandara', nama: 'Bandara', kontrak: false, aktif: true },
  { id: 'akap', nama: 'Antar Kota', kontrak: false, aktif: true },
  { id: 'jemputan', nama: 'Jemputan', kontrak: true, nilaiTetap: 2750000, aktif: true },
  { id: 'borongan', nama: 'Borongan', kontrak: true, nilaiTetap: 4200000, aktif: true },
  { id: 'haji', nama: 'Haji', kontrak: true, nilaiTetap: 6500000, aktif: true },
]

export const JALUR: Jalur[] = [
  { id: 'j1', nama: 'Dipatiukur – Soekarno-Hatta', segmentId: 'bandara', tarif: 150000, aktif: true, kmTempuh: 165, kmEmpty: 5 },
  { id: 'j2', nama: 'Kota Baru Parahyangan – Soekarno-Hatta', segmentId: 'bandara', tarif: 160000, aktif: true, kmTempuh: 180, kmEmpty: 8 },
  { id: 'j3', nama: 'Cicaheum – Soekarno-Hatta', segmentId: 'bandara', tarif: 150000, aktif: true, kmTempuh: 170, kmEmpty: 5 },
  { id: 'j4', nama: 'Bandung – Garut', segmentId: 'akap', tarif: 55000, aktif: true, kmTempuh: 65, kmEmpty: 2 },
  { id: 'j5', nama: 'Bandung – Cirebon', segmentId: 'akap', tarif: 85000, aktif: true, kmTempuh: 130, kmEmpty: 4 },
  { id: 'j6', nama: 'Jemputan Karyawan Cimahi', segmentId: 'jemputan', tarif: 0, aktif: true, kmTempuh: 35, kmEmpty: 0 },
  { id: 'j7', nama: 'Borongan Wisata Lembang', segmentId: 'borongan', tarif: 0, aktif: true, kmTempuh: 40, kmEmpty: 0 },
  { id: 'j8', nama: 'Haji Embarkasi Bandung', segmentId: 'haji', tarif: 0, aktif: true, kmTempuh: 85, kmEmpty: 0 },
]

export const VEHICLES: Vehicle[] = [
  { cb: 'CB-1021', plat: 'D 7021 AB', aktif: true },
  { cb: 'CB-1034', plat: 'D 7034 AB', aktif: true },
  { cb: 'CB-1048', plat: 'D 7048 AC', aktif: true },
  { cb: 'CB-1055', plat: 'D 7055 AC', aktif: true },
  { cb: 'CB-1067', plat: 'D 7067 AD', aktif: true },
  { cb: 'CB-1072', plat: 'D 7072 AD', aktif: false },
]

export const JENIS_PENUMPANG: JenisPenumpang[] = [
  { id: 'umum', nama: 'Umum', aktif: true },
  { id: 'pm', nama: 'Pelajar / Mahasiswa (P/M)', aktif: true },
  { id: 'lansia', nama: 'Lansia / Disabilitas', aktif: true },
  { id: 'tni-polri', nama: 'TNI / Polri', aktif: false },
]

export const DRIVERS = ['Asep Suryana', 'Dedi Kurniawan', 'Hendra Gunawan', 'Yayan Sopian', 'Iwan Setiawan']

export const rupiah = (n: number | null | undefined) =>
  n == null ? '–' : 'Rp ' + Math.round(n).toLocaleString('id-ID')
export const nf = (n: number | null | undefined) => (n == null ? '–' : Math.round(n).toLocaleString('id-ID'))
export const fmtDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
export const seg = (id: string) => {
  const s = SEGMENTS.find((x) => x.id === id || (x as any).kode === id)
  if (s) return { ...s, nilaiTetap: s.nilaiTetap ?? 0 }
  if (!id) return { id: "bandara", nama: "Bandara", kontrak: false, nilaiTetap: 0, aktif: true }
  if (id === "bandara") return { id: "bandara", nama: "Bandara", kontrak: false, nilaiTetap: 0, aktif: true }
  if (id === "akap") return { id: "akap", nama: "Antar Kota", kontrak: false, nilaiTetap: 0, aktif: true }
  const pretty = id
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
  return {
    id,
    nama: pretty,
    kontrak: false,
    nilaiTetap: 0,
    aktif: true,
  }
}

export const jalur = (id: string) => {
  const j = JALUR.find((x) => x.id === id || x.nama === id)
  if (j) return { ...j, tarif: j.tarif ?? 0 }
  return {
    id: id || "j1",
    nama: id || "Jalur",
    segmentId: "bandara",
    tarif: 0,
    aktif: true,
  }
}
export const plat = (cb: string) => {
  const v = VEHICLES.find((x) => x.cb === cb || x.plat === cb)
  if (v) return v.plat
  return cb && !cb.startsWith("CB-") ? cb : ""
}

export function calc(d: Pick<Departure, 'segmentId' | 'jalurId' | 'penumpang' | 'pendapatan' | 'subsidi' | 'bagasi' | 'kmTempuh'> & Partial<Departure>) {
  const s = seg(d.segmentId)
  const tarif = jalur(d.jalurId)?.tarif ?? 0
  let rev = d.pendapatan
  if (rev == null) {
    if (s.kontrak) {
      rev = s.nilaiTetap ?? 0
    } else {
      const totalPnp = (d.penumpang ?? 0) + (d.pm ?? 0)
      rev = totalPnp * (tarif || 0)
    }
  }
  const umum = rev ?? 0
  const total = umum + (d.subsidi ?? 0) + (d.bagasi ?? 0)
  const km = (d.kmTempuh != null && Number(d.kmTempuh) > 0) ? Number(d.kmTempuh) : (jalur(d.jalurId)?.kmTempuh || 0)
  const upp = km ? total / km : 0
  return { tarif, umum, total, upp }
}

export function missing(d: Departure): string[] {
  const m: string[] = []
  if (d.penumpang == null) m.push('penumpang')
  if (d.pm == null) m.push('pm')
  return m
}

let n = 100
export const uid = () => 'd' + n++

const mk = (
  date: string,
  time: string,
  jalurId: string,
  cb: string,
  driver: string,
  status: Status,
  v: Partial<Departure> = {},
): Departure => ({
  id: uid(),
  date,
  time,
  segmentId: jalur(jalurId).segmentId,
  jalurId,
  cb,
  driver,
  kmTempuh: null,
  kmEmpty: null,
  penumpang: null,
  pm: null,
  pendapatan: null,
  subsidi: null,
  bagasi: null,
  status,
  ...v,
})
const full = (km: number, pax: number, j: string) => {
  const t = jalur(j).tarif
  const s = seg(jalur(j).segmentId)
  return {
    kmTempuh: km,
    kmEmpty: Math.round(km * 0.08),
    penumpang: pax,
    pm: Math.round(pax * 0.9),
    pendapatan: s.kontrak ? s.nilaiTetap! : pax * t,
    subsidi: 0,
    bagasi: pax * 2500,
  }
}

export const SEED: Departure[] = [
  mk(daysAgo(0), '05:30', 'j1', 'CB-1021', 'Asep Suryana', 'draft', { kmTempuh: 148 }),
  mk(daysAgo(1), '13:00', 'j2', 'CB-1034', 'Asep Suryana', 'draft', {
    ...full(152, 21, 'j2'),
    rejectNote: 'Jumlah penumpang tidak sesuai manifest (manifest 24 orang). Mohon periksa kembali dan kirim ulang.',
  }),
  mk(daysAgo(1), '08:15', 'j1', 'CB-1021', 'Asep Suryana', 'dikirim', full(148, 27, 'j1')),
  mk(daysAgo(0), '14:00', 'j3', 'CB-1048', 'Asep Suryana', 'disetujui', full(139, 30, 'j3')),
  mk(daysAgo(2), '06:00', 'j6', 'CB-1055', 'Asep Suryana', 'disetujui', full(62, 38, 'j6')),
  mk(daysAgo(3), '09:30', 'j4', 'CB-1067', 'Asep Suryana', 'disetujui', full(118, 33, 'j4')),
  mk(daysAgo(0), '06:10', 'j1', 'CB-1034', 'Dedi Kurniawan', 'dikirim', full(150, 29, 'j1')),
  mk(daysAgo(0), '07:45', 'j2', 'CB-1048', 'Hendra Gunawan', 'dikirim', full(153, 24, 'j2')),
  mk(daysAgo(0), '08:00', 'j5', 'CB-1067', 'Yayan Sopian', 'dikirim', full(262, 36, 'j5')),
  mk(daysAgo(1), '19:20', 'j3', 'CB-1055', 'Iwan Setiawan', 'dikirim', full(141, 31, 'j3')),
  mk(daysAgo(1), '10:30', 'j7', 'CB-1021', 'Dedi Kurniawan', 'dikirim', full(74, 41, 'j7')),
  mk(daysAgo(1), '04:50', 'j8', 'CB-1034', 'Hendra Gunawan', 'dikirim', full(96, 44, 'j8')),
  mk(daysAgo(2), '12:00', 'j1', 'CB-1067', 'Dedi Kurniawan', 'disetujui', full(147, 32, 'j1')),
  mk(daysAgo(2), '15:30', 'j2', 'CB-1021', 'Hendra Gunawan', 'disetujui', full(151, 26, 'j2')),
  mk(daysAgo(3), '07:00', 'j4', 'CB-1048', 'Yayan Sopian', 'disetujui', full(119, 29, 'j4')),
  mk(daysAgo(3), '11:15', 'j5', 'CB-1055', 'Iwan Setiawan', 'disetujui', full(260, 38, 'j5')),
  mk(daysAgo(4), '06:30', 'j1', 'CB-1034', 'Dedi Kurniawan', 'disetujui', full(149, 28, 'j1')),
  mk(daysAgo(4), '14:00', 'j3', 'CB-1067', 'Yayan Sopian', 'disetujui', full(140, 34, 'j3')),
  mk(daysAgo(5), '05:45', 'j6', 'CB-1055', 'Iwan Setiawan', 'disetujui', full(60, 36, 'j6')),
  mk(daysAgo(6), '09:00', 'j8', 'CB-1021', 'Hendra Gunawan', 'disetujui', full(98, 45, 'j8')),
  mk(daysAgo(6), '16:20', 'j2', 'CB-1048', 'Asep Suryana', 'disetujui', full(150, 25, 'j2')),
]

export const INCOMING: Departure[] = [
  mk(daysAgo(0), '09:05', 'j3', 'CB-1055', 'Iwan Setiawan', 'dikirim', full(142, 28, 'j3')),
  mk(daysAgo(0), '09:40', 'j1', 'CB-1021', 'Dedi Kurniawan', 'dikirim', full(149, 31, 'j1')),
  mk(daysAgo(0), '10:10', 'j4', 'CB-1067', 'Yayan Sopian', 'dikirim', full(117, 35, 'j4')),
]

export const AUDIT = [
  { t: '16 Okt 2026 09:12', u: 'Rina Marlina', a: 'Setujui', o: 'keberangkatan #d117', before: { status: 'dikirim' }, after: { status: 'disetujui' } },
  { t: '16 Okt 2026 08:47', u: 'Rina Marlina', a: 'Ubah', o: 'tarif · Dipatiukur – Soekarno-Hatta', before: { tarif: 'Rp 140.000', berlaku_mulai: '01 Jan 2026' }, after: { tarif: 'Rp 150.000', berlaku_mulai: '01 Okt 2026' } },
  { t: '15 Okt 2026 16:30', u: 'Rina Marlina', a: 'Tolak', o: 'keberangkatan #d101', before: { status: 'dikirim', penumpang: 21 }, after: { status: 'draft', catatan: 'Jumlah penumpang tidak sesuai manifest' } },
  { t: '15 Okt 2026 11:05', u: 'Budi Hartono', a: 'Tambah', o: 'akun · Iwan Setiawan', before: {}, after: { peran: 'Sopir', aktif: 'ya' } },
  { t: '14 Okt 2026 20:00', u: 'Sistem', a: 'Backup', o: 'database', before: {}, after: { status: 'Berhasil', ukuran: '48,2 MB' } },
  { t: '14 Okt 2026 10:21', u: 'Budi Hartono', a: 'Nonaktifkan', o: 'kendaraan · CB-1072', before: { aktif: 'ya' }, after: { aktif: 'tidak' } },
]
