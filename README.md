# Aplikasi Web Pencatatan dan Rekapitulasi Laporan Produksi Operasional Bus

Aplikasi web untuk membantu proses pencatatan, pengelolaan, dan rekapitulasi laporan produksi operasional bus pada Perum DAMRI Cabang Bandung.

## Teknologi yang Digunakan

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase (backend dan database)

## Fitur Aplikasi

### Sopir
- Login ke aplikasi.
- Menginput laporan produksi operasional bus.
- Melihat riwayat laporan yang telah dibuat.

### Koordinator Lapangan
- Melihat laporan produksi dari seluruh sopir.
- Memantau data produksi operasional.
- Melakukan penyaringan laporan berdasarkan periode.
- Melihat rekapitulasi laporan produksi.
- Mengekspor laporan ke format Excel.

## Instalasi dan Menjalankan Project

Pastikan Node.js sudah terpasang.

1. Clone repository:

```bash
git clone https://github.com/USERNAME/AplikasiWebDAMRI.git
```

2. Masuk ke folder project:

```bash
cd AplikasiWebDAMRI
```

3. Instal dependensi:

```bash
npm install
```

4. Jalankan aplikasi:

```bash
npm run dev
```

5. Buka `http://localhost:3000` di browser.

## Konfigurasi Environment

Buat file `.env.local` di root project dan isi variabel lingkungan sesuai konfigurasi project Supabase.

Jangan mengunggah file `.env.local` atau kredensial rahasia ke repository publik.

## Status Pengembangan

Project ini dikembangkan sebagai bagian dari Proyek Konsultasi Program Studi Teknik Komputer, Universitas Pendidikan Indonesia.