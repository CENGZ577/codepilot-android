import type { AssistantReply } from './types'

interface KnowledgeEntry {
  /** Pola regex yang dicocokkan terhadap pesan pengguna (case-insensitive). */
  patterns: RegExp[]
  reply: AssistantReply
}

/**
 * Basis pengetahuan error — pesan error/stack trace populer
 * beserta penyebab dan perbaikannya.
 */
export const ERROR_KB: KnowledgeEntry[] = [
  {
    patterns: [/cannot read propert\w* of (undefined|null)/i, /reading '\w+' of/i],
    reply: {
      content:
        'Error "Cannot read properties of undefined/null" berarti kamu mengakses properti atau memanggil method pada nilai yang belum terinisialisasi. Penyebab paling umum:\n\n• Variabel hasil fetch/API belum dicek sebelum dipakai\n• Akses array/object bertingkat tanpa optional chaining\n• Fungsi async dipakai sebelum hasilnya siap',
      code: `// 1. Cek dulu, pakai kemudian\nif (user && user.profile) { ... }\n\n// 2. Atau optional chaining (paling ringkas)\nconst nama = user?.profile?.nama ?? 'Tamu';\n\n// 3. Untuk array dari API\nconst item = (data ?? [])[0]?.title;`,
      codeLang: 'javascript',
    },
  },
  {
    patterns: [/\bis not defined\b/i, /referenceerror/i],
    reply: {
      content:
        '"X is not defined" (ReferenceError) artinya JavaScript tidak menemukan variabel/ fungsi itu di scope manapun. Cek urutan berikut:\n\n1. Typo nama variabel (huruf besar/kecil berpengaruh)\n2. Deklarasi ada di file lain tapi lupa di-import\n3. Variabel dipakai sebelum dideklarasikan\n4. Variabel lokal dianggap global — scope-nya salah',
      code: `// Pastikan import-nya benar\nimport { hitungTotal } from './utils.js';\n\n// Cek penggunaan sebelum deklarasi\nconst total = hitungTotal(items); // setelah fungsi terdefinisi`,
      codeLang: 'javascript',
    },
  },
  {
    patterns: [/\bis not a function\b/i, /typeerror: .*not a function/i],
    reply: {
      content:
        '"X is not a function" berarti nilai yang kamu panggil bukanlah fungsi. Sering terjadi karena:\n\n• Default export vs named export keliru saat import\n• Variabel tertimpa nilai non-fungsi (mis. hasil fetch langsung dipanggil)\n• Kurung kurawal/kurung biasa tertukar saat destructuring',
      code: `// Salah: default export di-import sebagai named\nimport { myFunc } from './mod.js';  // ❌\nimport myFunc from './mod.js';       // ✅\n\n// Cek tipe sebelum memanggil\nif (typeof callback === 'function') callback();`,
      codeLang: 'javascript',
    },
  },
  {
    patterns: [/cannot find module|module not found|modulenotfounderror|no module named/i],
    reply: {
      content:
        'Error "module not found" berarti runtime tidak menemukan paket/file yang di-import. Urutan perbaikannya:\n\n1. Paket belum terinstall → jalankan npm/pip install\n2. Salah penulisan path relatif (./ vs ../)\n3. Di Node: package.json tidak punya "type": "module" tapi pakai import\n4. Python: nama modul salah atau virtualenv belum aktif',
      code: `# Node.js\nnpm install nama-paket\n# atau jika file lokal, cek path:\nimport utils from './utils.js';\n\n# Python\npip install nama-modul\npython -m pip install nama-modul`,
      codeLang: 'bash',
    },
  },
  {
    patterns: [/unexpected token|syntaxerror/i, /expected ['"]?[,;)}\]]/i],
    reply: {
      content:
        'SyntaxError berarti parser menemukan karakter yang tidak sesuai grammar bahasa. Tiga penyebab paling sering:\n\n• Kurung/kurawal tidak seimbang — hitung jumlah { } ( ) [ ]\n• Koma terakhir berlebih atau titik koma hilang di baris sebelumnya\n• String tidak tertutup — kutip pembuka tanpa penutup\n\nTips: error biasanya menunjuk BARIS SETELAH letak sebenarnya. Periksa 2–3 baris ke atas.',
      code: `// Contoh: koma berlebih di object (valid JS, tapi error di JSON)\nconst data = { a: 1, b: 2, };  // OK di JS\n// JSON.parse gagal jika ada trailing comma!`,
      codeLang: 'javascript',
    },
  },
  {
    patterns: [/nullpointerexception/i],
    reply: {
      content:
        'NullPointerException terjadi saat memanggil method/mengakses field pada referensi null di Java. Pola pencegahan standar:\n\n• Validasi input di boundary (controller/method publik)\n• Gunakan Objects.requireNonNull untuk parameter wajib\n• Balik equals: "konstanta".equals(variabel)\n• Pertimbangkan Optional<T> untuk nilai yang boleh kosong',
      code: `// 1. Guard clause\nif (user == null) throw new IllegalArgumentException("user wajib diisi");\n\n// 2. equals aman dari null\nif ("ADMIN".equals(user.getRole())) { ... }\n\n// 3. Optional untuk nilai boleh-kosong\nString nama = Optional.ofNullable(user)\n    .map(User::getProfile)\n    .map(Profile::getNama)\n    .orElse("Tamu");`,
      codeLang: 'java',
    },
  },
  {
    patterns: [/arrayindexoutofbounds|list index out of range|indexerror/i],
    reply: {
      content:
        'Index out of bounds berarti kamu mengakses posisi di luar ukuran array/list. Perbaikan umum:\n\n• Selalu cek batas: i >= 0 && i < arr.length sebelum akses\n• Loop sampai length-1, bukan length\n• Untuk akses "terakhir", gunakan arr[arr.length - 1] atau .at(-1)\n• Pertimbangkan koleksi dinamis (ArrayList, Python list) jika ukuran berubah',
      code: `// JavaScript: akses aman\nconst terakhir = arr.at(-1);\nif (i >= 0 && i < arr.length) { ... }\n\n// Python: tangkap atau cek\nif 0 <= i < len(data):\n    print(data[i])`,
      codeLang: 'javascript',
    },
  },
  {
    patterns: [/classnotfoundexception|noclassdeffounderror/i],
    reply: {
      content:
        'ClassNotFoundException / NoClassDefFoundError di Java berarti class tidak ada di classpath saat runtime. Penyebab umum:\n\n• Dependency belum masuk build (cek pom.xml / build.gradle)\n• Versi library bentrok setelah update\n• Class dihapus/dipindah tapi bytecode lama masih dipakai\n\nSolusi: jalankan clean build (mvn clean install / gradle clean build), lalu verifikasi dependency tree.',
      code: `# Maven\nmvn clean install\nmvn dependency:tree | grep nama-library\n\n# Gradle\n./gradlew clean build`,
      codeLang: 'bash',
    },
  },
  {
    patterns: [/keyerror/i],
    reply: {
      content:
        'KeyError di Python berarti key yang dicari tidak ada di dictionary. Tiga cara menanganinya:\n\n1. Cek keberadaan key dengan in\n2. Gunakan .get() dengan nilai default\n3. Untuk nested dict, gabungkan dengan .get() berantai atau try-except',
      code: `data = {'nama': 'Andi'}\n\n# Aman dengan default\numur = data.get('umur', 0)\n\n# Nested aman\ncity = data.get('alamat', {}).get('kota', 'Tidak diketahui')\n\n# Atau cek dulu\nif 'umur' in data:\n    print(data['umur'])`,
      codeLang: 'python',
    },
  },
  {
    patterns: [/invalid literal for int|valueerror/i],
    reply: {
      content:
        'ValueError berarti tipe datanya benar (string) tapi isinya tidak bisa diproses — mis. int("12a"). Pola aman untuk konversi input pengguna:\n\n• Strip spasi dulu, validasi format\n• Tangkap ValueError dengan try-except dan beri pesan ramah\n• Untuk float yang pakai koma Indonesia, ganti koma jadi titik',
      code: `raw = input("Umur: ").strip()\ntry:\n    umur = int(raw)\nexcept ValueError:\n    print("Umur harus berupa angka")\n\n# Float format Indonesia\nharga = float("15.500,50".replace('.', '').replace(',', '.'))`,
      codeLang: 'python',
    },
  },
  {
    patterns: [/indentationerror|expected an indented block|unexpected indent/i],
    reply: {
      content:
        'Indentasi Python menentukan blok kode — tidak seperti bahasa lain yang pakai kurung kurawal. Error ini berarti blok setelah if/for/def/try tidak menjorok.\n\n• Satu blok harus konsisten: disarankan 4 spasi per level (bukan tab)\n• Jangan campur spasi dan tab\n• Baris setelah : wajib menjorok, kecuali struktur satu baris',
      code: `def hitung(a, b):\n    total = a + b        # 4 spasi\n    if total > 10:\n        return total     # 8 spasi\n    return 0`,
      codeLang: 'python',
    },
  },
  {
    patterns: [/cors|access-control-allow-origin/i],
    reply: {
      content:
        'Error CORS (Cross-Origin Resource Sharing) terjadi karena browser memblokir response dari origin berbeda. Yang perlu dipahami:\n\n• CORS adalah keamanan BROWSER — backend harus mengizinkan origin kamu lewat header\n• Jangan pernah "memperbaiki" dengan mode: \'no-cors\' — response tetap tidak terbaca\n• Dev saja: proxy Vite / extension; Produksi: set header di server',
      code: `// Express.js — contoh header yang benar\napp.use((req, res, next) => {\n  res.header('Access-Control-Allow-Origin', 'https://appkamu.com');\n  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');\n  next();\n});`,
      codeLang: 'javascript',
    },
  },
  {
    patterns: [/econnrefused|connection refused/i],
    reply: {
      content:
        'ECONNREFUSED berarti koneksi ditolak — tidak ada yang mendengarkan di host:port tujuan. Checklist:\n\n1. Service-nya jalan? (database, API server)\n2. Port benar? (8080 vs 3000 vs 5432)\n3. Binding address — cek apakah server listen di 127.0.0.1 vs 0.0.0.0 (penting di Docker)\n4. Firewall/security group membuka portnya?',
      code: `# Cek apa yang listen di port\ncurl -v http://localhost:3000\nss -tlnp | grep 3000   # Linux\nlsof -i :3000          # macOS`,
      codeLang: 'bash',
    },
  },
  {
    patterns: [/etimedout|timeout|request timed out/i],
    reply: {
      content:
        'Timeout berarti request terkirim tapi tidak ada respons dalam batas waktu. Penyebab umum:\n\n• Query database lambat — cek dengan EXPLAIN\n• API eksternal lambat — tambahkan timeout eksplisit + retry\n• Event loop JS macet (blocking operation)\n• Koneksi pool habis — semua koneksi tertahan',
      code: `// Timeout eksplisit + retry di JavaScript\nconst controller = new AbortController();\nconst timer = setTimeout(() => controller.abort(), 5000);\ntry {\n  const res = await fetch(url, { signal: controller.signal });\n  clearTimeout(timer);\n  return await res.json();\n} catch (err) {\n  if (err.name === 'AbortError') throw new Error('Request timeout');\n  throw err;\n}`,
      codeLang: 'javascript',
    },
  },
  {
    patterns: [/maximum call stack size exceeded|stack overflow|recursion/i],
    reply: {
      content:
        '"Maximum call stack size exceeded" berarti rekursi tidak pernah berhenti. Penyebab:\n\n• Tidak ada base case, atau base case tidak pernah tercapai\n• Rekursi memanggil dirinya dengan data yang tidak mengecil\n• Di React: setState di render tanpa kondisi → render → setState → ...',
      code: `// Rekursi benar: base case + data mengecil\nfunction faktorial(n) {\n  if (n <= 1) return 1;      // base case\n  return n * faktorial(n - 1); // menuju base case\n}\n\n// React: lindungi setState dengan kondisi\nuseEffect(() => {\n  if (!data) fetchData();\n}, [data]);`,
      codeLang: 'javascript',
    },
  },
  {
    patterns: [/assignment to constant variable|cannot assign to/i],
    reply: {
      content:
        '"Assignment to constant variable" artinya kamu mencoba menimpa nilai const. const tidak berarti "immutable mendalam" — objek/array di dalamnya masih bisa dimutasi.',
      code: `const user = { nama: 'Andi' };\nuser.nama = 'Budi';   // ✅ mutasi properti OK\nuser = { nama: 'Caca' }; // ❌ TypeError\n\n// Jika memang perlu reassignment:\nlet user = { nama: 'Andi' };\nuser = { nama: 'Caca' };  // ✅`,
      codeLang: 'javascript',
    },
  },
  {
    patterns: [/unexpected end of json|json\.parse|invalid json/i],
    reply: {
      content:
        '"Unexpected end of JSON input" berarti JSON.parse menerima string kosong atau terpotong. Sering terjadi saat:\n\n• Response bukan JSON (error page HTML, redirect) — cek res.status dan content-type dulu\n• String terpotong saat penyimpanan\n• Trailing comma di object JSON (tidak boleh, beda dengan JS)',
      code: `const res = await fetch('/api/data');\nif (!res.ok) throw new Error('HTTP ' + res.status);\n\nconst text = await res.text();\ntry {\n  return JSON.parse(text);\n} catch {\n  console.error('Bukan JSON:', text.slice(0, 100));\n  return null;\n}`,
      codeLang: 'javascript',
    },
  },
  {
    patterns: [/segmentation fault|segfault|core dumped/i],
    reply: {
      content:
        'Segmentation fault = program C/C++ mengakses memori yang bukan haknya. Strategi debugging:\n\n• Compile dengan -g lalu jalankan di gdb untuk stack trace\n• Cek akses array di luar batas dan pointer null/dangling\n• Gunakan sanitizers — mereka menunjukkan baris persisnya\n• Valgrind untuk deteksi memory error runtime',
      code: `# Compile dengan simbol debug + sanitizer\ng++ -g -fsanitize=address main.cpp -o main\n./main\n\n# GDB\ngdb ./main\n(gdb) run\n(gdb) backtrace`,
      codeLang: 'bash',
    },
  },
  {
    patterns: [/undefined reference to/i],
    reply: {
      content:
        '"Undefined reference to X" adalah error LINKER (bukan compiler): deklarasi X ada, definisinya tidak. Penyebab:\n\n• Fungsi dideklarasikan tapi tidak pernah didefinisikan\n• File .cpp tidak ikut dikompilasi/link\n• Urutan library di command line salah — library harus SETELAH object yang menggunakannya',
      code: `g++ main.cpp utils.cpp -o app   # utils.cpp wajib ikut!\n\n# Atau pisah compile & link:\ng++ -c main.cpp\ng++ -c utils.cpp\ng++ main.o utils.o -o app`,
      codeLang: 'bash',
    },
  },
  {
    patterns: [/sqlstate|fatal error.*(mysqli|pdo)|call to (undefined function|a member function)/i],
    reply: {
      content:
        'Error PHP database umumnya jatuh ke tiga kategori:\n\n• SQLSTATE/HY000 → kredensial, host, atau nama database salah\n• "Call to a member function on null" → $pdo/query mengembalikan null, biasanya koneksi gagal diam-diam\n• Call to undefined function mysqli_ → ekstensi belum aktif di php.ini',
      code: `// Selalu aktifkan error reporting saat dev\nini_set('display_errors', 1);\nerror_reporting(E_ALL);\n\n// Cek koneksi secara eksplisit\ntry {\n  $pdo = new PDO($dsn, $user, $pass, [\n    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,\n  ]);\n} catch (PDOException $e) {\n  die('Koneksi gagal: ' . $e->getMessage());\n}`,
      codeLang: 'php',
    },
  },
  {
    patterns: [/403|forbidden/i],
    reply: {
      content:
        'HTTP 403 Forbidden = server mengerti request tapi menolak mengizinkannya. Bedakan dengan 401 (belum login):\n\n• Cek token/kredensial yang dikirim masih valid dan tidak kedaluwarsa\n• Peran/permission akun tidak cukup untuk resource itu\n• Token benar formatnya? ("Bearer " jangan sampai dobel)\n• IP/environment dibatasi (allowlist)?',
      code: `const res = await fetch('/api/admin', {\n  headers: {\n    Authorization: 'Bearer ' + token, // satu kali "Bearer "\n  },\n});\nif (res.status === 403) {\n  console.error('Akses ditolak — cek permission akun');\n}`,
      codeLang: 'javascript',
    },
  },
  {
    patterns: [/404|not found/i],
    reply: {
      content:
        'HTTP 404 = resource tidak ditemukan di server. Untuk API dan routing SPA:\n\n• Periksa URL: trailing slash, versi endpoint (/v1), typo path\n• Route backend benar-benar terdaftar?\n• SPA: pastikan fallback ke index.html untuk client-side routing\n• Cek apakah id/nilai di path valid, bukan "undefined"',
      code: `# Nginx — SPA fallback\nlocation / {\n  try_files $uri /index.html;\n}\n\n// Debug: cetak URL yang sebenarnya terkirim\nconsole.log('GET', url); // sering ada undefined di sini!`,
      codeLang: 'bash',
    },
  },
  {
    patterns: [/500|internal server error/i],
    reply: {
      content:
        'HTTP 500 = server melempar exception yang tidak tertangani. Langkah sistematis:\n\n1. Baca log server — stack trace ada di sana, bukan di browser\n2. Reproduksi dengan payload minimal untuk isolasi\n3. Tambahkan error handling + logging di endpoint yang bermasalah\n4. Cek dependensi eksternal (database, cache) yang dipanggil endpoint itu',
      code: `# Lihat log\n tail -f /var/log/nginx/error.log\ntail -f storage/logs/laravel.log\n\n# Express — tangkap dengan middleware\app.use((err, req, res, next) => {\n  console.error(err.stack);\n  res.status(500).json({ error: 'Terjadi kesalahan server' });\n});`,
      codeLang: 'bash',
    },
  },
  {
    patterns: [/npm err|npm error/i],
    reply: {
      content:
        'Error npm umumnya salah satu dari ini:\n\n• ERESOLVE → konflik versi dependency; coba npm install --legacy-peer-deps\n• EACCES → permission; jangan pakai sudo — perbaiki ownership direktori npm\n• Cache korup → npm cache clean --force lalu install ulang\n• Node versi lama → cek dengan node -v, upgrade ke LTS',
      code: `npm cache clean --force\nrm -rf node_modules package-lock.json\nnpm install\n\n# Konflik versi peer dependency\nnpm install --legacy-peer-deps`,
      codeLang: 'bash',
    },
  },
]

/**
 * Basis pengetahuan how-to — jawaban untuk pertanyaan coding populer.
 */
export const HOWTO_KB: KnowledgeEntry[] = [
  {
    patterns: [/debounce/i],
    reply: {
      content:
        'Debounce memastikan fungsi hanya jalan SETELAH user berhenti mengetik/melakukan aksi selama jeda tertentu — standar untuk search box dan resize handler.',
      code: `function debounce(fn, delay = 300) {\n  let timer;\n  return (...args) => {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), delay);\n  };\n}\n\nconst cari = debounce((q) => fetchResult(q), 400);\ninput.addEventListener('input', (e) => cari(e.target.value));`,
      codeLang: 'javascript',
    },
  },
  {
    patterns: [/reverse|membalik (string|array)|string terbalik/i],
    reply: {
      content:
        'Cara membalik string/array di berbagai bahasa:',
      code: `// JavaScript\nconst balik = s => [...s].reverse().join('');\n\n// Python (paling idiomatis)\n'hello'[::-1]   # 'olleh'\n\n// Java\nStringBuilder("hello").reverse().toString();\n\n// PHP\nstrrev("hello");`,
      codeLang: 'javascript',
    },
  },
  {
    patterns: [/async|await|promise/i],
    reply: {
      content:
        'async/await adalah cara menulis kode asynchronous yang terlihat sinkron. Aturan mainnya:\n\n• await hanya valid di dalam fungsi async\n• try-catch menangkap error sama seperti kode sinkron\n• Jalankan promise independen secara paralel dengan Promise.all',
      code: `async function muatDashboard() {\n  try {\n    const [user, notif] = await Promise.all([\n      fetch('/api/user').then(r => r.json()),\n      fetch('/api/notif').then(r => r.json()),\n    ]);\n    render(user, notif);\n  } catch (err) {\n    console.error('Gagal memuat:', err);\n  }\n}`,
      codeLang: 'javascript',
    },
  },
  {
    patterns: [/remove duplicate|menghapus duplikat|unik/i],
    reply: {
      content: 'Menghapus nilai duplikat dari array/list:',
      code: `// JavaScript — Set paling cepat\nconst unik = [...new Set(angka)];\n\n// Array of object: dedupe by key\nconst unikById = [...new Map(data.map(d => [d.id, d])).values()];\n\n// Python\nlist(dict.fromkeys(angka))   # pertahankan urutan`,
      codeLang: 'javascript',
    },
  },
  {
    patterns: [/sort|mengurutkan/i],
    reply: {
      content:
        'Pengurutan yang benar perhatikan dua hal: komparator harus mengembalikan angka (negatif/0/positif), dan di JS default sort adalah lexicographic — angka 10 akan dianggap lebih kecil dari 9!',
      code: `// JavaScript — angka WAJIB komparator\n[10, 1, 9].sort((a, b) => a - b); // [1, 9, 10]\n\n// Object berdasarkan field\nusers.sort((a, b) => a.nama.localeCompare(b.nama));\n\n// Python — key function\ndata.sort(key=lambda x: x['umur'], reverse=True)`,
      codeLang: 'javascript',
    },
  },
  {
    patterns: [/fibonacci|deret fib/i],
    reply: {
      content:
        'Fibonacci iteratif O(n) — jauh lebih baik dari rekursif naive O(2^n) yang meledak di n kecil saja:',
      code: `function fib(n) {\n  let a = 0, b = 1;\n  for (let i = 0; i < n; i++) [a, b] = [b, a + b];\n  return a;\n}\n\n// Python\na, b = 0, 1\nfor _ in range(n):\n    a, b = b, a + b\nprint(a)`,
      codeLang: 'javascript',
    },
  },
  {
    patterns: [/palindrom/i],
    reply: {
      content: 'Cek palindrom — bandingkan string dengan versi terbaliknya (normalisasi dulu: lowercase, buang non-alfanumerik):',
      code: `function isPalindrom(s) {\n  const bersih = s.toLowerCase().replace(/[^a-z0-9]/g, '');\n  return bersih === [...bersih].reverse().join('');\n}\n\nisPalindrom('Kasur ini rusak'); // true`,
      codeLang: 'javascript',
    },
  },
  {
    patterns: [/validasi email|regex|regular expression/i],
    reply: {
      content:
        'Validasi email praktis: di HTML gunakan input type="email" (gratis, native). Di JS gunakan pola sederhana — regex email "sempurna" justru salah; standar RFC 5322 terlalu kompleks untuk praktik.',
      code: `// Validasi praktis (HTML dulu, JS sebagai cadangan)\nconst emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;\n\n// Lebih baik lagi: verifikasi dengan email konfirmasi,\n// karena regex tidak bisa memastikan mailbox benar-benar ada.`,
      codeLang: 'javascript',
    },
  },
  {
    patterns: [/localstorage|session ?storage|cookie/i],
    reply: {
      content:
        'localStorage menyimpan data string di browser (±5–10MB, persisten), sessionStorage sama tapi hilang saat tab ditutup. Selalu JSON.stringify saat menyimpan objek, dan jangan simpan token sensitif di sini — bisa dibaca JavaScript apapun (risiko XSS).',
      code: `// Simpan & baca objek\nlocalStorage.setItem('profil', JSON.stringify({ tema: 'gelap' }));\nconst profil = JSON.parse(localStorage.getItem('profil') ?? '{}');\n\nlocalStorage.removeItem('profil');\nlocalStorage.clear();`,
      codeLang: 'javascript',
    },
  },
  {
    patterns: [/binary search|pencarian biner/i],
    reply: {
      content:
        'Binary search O(log n) — syaratnya data SUDAH TERURUT. Bandingkan target dengan elemen tengah, buang setengah rentang setiap langkah:',
      code: `function binarySearch(arr, target) {\n  let lo = 0, hi = arr.length - 1;\n  while (lo <= hi) {\n    const mid = (lo + hi) >> 1;\n    if (arr[mid] === target) return mid;\n    if (arr[mid] < target) lo = mid + 1;\n    else hi = mid - 1;\n  }\n  return -1;\n}`,
      codeLang: 'javascript',
    },
  },
  {
    patterns: [/menghitung (kemunculan|frekuensi)|count.*(occurrence|frequency)/i],
    reply: {
      content: 'Menghitung frekuensi elemen — pattern hash map / object counter:',
      code: `// JavaScript\nconst hitung = arr =>\n  arr.reduce((acc, x) => ((acc[x] = (acc[x] ?? 0) + 1), acc), {});\n\n// Python — paling idiomatis\nfrom collections import Counter\nCounter(data)          # Counter({'a': 3, 'b': 1})`,
      codeLang: 'javascript',
    },
  },
  {
    patterns: [/sql join/i],
    reply: {
      content:
        'JOIN menggabungkan baris dari dua tabel berdasarkan kolom relasi. Intuisinya:\n\n• INNER JOIN → hanya baris yang cocok di kedua tabel\n• LEFT JOIN → semua baris tabel kiri, null jika tidak cocok\n• FULL OUTER → semua baris dari keduanya',
      code: `SELECT p.nama, SUM(t.jumlah) AS total\nFROM pelanggan p\nLEFT JOIN transaksi t ON t.pelanggan_id = p.id\nGROUP BY p.id, p.nama\nORDER BY total DESC;`,
      codeLang: 'sql',
    },
  },
  {
    patterns: [/fizz ?buzz/i],
    reply: {
      content: 'FizzBuzz — klasik interview: kelipatan 3 → Fizz, 5 → Buzz, keduanya → FizzBuzz:',
      code: `for (let i = 1; i <= 100; i++) {\n  let out = '';\n  if (i % 3 === 0) out += 'Fizz';\n  if (i % 5 === 0) out += 'Buzz';\n  console.log(out || i);\n}`,
      codeLang: 'javascript',
    },
  },
  {
    patterns: [/git (reset|revert|undo)|membatalkan commit/i],
    reply: {
      content:
        'Membatalkan perubahan di Git — pilih senjata sesuai situasi:\n\n• Belum di-commit → git restore/checkout\n• Sudah commit, privat → git reset (menulis ulang riwayat)\n• Sudah push, publik → git revert (commit baru, aman)',
      code: `# Batal perubahan file (belum commit)\ngit restore nama-file.js\n\n# Batal commit terakhir, simpan perubahan\ngit reset --soft HEAD~1\n\n# Batalkan commit yang sudah dipush (aman)\ngit revert <hash-commit>`,
      codeLang: 'bash',
    },
  },
  {
    patterns: [/fetch (data|api)|consume api|memanggil api/i],
    reply: {
      content:
        'Pola fetch modern dengan error handling lengkap — selalu cek res.ok karena fetch TIDAK melempar error untuk HTTP 404/500:',
      code: `async function getData() {\n  const res = await fetch('https://api.contoh.com/data', {\n    headers: { Accept: 'application/json' },\n  });\n  if (!res.ok) throw new Error('HTTP ' + res.status);\n  return res.json();\n}\n\ngetData()\n  .then(render)\n  .catch((err) => showError(err.message));`,
      codeLang: 'javascript',
    },
  },
]

export function matchKB(text: string, kb: KnowledgeEntry[]): AssistantReply | null {
  for (const entry of kb) {
    if (entry.patterns.some((p) => p.test(text))) return entry.reply
  }
  return null
}
