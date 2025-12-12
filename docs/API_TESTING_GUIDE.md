# 🚀 PANDUAN TESTING API (POSTMAN CHEAT SHEET)

**Base URL:** `http://127.0.0.1:3000/api`
**Penting:** Gunakan `127.0.0.1` bukan `localhost` untuk menghindari delay/error di Postman.

-----

## 🔐 BAGIAN 1: AUTHENTICATION (UMUM)

Endpoint ini adalah pintu masuk. Tanpa Token dari sini, endpoint lain tidak akan bisa diakses.

### 1\. Login Guru

  * **Method:** `POST`
  * **URL:** `{{BASE_URL}}/auth/login`
  * **Body (JSON):**
    ```json
    {
        "email": "guru@sekolah.id",
        "password": "guru123"
    }
    ```
  * **Output:** Copy `token` dari response. Simpan sebagai **Token Guru**.

### 2\. Login Siswa

  * **Method:** `POST`
  * **URL:** `{{BASE_URL}}/auth/login`
  * **Body (JSON):**
    ```json
    {
        "nisn": "1234567890",
        "password": "1234567890"
    }
    ```
    *(Note: Default password siswa adalah NISN-nya sendiri).*
  * **Output:** Copy `token` dari response. Simpan sebagai **Token Siswa**.

-----

## 👨‍🏫 BAGIAN 2: MODUL GURU

**Header Wajib:** `Authorization`: `Bearer {TOKEN_GURU}`

### A. Dashboard

#### 1\. Ringkasan Statistik

  * **Method:** `GET`
  * **URL:** `{{BASE_URL}}/dashboard/summary`

### B. Manajemen Kelas

#### 2\. Buat Kelas Baru

  * **Method:** `POST`
  * **URL:** `{{BASE_URL}}/classes`
  * **Body (JSON):**
    ```json
    {
        "nama_kelas": "XII IPA 1",
        "tahun_ajaran": "2024/2025"
    }
    ```
  * **Output:** Simpan `id` kelas yang dihasilkan.

#### 3\. Lihat Semua Kelas Saya

  * **Method:** `GET`
  * **URL:** `{{BASE_URL}}/classes`

### C. Manajemen Siswa

#### 4\. Upload/Import Siswa (Upsert)

  * **Method:** `POST`
  * **URL:** `{{BASE_URL}}/classes/{ID_KELAS}/import-students`
  * **Body (Form-Data):**
      * Key: `file` (Type: File) -\> Upload CSV `nama,nisn`

#### 5\. Lihat Daftar Siswa di Kelas

  * **Method:** `GET`
  * **URL:** `{{BASE_URL}}/classes/{ID_KELAS}/students`

#### 6\. Edit Data Siswa (Manual)

  * **Method:** `PUT`
  * **URL:** `{{BASE_URL}}/classes/students/{ID_SISWA}`
  * **Body (JSON):**
    ```json
    {
        "nama": "Budi Santoso (Revisi)",
        "nisn": "12345"
    }
    ```

#### 7\. Hapus Siswa dari Kelas

  * **Method:** `DELETE`
  * **URL:** `{{BASE_URL}}/classes/{ID_KELAS}/students/{ID_SISWA}`

#### 8\. Lihat History Nilai Siswa

  * **Method:** `GET`
  * **URL:** `{{BASE_URL}}/classes/{ID_KELAS}/students/{ID_SISWA}/history`

### D. Manajemen Tugas (LMS)

#### 9\. Buat Tugas (Tipe Upload)

  * **Method:** `POST`
  * **URL:** `{{BASE_URL}}/classes/tugas`
  * **Body (JSON):**
    ```json
    {
        "id_kelas": "{ID_KELAS}",
        "nama_tugas": "Tugas Makalah",
        "jenis_tugas": "upload",
        "deskripsi": "Kumpul PDF",
        "deadline": "2025-12-31 23:59:00"
    }
    ```

#### 10\. Buat Tugas (Tipe Quiz + Soal Langsung)

  * **Method:** `POST`
  * **URL:** `{{BASE_URL}}/classes/tugas`
  * **Body (JSON):**
    ```json
    {
        "id_kelas": "{ID_KELAS}",
        "nama_tugas": "Quiz Harian",
        "jenis_tugas": "quiz",
        "deadline": "2025-12-31 23:59:00",
        "soal_list": [
            { "pertanyaan": "1+1?", "a":"1", "b":"2", "c":"3", "d":"4", "kunci":"b" }
        ]
    }
    ```

#### 11\. Import Soal Quiz (Via CSV)

  * **Method:** `POST`
  * **URL:** `{{BASE_URL}}/classes/tugas/{ID_TUGAS}/import-quiz`
  * **Body (Form-Data):**
      * Key: `file` (Type: File) -\> CSV `pertanyaan,a,b,c,d,kunci`

#### 12\. Lihat Daftar Tugas di Kelas

  * **Method:** `GET`
  * **URL:** `{{BASE_URL}}/classes/{ID_KELAS}/tugas`

#### 13\. Lihat Submission Siswa (Siapa yang udah kumpul)

  * **Method:** `GET`
  * **URL:** `{{BASE_URL}}/classes/tugas/{ID_TUGAS}/submissions`
  * **Output:** Berisi link file siswa (klik link untuk download).

### E. Penilaian (Grading)

#### 14\. Input Nilai Tugas (Manual)

  * **Method:** `POST`
  * **URL:** `{{BASE_URL}}/classes/nilai-tugas`
  * **Body (JSON):**
    ```json
    {
        "id_tugas": "{ID_TUGAS}",
        "id_siswa": "{ID_SISWA}",
        "nilai": 85
    }
    ```

#### 15\. Input Nilai Ujian (UTS/UAS)

  * **Method:** `POST`
  * **URL:** `{{BASE_URL}}/classes/nilai-ujian`
  * **Body (JSON):**
    ```json
    {
        "id_kelas": "{ID_KELAS}",
        "id_siswa": "{ID_SISWA}",
        "nilai_uts": 80,
        "nilai_uas": 90
    }
    ```

### F. AI & Prediksi Potensi

#### 16\. Cek Kesiapan Data Kelas (Pre-Check)

  * **Method:** `GET`
  * **URL:** `{{BASE_URL}}/classes/{ID_KELAS}/check-readiness`

#### 17\. Proses Prediksi Massal (K-Means)

  * **Method:** `POST`
  * **URL:** `{{BASE_URL}}/classes/predict-bulk`
  * **Body (JSON):**
    ```json
    {
        "id_kelas": "{ID_KELAS}"
    }
    ```

-----

## 🎓 BAGIAN 3: MODUL SISWA

**Header Wajib:** `Authorization`: `Bearer {TOKEN_SISWA}`

### A. Dashboard

#### 1\. Lihat Dashboard & Profil

  * **Method:** `GET`
  * **URL:** `{{BASE_URL}}/student/dashboard`

### B. Tugas Saya

#### 2\. Lihat Daftar Tugas

  * **Method:** `GET`
  * **URL:** `{{BASE_URL}}/student/tasks`

#### 3\. Lihat Detail Tugas (Untuk Quiz: Muncul Soal)

  * **Method:** `GET`
  * **URL:** `{{BASE_URL}}/student/tasks/{ID_TUGAS}`

### C. Mengerjakan Tugas (Submit)

#### 4\. Submit Quiz (Auto Nilai)

  * **Method:** `POST`
  * **URL:** `{{BASE_URL}}/student/tasks/{ID_TUGAS}/submit`
  * **Body (JSON):**
    ```json
    {
        "jenis_pengerjaan": "quiz",
        "jawaban_siswa": {
            "ID_SOAL_1": "a",
            "ID_SOAL_2": "b"
        }
    }
    ```

#### 5\. Submit Upload (File)

  * **Method:** `POST`
  * **URL:** `{{BASE_URL}}/student/tasks/{ID_TUGAS}/submit`
  * **Body (Form-Data):**
      * `jenis_pengerjaan`: `upload`
      * `file`: (Pilih File PDF/Gambar)

-----

## 📝 CATATAN PENTING SAAT TESTING

1.  **UUID:** Pastikan kamu menggunakan ID yang benar (copy dari response sebelumnya). Jangan pakai ID ngawur.
2.  **Date Format:** Gunakan format `YYYY-MM-DD HH:mm:ss`.
3.  **File Upload:** Di Postman body, jangan lupa ganti dropdown tipe input dari `Text` menjadi `File` saat mau upload CSV/PDF.
4.  **Token Expired:** Token berlaku 1 hari. Jika error `401 Unauthorized`, login ulang dan ambil token baru.