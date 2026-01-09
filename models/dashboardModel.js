const supabase = require('../config/supabase');

const DashboardModel = {
    // 1. Ambil Data Kelas Berdasarkan Penugasan Admin (guru_mapel_kelas)
    getClassesByGuru: async (guruId) => {
        // Kita ambil data dari tabel relasi guru_mapel_kelas
        // Lalu kita join ke tabel classes untuk dapat nama kelasnya
        const { data, error } = await supabase
            .from('guru_mapel_kelas')
            .select(`
                id_kelas,
                classes:id_kelas (id, nama_kelas, tahun_ajaran)
            `)
            .eq('id_guru', guruId);
        
        if (error) throw error;

        // Data akan duplicate jika guru mengajar 2 mapel di kelas yg sama.
        // Kita filter supaya kelasnya unik (distinct)
        const uniqueClasses = [];
        const seenIds = new Set();

        data.forEach(item => {
            if (item.classes && !seenIds.has(item.classes.id)) {
                seenIds.add(item.classes.id);
                uniqueClasses.push(item.classes);
            }
        });

        return uniqueClasses; // Array of objects: [{id, nama_kelas, tahun_ajaran}, ...]
    },

    // 2. Hitung Total Siswa (Logic tetap sama)
    countTotalStudents: async (classIds) => {
        if (!classIds || classIds.length === 0) return 0;

        const { count, error } = await supabase
            .from('class_students')
            .select('*', { count: 'exact', head: true })
            .in('id_kelas', classIds);

        if (error) throw error;
        return count;
    },

    // 3. Hitung Incomplete (Logic tetap sama)
    getIncompleteCount: async (classIds) => {
        if (!classIds || classIds.length === 0) return 0;

        const [allStudents, exams] = await Promise.all([
            supabase
                .from('class_students')
                .select('id_siswa')
                .in('id_kelas', classIds),
            
            supabase
                .from('nilai_ujian')
                .select('id_siswa')
                .in('id_kelas', classIds)
        ]);

        if (allStudents.error) throw allStudents.error;
        if (exams.error) throw exams.error;

        const studentsWithExam = new Set(exams.data.map(e => e.id_siswa));
        const incompleteCount = allStudents.data.filter(s => !studentsWithExam.has(s.id_siswa)).length;

        return incompleteCount;
    },

    countTasksInClass: async (classId) => {
        const { count, error } = await supabase
            .from('tugas')
            .select('*', { count: 'exact', head: true }) // head: true = Cuma ambil jumlah
            .eq('id_kelas', classId);
        
        if (error) throw error;
        return count || 0;
    }
};

module.exports = DashboardModel;