-- Migration: Tambah kolom jarak (km_tempuh dan km_empty) pada tabel jalur
-- Jalur jarak kini disimpan di data master jalur sebagai nilai tetap

ALTER TABLE public.jalur 
ADD COLUMN IF NOT EXISTS km_tempuh NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS km_empty NUMERIC DEFAULT 0;

COMMENT ON COLUMN public.jalur.km_tempuh IS 'Jarak tempuh tetap untuk jalur (km)';
COMMENT ON COLUMN public.jalur.km_empty IS 'Jarak empty tetap untuk jalur (km, opsional)';
