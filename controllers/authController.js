// controllers/authController.js
const UserModel = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
    try {
        // Terima input: email (untuk guru), nisn (untuk siswa), dan password
        const { email, nisn, password } = req.body;

        // 1. Validasi Input Dasar
        if (!password) {
            return res.status(400).json({ message: "Password wajib diisi!" });
        }
        if (!email && !nisn) {
            return res.status(400).json({ message: "Email atau NISN wajib diisi!" });
        }

        let user = null;

        // 2. Logika Percabangan (Guru vs Siswa)
        if (email) {
            // --- JALUR GURU ---
            user = await UserModel.findByEmail(email);
        } else if (nisn) {
            // --- JALUR SISWA ---
            user = await UserModel.findByNISN(nisn);
        }

        // 3. Cek apakah user ditemukan
        if (!user) {
            return res.status(401).json({ message: "Akun tidak ditemukan." });
        }

        // 4. Verifikasi Password
        // (Ingat: Siswa passwordnya adalah hash dari NISN, Guru hash dari password buatannya)
        // Karena dua-duanya di-hash pakai bcrypt, kita pakai cara cek yang sama.
        const isMatch = await bcrypt.compare(password, user.password_hash);
        
        if (!isMatch) {
            return res.status(401).json({ message: "Password salah!" });
        }

        // 5. Generate Token JWT (Payloadnya sama untuk Guru & Siswa)
        const token = jwt.sign(
            { 
                id: user.id, 
                role: user.role, 
                nama: user.nama,
                nisn: user.nisn 
            },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        // 6. Kirim Respon
        res.status(200).json({
            status: 'success',
            message: `Login berhasil sebagai ${user.role}`,
            token: token,
            user: {
                id: user.id,
                nama: user.nama,
                email: user.email, // Akan null kalau siswa
                nisn: user.nisn,   // Akan null kalau guru
                role: user.role
            }
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Terjadi kesalahan server" });
    }
};

exports.logout = async (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Logout berhasil. Hapus token di client.'
    });
};