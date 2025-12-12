# 📚 Dokumentasi Autentikasi & Manajemen User

Sistem ini memiliki dua aktor utama: **Guru** dan **Siswa**. Karena sistem ini digunakan di lingkungan sekolah tertutup, alur pendaftaran tidak bersifat terbuka (Public Registration), melainkan berbasis data pusat.

## 1\. Aktor: GURU 👨‍🏫

### A. Dari mana akun Guru didapatkan?

Akun Guru **hanya bisa dibuat oleh Administrator** (Tim IT Sekolah atau Developer).

  * Guru **tidak bisa mendaftar sendiri** (No Sign-Up Page).
  * Hal ini untuk mencegah orang asing mengaku sebagai guru dan memanipulasi nilai.
  * *Dalam tahap pengembangan (Coding), akun guru dibuat menggunakan script `seed_guru.js`.*

### B. Bagaimana Guru Login?

Guru login menggunakan **Email** dan **Password**.

  * **Endpoint:** `POST /api/auth/login`
  * **Body Request:**
    ```json
    {
        "email": "guru@sekolah.id",
        "password": "guru123"
    }
    ```
  * **Output:** Menerima **Token JWT** yang harus dipakai untuk mengakses fitur Kelas, Input Nilai, dan Analisis K-Means.

-----

## 2\. Aktor: SISWA 🎓

### A. Dari mana akun Siswa didapatkan?

Siswa **tidak mendaftar manual**. Akun siswa dibuatkan secara **otomatis** oleh sistem ketika Guru melakukan **Import CSV** ke dalam Kelas.

**Alurnya:**

1.  Guru membuat Kelas (misal: XII IPA 1).
2.  Guru mengupload file `data_siswa.csv` yang berisi `Nama` dan `NISN`.
3.  Backend membaca file tersebut:
      * Jika NISN belum terdaftar: Sistem otomatis membuatkan akun Siswa baru di tabel `users`.
      * Jika NISN sudah ada: Sistem akan melewati pembuatan akun, dan langsung memasukkan siswa tersebut ke kelas.

### B. Bagaimana Siswa Login?

Karena siswa tidak mendaftar (tidak input email/password sendiri), sistem menerapkan **Default Credential** agar siswa bisa langsung masuk.

  * **Username:** Menggunakan **NISN**.
  * **Password Default:** Menggunakan **NISN** juga.
      * *Alasan:* NISN bersifat unik dan diketahui oleh siswa.
      * *Contoh:* Jika NISN siswa adalah `1234567890`, maka password login pertamanya adalah `1234567890`.

> **Catatan Teknis untuk Developer (Kamu):**
> Saat ini controller login (`authController.js`) kita masih mengecek by `email`. Nanti, kita perlu memodifikasi kode login sedikit agar sistem bisa mengecek:
>
>   * Kalau inputnya Email -\> Cari di kolom email (Logika Guru).
>   * Kalau inputnya Angka (NISN) -\> Cari di kolom NISN (Logika Siswa).

-----

## 3\. Ringkasan Matriks Akses

| Fitur | Guru | Siswa | Keterangan |
| :--- | :---: | :---: | :--- |
| **Registrasi** | ❌ | ❌ | Dibuatkan Admin / Import CSV |
| **Login** | ✅ (Email) | ✅ (NISN) | Guru pakai Email, Siswa pakai NISN |
| **Buat Kelas** | ✅ | ❌ | Hanya guru yang punya hak akses |
| **Upload Siswa** | ✅ | ❌ | Guru memasukkan siswa ke kelas |
| **Input Nilai** | ✅ | ❌ | Guru memberi nilai Tugas/UTS/UAS |
| **Lihat Nilai** | ✅ | ✅ | Siswa hanya bisa lihat nilai sendiri |
| **Analisis Potensi**| ✅ | ❌ | Guru melihat hasil clustering K-Means |

-----

### Apa Langkah Selanjutnya?

Karena di dokumentasi disebutkan siswa login menggunakan **NISN**, sementara kode `authController.js` kita saat ini masih `findByEmail`, maka langkah selanjutnya yang logis adalah:

**Mengupdate `authController.js` agar bisa mendeteksi login Siswa via NISN.**

Apakah kita mau kerjakan update login ini sekarang, atau lanjut ke integrasi Python K-Means? (Saran saya: bereskan login siswa dulu biar tuntas urusan "User").