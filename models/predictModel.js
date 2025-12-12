const supabase = require('../config/supabase');

const PredictModel = {
    // === HELPER QUERY ===

    // 1. Ambil daftar siswa di kelas tertentu
    getStudentsByClass: async (classId) => {
        const { data, error } = await supabase
            .from('class_students')
            .select('id_siswa, users:id_siswa(nama, nisn)')
            .eq('id_kelas', classId);
        
        if (error) throw error;
        return data;
    },

    // 2. Ambil daftar tugas di kelas tertentu (Untuk cek guru udah bikin tugas blm)
    getTasksByClass: async (classId) => {
        const { data, error } = await supabase
            .from('tugas')
            .select('id')
            .eq('id_kelas', classId);
            
        if (error) throw error;
        return data;
    },

    // 3. Ambil nilai tugas siswa berdasarkan list ID Tugas
    getTaskGrades: async (studentId, taskIds) => {
        const { data, error } = await supabase
            .from('nilai_tugas')
            .select('nilai')
            .eq('id_siswa', studentId)
            .in('id_tugas', taskIds)
            .not('nilai', 'is', null); // Hanya ambil yang sudah dinilai

        if (error) throw error;
        return data;
    },

    // 4. Ambil nilai ujian (UTS/UAS) siswa
    getExamGrade: async (studentId, classId) => {
        const { data, error } = await supabase
            .from('nilai_ujian')
            .select('nilai_uts, nilai_uas')
            .eq('id_kelas', classId)
            .eq('id_siswa', studentId)
            .maybeSingle(); // Pakai maybeSingle biar gak error kalau null
            
        if (error && error.code !== 'PGRST116') throw error; // Ignore not found error
        return data;
    },

    // === ACTION QUERY ===

    // 5. Simpan Hasil Prediksi (Bulk Upsert)
    savePredictions: async (predictionData) => {
        // predictionData: Array of Objects
        const { error } = await supabase
            .from('prediction_results')
            .upsert(predictionData, { onConflict: 'id_siswa, id_kelas' });
            
        if (error) throw error;
    }
};

module.exports = PredictModel;