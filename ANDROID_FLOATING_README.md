# CodePilot AI — Android Floating Edition ♡

Pilihan C diterapkan sebagai gabungan:
- Bubble native Android yang dapat digeser dan tampil di atas aplikasi lain.
- Panel mini yang terbuka saat bubble disentuh dan memuat aplikasi CodePilot.
- Panel dapat ditutup dengan tombol minus; bubble tetap tersedia.

Lihat `android/README.md` untuk langkah build APK. Build web (`npm ci && npm run build`) harus dilakukan lebih dulu, lalu salin `dist/` ke `android/app/src/main/assets/public/`. Buka folder `android/` di Android Studio dan build APK.

Catatan: file APK belum disertakan karena lingkungan ini tidak memiliki Android SDK/Gradle build environment yang terkonfigurasi. Source Android dan service overlay sudah disiapkan.
