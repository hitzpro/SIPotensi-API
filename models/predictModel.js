const supabase = require('../config/supabase');

const PredictModel = {

    getStudentsByClass: async (classId) => {
        const { data, error } = await supabase
            .from('class_students')
            .select('id_siswa, users:id_siswa(nama, nisn)')
            .eq('id_kelas', classId);
        if (error) throw error;
        return data;
    },

    getTasksByClass: async (classId) => {
        const { data, error } = await supabase
            .from('tugas').select('id').eq('id_kelas', classId);
        if (error) throw error;
        return data;
    },

    getTaskGrades: async (studentId, taskIds) => {
        const { data, error } = await supabase
            .from('nilai_tugas').select('nilai')
            .eq('id_siswa', studentId).in('id_tugas', taskIds).not('nilai', 'is', null);
        if (error) throw error;
        return data;
    },

    getExamGrade: async (studentId, classId) => {
        const { data, error } = await supabase
            .from('nilai_ujian').select('nilai_uts, nilai_uas')
            .eq('id_kelas', classId).eq('id_siswa', studentId).maybeSingle();
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    },

    // === PERBAIKAN DI SINI ===
    savePredictions: async (predictionData) => {
        // predictionData berisi: { id_siswa, id_kelas, cluster_id, risk_label, status_ui, recommendation, created_at }
        
        const { error } = await supabase
            .from('prediction_results') // Pastikan nama tabel ini benar
            .upsert(predictionData, { 
                onConflict: 'id_siswa, id_kelas' // Kunci unik agar data terupdate, bukan duplikat
            });
            
        if (error) {
            console.error("Supabase Save Error:", error);
            throw error;
        }
    }
};

module.exports = PredictModel;