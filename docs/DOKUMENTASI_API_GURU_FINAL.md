# 📘 DOKUMENTASI API - MODUL GURU (FINAL)

Dokumen ini berisi daftar lengkap endpoint backend untuk Role **Guru**, mencakup manajemen dashboard, akademik, hingga analisis potensi siswa berbasis AI.

**Base URL:** `http://127.0.0.1:3000/api`
**Authentication:** Wajib menyertakan Header `Authorization: Bearer {TOKEN}`

---

## 1. 📊 MODUL DASHBOARD
Digunakan untuk halaman utama (Home) Guru setelah login.

### A. Ringkasan Statistik
Mendapatkan jumlah kelas, total siswa, dan notifikasi siswa yang datanya belum lengkap.

* **Endpoint:** `GET /dashboard/summary`
* **Response:**
    ```json
    {
        "status": "success",
        "data": {
            "total_kelas": 5,
            "total_siswa": 142,
            "notifikasi_incomplete": 10
        }
    }
    ```

---

## 2. 🏫 MODUL MANAJEMEN KELAS & SISWA
Digunakan untuk halaman "Kelola Kelas".

### A. Buat Kelas Baru
* **Endpoint:** `POST /classes`
* **Body:** `{ "nama_kelas": "XII IPA 1", "tahun_ajaran": "2024/2025" }`

### B. Upload Data Siswa (Bulk Upsert)
Mengupload CSV siswa. Jika NISN sudah ada, data nama akan di-update (tidak duplikat). Password siswa di-reset menjadi NISN.

* **Endpoint:** `POST /classes/:id_kelas/import-students`
* **Body:** `form-data` -> Key: `file` (File CSV).
* **Format CSV:**
    ```csv
    nama,nisn
    Budi Santoso,12345
    Siti Aminah,12346
    ```

### C. Lihat Daftar Siswa & Nilai
* **Endpoint:** `GET /classes/:id_kelas/students`

### D. Manajemen Siswa (Edit & Hapus)
* **Edit Siswa:** `PUT /classes/students/:studentId` (Body: `nama`, `nisn`)
* **Hapus dari Kelas:** `DELETE /classes/:id_kelas/students/:studentId`

### E. Lihat History Lengkap Siswa
Melihat riwayat tugas yang pernah dikerjakan, nilai ujian, dan hasil prediksi terakhir.
* **Endpoint:** `GET /classes/:id_kelas/students/:studentId/history`

---

## 3. 📝 MODUL TUGAS & QUIZ
Digunakan di tab "Tugas" pada halaman kelas.

### A. Buat Tugas Baru
Guru bisa memilih jenis `upload` (essay/laporan) atau `quiz` (pilihan ganda).

* **Endpoint:** `POST /classes/tugas`
* **Body (Tipe Upload):**
    ```json
    {
        "id_kelas": "UUID_KELAS",
        "nama_tugas": "Laporan Fisika",
        "jenis_tugas": "upload",
        "deadline": "2025-12-31 23:59:00"
    }
    ```
* **Body (Tipe Quiz):** Tambahkan `"jenis_tugas": "quiz"` dan deskripsi.

### B. Import Soal Quiz
Mengupload bank soal untuk tugas tipe Quiz.

* **Endpoint:** `POST /classes/tugas/:idTugas/import-quiz`
* **Body:** `form-data` -> Key: `file` (CSV).
* **Format CSV:**
    ```csv
    pertanyaan,a,b,c,d,kunci
    Ibukota Jabar?,Bandung,Solo,Bogor,Depok,a
    1+1=?,1,2,3,4,b
    ```

---

## 4. 📈 MODUL PENILAIAN (GRADING)
Digunakan untuk input nilai secara manual oleh Guru.

### A. Input Nilai Tugas
* **Endpoint:** `POST /classes/nilai-tugas`
* **Body:** `{ "id_tugas": "...", "id_siswa": "...", "nilai": 85 }`

### B. Input Nilai UTS/UAS
* **Endpoint:** `POST /classes/nilai-ujian`
* **Body:** `{ "id_kelas": "...", "id_siswa": "...", "nilai_uts": 80, "nilai_uas": 90 }`

---

## 5. 🤖 MODUL AI & ANALISIS POTENSI
Digunakan di halaman "Analisis Potensi Kelas".

### A. Cek Kesiapan Data (Pre-Analysis)
Sistem mengecek siapa saja siswa yang nilainya belum lengkap sebelum diproses ke AI.

* **Endpoint:** `GET /classes/:id_kelas/check-readiness`
* **Response (Contoh):**
    ```json
    {
        "summary": {
            "total_siswa": 30,
            "siap_proses": 28,
            "belum_lengkap": 2
        },
        "data_belum_lengkap": [
            { "nama": "Budi", "alasan": ["Nilai UTS Kosong"] }
        ]
    }
    ```
* *Frontend Logic:* Jika `belum_lengkap > 0`, tampilkan peringatan merah.

### B. Proses Prediksi Massal (Bulk Predict)
Mengirim data siswa yang "siap" ke server Python K-Means, lalu menyimpan hasilnya.

* **Endpoint:** `POST /classes/predict-bulk`
* **Body:** `{ "id_kelas": "UUID_KELAS" }`
* **Response:**
    ```json
    {
        "status": "success",
        "pie_chart_data": {
            "Potensi Tinggi": 10,
            "Potensi Cukup": 15,
            "Potensi Kurang": 3
        }
    }
    ```
* *Frontend Logic:* Gunakan data `pie_chart_data` untuk membuat Grafik Lingkaran. Gunakan endpoint History Siswa untuk menampilkan detail per anak jika grafik diklik.

---