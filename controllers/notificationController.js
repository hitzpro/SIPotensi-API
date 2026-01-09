const NotificationModel = require('../models/notificationModel');

// 1. Ambil Notifikasi Saya
exports.getMyNotifications = async (req, res) => {
    try {
        const studentId = req.user.id;
        const notifs = await NotificationModel.getByStudent(studentId);
        
        // Handle null/undefined dari model
        const safeNotifs = notifs || [];
        const unreadCount = safeNotifs.filter(n => !n.is_read).length;

        res.status(200).json({
            status: 'success',
            // Format Data yang seragam
            data: {
                notifications: safeNotifs, // Array notifikasi
                unread: unreadCount        // Jumlah unread
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 2. Baca Notifikasi (Satu per satu)
exports.readNotification = async (req, res) => {
    try {
        const { id } = req.params;
        await NotificationModel.markAsRead(id);
        res.status(200).json({ status: 'success', message: 'Notifikasi dibaca' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 3. Baca Semua (Mark All as Read)
exports.readAll = async (req, res) => {
    try {
        const studentId = req.user.id;
        await NotificationModel.markAllRead(studentId);
        res.status(200).json({ status: 'success', message: 'Semua notifikasi dibaca' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 4. Subscribe Web Push
exports.subscribe = async (req, res) => {
    try {
        const subscription = req.body;
        const userId = req.user.id;

        // Validasi Input
        if (!subscription || !subscription.endpoint || !subscription.keys) {
            return res.status(400).json({ message: "Data subscription tidak lengkap" });
        }

        // Panggil Model untuk Simpan ke DB
        await NotificationModel.saveSubscription(userId, subscription);

        res.status(201).json({ status: 'success', message: 'Subscribed' });

    } catch (error) {
        console.error("Subscribe Error:", error.message);
        res.status(500).json({ message: "Internal Server Error saat menyimpan langganan." });
    }
};

// 5. Unsubscribe Web Push
exports.unsubscribe = async (req, res) => {
    try {
        const { endpoint } = req.body;
        if (!endpoint) return res.status(400).json({ message: "Endpoint required" });

        // Panggil Model untuk Hapus dari DB
        await NotificationModel.deleteSubscription(endpoint);

        res.status(200).json({ status: 'success', message: 'Unsubscribed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};