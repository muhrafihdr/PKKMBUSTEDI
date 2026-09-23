/**
 * ============================================================================
 *  PKKMB USTEDI — BACKEND POLLING (Google Apps Script)
 * ============================================================================
 *
 *  Cara pakai (5 menit):
 *  1. Buka Google Spreadsheet:
 *     https://docs.google.com/spreadsheets/d/1RlyXaOdp1IS5uY6aXhlIiycoJAd3uWVq8CRFCMorcNg/edit
 *  2. Menu  Extensions / Ekstensi  →  Apps Script
 *  3. Hapus isi Code.gs, tempel SELURUH file ini, lalu Save (Ctrl/Cmd+S)
 *  4. Pilih fungsi `setup` di dropdown, klik Run, izinkan akses (Allow)
 *     → sheet "Respon" otomatis dibuat lengkap dengan header
 *  5. Klik  Deploy → New deployment → pilih type "Web app"
 *        Description   : Polling PKKMB USTEDI
 *        Execute as    : Me (akun kamu)
 *        Who has access: Anyone
 *     Klik Deploy → salin URL yang berakhiran /exec
 *  6. Tempel URL itu ke  assets/js/config.js  →  API_URL
 *
 *  Setiap kali kamu ubah file ini, lakukan:
 *     Deploy → Manage deployments → Edit (pensil) → Version: New version → Deploy
 * ============================================================================
 */

/* ============================== KONFIGURASI ============================== */

var SPREADSHEET_ID = '1RlyXaOdp1IS5uY6aXhlIiycoJAd3uWVq8CRFCMorcNg';
var SHEET_NAME     = 'Respon';

var HEADERS = [
  'Waktu',
  'Nama',
  'Asal Sekolah / Instansi',
  'Status',
  'Sumber Informasi',
  'Detail',
  'Halaman',
  'User Agent'
];

/** Harus sama urutannya dengan POLL_OPTIONS di assets/js/config.js */
var DEFAULT_OPTIONS = [
  'Media Sosial',
  'Teman / Sahabat',
  'Dosen / Guru',
  'Mitra Kampus / Sekolah',
  'Saudara / Keluarga',
  'Alumni USTEDI',
  'Website Resmi USTEDI',
  'Grup WhatsApp / Broadcast',
  'Pameran / Event Pendidikan',
  'Brosur / Spanduk / Baliho',
  'Instansi / Tempat Kerja',
  'Lainnya'
];

var CACHE_SECONDS = 10;

/* ============================== ENTRY POINTS ============================= */

/** Dipanggil dari browser (GET) — mendukung JSONP lewat parameter `callback`. */
function doGet(e) {
  var p = (e && e.parameter) || {};
  var action = (p.action || 'results').toLowerCase();

  try {
    if (action === 'submit') {
      return jsonOut(handleSubmit(p), p.callback);
    }
    return jsonOut(handleResults(), p.callback);
  } catch (err) {
    return jsonOut({ ok: false, error: String(err && err.message ? err.message : err) }, p.callback);
  }
}

/** Alternatif (POST) — body JSON, dipakai sebagai fallback tanpa CORS. */
function doPost(e) {
  var payload = {};
  try {
    payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    payload = (e && e.parameter) || {};
  }

  try {
    if ((payload.action || 'submit').toLowerCase() === 'results') {
      return jsonOut(handleResults());
    }
    return jsonOut(handleSubmit(payload));
  } catch (err) {
    return jsonOut({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

/* ============================== HANDLERS ================================= */

function handleSubmit(data) {
  var nama   = clean(data.nama, 80);
  var asal   = clean(data.asal, 120);
  var status = clean(data.status, 40);
  var sumber = clean(data.sumber, 60);
  var detail = clean(data.detail, 120);

  /* --- validasi --- */
  if (nama.length < 2)   return { ok: false, error: 'Nama wajib diisi (min. 2 karakter).' };
  if (asal.length < 2)   return { ok: false, error: 'Asal sekolah/instansi wajib diisi.' };
  if (!status)           return { ok: false, error: 'Status wajib dipilih.' };
  if (!sumber)           return { ok: false, error: 'Sumber informasi wajib dipilih.' };
  if (sumber !== 'Media Sosial' && sumber !== 'Lainnya') detail = detail || '';

  /* --- tulis ke spreadsheet (aman untuk submit bersamaan) --- */
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var sheet = getSheet();
    sheet.appendRow([
      new Date(),
      nama,
      asal,
      status,
      sumber,
      detail,
      clean(data.halaman, 200),
      clean(data.ua, 200)
    ]);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }

  /* paksa hasil selalu terbaru setelah submit */
  try { CacheService.getScriptCache().remove('results_v1'); } catch (e) {}

  var result = handleResults();
  result.submitted = true;
  return result;
}

function handleResults() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('results_v1');
  if (cached) {
    try { return JSON.parse(cached); } catch (e) {}
  }

  var sheet = getSheet();
  var lastRow = sheet.getLastRow();

  var data = [];
  if (lastRow > 1) {
    /* kolom E = Sumber Informasi (index 5), kolom F = Detail (index 6) */
    data = sheet.getRange(2, 5, lastRow - 1, 2).getValues();
  }

  var counts = {};
  var detailCounts = {};

  for (var i = 0; i < data.length; i++) {
    var sumber = String(data[i][0] || '').trim();
    var detail = String(data[i][1] || '').trim();
    if (!sumber) continue;
    counts[sumber] = (counts[sumber] || 0) + 1;
    if (sumber === 'Media Sosial' && detail) {
      detailCounts[detail] = (detailCounts[detail] || 0) + 1;
    }
  }

  var total = 0;
  Object.keys(counts).forEach(function (k) { total += counts[k]; });

  /* pastikan semua opsi tetap muncul walau 0 suara */
  DEFAULT_OPTIONS.forEach(function (o) {
    if (!(o in counts)) counts[o] = 0;
  });

  var results = Object.keys(counts).map(function (k) {
    return {
      label: k,
      count: counts[k],
      percent: total ? (counts[k] / total) * 100 : 0
    };
  }).sort(function (a, b) { return b.count - a.count || a.label.localeCompare(b.label); });

  var subresults = Object.keys(detailCounts).map(function (k) {
    return { label: k, count: detailCounts[k], percent: 0 };
  }).sort(function (a, b) { return b.count - a.count; });

  var subTotal = subresults.reduce(function (a, b) { return a + b.count; }, 0);
  subresults.forEach(function (s) { s.percent = subTotal ? (s.count / subTotal) * 100 : 0; });

  var out = {
    ok: true,
    total: total,
    results: results,
    subresults: subresults,
    updatedAt: new Date().toISOString(),
    options: DEFAULT_OPTIONS
  };

  try { cache.put('results_v1', JSON.stringify(out), CACHE_SECONDS); } catch (e) {}

  return out;
}

/* ============================== HELPERS ================================== */

function getSheet() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    styleHeader(sheet);
  }
  return sheet;
}

function styleHeader(sheet) {
  var range = sheet.getRange(1, 1, 1, HEADERS.length);
  range.setFontWeight('bold')
       .setBackground('#1d4ed8')
       .setFontColor('#ffffff')
       .setVerticalAlignment('middle');
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 160);
  sheet.setColumnWidth(2, 200);
  sheet.setColumnWidth(3, 220);
  sheet.setColumnWidth(4, 150);
  sheet.setColumnWidth(5, 190);
  sheet.setColumnWidth(6, 160);
}

function jsonOut(obj, callback) {
  var json = JSON.stringify(obj);
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function clean(value, max) {
  if (value === undefined || value === null) return '';
  var s = String(value).replace(/[\u0000-\u001F\u007F]/g, ' ').trim();
  if (max && s.length > max) s = s.substring(0, max);
  return s;
}

/* ============================== SETUP ==================================== */

/**
 * Jalankan SEKALI dari editor Apps Script.
 * Membuat sheet "Respon" + header + format.
 */
function setup() {
  var sheet = getSheet();
  styleHeader(sheet);
  SpreadsheetApp.getActive().toast('Sheet "Respon" siap digunakan ✅', 'PKKMB USTEDI', 5);
  Logger.log('Setup selesai. Sheet: ' + sheet.getName());
  return 'OK';
}

/** Menu bantuan di spreadsheet (opsional). */
function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('Polling PKKMB')
      .addItem('Setup sheet Respon', 'setup')
      .addItem('Buka URL Web App', 'showWebAppUrl')
      .addToUi();
  } catch (e) {}
}

function showWebAppUrl() {
  var url = ScriptApp.getService().getUrl();
  SpreadsheetApp.getUi().alert(
    'Tempel URL ini ke assets/js/config.js pada bagian API_URL:\n\n' + (url || '(belum di-deploy)')
  );
}

/** Utilitas: hapus cache hasil supaya angka langsung ter-refresh. */
function clearCache() {
  CacheService.getScriptCache().remove('results_v1');
  return 'cache dibersihkan';
}
