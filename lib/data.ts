export type Status = 'draft' | 'dikirim' | 'disetujui'

export interface Segment {
  id: string
  nama: string
  kontrak: boolean
  nilaiTetap?: number
  aktif: boolean
}
export interface Jalur {
  id: string
  nama: string
  segmentId: string
  tarif: number
  aktif: boolean
}
export interface Vehicle {
  cb: string
  plat: string
  aktif: boolean
}
export interface Departure {
  id: string
  date: string
  time: string
  segmentId: string
  jalurId: string
  cb: string
  driver: string
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
}

export const TODAY = '2026-10-16'
export const ME = 'Asep Suryana'

export const SEGMENTS: Segment[] = [
  { id: 'bandara', nama: 'Bandara', kontrak: false, aktif: true },
  { id: 'akap', nama: 'Antar Kota', kontrak: false, aktif: true },
  { id: 'jemputan', nama: 'Jemputan', kontrak: true, nilaiTetap: 2750000, aktif: true },
  { id: 'borongan', nama: 'Borongan', kontrak: true, nilaiTetap: 4200000, aktif: true },
  { id: 'haji', nama: 'Haji', kontrak: true, nilaiTetap: 6500000, aktif: true },
]

export const JALUR: Jalur[] = [
  { id: 'j1', nama: 'Dipatiukur – Soekarno-Hatta', segmentId: 'bandara', tarif: 150000, aktif: true },
  { id: 'j2', nama: 'Kota Baru Parahyangan – Soekarno-Hatta', segmentId: 'bandara', tarif: 160000, aktif: true },
  { id: 'j3', nama: 'Cicaheum – Soekarno-Hatta', segmentId: 'bandara', tarif: 150000, aktif: true },
  { id: 'j4', nama: 'Bandung – Garut', segmentId: 'akap', tarif: 55000, aktif: true },
  { id: 'j5', nama: 'Bandung – Cirebon', segmentId: 'akap', tarif: 85000, aktif: true },
  { id: 'j6', nama: 'Jemputan Karyawan Cimahi', segmentId: 'jemputan', tarif: 0, aktif: true },
  { id: 'j7', nama: 'Borongan Wisata Lembang', segmentId: 'borongan', tarif: 0, aktif: true },
  { id: 'j8', nama: 'Haji Embarkasi Bandung', segmentId: 'haji', tarif: 0, aktif: true },
]

export const VEHICLES: Vehicle[] = [
  { cb: 'CB-1021', plat: 'D 7021 AB', aktif: true },
  { cb: 'CB-1034', plat: 'D 7034 AB', aktif: true },
  { cb: 'CB-1048', plat: 'D 7048 AC', aktif: true },
  { cb: 'CB-1055', plat: 'D 7055 AC', aktif: true },
  { cb: 'CB-1067', plat: 'D 7067 AD', aktif: true },
  { cb: 'CB-1072', plat: 'D 7072 AD', aktif: false },
]

export const DRIVERS = ['Asep Suryana', 'Dedi Kurniawan', 'Hendra Gunawan', 'Yayan Sopian', 'Iwan Setiawan']

export const rupiah = (n: number | null | undefined) =>
  n == null ? '–' : 'Rp ' + Math.round(n).toLocaleString('id-ID')
export const nf = (n: number | null | undefined) => (n == null ? '–' : Math.round(n).toLocaleString('id-ID'))
export const fmtDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
export const seg = (id: string) => SEGMENTS.find((s) => s.id === id)!
export const jalur = (id: string) => JALUR.find((j) => j.id === id)!
export const plat = (cb: string) => VEHICLES.find((v) => v.cb === cb)?.plat ?? ''

export function calc(d: Pick<Departure, 'segmentId' | 'jalurId' | 'penumpang' | 'pendapatan' | 'subsidi' | 'bagasi' | 'kmTempuh'>) {
  const s = seg(d.segmentId)
  const tarif = jalur(d.jalurId)?.tarif ?? 0
  const umum = s.kontrak ? s.nilaiTetap ?? 0 : (d.penumpang ?? 0) * tarif
  const total = (d.pendapatan ?? 0) + (d.subsidi ?? 0) + (d.bagasi ?? 0)
  const upp = d.kmTempuh ? total / d.kmTempuh : 0
  return { tarif, umum, total, upp }
}

export function missing(d: Departure): string[] {
  const m: string[] = []
  const s = seg(d.segmentId)
  if (d.kmTempuh == null) m.push('kmTempuh')
  if (d.kmEmpty == null) m.push('kmEmpty')
  if (d.penumpang == null) m.push('penumpang')
  if (d.pm == null) m.push('pm')
  if (!s.kontrak && d.pendapatan == null) m.push('pendapatan')
  if (!s.kontrak && d.subsidi == null) m.push('subsidi')
  if (d.bagasi == null) m.push('bagasi')
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
  mk('2026-10-16', '05:30', 'j1', 'CB-1021', 'Asep Suryana', 'draft', { kmTempuh: 148 }),
  mk('2026-10-15', '13:00', 'j2', 'CB-1034', 'Asep Suryana', 'draft', {
    ...full(152, 21, 'j2'),
    rejectNote: 'Jumlah penumpang tidak sesuai manifest (manifest 24 orang). Mohon periksa kembali dan kirim ulang.',
  }),
  mk('2026-10-15', '08:15', 'j1', 'CB-1021', 'Asep Suryana', 'dikirim', full(148, 27, 'j1')),
  mk('2026-10-14', '17:45', 'j3', 'CB-1048', 'Asep Suryana', 'disetujui', full(139, 30, 'j3')),
  mk('2026-10-14', '06:00', 'j6', 'CB-1055', 'Asep Suryana', 'disetujui', full(62, 38, 'j6')),
  mk('2026-10-13', '09:30', 'j4', 'CB-1067', 'Asep Suryana', 'disetujui', full(118, 33, 'j4')),
  mk('2026-10-16', '06:10', 'j1', 'CB-1034', 'Dedi Kurniawan', 'dikirim', full(150, 29, 'j1')),
  mk('2026-10-16', '07:45', 'j2', 'CB-1048', 'Hendra Gunawan', 'dikirim', full(153, 24, 'j2')),
  mk('2026-10-16', '08:00', 'j5', 'CB-1067', 'Yayan Sopian', 'dikirim', full(262, 36, 'j5')),
  mk('2026-10-15', '19:20', 'j3', 'CB-1055', 'Iwan Setiawan', 'dikirim', full(141, 31, 'j3')),
  mk('2026-10-15', '10:30', 'j7', 'CB-1021', 'Dedi Kurniawan', 'dikirim', full(74, 41, 'j7')),
  mk('2026-10-15', '04:50', 'j8', 'CB-1034', 'Hendra Gunawan', 'dikirim', full(96, 44, 'j8')),
  mk('2026-10-14', '12:00', 'j1', 'CB-1067', 'Dedi Kurniawan', 'disetujui', full(147, 32, 'j1')),
  mk('2026-10-14', '15:30', 'j2', 'CB-1021', 'Hendra Gunawan', 'disetujui', full(151, 26, 'j2')),
  mk('2026-10-13', '07:00', 'j4', 'CB-1048', 'Yayan Sopian', 'disetujui', full(119, 29, 'j4')),
  mk('2026-10-13', '11:15', 'j5', 'CB-1055', 'Iwan Setiawan', 'disetujui', full(260, 38, 'j5')),
  mk('2026-10-12', '06:30', 'j1', 'CB-1034', 'Dedi Kurniawan', 'disetujui', full(149, 28, 'j1')),
  mk('2026-10-12', '14:00', 'j3', 'CB-1067', 'Yayan Sopian', 'disetujui', full(140, 34, 'j3')),
  mk('2026-10-11', '05:45', 'j6', 'CB-1055', 'Iwan Setiawan', 'disetujui', full(60, 36, 'j6')),
  mk('2026-10-10', '09:00', 'j8', 'CB-1021', 'Hendra Gunawan', 'disetujui', full(98, 45, 'j8')),
  mk('2026-10-10', '16:20', 'j2', 'CB-1048', 'Asep Suryana', 'disetujui', full(150, 25, 'j2')),
]

export const INCOMING: Departure[] = [
  mk('2026-10-16', '09:05', 'j3', 'CB-1055', 'Iwan Setiawan', 'dikirim', full(142, 28, 'j3')),
  mk('2026-10-16', '09:40', 'j1', 'CB-1021', 'Dedi Kurniawan', 'dikirim', full(149, 31, 'j1')),
  mk('2026-10-16', '10:10', 'j4', 'CB-1067', 'Yayan Sopian', 'dikirim', full(117, 35, 'j4')),
]

export const AUDIT = [
  { t: '16 Okt 2026 09:12', u: 'Rina Marlina', a: 'Setujui', o: 'keberangkatan #d117', before: { status: 'dikirim' }, after: { status: 'disetujui' } },
  { t: '16 Okt 2026 08:47', u: 'Rina Marlina', a: 'Ubah', o: 'tarif · Dipatiukur – Soekarno-Hatta', before: { tarif: 'Rp 140.000', berlaku_mulai: '01 Jan 2026' }, after: { tarif: 'Rp 150.000', berlaku_mulai: '01 Okt 2026' } },
  { t: '15 Okt 2026 16:30', u: 'Rina Marlina', a: 'Tolak', o: 'keberangkatan #d101', before: { status: 'dikirim', penumpang: 21 }, after: { status: 'draft', catatan: 'Jumlah penumpang tidak sesuai manifest' } },
  { t: '15 Okt 2026 11:05', u: 'Budi Hartono', a: 'Tambah', o: 'akun · Iwan Setiawan', before: {}, after: { peran: 'Sopir', aktif: 'ya' } },
  { t: '14 Okt 2026 20:00', u: 'Sistem', a: 'Backup', o: 'database', before: {}, after: { status: 'Berhasil', ukuran: '48,2 MB' } },
  { t: '14 Okt 2026 10:21', u: 'Budi Hartono', a: 'Nonaktifkan', o: 'kendaraan · CB-1072', before: { aktif: 'ya' }, after: { aktif: 'tidak' } },
]
