import type { Diagnostic, Language, Severity } from './types'

let counter = 0
function makeId() {
  counter += 1
  return `dg-${Date.now().toString(36)}-${counter}`
}

/** Map an offset in the source to a 1-based line number. */
function lineOf(code: string, index: number): number {
  let line = 1
  for (let i = 0; i < index && i < code.length; i++) {
    if (code[i] === '\n') line++
  }
  return line
}

interface Rule {
  severity: Severity
  re: RegExp
  /** Bahasa yang dikenai aturan; kosong = berlaku untuk semua. */
  langs?: Language[]
  title: string
  detail: string
  fix: string
  fixCode?: (match: RegExpExecArray) => string
}

const JS: Language[] = ['javascript', 'typescript']

const RULES: Rule[] = [
  // ---------- Generic (semua bahasa) ----------
  {
    severity: 'critical',
    langs: [],
    re: /(password|passwd|pwd)\s*[:=]\s*["'][^"'\n]{3,}["']/i,
    title: 'Kredensial tertanam langsung di kode',
    detail:
      'Password atau kredensial ditulis langsung di source code. Kode yang di-commit bisa dibaca siapa saja dan kredensial akan bocor ke riwayat Git.',
    fix: 'Pindahkan ke environment variable (mis. process.env.APP_PASSWORD) atau secret manager, lalu rotate kredensial yang sudah terekspos.',
    fixCode: () => `const password = process.env.APP_PASSWORD;\n// Jangan pernah menaruh nilai asli di kode.`,
  },
  {
    severity: 'critical',
    langs: [],
    re: /(api[_-]?key|secret|token)\s*[:=]\s*["'][A-Za-z0-9_\-]{16,}["']/i,
    title: 'API key / secret tertanam di kode',
    detail:
      'Kunci API atau token terdeteksi sebagai string literal. Ini adalah penyebab #1 kebocoran kredensial di repositori publik.',
    fix: 'Simpan di environment variable atau file .env yang masuk .gitignore, lalu revoke dan ganti kunci yang sudah pernah di-commit.',
    fixCode: () => `const apiKey = process.env.API_KEY;\n// .env → API_KEY=... (jangan di-commit)`,
  },
  {
    severity: 'info',
    langs: [],
    re: /(TODO|FIXME|HACK|XXX)\b/i,
    title: 'Marker TODO / FIXME ditemukan',
    detail:
      'Ada tugas yang ditandai belum selesai di kode. Marker seperti ini sering terlupakan dan masuk ke produksi.',
    fix: 'Selesaikan tugasnya, atau pindahkan ke issue tracker dengan prioritas yang jelas sebelum rilis.',
  },

  // ---------- JavaScript / TypeScript ----------
  {
    severity: 'warning',
    langs: JS,
    re: /[^=!<>]\s*==\s*[^=]|[^=!]\s*!=\s*[^=]/,
    title: 'Perbandingan longgar (== / !=)',
    detail:
      'Operator == dan != melakukan coercion tipe yang sering menimbulkan hasil tak terduga: 0 == "" bernilai true, null == undefined bernilai true.',
    fix: 'Gunakan === dan !== untuk perbandingan ketat (strict equality) tanpa konversi tipe.',
  },
  {
    severity: 'warning',
    langs: JS,
    re: /\bvar\s+[A-Za-z_$]/,
    title: 'Deklarasi dengan var',
    detail:
      'var memiliki function scope dan terkena hoisting, sehingga mudah menimbulkan bug sulit dilacak di blok percabangan dan loop.',
    fix: 'Ganti var dengan const secara default; gunakan let hanya jika nilainya memang berubah.',
    fixCode: (m) => m[0].replace(/\bvar\b/, 'const'),
  },
  {
    severity: 'warning',
    langs: JS,
    re: /JSON\.parse\(/,
    title: 'JSON.parse tanpa try-catch',
    detail:
      'JSON.parse melempar SyntaxError jika input tidak valid. Tanpa try-catch, satu payload rusak bisa menghentikan seluruh alur program.',
    fix: 'Bungkus dengan try-catch dan sediakan nilai fallback saat parsing gagal.',
    fixCode: () =>
      `let data;\ntry {\n  data = JSON.parse(raw);\n} catch (err) {\n  console.error('JSON tidak valid:', err.message);\n  data = null; // fallback\n}`,
  },
  {
    severity: 'warning',
    langs: JS,
    re: /\.then\(/,
    title: 'Penggunaan .then — pastikan ada .catch',
    detail:
      'Rantai promise tanpa .catch membuat rejection "hilang" — error tidak pernah ditangani dan sering muncul sebagai UnhandledPromiseRejection di console.',
    fix: 'Tambahkan .catch di akhir rantai, atau gunakan async/await dengan try-catch.',
    fixCode: () => `fetch('/api/data')\n  .then((res) => res.json())\n  .then((data) => render(data))\n  .catch((err) => console.error('Request gagal:', err));`,
  },
  {
    severity: 'critical',
    langs: JS,
    re: /\beval\s*\(/,
    title: 'Penggunaan eval()',
    detail:
      'eval mengeksekusi string sebagai kode, membuka celah injeksi dan mematikan optimasi engine. Hampir selalu ada alternatif yang lebih aman.',
    fix: 'Gunakan JSON.parse untuk data, atau refactor agar tidak perlu eval sama sekali.',
  },
  {
    severity: 'warning',
    langs: JS,
    re: /innerHTML\s*=[^=]/,
    title: 'innerHTML dengan nilai dinamis',
    detail:
      'Menetapkan innerHTML dari nilai yang mengandung input pengguna membuka celah XSS (cross-site scripting).',
    fix: 'Gunakan textContent untuk teks polos, atau sanitize HTML dengan library seperti DOMPurify sebelum menyisipkannya.',
    fixCode: () => `el.textContent = userInput; // aman dari XSS`,
  },
  {
    severity: 'warning',
    langs: JS,
    re: /while\s*\(\s*true\s*\)(?![\s\S]{0,300}?\bbreak\b)/,
    title: 'Kemungkinan infinite loop',
    detail:
      'while (true) tanpa break terlihat di dalam bloknya. Loop tanpa kondisi keluar akan membekukan thread/browser.',
    fix: 'Pastikan ada kondisi break yang pasti tercapai, atau ubah menjadi loop dengan kondisi eksplisit.',
  },
  {
    severity: 'info',
    langs: JS,
    re: /console\.log\(/,
    title: 'console.log tersisa',
    detail: 'Statement debug tersisa di kode. Di produksi ini menambah noise log dan bisa membocorkan data sensitif.',
    fix: 'Ganti dengan logger terstruktur (pino/winston) dengan level log, atau hapus sebelum deploy.',
  },
  {
    severity: 'warning',
    langs: JS,
    re: /new Array\(/,
    title: 'new Array() ambigu',
    detail: 'new Array(3) membuat array berisi 3 slot kosong, bukan [3] — perilaku yang sering disalahpahami.',
    fix: 'Gunakan literal array [ ] untuk menghindari ambiguitas.',
    fixCode: (m) => m[0].replace(/new Array\((.*)\)/, '[$1]'),
  },

  // ---------- Python ----------
  {
    severity: 'warning',
    langs: ['python'],
    re: /except\s*:/,
    title: 'Bare except menelan semua error',
    detail:
      'except: tanpa tipe exception menangkap segalanya termasuk KeyboardInterrupt dan SystemExit, sehingga program sulit dihentikan dan error disamarkan.',
    fix: 'Tangkap exception spesifik, mis. except ValueError:, dan log errornya.',
    fixCode: () => `try:\n    ...\nexcept ValueError as e:\n    print(f'Input tidak valid: {e}')`,
  },
  {
    severity: 'critical',
    langs: ['python'],
    re: /def\s+\w+\s*\([^)]*=\s*(\[\]|\{\})/,
    title: 'Default argument mutable',
    detail:
      'Default [] atau {} dievaluasi SEKALI saat definisi fungsi, bukan setiap pemanggilan — nilai "kosong" itu terbagi dan terakumulasi antar-pemanggilan.',
    fix: 'Gunakan None sebagai default, lalu buat objek baru di dalam fungsi.',
    fixCode: () => `def tambah(item, daftar=None):\n    if daftar is None:\n        daftar = []\n    daftar.append(item)\n    return daftar`,
  },
  {
    severity: 'warning',
    langs: ['python'],
    re: /(==|!=)\s*(True|False|None)\b/,
    title: 'Perbandingan singleton dengan ==',
    detail:
      'True, False, dan None adalah singleton — bandingkan identitas dengan is, bukan ==. == None juga melewatkan __eq__ custom.',
    fix: 'Ganti == None menjadi is None, == True menjadi is True, dan seterusnya.',
  },
  {
    severity: 'warning',
    langs: ['python'],
    re: /\bopen\(/,
    title: 'File dibuka tanpa context manager',
    detail:
      'open() tanpa with bergantung pada GC untuk menutup file. Jika terjadi exception, file handle bocor dan file bisa terkunci.',
    fix: 'Gunakan with open(...) agar file SELALU tertutup, termasuk saat error.',
    fixCode: () => `with open('data.txt', 'r', encoding='utf-8') as f:\n    isi = f.read()`,
  },
  {
    severity: 'info',
    langs: ['python'],
    re: /^\s*print\(/m,
    title: 'print() debugging tersisa',
    detail: 'print() untuk debug sebaiknya tidak masuk produksi — gunakan modul logging dengan level.',
    fix: 'Ganti dengan logging.info(...) / logging.debug(...) agar bisa dikontrol lewat konfigurasi.',
  },

  // ---------- Java ----------
  {
    severity: 'critical',
    langs: ['java'],
    re: /String\s+(\w+)\s*=[^;\n]*"[^"]*"[^;\n]*;[\s\S]{0,600}?\b\1\s*==\s*"/,
    title: 'String dibandingkan dengan ==',
    detail:
      '== membandingkan referensi objek, bukan isi string. Dua string berisi "abc" bisa saja objek berbeda sehingga == mengembalikan false.',
    fix: 'Selalu gunakan equals() untuk membandingkan isi String.',
    fixCode: () => `if ("admin".equals(nama)) { ... } // konstan di depan: aman dari NPE`,
  },
  {
    severity: 'warning',
    langs: ['java'],
    re: /(?<![\w" ])(\w+)\.equals\(/,
    title: 'Pemanggilan equals berpotensi NullPointerException',
    detail:
      'Memanggil equals pada variabel yang bisa bernilai null melempar NullPointerException. Pola aman: letakkan konstanta di depan.',
    fix: 'Tulis "konstanta".equals(variabel) agar aman meski variabel bernilai null.',
  },
  {
    severity: 'warning',
    langs: ['java'],
    re: /catch\s*\(\s*Exception\s+\w+\s*\)/,
    title: 'catch (Exception) terlalu luas',
    detail: 'Menangkap Exception secara umum menyamarkan bug dan membuat recovery spesifik mustahil.',
    fix: 'Tangkap exception spesifik (IOException, SQLException, ...) dan tangani masing-masing dengan tepat.',
  },
  {
    severity: 'info',
    langs: ['java'],
    re: /System\.out\.println\(/,
    title: 'System.out.println di kode',
    detail: 'Gunakan framework logging (SLF4J/Log4j) agar level, format, dan tujuan log bisa dikonfigurasi.',
    fix: 'Ganti dengan logger.info(...) dari SLF4J/Log4j.',
  },

  // ---------- PHP ----------
  {
    severity: 'critical',
    langs: ['php'],
    re: /\bmysql_(query|connect|fetch)/,
    title: 'Ekstensi mysql_ sudah dihapus',
    detail:
      'Ekstensi mysql_ dihapus sejak PHP 7.0 dan rentan SQL injection karena tidak mendukung prepared statement.',
    fix: 'Migrasi ke PDO atau MySQLi dengan prepared statement.',
    fixCode: () => `$stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');\n$stmt->execute([$id]);`,
  },
  {
    severity: 'critical',
    langs: ['php'],
    re: /(SELECT|INSERT|UPDATE|DELETE)[^"']*?(\$_GET|\$_POST|\$_REQUEST)/i,
    title: 'SQL Injection: input langsung ke query',
    detail:
      'Variabel superglobal $_GET/$_POST disisipkan langsung ke query SQL. Penyerang bisa membaca, mengubah, atau menghapus seluruh database.',
    fix: 'Gunakan prepared statement dengan parameter terikat — JANGAN PERNAH menggabungkan input mentah ke SQL.',
  },
  {
    severity: 'warning',
    langs: ['php'],
    re: /echo\s+\$_(GET|POST|REQUEST|COOKIE)/,
    title: 'XSS: output superglobal tanpa escape',
    detail: 'Mencetak $_GET/$_POST mentah ke HTML memungkinkan penyerang menyuntikkan <script> lewat URL.',
    fix: 'Escape semua output dengan htmlspecialchars() sebelum dicetak ke halaman.',
    fixCode: () => `echo htmlspecialchars($_GET['q'] ?? '', ENT_QUOTES, 'UTF-8');`,
  },

  // ---------- SQL ----------
  {
    severity: 'critical',
    langs: ['sql'],
    re: /DELETE\s+FROM\s+\w+\s*;?\s*$/im,
    title: 'DELETE tanpa klausa WHERE',
    detail: 'DELETE tanpa WHERE menghapus SEMUA baris di tabel, dan operasi ini sering tidak bisa dibatalkan.',
    fix: 'Selalu sertakan WHERE, dan uji dulu dengan SELECT dengan kondisi yang sama.',
    fixCode: () => `-- Uji dulu:\nSELECT * FROM users WHERE created_at < '2024-01-01';\n-- Baru hapus:\nDELETE FROM users WHERE created_at < '2024-01-01';`,
  },
  {
    severity: 'critical',
    langs: ['sql'],
    re: /UPDATE\s+\w+\s+SET\s+[^;]*;?\s*$/im,
    title: 'UPDATE tanpa klausa WHERE',
    detail: 'UPDATE tanpa WHERE menimpa kolom yang ditentukan di SEMUA baris tabel.',
    fix: 'Selalu sertakan WHERE. Jalankan SELECT dengan kondisi identik untuk memverifikasi baris yang terkena.',
  },
  {
    severity: 'info',
    langs: ['sql'],
    re: /SELECT\s+\*/i,
    title: 'SELECT * tidak eksplisit',
    detail:
      'SELECT * mengambil semua kolom termasuk yang tidak dipakai — boros I/O dan bisa pecah saat skema berubah.',
    fix: 'Sebutkan kolom yang benar-benar dibutuhkan secara eksplisit.',
  },

  // ---------- C++ ----------
  {
    severity: 'critical',
    langs: ['cpp'],
    re: /\bgets\s*\(/,
    title: 'gets() — buffer overflow tak terhindarkan',
    detail: 'gets tidak memeriksa batas buffer dan telah DIHAPUS dari standar C11/C++14 karena tidak bisa dipakai dengan aman.',
    fix: 'Gunakan fgets(buffer, sizeof(buffer), stdin) sebagai pengganti.',
  },
  {
    severity: 'critical',
    langs: ['cpp'],
    re: /scanf\s*\(\s*"%s"/,
    title: 'scanf("%s") tanpa batas lebar',
    detail: '"%s" membaca tanpa batas, sehingga input yang lebih panjang dari buffer menimpa memori di stack.',
    fix: 'Batasi lebar field: scanf("%31s", nama) untuk buffer 32 byte.',
  },
  {
    severity: 'warning',
    langs: ['cpp'],
    re: /using\s+namespace\s+std\s*;/,
    title: 'using namespace std global',
    detail:
      'Mengimpor seluruh namespace std ke scope global menimbulkan konflik nama dan perilaku tak terduga di project besar.',
    fix: 'Gunakan std:: eksplisit, atau import terbatas di dalam fungsi.',
  },
  {
    severity: 'warning',
    langs: ['cpp'],
    re: /\bnew\s+[A-Za-z_]/,
    title: 'Alokasi new tanpa delete terlihat',
    detail:
      'new tanpa pasangan delete menyebabkan memory leak. Di C++ modern, ownership sebaiknya dipegang smart pointer.',
    fix: 'Gunakan std::unique_ptr / std::shared_ptr agar memori bebas otomatis.',
    fixCode: () => `auto data = std::make_unique<Buffer>(1024);`,
  },
  {
    severity: 'warning',
    langs: ['cpp'],
    re: /(float|double)\s+\w+[^;\n]*==\s*[^=]/,
    title: 'Membandingkan float dengan ==',
    detail:
      'Representasi biner floating-point tidak eksak — 0.1 + 0.2 != 0.3. Perbandingan == pada float hampir selalu salah.',
    fix: 'Bandingkan selisihnya dengan epsilon: fabs(a - b) < 1e-9.',
    fixCode: () => `bool sama = std::fabs(a - b) < 1e-9;`,
  },

  // ---------- HTML ----------
  {
    severity: 'warning',
    langs: ['html'],
    re: /<img\b(?![^>]*\balt=)[^>]*>/i,
    title: '<img> tanpa atribut alt',
    detail:
      'Tanpa alt, pembaca layar tidak bisa menjelaskan gambar dan gambar yang gagal dimuat tidak punya teks pengganti.',
    fix: 'Tambahkan atribut alt yang deskriptif, atau alt="" untuk gambar dekoratif.',
  },
  {
    severity: 'warning',
    langs: ['html'],
    re: /\son[a-z]+\s*=\s*["']/i,
    title: 'Event handler inline (onclick=...)',
    detail:
      'Handler inline mencampur logika JavaScript ke markup, sulit di-maintain, dan melanggar Content Security Policy ketat.',
    fix: 'Pindahkan ke addEventListener di file JavaScript terpisah.',
    fixCode: () => `document.querySelector('#btn').addEventListener('click', handleClick);`,
  },

  // ---------- CSS ----------
  {
    severity: 'warning',
    langs: ['css'],
    re: /!important/,
    title: 'Penggunaan !important',
    detail:
      '!important memutus rantai specificity dan membuat styling hampir mustahil ditimpa — utamanya menandakan masalah struktur CSS.',
    fix: 'Perbaiki specificity dengan struktur selector yang lebih baik, bukan memaksa dengan !important.',
  },
  {
    severity: 'info',
    langs: ['css'],
    re: /^\s*\*\s*\{/m,
    title: 'Universal selector *',
    detail: '* memilih semua elemen dan memaksa browser menghitung ulang style untuk seluruh dokumen.',
    fix: 'Targetkan elemen yang benar-benar perlu di-reset (body, h1, dll).',
  },
]

/** Deteksi duplikasi atribut id pada HTML. */
function findDuplicateIds(code: string, language: Language): Diagnostic[] {
  if (language !== 'html') return []
  const out: Diagnostic[] = []
  const seen = new Set<string>()
  const re = /\bid\s*=\s*["']([^"']+)["']/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(code))) {
    if (seen.has(m[1])) {
      out.push({
        id: makeId(),
        severity: 'warning',
        line: lineOf(code, m.index),
        title: `ID "${m[1]}" duplikat`,
        detail:
          'Atribut id harus unik per dokumen. Duplikat membuat getElementById, label for, dan anchor #id berperilaku tak terduga.',
        fix: 'Gunakan class untuk styling berulang, atau beri id yang unik untuk tiap elemen.',
        language,
      })
    } else {
      seen.add(m[1])
    }
  }
  return out
}

/** Deteksi pemanggilan fungsi JS yang tidak pernah dideklarasikan. */
function findUndeclaredCalls(code: string, language: Language): Diagnostic[] {
  if (language !== 'javascript' && language !== 'typescript') return []
  const out: Diagnostic[] = []
  const declared = new Set<string>()
  const declRe =
    /(?:\b(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)|\bfunction\s+([A-Za-z_$][\w$]*)|\(([A-Za-z_$][\w$]*(?:\s*,\s*[A-Za-z_$][\w$]*)*)\)\s*=>)/g
  let m: RegExpExecArray | null
  while ((m = declRe.exec(code))) {
    if (m[3]) m[3].split(',').forEach((p) => declared.add(p.trim()))
    else declared.add(m[1] ?? m[2])
  }
  const knownGlobals = new Set([
    'console', 'JSON', 'Math', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Promise',
    'fetch', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'parseInt', 'parseFloat',
    'isNaN', 'document', 'window', 'localStorage', 'sessionStorage', 'alert', 'require', 'process',
    'setImmediate', 'queueMicrotask', 'structuredClone', 'encodeURIComponent', 'decodeURIComponent',
    'Date', 'RegExp', 'Error', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Symbol', 'BigInt',
    'undefined', 'NaN', 'globalThis', 'TextEncoder', 'TextDecoder', 'URL', 'URLSearchParams',
    'Headers', 'Request', 'Response', 'FormData', 'FileReader', 'Image', 'Audio', 'Notification',
    'Intl', 'Proxy', 'Reflect', 'AbortController', 'customElements', 'navigator', 'location',
    'history', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'btoa', 'atob',
    'ArrayBuffer', 'Uint8Array', 'DataView', 'eval', 'setuid',
  ])
  const keywords = new Set([
    'if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'new', 'typeof', 'delete',
    'void', 'in', 'of', 'instanceof', 'do', 'else', 'case', 'throw', 'yield', 'await', 'async',
    'sizeof', 'printf', 'fprintf', 'sprintf', 'malloc', 'free', 'printf',
  ])
  const callRe = /(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(/g
  const reported = new Set<string>()
  while ((m = callRe.exec(code))) {
    const name = m[1]
    if (declared.has(name) || knownGlobals.has(name) || keywords.has(name) || reported.has(name)) continue
    reported.add(name)
    out.push({
      id: makeId(),
      severity: 'critical',
      line: lineOf(code, m.index),
      title: `Fungsi "${name}" dipanggil tetapi tidak dideklarasikan`,
      detail:
        'Identifier ini dipanggil seperti fungsi, tetapi tidak ada deklarasi const/let/var/function/class yang terlihat di kode. Runtime akan melempar ReferenceError ("X is not defined").',
      fix: 'Periksa ejaan nama fungsi, pastikan file/dependensi di-import dengan benar, atau tambahkan deklarasinya.',
      language,
    })
    if (out.length >= 5) break
  }
  return out
}

export function analyzeCode(code: string, language: Language): Diagnostic[] {
  if (!code.trim()) return []
  const results: Diagnostic[] = []

  for (const rule of RULES) {
    if (rule.langs && rule.langs.length > 0 && !rule.langs.includes(language)) continue
    const re = new RegExp(rule.re.source, rule.re.flags.includes('g') ? rule.re.flags : rule.re.flags + 'g')
    let m: RegExpExecArray | null
    let count = 0
    while ((m = re.exec(code)) && count < 3) {
      count++
      results.push({
        id: makeId(),
        severity: rule.severity,
        line: lineOf(code, m.index),
        title: rule.title,
        detail: rule.detail,
        fix: rule.fix,
        fixCode: rule.fixCode ? rule.fixCode(m) : undefined,
        language,
      })
      if (m.index === re.lastIndex) re.lastIndex++
    }
  }

  results.push(...findDuplicateIds(code, language))
  results.push(...findUndeclaredCalls(code, language))

  const order: Record<Severity, number> = { critical: 0, warning: 1, info: 2 }
  return results.sort((a, b) => order[a.severity] - order[b.severity] || a.line - b.line)
}

/** Skor kesehatan kode 0–100 berdasarkan temuan. */
export function healthScore(diagnostics: Diagnostic[]): number {
  if (diagnostics.length === 0) return 100
  const penalty = diagnostics.reduce(
    (sum, d) => sum + (d.severity === 'critical' ? 16 : d.severity === 'warning' ? 7 : 3),
    0,
  )
  return Math.max(0, Math.round(100 - penalty))
}
