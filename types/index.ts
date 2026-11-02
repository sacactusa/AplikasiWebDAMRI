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

export type Role = 'sopir' | 'koordinator' | null

export interface Account {
  nama: string
  role: Exclude<Role, null>
  pw: string
}

