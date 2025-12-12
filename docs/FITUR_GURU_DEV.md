## BAGIAN 2: PANDUAN TEKNIS (UNTUK DEVELOPER) 💻

Bagian ini menjelaskan implementasi teknis, endpoint API, dan cara pengujian menggunakan Postman.

### 1\. Persiapan Database

Pastikan skema database sudah diupdate dengan tabel:

  * `tugas` (support kolom `jenis_tugas`, `deadline`).
  * `soal_quiz` (relasi ke `tugas`).
  * `nilai_tugas` (support `file_url`, `jawaban_siswa`).

### 2\. Daftar Endpoint Baru

Semua request wajib menyertakan **Header Authorization: Bearer {TOKEN\_GURU}**.

#### A. Group: Manajemen Siswa

| Method | Endpoint | Deskripsi | Body / Params |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/classes/:id/import-students` | **Upsert** Siswa (Insert if new, Update if exists) | `form-data`: key `file` (CSV) |
| `PUT` | `/api/classes/students/:studentId` | Edit Data Siswa Manual | JSON: `{ "nama": "...", "nisn": "..." }` |
| `DELETE`| `/api/classes/:id/students/:studentId`| Hapus Siswa dari Kelas | - |
| `GET` | `/api/classes/:id/students/:studentId/history` | Get Detail Nilai & Prediksi | - |

#### B. Group: Tugas & Kuis

| Method | Endpoint | Deskripsi | Body / Params |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/classes/tugas` | Buat Tugas Baru (Header) | JSON (Lihat contoh di bawah) |
| `POST` | `/api/classes/tugas/:idTugas/import-quiz` | Import Soal ke Tugas Quiz | `form-data`: key `file` (CSV) |

-----

### 3\. Skenario Testing di Postman

Berikut adalah langkah demi langkah untuk menguji fitur ini.

#### Skenario 1: Update Data Siswa (Fitur Timpa)

*Tujuan: Memastikan saat upload ulang CSV, data terupdate, bukan duplikat.*

1.  **Siapkan CSV** `siswa_update.csv`. Ubah nama salah satu siswa yang NISN-nya sudah ada.
2.  **Request:** `POST {{BASE_URL}}/api/classes/{{CLASS_ID}}/import-students`
3.  **Body:** `form-data` -\> `file`: `siswa_update.csv`.
4.  **Verifikasi:** Cek endpoint `GET Students`. Pastikan nama siswa berubah dan jumlah siswa **tetap** (tidak bertambah).

#### Skenario 2: Edit Siswa Manual

1.  **Request:** `PUT {{BASE_URL}}/api/classes/students/{{STUDENT_ID}}`
2.  **Body (JSON):**
    ```json
    {
        "nama": "Budi (Revisi)",
        "nisn": "1234567890"
    }
    ```
3.  **Expectation:** Status 200 OK.

#### Skenario 3: Lihat History Siswa

1.  **Request:** `GET {{BASE_URL}}/api/classes/{{CLASS_ID}}/students/{{STUDENT_ID}}/history`
2.  **Expectation:** Menerima JSON berisi object `tugas` (array), `ujian` (object), dan `prediksi` (object).

#### Skenario 4: Membuat Tugas "Quiz"

1.  **Request:** `POST {{BASE_URL}}/api/classes/tugas`
2.  **Body (JSON):**
    ```json
    {
        "id_kelas": "{{CLASS_ID}}",
        "nama_tugas": "Ujian Harian Biologi",
        "deskripsi": "Wajib dikerjakan. Waktu 60 menit.",
        "jenis_tugas": "quiz",
        "deadline": "2025-12-30 12:00:00"
    }
    ```
3.  **Response:** Copy `id` tugas yang dihasilkan (misal: `uuid-tugas-baru`).

#### Skenario 5: Import Soal Kuis

1.  **Siapkan CSV** `soal.csv` (Format: `pertanyaan,a,b,c,d,kunci`).
2.  **Request:** `POST {{BASE_URL}}/api/classes/tugas/{{ID_TUGAS_DARI_SKENARIO_4}}/import-quiz`
3.  **Body:** `form-data` -\> `file`: `soal.csv`.
4.  **Expectation:** Status 200. Message: "Berhasil mengimport X soal".
5.  **Verifikasi DB:** Cek tabel `soal_quiz` di Supabase, pastikan data masuk.

-----