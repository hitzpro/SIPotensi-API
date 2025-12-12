# 📘 DOKUMENTASI API - MODUL SISWA (FINAL)

Dokumen ini berisi daftar endpoint untuk Role **Siswa**.
**Authentication:** Wajib menyertakan Header `Authorization: Bearer {TOKEN_SISWA}`

---

## 1. 🎓 DASHBOARD & PROFIL
Halaman pertama saat siswa login.

### A. Lihat Dashboard
Menampilkan data diri, kelas, guru wali, dan rekap nilai akademik.

* **Endpoint:** `GET /api/student/dashboard`
* **Response:**
    ```json
    {
        "status": "success",
        "data": {
            "nama": "Wakhid Khoirul",
            "nisn": "123456",
            "kelas": "XII IPA 1",
            "guru": "Budi Santoso",
            "status_nilai": "Lengkap", // atau "Belum Lengkap"
            "nilai_akademik": {
                "rata_tugas": 85,
                "uts": 70,
                "uas": 90
            }
        }
    }
    ```

---

## 2. 📚 TUGAS SAYA
Halaman untuk melihat daftar tugas yang diberikan guru.

### A. Lihat Semua Tugas
Mengambil daftar tugas di kelas beserta status pengerjaannya.

* **Endpoint:** `GET /api/student/tasks`
* **Response:**
    ```json
    [
        {
            "id": "uuid-tugas-1",
            "nama_tugas": "Quiz Matematika",
            "jenis_tugas": "quiz",
            "deadline": "2025-12-30...",
            "status": "Belum Mengerjakan", // atau "Dikumpulkan"
            "nilai": null
        }
    ]
    ```

### B. Lihat Detail Tugas (Mulai Mengerjakan)
Jika jenis tugas adalah `quiz`, endpoint ini akan menyertakan daftar soal (tanpa kunci jawaban).

* **Endpoint:** `GET /api/student/tasks/:idTugas`
* **Response (Contoh Quiz):**
    ```json
    {
        "data": {
            "nama_tugas": "Quiz 1",
            "deskripsi": "Kerjakan jujur",
            "soal": [
                { "id": "s1", "pertanyaan": "1+1=?", "pilihan_a": "2", ... }
            ]
        }
    }
    ```

---

## 3. 📝 PENGUMPULAN TUGAS (SUBMIT)
Satu endpoint sakti untuk mengumpulkan tugas tipe apapun.

### A. Submit Quiz (Auto-Grading)
Siswa mengirim jawaban pilihan ganda, sistem langsung memberi nilai.

* **Endpoint:** `POST /api/student/tasks/:idTugas/submit`
* **Body (Raw JSON):**
    ```json
    {
        "jenis_pengerjaan": "quiz",
        "jawaban_siswa": {
            "ID_SOAL_1": "a",
            "ID_SOAL_2": "c"
        }
    }
    ```
* **Response:**
    ```json
    {
        "status": "success",
        "message": "Quiz selesai! Nilai kamu: 80",
        "nilai": 80
    }
    ```

### B. Submit Tugas Upload (File)
Siswa mengupload file jawaban (PDF/Gambar).

* **Endpoint:** `POST /api/student/tasks/:idTugas/submit`
* **Body:** `form-data`
    * `jenis_pengerjaan`: `upload`
    * `file`: (Pilih File)
* **Response:** Message "Tugas berhasil dikumpulkan".

---