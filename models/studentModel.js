const supabase = require('../config/supabase');
const bcrypt = require('bcryptjs');

const StudentModel = {
    // === 1. PROFIL & KELAS ===

    // Ambil foto & NISN user (karena data di token mungkin basi)
    getUserProfile: async (userId) => {
        const { data, error } = await supabase
            .from('users')
            .select('foto_profil, nisn')
            .eq('id', userId)
            .single();
        
        if (error) throw error;
        return data;
    },

    // Update Foto Profil
    updatePhoto: async (userId, photoPath) => {
        const { data, error } = await supabase
            .from('users')
            .update({ foto_profil: photoPath })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Update Password
    updatePassword: async (userId, newPassword) => {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);

        const { data, error } = await supabase
            .from('users')
            .update({ password_hash: hash })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Ambil Info Kelas & Status Akademik (Parallel Fetch)
    getMyClassInfo: async (studentId) => {
        try {
            // STEP 1: Cek tabel relasi
            const { data: link, error: errLink } = await supabase
                .from('class_students')
                .select('id_kelas')
                .eq('id_siswa', studentId)
                .maybeSingle();

            if (errLink) throw errLink;
            if (!link) return null;

            const classId = link.id_kelas;

            // STEP 2: Jalankan query berat secara paralel
            const [kelasRes, ujianRes, tugasRes] = await Promise.all([
                // Detail Kelas + Nama Guru
                supabase.from('classes').select(`nama_kelas, tahun_ajaran, users ( nama )`).eq('id', classId).single(),
                // Nilai Ujian
                supabase.from('nilai_ujian').select('nilai_uts, nilai_uas').eq('id_kelas', classId).eq('id_siswa', studentId).maybeSingle(),
                // List ID Tugas (untuk hitung rata-rata)
                supabase.from('tugas').select('id').eq('id_kelas', classId)
            ]);

            if (kelasRes.error) throw kelasRes.error;
            
            const kelasInfo = kelasRes.data;
            const ujian = ujianRes.data;
            const listTugas = tugasRes.data || [];

            // STEP 3: Hitung Rata-rata Tugas
            let rataTugas = 0;
            if (listTugas.length > 0) {
                const idsTugas = listTugas.map(t => t.id);
                const { data: nilaiTugas } = await supabase
                    .from('nilai_tugas')
                    .select('nilai')
                    .eq('id_siswa', studentId)
                    .in('id_tugas', idsTugas);
                
                const totalNilai = nilaiTugas ? nilaiTugas.reduce((acc, curr) => acc + (curr.nilai || 0), 0) : 0;
                rataTugas = totalNilai / listTugas.length;
            }

            return {
                id_kelas: classId,
                classes: {
                    nama_kelas: kelasInfo.nama_kelas,
                    tahun_ajaran: kelasInfo.tahun_ajaran,
                    users: kelasInfo.users
                },
                nilai_uts: ujian ? ujian.nilai_uts : 0,
                nilai_uas: ujian ? ujian.nilai_uas : 0,
                rata_tugas: parseFloat(rataTugas.toFixed(2))
            };

        } catch (error) {
            console.error("Error in getMyClassInfo:", error.message);
            throw error; // Lempar error agar controller tahu
        }
    },

    // === 2. TUGAS & PENGERJAAN ===

    // Ambil Daftar Tugas + Status Pengerjaan Saya
    getMyTasks: async (classId, studentId) => {
        const [allTasksRes, myGradesRes] = await Promise.all([
            supabase.from('tugas').select('id, nama_tugas, jenis_tugas, deadline, deskripsi').eq('id_kelas', classId).order('deadline', { ascending: true }),
            supabase.from('nilai_tugas').select('id_tugas, nilai, tanggal_kumpul').eq('id_siswa', studentId)
        ]);

        if (allTasksRes.error) throw allTasksRes.error;
        if (myGradesRes.error) throw myGradesRes.error;

        // Merge logic di Model (biar controller terima data jadi)
        return allTasksRes.data.map(task => {
            const submission = myGradesRes.data.find(g => g.id_tugas === task.id);
            return {
                ...task,
                status: submission ? 'Dikumpulkan' : 'Belum Mengerjakan',
                nilai: submission ? submission.nilai : null,
                tanggal_kumpul: submission ? submission.tanggal_kumpul : null
            };
        });
    },

    // Ambil Detail 1 Tugas (Header)
    getTaskById: async (taskId) => {
        const { data, error } = await supabase
            .from('tugas')
            .select('*')
            .eq('id', taskId)
            .single();
        
        if (error) throw error;
        return data;
    },

    // Cek Pengerjaan Siswa (Submission)
    getSubmission: async (taskId, studentId) => {
        const { data, error } = await supabase
            .from('nilai_tugas')
            .select('*')
            .eq('id_tugas', taskId)
            .eq('id_siswa', studentId)
            .maybeSingle();
        
        if (error) throw error;
        return data;
    },

    // Ambil Soal Quiz (Tanpa Kunci)
    getQuizQuestions: async (tugasId) => {
        const { data, error } = await supabase
            .from('soal_quiz')
            .select('id, pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d, bobot_soal')
            .eq('id_tugas', tugasId);
        
        if (error) throw error;
        return data;
    },

    // Ambil Kunci Jawaban (Untuk Koreksi)
    getQuizKeys: async (tugasId) => {
        const { data, error } = await supabase
            .from('soal_quiz')
            .select('id, kunci_jawaban, bobot_soal')
            .eq('id_tugas', tugasId);
        
        if (error) throw error;
        return data;
    }
};

module.exports = StudentModel;