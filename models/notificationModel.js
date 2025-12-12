const supabase = require('../config/supabase');

const NotificationModel = {
    // === FITUR NOTIFIKASI DALAM APLIKASI ===

    // 1. Buat Banyak Notifikasi Sekaligus (Broadcast ke sekelas)
    createBulk: async (notificationsArray) => {
        // notificationsArray: [{ id_siswa, judul, pesan, link_url, tipe }, ...]
        const { data, error } = await supabase
            .from('notifications')
            .insert(notificationsArray);
        
        if (error) throw error;
        return data;
    },

    // 2. Ambil Notifikasi Milik Siswa Tertentu
    getByStudent: async (studentId) => {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('id_siswa', studentId)
            .order('created_at', { ascending: false }) // Yang terbaru di atas
            .limit(20); // Batasi 20 terakhir biar gak berat
        
        if (error) throw error;
        return data;
    },

    // 3. Tandai Sudah Dibaca
    markAsRead: async (notificationId) => {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId);
        
        if (error) throw error;
    },

    // 4. Tandai Semua Sudah Dibaca (Mark All as Read)
    markAllRead: async (studentId) => {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id_siswa', studentId);
            
        if (error) throw error;
    },

    // === FITUR PUSH SUBSCRIPTION (WEB PUSH) ===

    // 5. Simpan/Update Subscription Browser
    saveSubscription: async (userId, subscription) => {
        const { data, error } = await supabase
            .from('push_subscriptions')
            .upsert({
                user_id: userId,
                endpoint: subscription.endpoint,
                keys: subscription.keys,
                created_at: new Date() // Update timestamp agar tahu kapan terakhir aktif
            }, { onConflict: 'endpoint' });

        if (error) throw error;
        return data;
    },

    // 6. Hapus Subscription (Unsubscribe)
    deleteSubscription: async (endpoint) => {
        const { error } = await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', endpoint);

        if (error) throw error;
    }
};

module.exports = NotificationModel;