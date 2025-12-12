# 📘 DOKUMENTASI SISTEM & PANDUAN PENGGUNAAN
**Modul: Manajemen Siswa & Pembelajaran (LMS Sederhana)**

Dokumen ini berisi panduan penggunaan fitur baru untuk Guru, mencakup pengelolaan data siswa lanjutan (update/history) dan pembuatan tugas berbasis Kuis/Upload.

---

## BAGIAN 1: PANDUAN OPERASIONAL (UNTUK GURU/ADMIN) 👨‍🏫

Bagian ini menjelaskan alur kerja sistem dari sudut pandang pengguna awam tanpa istilah teknis yang rumit.

### 1. Manajemen Data Siswa (Lanjutan)

Sistem kini mendukung pembaruan data otomatis. Guru tidak perlu takut data ganda (duplikat) saat mengupload file CSV siswa berulang kali.

* **Menambah/Memperbarui Siswa (Bulk Upload):**
    * Siapkan file `data_siswa.csv` dengan kolom: `nama,nisn`.
    * Upload ke menu **Import Siswa**.
    * **Logika Cerdas:**
        * Jika NISN **belum ada**: Sistem membuat akun siswa baru.
        * Jika NISN **sudah ada**: Sistem akan **mengupdate** Nama siswa tersebut sesuai file baru (Data nilai tidak akan hilang).
        * *Catatan:* Password siswa akan di-reset otomatis menjadi NISN mereka jika dilakukan upload ulang.

* **Edit Manual:**
    * Jika ada kesalahan penulisan nama pada satu siswa, Guru bisa menggunakan tombol **Edit** pada daftar siswa tanpa perlu upload ulang CSV.

* **Hapus Siswa:**
    * Guru dapat menghapus siswa dari kelas (misal: pindah sekolah).
    * *Perhatian:* Menghapus siswa dari kelas akan menyembunyikan riwayat nilainya di kelas tersebut.

* **Lihat History:**
    * Guru dapat mengklik **Detail Siswa** untuk melihat rekam jejak lengkap:
        * Daftar tugas yang sudah dikerjakan.
        * Nilai UTS & UAS.
        * Hasil analisis potensi terakhir (Klaster Potensi).

### 2. Manajemen Tugas & Kuis

Guru dapat membuat dua jenis tugas untuk siswa:

#### A. Tugas Tipe Upload (Essay/Proyek)
* **Digunakan untuk:** Tugas yang membutuhkan jawaban panjang, laporan, foto, atau file dokumen.
* **Cara Kerja:** Guru membuat tugas -> Siswa mengupload file jawaban -> Guru memeriksa & memberi nilai manual.

#### B. Tugas Tipe Quiz (Pilihan Ganda Otomatis)
* **Digunakan untuk:** Ujian harian atau latihan soal objektif.
* **Cara Kerja:** Guru mengupload soal & kunci jawaban -> Siswa mengerjakan di aplikasi -> **Nilai keluar otomatis detik itu juga**.

### 3. Cara Menyiapkan Soal Kuis (Format CSV)

Untuk membuat Kuis, Guru **tidak perlu** mengetik soal satu per satu di aplikasi. Cukup gunakan Excel/Spreadsheet.

1.  Buat file Excel baru.
2.  Pastikan baris pertama (Header) berisi tulisan kecil semua: `pertanyaan,a,b,c,d,kunci`
3.  Isi data soal di bawahnya.
4.  Simpan sebagai **CSV (Comma Delimited)**.

**Contoh Format CSV Soal:**
```csv
pertanyaan,a,b,c,d,kunci
"Siapa proklamator Indonesia?",Soekarno,Hatta,Sjahrir,Sudirman,a
"Ibukota Jawa Barat?",Bandung,Surabaya,Semarang,Jakarta,a
"2 + 2 = ?",2,3,4,5,c