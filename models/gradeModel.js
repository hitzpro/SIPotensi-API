const supabase = require('../config/supabase');

const GradeModel = {
    // === FITUR TUGAS (CREATE & UPDATE) ===
    
    // Buat Slot Tugas Baru
    createTugas: async (data) => {
        const { data: res, error } = await supabase
            .from('tugas')
            .insert([data])
            .select()
            .single(); // Pakai single() biar langsung dapat object, bukan array
        if (error) throw error;
        return res;
    },

    // Simpan Soal Quiz (Bulk Insert)
    createSoalQuiz: async (soalArray) => {
        const { data, error } = await supabase
            .from('soal_quiz')
            .insert(soalArray)
            .select();
        if (error) throw error;
        return data;
    },

    // Update Tugas
    updateTugas: async (id, data) => {
        const { data: res, error } = await supabase
            .from('tugas')
            .update(data)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return res;
    },

    // Hapus Tugas
    deleteTugas: async (id) => {
        const { error } = await supabase
            .from('tugas')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // === FITUR READ (GET DATA) ===

    // Ambil 1 Tugas by ID
    getTugasById: async (id) => {
        const { data, error } = await supabase
            .from('tugas')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    },

    // Ambil daftar tugas di suatu kelas
    getTugasByKelas: async (classId) => {
        const { data, error } = await supabase
            .from('tugas')
            .select('*')
            .eq('id_kelas', classId)
            // Ganti 'tanggal' dengan 'id' atau 'created_at' jika 'tanggal' belum ada di DB
            .order('tanggal', { ascending: false }); 
        
        if (error) throw error;
        return data;
    },

    // Ambil Soal Quiz
    getSoalByTugas: async (tugasId) => {
        const { data, error } = await supabase
            .from('soal_quiz')
            .select('*')
            .eq('id_tugas', tugasId);
        if (error) throw error;
        return data;
    },

    // Ambil Submission (Pengumpulan Tugas) + Data Siswa
    getTaskSubmissions: async (tugasId) => {
        const { data, error } = await supabase
            .from('nilai_tugas')
            .select(`
                id,
                nilai,
                file_url,
                tanggal_kumpul,
                users:id_siswa ( id, nama, nisn )
            `)
            .eq('id_tugas', tugasId)
            .order('tanggal_kumpul', { ascending: false });

        if (error) throw error;
        return data;
    },

    // === FITUR NILAI ===

    // Input/Update Nilai Tugas Siswa
    upsertNilaiTugas: async (nilaiData) => {
        const { data, error } = await supabase
            .from('nilai_tugas')
            .upsert(nilaiData, { onConflict: 'id_tugas, id_siswa' }) 
            .select();
        if (error) throw error;
        return data;
    },

    // Input/Update Nilai Ujian
    upsertNilaiUjian: async (ujianData) => {
        const { data, error } = await supabase
            .from('nilai_ujian')
            .upsert(ujianData, { onConflict: 'id_siswa, id_kelas' })
            .select();
        if (error) throw error;
        return data;
    },

    // === HELPER QUERY (Untuk Logic Controller) ===
    
    deleteSoalByTugas: async (tugasId) => {
        const { error } = await supabase
            .from('soal_quiz')
            .delete()
            .eq('id_tugas', tugasId);
        if (error) throw error;
    },

    // Ambil ID Siswa dalam satu kelas (Untuk target notifikasi)
    getStudentIdsInClass: async (classId) => {
        const { data, error } = await supabase
            .from('class_students')
            .select('id_siswa')
            .eq('id_kelas', classId);
        
        if (error) throw error;
        return data.map(s => s.id_siswa);
    },

    // Ambil data Push Subscription user tertentu
    getPushSubscriptionsByUserIds: async (userIds) => {
        const { data, error } = await supabase
            .from('push_subscriptions')
            .select('*')
            .in('user_id', userIds);
            
        if (error) throw error;
        return data;
    }
};

module.exports = GradeModel;