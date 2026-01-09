// controllers/adminClassController.js
const supabase = require('../config/supabase');

exports.createClass = async (req, res) => {
    try {
        const { nama_kelas, tahun_ajaran } = req.body;

        if (!nama_kelas || !tahun_ajaran) {
            return res.status(400).json({ message: "Nama Kelas & Tahun Ajaran wajib diisi" });
        }

        const { data, error } = await supabase
            .from('classes')
            .insert([{ nama_kelas, tahun_ajaran }])
            .select()
            .single();

        if (error) throw error;

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
        // Admin butuh melihat SEMUA kelas untuk dropdown
        const { data, error } = await supabase
            .from('classes')
            .select('*')
            .order('nama_kelas', { ascending: true });

        if (error) throw error;

        res.status(200).json({
            status: 'success',
            data: data
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteClass = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase.from('classes').delete().eq('id', id);
        if (error) throw error;
        res.status(200).json({ status: 'success', message: 'Kelas dihapus' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};