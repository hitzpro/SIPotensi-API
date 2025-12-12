const axios = require('axios');
const PredictModel = require('../models/predictModel');

// URL API Python
const ML_API_URL = process.env.ML_API_URL || 'http://127.0.0.1:5000/predict';

// === HELPER LOGIC: Hitung Status Akademik ===
// Fungsi ini tetap di sini karena mengandung "Business Logic" (menghitung rata-rata & validasi aturan)
const calculateAcademicStatus = async (id_kelas, id_siswa) => {
    // 1. Ambil List Tugas dari Model
    const listTugas = await PredictModel.getTasksByClass(id_kelas);
    
    // Jika guru belum bikin tugas sama sekali
    if (listTugas.length === 0) {
        return { valid: false, msg: "Guru belum membuat tugas" };
    }

    const idsTugas = listTugas.map(t => t.id);

    // 2. Ambil Nilai Tugas Siswa dari Model
    const nilaiTugas = await PredictModel.getTaskGrades(id_siswa, idsTugas);
    const jumlahDinilai = nilaiTugas.length;
    
    // Syarat: Minimal 3 tugas sudah dinilai.
    const MIN_TUGAS = 3;

    if (jumlahDinilai < MIN_TUGAS) {
        return { 
            valid: false, 
            msg: `Baru ${jumlahDinilai} tugas dinilai (Min. ${MIN_TUGAS})` 
        };
    }

    // Hitung Rata-rata
    let total = 0;
    nilaiTugas.forEach(n => total += n.nilai);
    const rataTugas = total / jumlahDinilai;

    return { valid: true, rata_tugas: rataTugas };
};

// 1. CEK KELENGKAPAN DATA (READINESS)
exports.checkClassReadiness = async (req, res) => {
    try {
        const { id_kelas } = req.params;

        // Ambil siswa via Model
        const students = await PredictModel.getStudentsByClass(id_kelas);

        const fullReport = [];

        // Loop siswa (bisa dioptimasi pakai Promise.all jika data banyak, tapi loop basic lebih aman untuk logic berurutan)
        for (const s of students) {
            const issues = [];

            // A. Cek Nilai Ujian via Model
            const ujian = await PredictModel.getExamGrade(s.id_siswa, id_kelas);

            if (!ujian || ujian.nilai_uts === null) issues.push("Nilai UTS Kosong");
            if (!ujian || ujian.nilai_uas === null) issues.push("Nilai UAS Kosong");

            // B. Cek Tugas (Panggil Helper Local)
            const statusTugas = await calculateAcademicStatus(id_kelas, s.id_siswa);
            if (!statusTugas.valid) {
                issues.push(statusTugas.msg);
            }

            fullReport.push({
                id_siswa: s.id_siswa,
                nama: s.users ? s.users.nama : "Tanpa Nama",
                nisn: s.users ? s.users.nisn : "-",
                is_ready: issues.length === 0, // True jika tidak ada masalah
                message: issues.length > 0 ? issues.join(', ') : 'Data Lengkap'
            });
        }

        res.status(200).json({
            status: 'success',
            data: fullReport
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 2. PREDIKSI MASSAL (BULK)
exports.predictClassBulk = async (req, res) => {
    try {
        const { id_kelas } = req.body;
        
        // --- STEP 1: TEST KONEKSI AI ---
        try {
            await axios.post(ML_API_URL, { rata_tugas: 0, nilai_uts: 0, nilai_uas: 0 }, { timeout: 3000 });
        } catch (e) {
            if (e.code === 'ECONNREFUSED' || e.code === 'ERR_NETWORK') {
                return res.status(503).json({ status: 'error', message: "Server AI (Python) mati." });
            }
        }

        // --- STEP 2: MULAI PROSES ---
        const students = await PredictModel.getStudentsByClass(id_kelas);

        const responseData = []; 
        const dbUpdates = [];    

        for (const s of students) {
            // Ambil Data Akademik via Model & Helper
            const [ujian, statusTugas] = await Promise.all([
                PredictModel.getExamGrade(s.id_siswa, id_kelas),
                calculateAcademicStatus(id_kelas, s.id_siswa)
            ]);

            // Validasi: Skip jika data tidak lengkap
            if (!ujian || ujian.nilai_uts === null || ujian.nilai_uas === null || !statusTugas.valid) {
                continue; 
            }

            try {
                // Tembak Python
                const payload = { 
                    rata_tugas: statusTugas.rata_tugas, 
                    nilai_uts: ujian.nilai_uts, 
                    nilai_uas: ujian.nilai_uas 
                };
                
                const responseAI = await axios.post(ML_API_URL, payload);
                const hasil = responseAI.data.prediction;

                // 1. Siapkan data DB
                dbUpdates.push({
                    id_siswa: s.id_siswa,
                    id_kelas: id_kelas,
                    cluster: hasil.cluster_id,
                    rekomendasi: hasil.potensi, 
                    tanggal_proses: new Date()
                });

                // 2. Siapkan data Frontend
                responseData.push({
                    student_name: s.users?.nama,
                    nisn: s.users?.nisn,
                    risk_label: hasil.potensi, 
                    scores: {
                        tugas: statusTugas.rata_tugas,
                        uts: ujian.nilai_uts,
                        uas: ujian.nilai_uas
                    }
                });

            } catch (errAI) {
                console.error(`Gagal memprediksi siswa ${s.id_siswa}:`, errAI.message);
            }
        }

        // --- STEP 3: UPDATE DATABASE VIA MODEL ---
        if (dbUpdates.length > 0) {
            await PredictModel.savePredictions(dbUpdates);
        }

        // --- STEP 4: RETURN DATA ---
        res.status(200).json({
            status: 'success',
            message: 'Analisis selesai',
            data: responseData 
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};