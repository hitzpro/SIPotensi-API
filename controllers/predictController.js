const axios = require('axios');
const PredictModel = require('../models/predictModel');

// Pastikan URL ini sesuai dengan port Flask/Python kamu
const ML_API_URL = process.env.ML_API_URL || 'http://127.0.0.1:5000/predict';

/* ================================
   HELPER: HITUNG RATA-RATA TUGAS
================================ */
const calculateAcademicStatus = async (id_kelas, id_siswa) => {
    const listTugas = await PredictModel.getTasksByClass(id_kelas);
    if (listTugas.length === 0) {
        return { valid: false, msg: "Guru belum membuat tugas" };
    }

    const idsTugas = listTugas.map(t => t.id);
    const nilaiTugas = await PredictModel.getTaskGrades(id_siswa, idsTugas);

    const MIN_TUGAS = 3; // Minimal tugas yang harus dinilai
    if (nilaiTugas.length < MIN_TUGAS) {
        return { valid: false, msg: `Tugas dinilai baru ${nilaiTugas.length} dari ${MIN_TUGAS}` };
    }

    const total = nilaiTugas.reduce((sum, n) => sum + n.nilai, 0);
    const rataTugas = total / nilaiTugas.length;

    return { valid: true, rata_tugas: Number(rataTugas.toFixed(2)) };
};

/* ================================
   1. CEK KESIAPAN DATA (Untuk UI Table Awal)
================================ */
exports.checkClassReadiness = async (req, res) => {
    try {
        const { id_kelas } = req.params;
        const students = await PredictModel.getStudentsByClass(id_kelas);

        const report = [];

        for (const s of students) {
            const issues = [];

            // Cek Nilai Ujian
            const ujian = await PredictModel.getExamGrade(s.id_siswa, id_kelas);
            if (!ujian?.nilai_uts) issues.push("Nilai UTS kosong");
            if (!ujian?.nilai_uas) issues.push("Nilai UAS kosong");

            // Cek Nilai Tugas
            const tugasStatus = await calculateAcademicStatus(id_kelas, s.id_siswa);
            if (!tugasStatus.valid) issues.push(tugasStatus.msg);

            report.push({
                id_siswa: s.id_siswa,
                nama: s.users?.nama ?? "-",
                nisn: s.users?.nisn ?? "-",
                is_ready: issues.length === 0, // True jika tidak ada masalah
                message: issues.length ? issues.join(", ") : "Siap diprediksi"
            });
        }

        res.json({ status: "success", data: report });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/* ================================
   2. PREDIKSI MASSAL (KMEANS)
================================ */
exports.predictClassBulk = async (req, res) => {
    try {
        const { id_kelas } = req.body;

        // 🔹 1. Tes koneksi ke Server Python/AI
        try {
            await axios.post(ML_API_URL, {
                rata_tugas: 75, nilai_uts: 75, nilai_uas: 75
            }, { timeout: 3000 });
        } catch (error) {
            console.error("AI Server Error:", error.message);
            return res.status(503).json({
                status: "error",
                message: "Server AI (Python) tidak aktif atau error."
            });
        }

        const students = await PredictModel.getStudentsByClass(id_kelas);
        
        const results = [];
        const skipped = [];
        const dbPayload = [];

        for (const s of students) {
            // 🔹 2. Ambil Data Real
            const [ujian, tugas] = await Promise.all([
                PredictModel.getExamGrade(s.id_siswa, id_kelas),
                calculateAcademicStatus(id_kelas, s.id_siswa)
            ]);

            // Validasi kelengkapan (Skip jika belum lengkap)
            if (!ujian || !tugas.valid) {
                skipped.push({
                    id_siswa: s.id_siswa,
                    nama: s.users?.nama,
                    reason: "Data akademik belum lengkap saat proses berjalan"
                });
                continue;
            }

            const payload = {
                rata_tugas: tugas.rata_tugas,
                nilai_uts: ujian.nilai_uts,
                nilai_uas: ujian.nilai_uas
            };

            // Validasi range angka (0-100)
            const invalid = Object.values(payload).some(v => typeof v !== 'number' || v < 0 || v > 100);
            if (invalid) {
                skipped.push({ id_siswa: s.id_siswa, nama: s.users?.nama, reason: "Nilai diluar range 0-100" });
                continue;
            }

            try {
                // 🔹 3. Kirim ke Python
                const { data } = await axios.post(ML_API_URL, payload);
                
                // === PERBAIKAN DI SINI (Mapping Output Python) ===
                // Python return: { prediction: { cluster_id, label, status_ui, recommendation, ... } }
                const pred = data.prediction;

                // Siapkan data untuk Database
                dbPayload.push({
                    id_siswa: s.id_siswa,
                    id_kelas: id_kelas,
                    cluster_id: pred.cluster_id,       // INT
                    risk_label: pred.label,            // TEXT "Potensi Tinggi"
                    status_ui: pred.status_ui,         // TEXT "Aman"
                    recommendation: pred.recommendation, // TEXT Panjang
                    tanggal_proses: new Date()
                });

                // Siapkan data untuk return ke Frontend (HARUS format nested prediction)
                results.push({
                    student_name: s.users?.nama,
                    nisn: s.users?.nisn,
                    prediction: pred, // <-- Kirim FULL object prediction ke FE agar JS tidak error
                    scores: payload
                });

            } catch (err) {
                console.error(`Gagal memprediksi siswa ${s.id_siswa}:`, err.message);
                skipped.push({
                    id_siswa: s.id_siswa,
                    nama: s.users?.nama,
                    reason: "Gagal proses perhitungan AI"
                });
            }
        }

        // 🔹 4. Simpan ke Database (Bulk Upsert)
        if (dbPayload.length > 0) {
            await PredictModel.savePredictions(dbPayload);
        }

        res.json({
            status: "success",
            processed: results.length,
            skipped_count: skipped.length,
            data: results, // Ini array yang akan diloop oleh Frontend
            skipped_data: skipped
        });

    } catch (err) {
        console.error("Bulk Predict Error:", err);
        res.status(500).json({ message: err.message });
    }
};