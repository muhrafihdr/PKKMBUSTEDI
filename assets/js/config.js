/* ==========================================================================
   KONFIGURASI POLLING PKKMB USTEDI
   --------------------------------------------------------------------------
   >>> SATU-SATUNYA HAL YANG WAJIB KAMU UBAH: API_URL <<<

   Isi dengan URL Web App Google Apps Script yang berakhiran /exec.
   Lihat langkah lengkapnya di README.md atau apps-script/Code.gs.

   Kalau API_URL dibiarkan kosong (''), halaman tetap jalan dalam MODE DEMO
   dan jawaban hanya disimpan di browser (localStorage), TIDAK masuk ke
   Google Spreadsheet.
   ========================================================================== */

window.PKKMB_CONFIG = {
  /* contoh: 'https://script.google.com/macros/s/AKfycb...../exec' */
  API_URL: '',

  /* Nama spreadsheet tujuan (hanya untuk ditampilkan) */
  SPREADSHEET_URL:
    'https://docs.google.com/spreadsheets/d/1RlyXaOdp1IS5uY6aXhlIiycoJAd3uWVq8CRFCMorcNg/edit',

  /* Interval auto-refresh hasil (detik) */
  REFRESH_INTERVAL: 15,

  /* Judul saat dibagikan ke WhatsApp */
  SHARE_TEXT:
    'Aku baru isi polling PKKMB USTEDI nih! Kamu tahu USTEDI dari mana aja? Isi juga di sini:',

  /* ---------------------------------------------------------------
     Daftar pilihan sumber informasi.
     PENTING: kalau kamu ubah daftar ini, samakan juga dengan
     DEFAULT_OPTIONS di file apps-script/Code.gs
     --------------------------------------------------------------- */
  POLL_OPTIONS: [
    { value: 'Media Sosial',                    emoji: '📱' },
    { value: 'Teman / Sahabat',                 emoji: '🧑‍🤝‍🧑' },
    { value: 'Dosen / Guru',                    emoji: '👨‍🏫' },
    { value: 'Mitra Kampus / Sekolah',          emoji: '🏫' },
    { value: 'Saudara / Keluarga',              emoji: '👨‍👩‍👧' },
    { value: 'Alumni USTEDI',                   emoji: '🎓' },
    { value: 'Website Resmi USTEDI',            emoji: '🌐' },
    { value: 'Grup WhatsApp / Broadcast',       emoji: '💬' },
    { value: 'Pameran / Event Pendidikan',      emoji: '📢' },
    { value: 'Brosur / Spanduk / Baliho',       emoji: '📄' },
    { value: 'Instansi / Tempat Kerja',         emoji: '🏢' },
    { value: 'Lainnya',                         emoji: '✨' }
  ],

  /* Muncul kalau memilih "Media Sosial" */
  SOSMED_OPTIONS: [
    'Instagram', 'TikTok', 'Facebook', 'YouTube', 'X / Twitter', 'WhatsApp'
  ]
};
