// seed_guru.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const UserModel = require('./models/userModel');

const seedGuru = async () => {
    const passwordRaw = "guru123"; // Password login nanti
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(passwordRaw, salt);

    const newGuru = {
        nama: "Budi Santoso",
        email: "guru@sekolah.id",
        password_hash: passwordHash,
        role: "guru",
        nisn: null // Guru tidak punya NISN
    };

    try {
        const user = await UserModel.createUser(newGuru);
        console.log("SUKSES! Data Guru berhasil dibuat:");
        console.log(user);
    } catch (error) {
        console.error("GAGAL insert guru:", error.message);
    }
};

seedGuru();