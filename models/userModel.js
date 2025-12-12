// models/userModel.js
const supabase = require('../config/supabase');

const UserModel = {
    // 1. Cari user berdasarkan Email (Khusus Guru)
    findByEmail: async (email) => {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    },

    // 2. Cari user berdasarkan NISN (Khusus Siswa) -- [TAMBAHAN BARU]
    findByNISN: async (nisn) => {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('nisn', nisn)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    },

    // 3. Create User (Dipakai saat Seed / Import CSV)
    createUser: async (userData) => {
        const { data, error } = await supabase
            .from('users')
            .insert([userData])
            .select();
        
        if (error) throw error;
        return data[0];
    },
    // [BARU] Create OR Update User Siswa
    upsertSiswa: async (userData) => {
        // userData: { nama, nisn, role, password_hash }
        const { data, error } = await supabase
            .from('users')
            .upsert(userData, { onConflict: 'nisn' }) // Kuncinya di sini: Cek NISN
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },

    // [BARU] Update Data Siswa Manual (Edit)
    updateUser: async (id, newData) => {
        const { data, error } = await supabase
            .from('users')
            .update(newData)
            .eq('id', id)
            .select();
        if (error) throw error;
        return data;
    },
    
    // [BARU] Hapus Siswa dari Tabel Users (Hati-hati, ini menghapus permanen)
    // Biasanya yang dihapus cuma relasi kelasnya saja. 
    // Tapi kalau mau hapus user total:
    deleteUser: async (id) => {
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) throw error;
    }
};

module.exports = UserModel;