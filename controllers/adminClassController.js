// controllers/adminClassController.js
const ClassModel = require('../models/classModel');

exports.createClass = async (req, res) => {
    try {
        const { nama_kelas, tahun_ajaran } = req.body;

        if (!nama_kelas || !tahun_ajaran) {
            return res.status(400).json({ message: "Nama Kelas & Tahun Ajaran wajib diisi" });
        }

        // Pakai createClass yang sudah ada di model kamu
        // Note: createClass di model kamu mungkin butuh revisi sedikit jika aslinya butuh id_guru.
        // Asumsi: Kita kirim object sesuai kebutuhan insert database
        const data = await ClassModel.createClass({ nama_kelas, tahun_ajaran });

        res.status(201).json({
            status: 'success',
            message: 'Kelas berhasil dibuat oleh Admin',
            data: data
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getAllClasses = async (req, res) => {
    try {
        const data = await ClassModel.getAllClasses(); // Fungsi baru yg kita tambah
        res.status(200).json({ status: 'success', data: data });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteClass = async (req, res) => {
    try {
        const { id } = req.params;
        await ClassModel.deleteClassAdmin(id); // Fungsi baru yg kita tambah
        res.status(200).json({ status: 'success', message: 'Kelas dihapus' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateClass = async (req, res) => {
    try {
        const { id } = req.params;
        const { nama_kelas, tahun_ajaran } = req.body;
        
        const data = await ClassModel.updateClass(id, { nama_kelas, tahun_ajaran });
        res.status(200).json({ status: 'success', message: 'Kelas diupdate', data });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};