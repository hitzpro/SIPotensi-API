const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware.protect);

// Endpoint Notifikasi (Bisa untuk Siswa, atau Guru juga kalau nanti butuh)
router.get('/', notificationController.getMyNotifications);
router.put('/:id/read', notificationController.readNotification);
router.put('/read-all', notificationController.readAll);
router.post('/subscribe', notificationController.subscribe);
router.post('/unsubscribe', notificationController.unsubscribe);

module.exports = router;