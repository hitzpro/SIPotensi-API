const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const webpush = require('web-push');

// Import Models
const GradeModel = require('../models/gradeModel');
const NotificationModel = require('../models/notificationModel');

// Helper untuk hapus file fisik
const deleteFile = (filePath) => {
    if (!filePath) return;
    const p = path.join(__dirname, '..', filePath); 
    if (fs.existsSync(p)) {
        try {
            fs.unlinkSync(p);
        } catch (err) {
            console.error(`[FILE] Error deleting: ${err.message}`);
        }
    }
};

// 1. Guru Membuat Tugas Baru
exports.createTugas = async (req, res) => {
    try {
        const { id_kelas, nama_tugas, deskripsi, deadline, jenis_tugas, soal_list } = req.body;
        
        // 1. Validasi
        if (!id_kelas || !nama_tugas || !jenis_tugas) {
            return res.status(400).json({ message: "Data wajib tidak lengkap" });
        }

        // 2. File upload path
        let file_soal_path = req.file ? req.file.path.replace(/\\/g, '/') : null;

        // 3. Simpan header tugas ke DB via Model
        const tugasBaru = await GradeModel.createTugas({
            id_kelas,
            nama_tugas,
            deskripsi,
            deadline,
            jenis_tugas,
            file_soal: file_soal_path
        });

        // 4. Logika Soal Quiz (Jika ada input JSON langsung)
        if (jenis_tugas === 'quiz' && Array.isArray(soal_list) && soal_list.length > 0) {
            const formatSoal = soal_list.map(item => ({
                id_tugas: tugasBaru.id,
                pertanyaan: item.pertanyaan,
                pilihan_a: item.a,
                pilihan_b: item.b,
                pilihan_c: item.c,
                pilihan_d: item.d,
                kunci_jawaban: item.kunci.toLowerCase(),
                bobot_soal: 100 / soal_list.length
            }));
            await GradeModel.createSoalQuiz(formatSoal);
        }

        // 5. NOTIFIKASI
        // Block ini bersifat "fire and forget" (kalau error gak ngerusak response utama)
        (async () => {
            try {
                // Ambil ID siswa pakai Model
                const siswaIds = await GradeModel.getStudentIdsInClass(id_kelas);
                if (siswaIds.length === 0) return;

                // A. Notifikasi DB
                const notifPayload = siswaIds.map(id => ({
                    id_siswa: id,
                    judul: "Tugas Baru 📝",
                    pesan: `Guru menambahkan tugas: "${nama_tugas}"`,
                    tipe: 'tugas',
                    link_url: `/siswa/tugas/${tugasBaru.id}`,
                    is_read: false
                }));
                await NotificationModel.createBulk(notifPayload);

                // B. Push Notification
                const subscriptions = await GradeModel.getPushSubscriptionsByUserIds(siswaIds);
                if (subscriptions.length > 0) {
                    const pushPayload = JSON.stringify({
                        title: "Tugas Baru! 📝",
                        body: `Deadline: ${new Date(deadline).toLocaleDateString()}`,
                        url: `/siswa/tugas/${tugasBaru.id}`
                    });

                    const pushPromises = subscriptions.map(sub => {
                        return webpush.sendNotification(
                            { endpoint: sub.endpoint, keys: sub.keys },
                            pushPayload
                        ).catch(() => {}); // Catch error per user agar loop tidak berhenti
                    });
                    await Promise.allSettled(pushPromises);
                }
            } catch (err) {
                console.error("Notif Error:", err.message);
            }
        })();

        res.status(201).json({
            status: 'success',
            message: 'Tugas berhasil dibuat',
            data: tugasBaru
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// 2. Guru Melihat Daftar Tugas
exports.getListTugas = async (req, res) => {
    try {
        const { classId } = req.params;
        const data = await GradeModel.getTugasByKelas(classId);
        res.status(200).json({ status: 'success', data });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 3. Input Nilai Tugas
exports.inputNilaiTugas = async (req, res) => {
    try {
        const { id_tugas, id_siswa, nilai } = req.body;
        if (!id_tugas || !id_siswa || nilai === undefined) {
            return res.status(400).json({ message: "Data tidak lengkap" });
        }
        const result = await GradeModel.upsertNilaiTugas({ id_tugas, id_siswa, nilai });
        res.status(200).json({ status: 'success', data: result });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 4. Input Nilai Ujian
exports.inputNilaiUjian = async (req, res) => {
    try {
        const inputData = req.body;
        if (!inputData.id_siswa || !inputData.id_kelas) {
            return res.status(400).json({ message: "ID Siswa dan ID Kelas wajib diisi" });
        }
        const result = await GradeModel.upsertNilaiUjian(inputData);
        res.status(200).json({ status: 'success', data: result });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 5. Import CSV Soal Quiz
exports.importSoalQuiz = async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "File CSV wajib diupload!" });
    
    const { idTugas } = req.params;
    const filePath = req.file.path.replace(/\\/g, '/');
    const results = [];

    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            try {
                const soalList = results.map(row => ({
                    id_tugas: idTugas,
                    pertanyaan: row.pertanyaan || row.Pertanyaan,
                    pilihan_a: row.a || row.A,
                    pilihan_b: row.b || row.B,
                    pilihan_c: row.c || row.C,
                    pilihan_d: row.d || row.D,
                    kunci_jawaban: (row.kunci || row.Kunci || row.jawaban).toLowerCase(),
                    bobot_soal: 10
                }));

                if (soalList.length === 0) throw new Error("CSV kosong/format salah");

                // Panggil Model
                await GradeModel.createSoalQuiz(soalList);
                await GradeModel.updateTugas(idTugas, { file_soal: filePath });

                res.status(200).json({
                    status: 'success',
                    message: `Import ${soalList.length} soal berhasil.`
                });

            } catch (error) {
                if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                res.status(500).json({ message: "Gagal import: " + error.message });
            }
        });
};

// 6. Lihat Submissions (Pengumpulan)
exports.getTaskSubmissions = async (req, res) => {
    try {
        const { idTugas } = req.params;
        
        // Ambil Raw Data dari Model
        const rawData = await GradeModel.getTaskSubmissions(idTugas);

        // Formatting Data (Tugas Controller: Memformat respon untuk Frontend)
        const formatted = rawData.map(item => ({
            id_submission: item.id,
            siswa: {
                id: item.users.id,
                nama: item.users.nama,
                nisn: item.users.nisn
            },
            file_download_url: item.file_url,
            tanggal_kumpul: item.tanggal_kumpul,
            nilai_sekarang: item.nilai
        }));

        res.status(200).json({
            status: 'success',
            results: formatted.length,
            data: formatted
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 7. Edit Tugas
exports.editTugas = async (req, res) => {
    try {
        const { id } = req.params;
        const { nama_tugas, deskripsi, deadline } = req.body;
        
        // Ambil Data Lama via Model
        const oldData = await GradeModel.getTugasById(id);
        if (!oldData) return res.status(404).json({ message: "Tugas tidak ditemukan" });

        const updateData = { nama_tugas, deskripsi, deadline };

        // Logic Ganti File
        if (req.file) {
            updateData.file_soal = req.file.path.replace(/\\/g, '/');
            
            // Hapus file lama fisik
            if (oldData.file_soal) deleteFile(oldData.file_soal);

            // Jika Quiz, Parsing Ulang
            if (oldData.jenis_tugas === 'quiz') {
                await GradeModel.deleteSoalByTugas(id);
                
                // Proses CSV Async
                await new Promise((resolve, reject) => {
                    const results = [];
                    fs.createReadStream(req.file.path)
                        .pipe(csv())
                        .on('data', (d) => results.push(d))
                        .on('end', async () => {
                            try {
                                const soalList = results.map(row => ({
                                    id_tugas: id,
                                    pertanyaan: row.pertanyaan || row.Pertanyaan,
                                    pilihan_a: row.a || row.A,
                                    pilihan_b: row.b || row.B,
                                    pilihan_c: row.c || row.C,
                                    pilihan_d: row.d || row.D,
                                    kunci_jawaban: (row.kunci || row.Kunci || row.jawaban).toLowerCase(),
                                    bobot_soal: 10
                                }));
                                if (soalList.length > 0) await GradeModel.createSoalQuiz(soalList);
                                resolve();
                            } catch (e) { reject(e); }
                        })
                        .on('error', reject);
                });
            }
        }

        // Update DB via Model
        const updated = await GradeModel.updateTugas(id, updateData);
        res.status(200).json({ status: 'success', data: updated });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 8. Hapus Tugas
exports.deleteTugas = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Cek data lama untuk hapus file
        const oldData = await GradeModel.getTugasById(id);
        if (!oldData) return res.status(404).json({ message: "Tugas tidak ditemukan" });

        // Hapus Data di DB (Cascade delete handled by DB usually, or logic in model)
        await GradeModel.deleteTugas(id);

        // Hapus File Fisik
        if (oldData.file_soal) deleteFile(oldData.file_soal);

        res.status(200).json({ status: 'success', message: 'Tugas dihapus.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 9. Get Detail Full
exports.getTaskDetailFull = async (req, res) => {
    try {
        const { idTugas } = req.params;
        const tugas = await GradeModel.getTugasById(idTugas);
        
        let soal = [];
        if (tugas && tugas.jenis_tugas === 'quiz') {
            soal = await GradeModel.getSoalByTugas(idTugas);
        }

        res.status(200).json({ 
            status: 'success', 
            data: { ...tugas, soal_list: soal } 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};