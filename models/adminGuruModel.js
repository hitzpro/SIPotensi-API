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
    },

    // 8. Ambil Siswa + Status Prediksi + Nilai (Untuk Admin Table)
    getStudentsWithPredictions: async (classId) => {
        // QUERY 1: Ambil Daftar Siswa di Kelas tersebut
        const { data: students, error: errStudent } = await supabase
          .from('class_students')
          .select(`
            id_siswa,
            users:id_siswa (nama, nisn)
          `)
          .eq('id_kelas', classId);
    
        if (errStudent) throw errStudent;
    
        // QUERY 2: Ambil Data Prediksi di Kelas tersebut
        const { data: predictions, error: errPred } = await supabase
          .from('prediction_results')
          .select('*')
          .eq('id_kelas', classId);
    
        if (errPred) throw errPred;
    
        // QUERY 3: Ambil Data Nilai Ujian di Kelas tersebut
        const { data: grades, error: errGrade } = await supabase
          .from('nilai_ujian')
          .select('*')
          .eq('id_kelas', classId);
          
        if (errGrade) throw errGrade;
    
        // --- LOGIC PENGGABUNGAN DATA (MERGE) ---
        // Kita gabungkan data berdasarkan 'id_siswa'
        
        const mergedData = students.map(s => {
          // Cari prediksi milik siswa ini
          const pred = predictions.find(p => p.id_siswa === s.id_siswa);
          
          // Cari nilai milik siswa ini
          const grade = grades.find(g => g.id_siswa === s.id_siswa);
    
          return {
            id_siswa: s.id_siswa,
            users: s.users, // Object {nama, nisn}
            
            // Format agar sesuai dengan Controller yang sudah kita buat
            prediction_results: pred ? [pred] : [], 
            nilai_ujian: grade ? [grade] : []
          };
        });
    
        return mergedData;
    },
    getAllGuruWithMapel: async () => {
        // A. Ambil Data Guru
        const { data: gurus, error } = await supabase
            .from('users')
            .select('id, nama, email, nisn')
            .eq('role', 'guru')
            .eq('is_active', true)
            .order('nama', { ascending: true });

        if (error) throw error;

        // B. Populate Mapel (Parallel Processing)
        const enrichedGurus = await Promise.all(gurus.map(async (guru) => {
            const { data: mapels } = await supabase
                .from('guru_mapel_kelas')
                .select(`
                    mata_pelajaran,
                    classes (id, nama_kelas)
                `)
                .eq('id_guru', guru.id);
            
            // Formatting data
            const mapelList = mapels.map(m => ({
                id_kelas: m.classes?.id,
                nama_kelas: m.classes?.nama_kelas,
                mapel: m.mata_pelajaran
            }));

            return { ...guru, mengajar: mapelList };
        }));

        return enrichedGurus;
    },

    getBroadcastHistory: async () => {
        // Kita group berdasarkan Link URL dan Judul untuk mendapatkan "Event Pengiriman"
        // Catatan: Supabase/Postgres butuh GROUP BY untuk semua kolom non-agregat
        // Kita ambil data unique berdasarkan link_url dan created_at (dibulatkan ke menit biar aman)
        
        const { data, error } = await supabase
            .rpc('get_broadcast_history'); 
            // Menggunakan RPC (Stored Procedure) lebih aman untuk query GROUP BY kompleks
            // TAPI, untuk simpelnya di Node JS, kita tarik raw data lalu grouping di JS 
            // karena membuat RPC butuh akses SQL Editor.
            // OPSI JS (Lebih mudah diimplementasikan sekarang):
            
        return AdminGuruModel.getHistoryViaJS();
    },

    // Helper: Grouping di sisi aplikasi (karena keterbatasan akses RPC user)
    getHistoryViaJS: async () => {
        const { data, error } = await supabase
            .from('notifications')
            .select('id, judul, link_url, created_at, id_siswa')
            .eq('tipe', 'download')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Grouping Logic
        const historyMap = new Map();

        data.forEach(item => {
            // Key grouping: Link URL + Jam (agar kalau kirim file sama di beda waktu tetap terpisah)
            // Kita potong string waktu sampai menit (YYYY-MM-DDTHH:MM)
            const timeKey = new Date(item.created_at).toISOString().slice(0, 16); 
            const key = `${item.link_url}-${timeKey}`;

            if (!historyMap.has(key)) {
                historyMap.set(key, {
                    judul: item.judul,
                    link_url: item.link_url,
                    created_at: item.created_at,
                    recipients: [] // Array ID Guru
                });
            }
            historyMap.get(key).recipients.push(item.id_siswa);
        });

        // Convert Map to Array
        return Array.from(historyMap.values());
    },

    // 10. Ambil Detail Penerima berdasarkan List ID
    getRecipientsDetail: async (recipientIds) => {
        if (!recipientIds || recipientIds.length === 0) return [];

        const { data, error } = await supabase
            .from('users')
            .select('nama, email')
            .in('id', recipientIds);
        
        if (error) throw error;
        return data;
    }
    
};

module.exports = AdminGuruModel;