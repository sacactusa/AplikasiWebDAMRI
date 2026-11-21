/**
 * Helper untuk kompresi gambar profil sebelum disimpan ke Supabase database.
 * Mengubah foto resolusi tinggi/file kamera menjadi Base64 JPEG ringan (~20-40 KB)
 * sehingga dapat disimpan langsung ke kolom `foto_url` tabel `profiles`
 * dan langsung tersinkronisasi lintas peramban/perangkat tanpa kendala kuota/storage.
 */
export function compressImage(
  file: File,
  maxWidth = 360,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("Gagal membaca file gambar"))
    reader.onload = (e) => {
      const src = e.target?.result as string
      if (!src) {
        return reject(new Error("File gambar kosong"))
      }

      const img = new Image()
      img.onerror = () => reject(new Error("Gagal memuat gambar untuk dikompres"))
      img.onload = () => {
        let width = img.width
        let height = img.height

        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          } else {
            width = Math.round((width * maxWidth) / height)
            height = maxWidth
          }
        }

        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          resolve(src)
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        const compressed = canvas.toDataURL("image/jpeg", quality)
        resolve(compressed)
      }
      img.src = src
    }
    reader.readAsDataURL(file)
  })
}
