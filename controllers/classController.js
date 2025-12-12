// controllers/classController.js
const ClassModel = require('../models/classModel');
const fs = require('fs');
const csv = require('csv-parser');
const bcrypt = require('bcryptjs');
const UserModel = require('../models/userModel');

exports.createClass = async (req, res) => {
    try {
        const { nama_kelas, tahun_ajaran } = req.body;
        const id_guru = req.user.id; // Diambil otomatis dari Token (Auth Middleware)

        // 1. Validasi Input
        if (!nama_kelas || !tahun_ajaran) {
            return res.status(400).json({ 
                message: "Nama Kelas dan Tahun Ajaran wajib diisi!" 
            });
        }

        // 2. Panggil Model
        const newClass = await ClassModel.createClass({
            id_guru,
            nama_kelas,
            tahun_ajaran
        });

        // 3. Response Sukses
        res.status(201).json({
            status: 'success',
            message: 'Kelas berhasil dibuat',
            data: newClass
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getMyClasses = async (req, res) => {
    try {
        const id_guru = req.user.id;
        const classes = await ClassModel.getClassesByGuru(id_guru);

        res.status(200).json({
            status: 'success',
            results: classes.length,
            data: classes // Di sini sudah ada field jumlah_siswa & jumlah_tugas
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getClassStats = async (req, res) => {
    try {
        const { id } = req.params; // ID Kelas
        const stats = await ClassModel.getClassStats(id);

        res.status(200).json({
            status: 'success',
            data: stats
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.importStudents = async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "File wajib diupload" });
    const classId = req.params.id;
    const results = [];
    
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            try {
                let successCount = 0;
                
                for (const row of results) {
                    const { nama, nisn } = row;
                    if (!nama || !nisn) continue;

                    // 1. Generate Password Hash (Default: NISN)
                    // (Password akan direset ke NISN setiap kali upload ulang, 
                    // atau kamu bisa cek kalau user udah ada, password jangan diubah.
                    // Disini kita asumsikan reset password biar gampang maintenance)
                    const salt = await bcrypt.genSalt(10);
                    const passwordHash = await bcrypt.hash(nisn.toString(), salt);

                    // 2. UPSERT USER (Update kalau ada, Insert kalau baru)
                    const student = await UserModel.upsertSiswa({
                        nama: nama,
                        nisn: nisn.toString(),
                        role: 'siswa',
                        password_hash: passwordHash // Password ter-reset jadi NISN
                    });

                    // 3. Masukkan ke Kelas (Ignore if already in class)
                    await ClassModel.addStudentToClass(classId, student.id);
                    successCount++;
                }
                
                fs.unlinkSync(req.file.path);
                res.status(200).json({ 
                    status: 'success', 
                    message: `Data berhasil diperbarui/ditambahkan: ${successCount} siswa.` 
                });

            } catch (error) {
                res.status(500).json({ message: error.message });
            }
        });
};

// A. Edit Data Siswa (Nama/NISN)
exports.editStudentData = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { nama, nisn } = req.body; // Data baru

        const updatedUser = await UserModel.updateUser(studentId, { nama, nisn });
        
        res.status(200).json({ status: 'success', message: 'Data siswa diupdate', data: updatedUser });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// B. Hapus Siswa dari Kelas
exports.removeStudent = async (req, res) => {
    try {
        const { id, studentId } = req.params; // id = classId
        await ClassModel.removeStudentFromClass(id, studentId);
        res.status(200).json({ status: 'success', message: 'Siswa dihapus dari kelas' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// C. Lihat History Nilai Siswa
exports.getStudentDetail = async (req, res) => {
    try {
        const { id, studentId } = req.params;
        const history = await ClassModel.getStudentHistory(id, studentId);
        res.status(200).json({ status: 'success', data: history });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteClass = async (req, res) => {
    try {
        const { id } = req.params; // ID Kelas dari URL
        const id_guru = req.user.id; // ID Guru dari Token

        await ClassModel.deleteClass(id, id_guru);

        res.status(200).json({
            status: 'success',
            message: 'Kelas berhasil dihapus beserta seluruh data di dalamnya.'
        });

    } catch (error) {
        // Cek error message untuk status code yang pas
        if (error.message.includes("tidak ditemukan")) {
            return res.status(404).json({ message: error.message });
        }
        res.status(500).json({ message: error.message });
    }
};

exports.getClassStudents = async (req, res) => {
    try {
        const { id } = req.params;
        const students = await ClassModel.getClassStudents(id);
        res.status(200).json({ status: 'success', data: students });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


exports.bulkRemoveStudents = async (req, res) => {
    try {
        const { id } = req.params; // Class ID
        const { studentIds } = req.body; // Array of IDs [1, 2, 3]

        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            return res.status(400).json({ message: "Tidak ada siswa yang dipilih" });
        }

        // Panggil Model
        await ClassModel.removeStudentsBulk(id, studentIds);

        res.status(200).json({ 
            status: 'success', 
            message: `${studentIds.length} siswa berhasil dihapus.` 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};