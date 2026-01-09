const path = require('path');
const fs = require('fs');

exports.getFile = (req, res) => {
    try {
        // Ambil path dari query parameter
        // Frontend mengirim path lengkap yang ada di DB
        const filePath = req.query.path;

        if (!filePath) {
            return res.status(400).send('Path tidak ditemukan');
        }

        // Keamanan Sederhana: Pastikan file ada
        if (!fs.existsSync(filePath)) {
            return res.status(404).send('File fisik tidak ditemukan di server (Mungkin sudah terhapus dari folder Temp)');
        }

        // Sajikan file
        res.sendFile(filePath);

    } catch (error) {
        console.error("File Error:", error);
        res.status(500).send('Gagal mengambil file');
    }
};