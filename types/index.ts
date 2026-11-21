export type Status = 'draft' | 'dikirim' | 'disetujui' | 'perbaikan'

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
  isRevised?: boolean
  passengerCounts?: Record<string, number>
}

export type Role = 'sopir' | 'koordinator' | null

export interface Account {
  nama: string
  role: Exclude<Role, null>
  pw: string
}

