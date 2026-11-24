# Build CodePilot APK langsung dari HP Android

Paket ini sudah disiapkan untuk build APK melalui GitHub Actions (cloud), jadi tidak perlu laptop/Android Studio. APK debug yang dihasilkan dapat dipasang untuk uji coba pribadi.

## Langkah dari HP
1. Ekstrak ZIP ini dengan aplikasi pengelola file.
2. Buka github.com di browser HP, masuk atau buat akun GitHub.
3. Buat repository baru, misalnya `codepilot-android` (boleh Private).
4. Di repository, pilih Add file → Upload files. Unggah **isi folder hasil ekstrak** (termasuk folder `.github`; aktifkan tampilkan file tersembunyi jika diperlukan).
5. Tekan Commit changes.
6. Buka tab Actions → workflow **Build CodePilot APK** → Run workflow. Jika workflow otomatis berjalan setelah commit, tunggu hingga selesai.
7. Buka hasil run yang hijau (Success), gulir ke Artifacts, unduh `CodePilot-Android12-debug-apk`, lalu ekstrak.
8. Ketuk `app-debug.apk` untuk memasang. Jika diminta, izinkan browser/pengelola file memasang aplikasi tidak dikenal.
9. Buka CodePilot AI → Aktifkan Floating Assistant → izinkan **Display over other apps**.

## Catatan
- Android 12 didukung (minSdk 26).
- Workflow menghasilkan APK debug untuk instalasi/testing pribadi, bukan APK rilis Play Store.
- Aplikasi mungkin memerlukan API key penyedia AI di Settings untuk jawaban model jarak jauh.
- Jangan bagikan API key atau unggah ke repository publik.
