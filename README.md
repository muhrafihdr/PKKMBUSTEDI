# Polling PKKMB — USTEDI 🎓

Landing page polling **"Kamu Tahu USTEDI Dari Mana Aja?"** untuk
**Universitas Sains Teknologi Ekonomi Digital Indonesia**.

Semua jawaban otomatis tersimpan ke Google Spreadsheet dan hasilnya tampil
**live** di halaman (auto-refresh).

- 🔗 Repo: <https://github.com/muhrafihdr/PKKMBUSTEDI>
- 📊 Spreadsheet: [Google Sheets PKKMB](https://docs.google.com/spreadsheets/d/1RlyXaOdp1IS5uY6aXhlIiycoJAd3uWVq8CRFCMorcNg/edit)

---

## 📁 Struktur

```
├── index.html              # Landing page (hero, form polling, hasil live)
├── assets/
│   ├── css/style.css       # Semua styling (responsive, tanpa framework)
│   └── js/
│       ├── config.js       # ⚙️ KONFIGURASI — isi API_URL di sini
│       └── app.js          # Logika form, submit, grafik live
├── apps-script/Code.gs     # 🔌 Backend Google Apps Script (penerima data)
├── .nojekyll               # Agar GitHub Pages tidak memproses Jekyll
└── README.md
```

---

## 🚀 Bagian 1 — Sambungkan ke Google Spreadsheet

Landing page **tidak bisa** menulis langsung ke Google Sheets dari browser
(butuh login). Solusinya: **Google Apps Script** sebagai perantara gratis.

### Langkah-langkah

1. Buka spreadsheet-nya:
   <https://docs.google.com/spreadsheets/d/1RlyXaOdp1IS5uY6aXhlIiycoJAd3uWVq8CRFCMorcNg/edit>
2. Klik menu **Extensions → Apps Script**.
3. Hapus semua isi `Code.gs`, lalu **tempel seluruh isi** file
   [`apps-script/Code.gs`](apps-script/Code.gs) dari repo ini.
4. Simpan dengan `Ctrl/Cmd + S`.
5. Di dropdown fungsi, pilih **`setup`** → klik **Run**.
   - Muncul permintaan izin → **Review permissions** → pilih akun →
     **Advanced** → **Go to … (unsafe)** → **Allow**.
   - Sheet bernama **`Respon`** akan otomatis dibuat lengkap dengan header.
6. Klik **Deploy → New deployment**.
   - Klik ikon ⚙️ → pilih **Web app**
   - **Description**: `Polling PKKMB USTEDI`
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
   - Klik **Deploy**, lalu **salin URL** yang berakhiran `/exec`
     (bentuknya `https://script.google.com/macros/s/AKfycb.../exec`).
7. Buka `assets/js/config.js` dan tempel URL tersebut:

   ```js
   window.PKKMB_CONFIG = {
     API_URL: 'https://script.google.com/macros/s/AKfycb..../exec',
     ...
   };
   ```

8. Commit & push. Selesai! ✅

> **Penting:** setiap kali kamu mengubah `Code.gs`, lakukan
> **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**.
> Kalau tidak, perubahan tidak akan aktif.

### Cek backend berjalan

Buka URL `/exec?action=results` di browser. Kalau muncul JSON seperti
`{"ok":true,"total":0,...}` berarti backend sudah benar.

---

## 🌐 Bagian 2 — Deploy ke GitHub Pages

1. Push semua file ke repo `muhrafihdr/PKKMBUSTEDI` (branch `main`):

   ```bash
   git add .
   git commit -m "feat: landing page polling PKKMB USTEDI"
   git push origin main
   ```

2. Buka repo di GitHub → **Settings → Pages**.
3. Bagian **Build and deployment**:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` &nbsp;/&nbsp; folder `/ (root)`
   - Klik **Save**.
4. Tunggu ± 1 menit. Halaman akan live di:

   ```
   https://muhrafihdr.github.io/PKKMBUSTEDI/
   ```

Bagikan link itu (atau jadikan QR code) saat acara PKKMB berlangsung.

---

## ⚙️ Kustomisasi

Semua pengaturan ada di **`assets/js/config.js`**:

| Key                | Fungsi                                                  |
| ------------------ | ------------------------------------------------------- |
| `API_URL`          | URL Web App Apps Script. Kosong = **mode demo**.        |
| `REFRESH_INTERVAL` | Interval auto-refresh hasil (detik).                    |
| `SHARE_TEXT`       | Teks saat tombol "Bagikan ke WhatsApp" ditekan.         |
| `POLL_OPTIONS`     | Daftar pilihan sumber informasi (emoji + label).        |
| `SOSMED_OPTIONS`   | Pilihan platform saat memilih "Media Sosial".           |

> ⚠️ Kalau kamu mengubah `POLL_OPTIONS`, samakan juga
> `DEFAULT_OPTIONS` di `apps-script/Code.gs`.

### Pilihan polling saat ini

📱 Media Sosial · 🧑‍🤝‍🧑 Teman/Sahabat · 👨‍🏫 Dosen/Guru ·
🏫 Mitra Kampus/Sekolah · 👨‍👩‍👧 Saudara/Keluarga · 🎓 Alumni USTEDI ·
🌐 Website Resmi USTEDI · 💬 Grup WhatsApp/Broadcast ·
📢 Pameran/Event Pendidikan · 📄 Brosur/Spanduk/Baliho ·
🏢 Instansi/Tempat Kerja · ✨ Lainnya

---

## 🧪 Mode Demo

Kalau `API_URL` masih kosong, halaman tetap bisa dibuka dan dicoba.
Jawaban hanya disimpan di `localStorage` browser (tidak masuk spreadsheet),
dan muncul banner peringatan di atas halaman.

---

## 📋 Struktur Data di Spreadsheet

Sheet **`Respon`**:

| Waktu | Nama | Asal Sekolah / Instansi | Status | Sumber Informasi | Detail | Halaman | User Agent |
| ----- | ---- | ----------------------- | ------ | ---------------- | ------ | ------- | ---------- |

Kolom **Detail** diisi platform medsos (Instagram/TikTok/…) atau keterangan
tambahan bila memilih "Lainnya".

---

## 🛠️ Menjalankan secara lokal

```bash
python3 -m http.server 8080
# buka http://localhost:8080
```

Jangan buka `index.html` dengan klik dua kali (`file://`), karena request ke
Apps Script bisa diblokir browser.

---

## ❓ Troubleshooting

| Masalah | Solusi |
| ------- | ------ |
| Hasil tidak muncul / "Tidak bisa terhubung ke server" | Cek `API_URL` sudah diakhiri `/exec` dan deployment diset **Anyone**. |
| Data tidak masuk spreadsheet | Jalankan ulang **Deploy → New version**, dan pastikan fungsi `setup` sudah dijalankan. |
| Angka hasil terasa lambat | Ada cache 10 detik di backend. Jalankan fungsi `clearCache` bila perlu. |
| Perubahan `Code.gs` tidak berefek | Harus deploy **New version**, bukan sekadar Save. |
| Halaman 404 di GitHub Pages | Pastikan file `index.html` ada di root branch `main`. |

---

Dibuat untuk **PKKMB Universitas Sains Teknologi Ekonomi Digital Indonesia**.
