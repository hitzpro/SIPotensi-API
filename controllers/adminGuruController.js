// controllers/adminGuruController.js
const AdminGuruModel = require('../models/adminGuruModel');
const bcrypt = require('bcryptjs');
const path = require('path');

// A. TAMBAH GURU BARU + MAPEL
exports.addGuru = async (req, res) => {
    try {
        const { nama, email, password, mapel_list } = req.body;
        // mapel_list contoh: [{ "id_kelas": "...", "mata_pelajaran": "Matematika" }, ...]

        if (!nama || !email || !password) {
            return res.status(400).json({ message: "Data utama (nama, email, password) wajib diisi" });
        }

        // 1. Hash Password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // 2. Insert ke Tabel Users
        const newUser = await AdminGuruModel.createGuruUser({
            nama,
            email,
            password_hash,
            role: 'guru',
            is_active: true
        });

        // 3. Insert ke Tabel Mapel (Jika ada input mapel)
        let mapelData = [];
        if (mapel_list && mapel_list.length > 0) {
            const assignments = mapel_list.map(item => ({
                id_guru: newUser.id,
                id_kelas: item.id_kelas,
                mata_pelajaran: item.mata_pelajaran
            }));
            mapelData = await AdminGuruModel.assignMapel(assignments);
        }

        res.status(201).json({
            status: 'success',
            message: 'Guru berhasil ditambahkan',
            data: {
                guru: newUser,
                mengajar: mapelData
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message || "Terjadi kesalahan server" });
    }
};

// B. EDIT DATA GURU & MAPEL
exports.updateGuru = async (req, res) => {
    try {
        const { id } = req.params;
        const { nama, email, password, mapel_list } = req.body;

        // 1. Siapkan object update
        let updateData = {};
        if (nama) updateData.nama = nama;
        if (email) updateData.email = email;
        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password_hash = await bcrypt.hash(password, salt);
        }

        // 2. Update Data User
        const updatedUser = await AdminGuruModel.updateGuru(id, updateData);

        // 3. Update Mapel (Konsep: Hapus semua mapel lama -> Masukkan mapel baru)
        // Ini cara paling aman agar tidak duplikat
        let mapelData = [];
        if (mapel_list) {
            await AdminGuruModel.clearMapelGuru(id); // Hapus yg lama
            
            if (mapel_list.length > 0) {
                const assignments = mapel_list.map(item => ({
                    id_guru: id,
                    id_kelas: item.id_kelas,
                    mata_pelajaran: item.mata_pelajaran
                }));
                mapelData = await AdminGuruModel.assignMapel(assignments);
            }
        }

        res.status(200).json({
            status: 'success',
            message: 'Data Guru berhasil diperbarui',
            data: updatedUser
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Gagal update guru" });
    }
};

// C. SOFT DELETE GURU
exports.deactivateGuru = async (req, res) => {
    try {
        const { id } = req.params;
        await AdminGuruModel.softDelete(id);
        
        res.status(200).json({
            status: 'success',
            message: 'Guru berhasil dinonaktifkan (Soft Delete).'
        });
    } catch (error) {
        res.status(500).json({ message: "Gagal menonaktifkan guru" });
    }
};

// D. KIRIM DOKUMEN (CSV) KE GURU
exports.sendDocumentToGuru = async (req, res) => {
    try {
        const { id_guru } = req.body;
        
        // 1. Validasi File
        if (!req.file) {
            return res.status(400).json({ message: "File CSV wajib diupload" });
        }
        
        // Validasi ekstensi manual (optional, jika multer belum filter)
        const ext = path.extname(req.file.originalname).toLowerCase();
        if (ext !== '.csv') {
            return res.status(400).json({ message: "Format file harus CSV!" });
        }

        // 2. Generate URL File (Sesuaikan dengan setup server static kamu)
        // Misal di app.js kamu: app.use('/uploads', express.static('uploads'))
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

        // 3. Simpan ke Database
        const docData = await AdminGuruModel.saveDocument({
            id_guru: id_guru,
            judul_dokumen: req.body.judul || "Dokumen Admin",
            file_url: fileUrl
        });

        res.status(200).json({
            status: 'success',
            message: 'Dokumen berhasil dikirim ke Guru',
            data: docData
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Gagal mengirim dokumen" });
    }
};

// E. GET DASHBOARD STATS (BARU)
exports.getDashboardStats = async (req, res) => {
    try {
        const stats = await AdminGuruModel.getDashboardStats();
        
        res.status(200).json({
            status: 'success',
            data: stats
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Gagal memuat statistik dashboard" });
    }
};

// F. GET ALL GURU (BESERTA MAPEL)
exports.getAllGuru = async (req, res) => {
    try {
        const supabase = require('../config/supabase'); // Pastikan path config benar

        // 1. Ambil semua user dengan role guru & aktif
        const { data: gurus, error } = await supabase
            .from('users')
            .select('id, nama, email, nisn')
            .eq('role', 'guru')
            .eq('is_active', true)
            .order('nama', { ascending: true });

        if (error) throw error;

        // 2. Ambil data mapel untuk setiap guru (Manual Populate karena Supabase Join kadang tricky tanpa setup foreign key alias)
        // Kita pakai Promise.all agar parallel dan cepat
        const enrichedGurus = await Promise.all(gurus.map(async (guru) => {
            const { data: mapels } = await supabase
                .from('guru_mapel_kelas')
                .select(`
                    mata_pelajaran,
                    classes (id, nama_kelas)
                `)
                .eq('id_guru', guru.id);
            
            // Format mapel jadi string yang enak dibaca frontend
            // Contoh: "Matematika (10 A), Fisika (10 B)"
            const mapelList = mapels.map(m => ({
                id_kelas: m.classes?.id,
                nama_kelas: m.classes?.nama_kelas,
                mapel: m.mata_pelajaran
            }));

            return { ...guru, mengajar: mapelList };
        }));

        res.status(200).json({
            status: 'success',
            data: enrichedGurus
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Gagal mengambil data guru" });
    }
};

// G. BROADCAST DOKUMEN KE GURU (Via Notifikasi)
exports.broadcastDocument = async (req, res) => {
    try {
        const { target_ids, judul, pesan } = req.body;
        
        // 1. Validasi File
        if (!req.file) {
            return res.status(400).json({ message: "File dokumen wajib diupload" });
        }
        
        // 2. Validasi Target
        // target_ids dikirim sebagai JSON String dari FormData, jadi harus di-parse
        let targets = [];
        try {
            targets = JSON.parse(target_ids);
        } catch (e) {
            return res.status(400).json({ message: "Format target guru tidak valid" });
        }

        if (!targets || targets.length === 0) {
            return res.status(400).json({ message: "Pilih minimal satu guru penerima" });
        }

        // 3. Generate File URL
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

        // 4. Siapkan Data Notifikasi
        const notifications = targets.map(id_guru => ({
            id_siswa: id_guru, // Menggunakan kolom id_siswa (foreign key users)
            judul: judul || "Dokumen Baru dari Admin",
            pesan: pesan || "Admin telah mengirimkan dokumen untuk Anda. Silakan unduh melalui link berikut.",
            link_url: fileUrl,
            tipe: 'download',
            is_read: false
        }));

        // 5. Bulk Insert ke Database
        await AdminGuruModel.sendBulkNotification(notifications);

        res.status(200).json({
            status: 'success',
            message: `Dokumen berhasil dikirim ke ${targets.length} guru via notifikasi.`
        });

    } catch (error) {
        console.error("Broadcast Error:", error);
        res.status(500).json({ message: "Gagal mengirim dokumen" });
    }
};

exports.getPredictionsByClass = async (req, res) => {
    try {
        const { id_kelas } = req.params;
        
        // Panggil Model (Pastikan AdminGuruModel sudah di-update juga)
        const rawData = await AdminGuruModel.getStudentsWithPredictions(id_kelas);

        // Format Data untuk Frontend
        const formattedData = rawData.map(item => {
            // Cek apakah ada data prediksi (array tidak kosong)
            const pred = (item.prediction_results && item.prediction_results.length > 0) 
                ? item.prediction_results[0] 
                : null;
            
            // Ambil nilai ujian (safe check)
            const ujian = (item.nilai_ujian && item.nilai_ujian.length > 0)
                ? item.nilai_ujian[0]
                : { nilai_uts: 0, nilai_uas: 0 };
            
            // Hitung Simple Nilai Akhir: (UTS + UAS) / 2
            const nilaiAkhir = ((ujian.nilai_uts + ujian.nilai_uas) / 2).toFixed(1);

            return {
                id_siswa: item.id_siswa,
                nama: item.users?.nama,
                nisn: item.users?.nisn,
                is_predicted: !!pred, // True jika pred tidak null
                status_ui: pred ? pred.status_ui : 'Belum Diprediksi',
                recommendation: pred ? pred.recommendation : '-',
                nilai_akhir: pred ? nilaiAkhir : 0
            };
        });

        res.status(200).json({
            status: 'success',
            data: formattedData
        });

    } catch (error) {
        console.error("Error getPredictionsByClass:", error.message);
        res.status(500).json({ message: "Gagal mengambil data prediksi siswa" });
    }
};