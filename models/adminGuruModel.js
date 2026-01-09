// models/adminGuruModel.js
const supabase = require('../config/supabase');

const AdminGuruModel = {
    // 1. Create Guru Baru (Data User)
    createGuruUser: async (userData) => {
        const { data, error } = await supabase
            .from('users')
            .insert([userData])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // 2. Assign Mapel & Kelas (Bisa banyak sekaligus)
    assignMapel: async (assignments) => {
        // assignments bentuknya array: [{id_guru, id_kelas, mata_pelajaran}, ...]
        const { data, error } = await supabase
            .from('guru_mapel_kelas')
            .insert(assignments)
            .select();
        if (error) throw error;
        return data;
    },

    // 3. Hapus Mapel Lama (Untuk keperluan Edit/Update)
    clearMapelGuru: async (id_guru) => {
        const { error } = await supabase
            .from('guru_mapel_kelas')
            .delete()
            .eq('id_guru', id_guru);
        if (error) throw error;
    },

    // 4. Update Data Guru
    updateGuru: async (id, newData) => {
        const { data, error } = await supabase
            .from('users')
            .update(newData)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // 5. Soft Delete (Nonaktifkan)
    softDelete: async (id) => {
        const { data, error } = await supabase
            .from('users')
            .update({ is_active: false }) // Set ke false, jangan dihapus row-nya
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // 6. Simpan Info Dokumen
    saveDocument: async (docData) => {
        const { data, error } = await supabase
            .from('teacher_documents')
            .insert([docData])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // 7. Ambil Statistik Dashboard (BARU)
    getDashboardStats: async () => {
        // Hitung Guru Aktif
        const { count: guruCount, error: errGuru } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true }) // head: true artinya cuma hitung jumlah, gak ambil data
            .eq('role', 'guru')
            .eq('is_active', true);
        
        // Hitung Siswa Aktif
        const { count: siswaCount, error: errSiswa } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'siswa')
            .eq('is_active', true);

        // Hitung Jumlah Kelas
        const { count: kelasCount, error: errKelas } = await supabase
            .from('classes')
            .select('*', { count: 'exact', head: true });

        if (errGuru || errSiswa || errKelas) throw new Error("Gagal mengambil statistik");

        return {
            total_guru: guruCount || 0,
            total_siswa: siswaCount || 0,
            total_kelas: kelasCount || 0
        };
    },

    sendBulkNotification: async (notifications) => {
        // notifications: Array of object [{id_siswa, judul, pesan, link_url, tipe}, ...]
        // Note: Kolom id_siswa di tabel notifications mereferensi ke users(id), jadi bisa dipakai untuk guru juga.
        const { data, error } = await supabase
            .from('notifications')
            .insert(notifications)
            .select();
        
        if (error) throw error;
        return data;
    }
    
};

module.exports = AdminGuruModel;