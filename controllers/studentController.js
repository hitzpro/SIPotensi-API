const fs = require('fs');
const StudentModel = require('../models/studentModel');
const GradeModel = require('../models/gradeModel'); 

// 1. DASHBOARD & PROFIL
exports.getDashboard = async (req, res) => {
    try {
        const studentId = req.user.id;
        const myName = req.user.nama;

        // Parallel Fetch: Ambil User Profile & Class Info bersamaan
        const [userProfile, classInfo] = await Promise.all([
            StudentModel.getUserProfile(studentId),
            StudentModel.getMyClassInfo(studentId)
        ]);

        // Jika belum masuk kelas
        if (!classInfo) {
            return res.status(200).json({
                status: 'success',
                message: 'Kamu belum terdaftar di kelas manapun.',
                data: { 
                    nama: myName, 
                    nisn: userProfile?.nisn || '-', 
                    kelas: '-',
                    foto_profil: userProfile?.foto_profil 
                }
            });
        }

        const isLengkap = classInfo.nilai_uts && classInfo.nilai_uas;

        res.status(200).json({
            status: 'success',
            data: {
                nama: myName,
                nisn: userProfile?.nisn || '-', 
                kelas: classInfo.classes.nama_kelas,
                foto_profil: userProfile?.foto_profil,
                guru: classInfo.classes.users.nama,
                status_nilai: isLengkap ? "Lengkap" : "Belum Lengkap",
                nilai_akademik: {
                    rata_tugas: classInfo.rata_tugas,
                    uts: classInfo.nilai_uts,
                    uas: classInfo.nilai_uas
                }
            }
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 2. LIHAT TUGAS SAYA (List)
exports.getMyTasks = async (req, res) => {
    try {
        const studentId = req.user.id;
        
        const classInfo = await StudentModel.getMyClassInfo(studentId);
        if (!classInfo) return res.status(400).json({ message: "Belum masuk kelas" });

        const tasks = await StudentModel.getMyTasks(classInfo.id_kelas, studentId);

        res.status(200).json({
            status: 'success',
            results: tasks.length,
            data: tasks
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 3. BUKA SOAL (Halaman "Kerjakan Tugas")
exports.getTaskDetail = async (req, res) => {
    try {
        const { idTugas } = req.params;
        const studentId = req.user.id;

        // 1. Parallel Fetch: Header Tugas & Status Submission
        const [task, submission] = await Promise.all([
            StudentModel.getTaskById(idTugas),
            StudentModel.getSubmission(idTugas, studentId)
        ]);

        if (!task) return res.status(404).json({ message: "Tugas tidak ditemukan" });

        let detail = { ...task, submission: submission || null };

        // 2. Jika Quiz, ambil soalnya
        if (task.jenis_tugas === 'quiz') {
            const questions = await StudentModel.getQuizQuestions(idTugas);
            detail.soal = questions;
        }

        res.status(200).json({ status: 'success', data: detail });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 4. SUBMIT TUGAS (Quiz & Upload)
exports.submitTask = async (req, res) => {
    try {
        const studentId = req.user.id;
        const { idTugas } = req.params;
        const { jenis_pengerjaan } = req.body;

        // 1. Cek Deadline via Model
        const task = await StudentModel.getTaskById(idTugas);
        if (!task) return res.status(404).json({ message: "Tugas tidak ditemukan" });

        // Logic Deadline
        if (task.deadline) {
            const now = new Date();
            const deadline = new Date(task.deadline);

            if (now > deadline) {
                // Hapus file fisik jika terlanjur upload
                if (req.file && req.file.path) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(400).json({ 
                    status: 'error',
                    message: `Batas waktu pengumpulan habis pada ${deadline.toLocaleString()}` 
                });
            }
        }

        // 2. Proses Submit
        if (jenis_pengerjaan === 'quiz') {
             const { jawaban_siswa } = req.body;
             // Ambil Kunci Jawaban
             const kunci = await StudentModel.getQuizKeys(idTugas);
             
             // Auto Koreksi
             let totalScore = 0;
             kunci.forEach(soal => {
                 const jawab = jawaban_siswa[soal.id];
                 if (jawab && jawab === soal.kunci_jawaban) {
                     // Bobot soal bisa dinamis atau rata
                     totalScore += (100 / kunci.length);
                 }
             });
             totalScore = Math.round(totalScore);

             // Simpan Nilai
             await GradeModel.upsertNilaiTugas({
                 id_tugas: idTugas,
                 id_siswa: studentId,
                 nilai: totalScore,
                 jawaban_siswa: jawaban_siswa,
                 tanggal_kumpul: new Date()
             });

             return res.status(200).json({
                 status: 'success',
                 message: `Quiz selesai! Nilai kamu: ${totalScore}`,
                 nilai: totalScore
             });

        } else {
            // Upload File
            if (!req.file) return res.status(400).json({ message: "File wajib diupload" });

            await GradeModel.upsertNilaiTugas({
                id_tugas: idTugas,
                id_siswa: studentId,
                nilai: null, 
                file_url: req.file.path.replace(/\\/g, "/"), // Normalize path
                tanggal_kumpul: new Date()
            });

            return res.status(200).json({
                status: 'success',
                message: "Tugas berhasil dikumpulkan tepat waktu."
            });
        }

    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ message: error.message });
    }
};

// 5. Upload Profile Photo
exports.uploadPhoto = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const studentId = req.user.id;
        const normalizedPath = req.file.path.replace(/\\/g, "/");
        
        const updatedUser = await StudentModel.updatePhoto(studentId, normalizedPath);

        res.status(200).json({
            status: 'success',
            message: 'Foto profil berhasil diperbarui',
            data: { foto_profil: updatedUser.foto_profil }
        });

    } catch (error) {
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ message: error.message });
    }
};

// 6. Update Password
exports.updatePassword = async (req, res) => {
    try {
        const studentId = req.user.id;
        const { password } = req.body;

        if (!password || password.length < 6) {
            return res.status(400).json({ message: 'Password minimal 6 karakter' });
        }

        await StudentModel.updatePassword(studentId, password);

        res.status(200).json({
            status: 'success',
            message: 'Password berhasil diubah'
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};