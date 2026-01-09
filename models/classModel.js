// models/classModel.js
const supabase = require('../config/supabase');

const ClassModel = {
    // Tambah Kelas Baru
    createClass: async (classData) => {
        // classData: { id_guru, nama_kelas, tahun_ajaran }
        const { data, error } = await supabase
            .from('classes')
            .insert([classData])
            .select()
            .single(); // Ambil 1 data yang baru dibuat
        
        if (error) throw error;
        return data;
    },

    getClassStats: async (classId) => {
        const { count: studentCount } = await supabase
            .from('class_students')
            .select('*', { count: 'exact', head: true })
            .eq('id_kelas', classId);

        const { count: taskCount } = await supabase
            .from('tugas')
            .select('*', { count: 'exact', head: true })
            .eq('id_kelas', classId);

        return {
            jumlah_siswa: studentCount || 0,
            jumlah_tugas: taskCount || 0
        };
    },

    // Ambil semua kelas milik guru tertentu
    getClassesByGuru: async (guruId) => {
        // 1. Ambil daftar kelas dulu
        const { data: classes, error } = await supabase
            .from('classes')
            .select('*')
            .eq('id_guru', guruId)
            .order('nama_kelas', { ascending: true });
        
        if (error) throw error;

        // 2. Loop setiap kelas untuk hitung siswa & tugas
        // Kita pakai Promise.all agar parallel (cepat)
        const classesWithStats = await Promise.all(classes.map(async (cls) => {
            
            // Hitung Siswa
            const { count: studentCount } = await supabase
                .from('class_students')
                .select('*', { count: 'exact', head: true }) // head: true = cuma ambil jumlah, gak ambil data
                .eq('id_kelas', cls.id);

            // Hitung Tugas
            const { count: taskCount } = await supabase
                .from('tugas')
                .select('*', { count: 'exact', head: true })
                .eq('id_kelas', cls.id);

            return {
                ...cls,
                jumlah_siswa: studentCount || 0,
                jumlah_tugas: taskCount || 0
            };
        }));

        return classesWithStats;
    },

    getClassStudents: async (classId) => {
        // 1. Ambil data siswa
        const { data: students, error } = await supabase
            .from('class_students')
            .select(`
                id_siswa,
                users:id_siswa ( nama, nisn )
            `)
            .eq('id_kelas', classId);

        if (error) throw error;

        // 2. Loop untuk ambil nilai (Ini cara simpel, idealnya pakai View/Join kompleks)
        const studentsWithGrades = await Promise.all(students.map(async (s) => {
            const studentId = s.id_siswa;
            const nama = s.users.nama;
            const nisn = s.users.nisn;

            // Rata-rata Tugas
            const { data: tugas } = await supabase
                .from('nilai_tugas')
                .select('nilai')
                .eq('id_siswa', studentId);
                // Note: Harusnya filter by class juga lewat relasi tugas, tapi kita asumsi sederhana dulu
            
            const avgTugas = tugas.length > 0 
                ? (tugas.reduce((a, b) => a + b.nilai, 0) / tugas.length).toFixed(1) 
                : 0;

            // Nilai Ujian
            const { data: ujian } = await supabase
                .from('nilai_ujian')
                .select('nilai_uts, nilai_uas')
                .eq('id_kelas', classId)
                .eq('id_siswa', studentId)
                .single();

            return {
                id: studentId, // ID User
                nama,
                nisn,
                nilai_tugas: avgTugas,
                nilai_uts: ujian?.nilai_uts || 0,
                nilai_uas: ujian?.nilai_uas || 0
            };
        }));

        return studentsWithGrades;
    },

    addStudentToClass: async (classId, studentId) => {
        const { data, error } = await supabase
            .from('class_students')
            .insert([{ id_kelas: classId, id_siswa: studentId }])
            .select();
        
        // Abaikan error duplicate (kalau siswa sudah ada di kelas itu)
        if (error && error.code !== '23505') throw error; 
        return data;
    },

    // Hapus siswa dari kelas tertentu (Kick siswa)
    removeStudentFromClass: async (classId, studentId) => {
        const { error } = await supabase
            .from('class_students')
            .delete()
            .eq('id_kelas', classId)
            .eq('id_siswa', studentId);
        if (error) throw error;
    },

    deleteClass: async (classId, guruId) => {
        // Hapus hanya jika id kelas cocok DAN id guru cocok (Security)
        const { data, error } = await supabase
            .from('classes')
            .delete()
            .eq('id', classId)
            .eq('id_guru', guruId)
            .select(); // Select agar kita tahu ada data yang kehapus atau ngga

        if (error) throw error;
        
        // Kalau data kosong, berarti kelas tidak ditemukan atau bukan milik guru ini
        if (data.length === 0) {
            throw new Error("Kelas tidak ditemukan atau Anda tidak memiliki izin menghapusnya.");
        }
        
        return data;
    },

    // Ambil History Nilai Lengkap Siswa di Kelas Tertentu
    getStudentHistory: async (classId, studentId) => {
        try {
            // 1. Ambil Master Tugas
            const { data: allTasks, error: errTask } = await supabase
                .from('tugas')
                .select('*') 
                .eq('id_kelas', classId)
                .order('id', { ascending: false }); 

            if (errTask) throw new Error("Gagal ambil master tugas: " + errTask.message);

            // 2. Ambil Submission Siswa
            const { data: submissions, error: errSub } = await supabase
                .from('nilai_tugas')
                .select('*')
                .eq('id_siswa', studentId);

            if (errSub) throw new Error("Gagal ambil submisi: " + errSub.message);

            // 3. Mapping (Gabungkan)
            const safeTasks = allTasks || [];
            const safeSubmissions = submissions || [];

            const tugasMerged = safeTasks.map(t => {
                const sub = safeSubmissions.find(s => s.id_tugas === t.id);
                
                // --- PERBAIKAN DI SINI ---
                let cleanFileUrl = null;
                if (sub && sub.file_url) {
                    const normalizedPath = sub.file_url.replace(/\\/g, '/');
                    // Ganti port 3000 jika backend Anda jalan di port lain
                    cleanFileUrl = `https://sipotensi-api.vercel.app/${normalizedPath}`;

                    // Cukup normalize slash saja. JANGAN tambah http://localhost...
                    // Kita butuh path fisik asli (C:/Users/...) untuk dikirim ke stream endpoint
                    cleanFileUrl = sub.file_url.replace(/\\/g, '/'); 
                }

                return {
                    nilai: sub ? sub.nilai : null,
                    tugas: t,
                    // Kirim path asli
                    submission: sub ? { ...sub, file_url: cleanFileUrl } : null
                };
            });

            // 4. Ambil Nilai Ujian
            const { data: ujian } = await supabase
                .from('nilai_ujian')
                .select('nilai_uts, nilai_uas')
                .eq('id_kelas', classId)
                .eq('id_siswa', studentId)
                .maybeSingle(); 

            // 5. Ambil Prediksi
            const { data: prediksi } = await supabase
                .from('prediction_results')
                .select('cluster, rekomendasi, tanggal_proses')
                .eq('id_kelas', classId)
                .eq('id_siswa', studentId)
                .maybeSingle();

            return { 
                tugas: tugasMerged, 
                ujian: ujian || {}, 
                prediksi: prediksi || {} 
            };

        } catch (error) {
            console.error("[MODEL ERROR] getStudentHistory:", error.message);
            throw error;
        }
    },

    // Tambahkan method ini di object ClassModel
    removeStudentsBulk: async (classId, studentIds) => {
        const { error } = await supabase
            .from('class_students')
            .delete()
            .eq('id_kelas', classId)
            .in('id_siswa', studentIds); // Hapus dimana ID ada di dalam array

        if (error) throw error;
    }
};

module.exports = ClassModel;
