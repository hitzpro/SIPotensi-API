const supabase = require('../config/supabase');

const DashboardModel = {
    // === FITUR DASHBOARD GURU ===

    // 1. Ambil Data Kelas milik Guru (ID saja cukup untuk logic selanjutnya)
    getClassesByGuru: async (guruId) => {
        const { data, error } = await supabase
            .from('classes')
            .select('id')
            .eq('id_guru', guruId);
        
        if (error) throw error;
        return data; // Mengembalikan array of objects: [{ id: 1 }, { id: 2 }]
    },

    // 2. Hitung Total Siswa di dalam list kelas tersebut
    countTotalStudents: async (classIds) => {
        if (!classIds || classIds.length === 0) return 0;

        const { count, error } = await supabase
            .from('class_students')
            .select('*', { count: 'exact', head: true }) // head: true artinya cuma ambil jumlah, hemat bandwidth
            .in('id_kelas', classIds);

        if (error) throw error;
        return count;
    },

    // 3. Hitung Siswa yang Datanya Belum Lengkap (Logic: Total Siswa - Siswa yg sudah ada nilai)
    getIncompleteCount: async (classIds) => {
        if (!classIds || classIds.length === 0) return 0;

        // Kita jalankan 2 request sekaligus biar cepat (Parallel)
        const [allStudents, exams] = await Promise.all([
            // Ambil semua siswa
            supabase
                .from('class_students')
                .select('id_siswa')
                .in('id_kelas', classIds),
            
            // Ambil data nilai ujian yang ada
            supabase
                .from('nilai_ujian')
                .select('id_siswa')
                .in('id_kelas', classIds)
        ]);

        if (allStudents.error) throw allStudents.error;
        if (exams.error) throw exams.error;

        // Proses Filter di sisi server (Node.js)
        const studentsWithExam = new Set(exams.data.map(e => e.id_siswa));
        const incompleteCount = allStudents.data.filter(s => !studentsWithExam.has(s.id_siswa)).length;

        return incompleteCount;
    }
};

module.exports = DashboardModel;