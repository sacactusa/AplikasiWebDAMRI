# DAMRI App (Next.js App Router)

Next.js + React 19 + TypeScript + Tailwind CSS v4 project for DAMRI operational tracking and verification.

## Development Server

To start the development server:
`npm run dev` (starts on `http://localhost:3000` or `$PORT`).

- Hot reload: Changes to source files are reflected immediately
- Production build: `npm run build`
- Production start: `npm run start`

## Project Structure

This project uses Next.js App Router with modular feature components:

- `app/layout.tsx` - Root layout with global metadata, HTML shell, and styles
- `app/page.tsx` - Primary application entry point (Client Component wrapper)
- `app/globals.css` - Global CSS entry point with Tailwind CSS v4 `@theme` and custom classes
- `components/App.tsx` - Main DAMRI stateful application controller
- `components/auth/`
  - `FormLogin.tsx` - Form login, pemilihan peran, dan pendaftaran koordinator
- `components/coordinator/`
  - `ArsipBackup.tsx` - Fitur arsip bulanan & riwayat backup
  - `VerifikasiKeberangkatan.tsx` - Fitur verifikasi & persetujuan perjalanan bus
  - `DashboardAnalitik.tsx` - Fitur visualisasi analitik & grafik produksi bus
  - `LaporanOperasional.tsx` - Fitur rekapitulasi laporan & ekspor Excel / AK 15
  - `MasterData.tsx` - Fitur kelola data master segmen, jalur, tarif, dan bus
  - `ManajemenAkun.tsx` - Fitur pengelolaan akun petugas & hak akses
  - `AuditLog.tsx` - Fitur riwayat aktivitas dan audit trail
  - `ProfilKoordinator.tsx` - Fitur profil koordinator & ubah kata sandi
  - `shared.tsx` - Komponen pembantu & shared table styling
- `components/driver/`
  - `DaftarKeberangkatan.tsx` - Daftar riwayat keberangkatan sopir
  - `InputKeberangkatan.tsx` - Formulir pencatatan keberangkatan baru
  - `DetailKeberangkatan.tsx` - Detail keberangkatan & koreksi data draft/revisi
  - `ProfilSopir.tsx` - Profil pengemudi bus & ganti kata sandi
  - `shared.tsx` - Komponen logo mark & header sopir
- `components/Coordinator.tsx` - Shell navigasi dashboard koordinator
- `components/Driver.tsx` - Shell navigasi sopir bus
- `components/ui.tsx` - Shared UI primitives (Btn, Dialog, Drawer, Field, NumInput, StatusBadge, etc.)
- `lib/data.ts` - Master dataset, calculations, mock seeds, and helper utilities
- `lib/supabase.ts` - Supabase client configuration
- `types/index.ts` - Shared TypeScript interfaces and types
- `public/assets/` - Static assets (`bus-damri-putih.jpg`, `logo-damri-full.png`, `logo-damri.png`)
- `package.json` - Project dependencies and Next.js scripts
- `next.config.ts` - Next.js configuration
- `postcss.config.mjs` - PostCSS configuration for `@tailwindcss/postcss`

## Dependencies

- Runtime: Next.js 16, React 19, React DOM 19, Recharts, Lucide React, Supabase JS
- Styling: Tailwind CSS v4 with `@tailwindcss/postcss`
- Build tooling: Next.js Turbopack, TypeScript 5.7
- Formatting: oxfmt
