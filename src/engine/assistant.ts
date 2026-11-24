import { analyzeCode } from './diagnostics'
import { ERROR_KB, HOWTO_KB, matchKB } from './knowledge'
import type { AssistantReply, Language } from './types'

export interface AssistantContext {
  code: string
  language: Language
}

const ANALYZE_WORDS = /(analisis|analisa|cek|periksa|perbaiki|\bfix\b|\bdebug\b|\berror\b|\bbug\b|kode saya|code saya|tinjau|review)/i

/**
 * Mesin asisten lokal: mengarahkan pesan pengguna ke basis pengetahuan
 * yang paling relevan (error KB → analisis kode di editor → how-to → fallback).
 */
export function composeLocalReply(text: string, ctx: AssistantContext): AssistantReply {
  // 1) Jawaban spesifik untuk pesan error yang dikenal
  const errMatch = matchKB(text, ERROR_KB)
  if (errMatch) return errMatch

  // 2) Permintaan analisis kode yang ada di editor
  if (ANALYZE_WORDS.test(text)) {
    if (!ctx.code.trim()) {
      return {
        content:
          'Siap membantu! Tapi editor kode masih kosong — tempel kode yang mau dicek ke panel editor di tengah, atau klik tombol "Muat Contoh" untuk mencoba. Setelah itu tanya lagi, misalnya "analisis kode ini" atau "ada bug tidak?".',
      }
    }
    const diags = analyzeCode(ctx.code, ctx.language)
    if (diags.length === 0) {
      return {
        content:
          'Saya sudah memindai kode di editor baris demi baris dan tidak menemukan masalah pada pola yang saya kenali — tidak ada kredensial bocor, pola berbahaya, maupun anti-pattern umum untuk bahasa ini.\n\nCatatan: analisis statis berbasis pola tidak menangkap semua bug (misalnya logika bisnis yang salah). Kalau ada perilaku aneh saat dijalankan, tempel pesan errornya di sini.',
      }
    }
    const critical = diags.filter((d) => d.severity === 'critical').length
    const warning = diags.filter((d) => d.severity === 'warning').length
    const info = diags.length - critical - warning
    const headline =
      critical > 0
        ? `Saya menemukan ${diags.length} temuan — **${critical} kritis**${warning ? `, ${warning} peringatan` : ''}. Perbaiki yang kritis dulu sebelum lanjut.`
        : `Saya menemukan ${diags.length} temuan (${warning} peringatan${info ? `, ${info} info` : ''}). Tidak ada yang kritis, tapi tetap worth diperbaiki.`

    const top = diags
      .slice(0, 3)
      .map((d, i) => `${i + 1}. **${d.title}** (baris ${d.line}) — ${d.detail.split('.')[0]}.`)
      .join('\n')

    return {
      content: `${headline}\n\n${top}\n\nDetail lengkap sudah saya kirim ke panel Diagnostik di sebelah kanan, lengkap dengan contoh perbaikan kodenya. Klik "Terapkan" di sana untuk memasukkan perbaikan ke editor.`,
    }
  }

  // 3) Pertanyaan how-to
  const howto = matchKB(text, HOWTO_KB)
  if (howto) return howto

  // 4) Fallback
  return {
    content:
      'Saya belum menemukan jawaban spesifik untuk itu di basis pengetahuan lokal saya. Berikut yang bisa saya bantu langsung:\n\n• **Tempel pesan error** (stack trace, "TypeError: ...", "500", dll) — saya kenali 20+ error paling umum beserta perbaikannya\n• **"Analisis kode ini"** — saya pindai kode di editor dan tandai bug, kebocoran kredensial, dan anti-pattern\n• **Pertanyaan how-to** — debounce, async/await, sorting, regex, SQL join, Git, dsb.\n\nUntuk jawaban AI bebas dari model besar, buka Pengaturan (ikon roda gigi) dan sambungkan API key OpenAI-compatible milikmu.',
  }
}

/**
 * Simulasi streaming: memecah balasan menjadi potongan kecil yang
 * disalurkan bertahap via callback — memberi kesan real-time.
 */
export async function streamReply(
  reply: AssistantReply,
  onChunk: (partial: AssistantReply) => void,
  signal?: { cancelled: boolean },
): Promise<AssistantReply> {
  const text = reply.content
  const chunks: string[] = []
  // Pecah per kata, tapi gabungkan spasi & newlines agar natural
  const tokens = text.match(/\S+\s*/g) ?? [text]
  for (const t of tokens) {
    if (t.length <= 6) {
      chunks.push(t)
    } else {
      for (let i = 0; i < t.length; i += 4) chunks.push(t.slice(i, i + 4))
    }
  }
  let acc = ''
  for (const c of chunks) {
    if (signal?.cancelled) break
    acc += c
    onChunk({ content: acc, code: reply.code, codeLang: reply.codeLang })
    // Jeda dinamis: lebih cepat di tengah kalimat, jeda di akhir kalimat
    const delay = /[.!?]\s*$/.test(acc) ? 60 : /[,;:]\s*$/.test(acc) ? 30 : 12
    await new Promise((r) => setTimeout(r, delay))
  }
  return { content: acc, code: reply.code, codeLang: reply.codeLang }
}

/** Contoh kode bermasalah per bahasa — untuk demo analisis. */
export const SAMPLES: Record<Language, { label: string; code: string }> = {
  javascript: {
    label: 'Checkout buggy (JS)',
    code: `// TODO: refactor sebelum rilis
var total = 0;
var apiKey = "sk-9f2b77c1d4e5a6b8c9d0e1f2a3b4";

function hitungKeranjang(items, pajak) {
  for (var i = 0; i <= items.length; i++) {
    total = total + items[i].harga;
  }
  if (pajak == "11") {
    total = total + total * 0.11;
  }
  const hasil = JSON.parse(items);
  console.log("total: " + total);
  return renderRingkasan(total);
}

fetch("/api/checkout", { method: "POST" })
  .then(res => res.json())
  .then(data => {
    document.getElementById("app").innerHTML = data.html;
  });

hitungKeranjang([{ harga: 5000 }, { harga: 7500 }], "11");`,
  },
  python: {
    label: 'Data pipeline (Python)',
    code: `def proses_file(nama):
    f = open(nama)
    data = f.read()

def tambah_tag(tag, daftar=[]):
    daftar.append(tag)
    return daftar

a = tambah_tag("urgent")
b = tambah_tag("biasa")
print(a)  # ['urgent', 'biasa'] — bukan ['urgent']!

nilai = input("Umur: ")
if nilai == None:
    print("kosong")
umur = int(nilai)

try:
    hasil = 10 / 0
except:
    pass

# TODO: tambahkan logging`,
  },
  java: {
    label: 'Auth service (Java)',
    code: `public boolean login(String user, String dbUser) {
    String role = getRoleFromCache(user);
    if (role == "ADMIN") {
        return true;
    }
    if (user.equals(dbUser)) {
        return checkPassword(user);
    }
    return false;
}

public void muatData(String path) {
    try {
        Files.readAllLines(Paths.get(path));
    } catch (Exception e) {
        e.printStackTrace();
    }
    System.out.println("data dimuat");
}`,
  },
  php: {
    label: 'Legacy query (PHP)',
    code: `<?php
$id = $_GET['id'];
$nama = $_POST['nama'];

// TODO: migrasi ke PDO
$result = mysql_query("SELECT * FROM users WHERE id = " . $id);
echo $_GET['q'];

if ($result == "ok") {
    header("Location: sukses.php");
}
?>`,
  },
  cpp: {
    label: 'Buffer handler (C++)',
    code: `#include <bits/stdc++.h>
using namespace std;

int main() {
    char nama[32];
    scanf("%s", nama);
    gets(nama);

    float harga = 0.1 + 0.2;
    if (harga == 0.3) {
        printf("pas\\n");
    }

    Buffer* buf = new Buffer(1024);
    buf->proses(nama);
    return 0;
}`,
  },
  sql: {
    label: 'Maintenance query (SQL)',
    code: `-- TODO: jalankan saat maintenance
DELETE FROM logs;

UPDATE produk SET harga = 0;

SELECT * FROM transaksi t
JOIN pelanggan p ON p.id = t.pelanggan_id
WHERE t.status = 'pending';`,
  },
  html: {
    label: 'Form lama (HTML)',
    code: `<div class="container">
  <img src="banner.png">
  <form id="form-daftar">
    <input type="text" id="nama" placeholder="Nama">
    <button onclick="kirim()">Daftar</button>
  </form>
  <div id="pesan"></div>
</div>
<div class="container">
  <img src="ikon.png" alt="">
  <section id="fitur"></section>
  <section id="fitur"></section>
</div>`,
  },
  css: {
    label: 'Stylesheet kacau (CSS)',
    code: `* {
  margin: 0 !important;
  padding: 0;
}

.btn {
  color: white !important;
  background: #22d3ee;
}

.sidebar .menu .item a span {
  color: red;
}

.card .card-body .card-title {
  font-size: 16px;
}`,
  },
  typescript: {
    label: 'API client (TS)',
    code: `var baseUrl = "https://api.contoh.com";

interface User { id: number; nama: string }

async function ambilUser(id: number): Promise<User> {
  const res = await fetch(baseUrl + "/users/" + id);
  const user = JSON.parse(await res.text());
  if (user.role == "admin") {
    user.isAdmin = true;
  }
  return user;
}

ambilUser(1).then((u) => console.log(u));
renderUserCard(ambilUser(1));`,
  },
}
