// routes/adminGuruRoutes.js
const express = require('express');
const router = express.Router();
const adminGuruController = require('../controllers/adminGuruController');
const adminClassController = require('../controllers/adminClassController');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// Setup Multer (Simpan file di folder 'uploads/')
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/from_admins/'); // Pastikan folder 'uploads' ada di root project
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'admin-doc-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Middleware Proteksi: Hanya Admin yg boleh akses
const protectAdmin = [authMiddleware.protect, authMiddleware.restrictTo('admin')];

// 1. Tambah Guru
router.post('/create', protectAdmin, adminGuruController.addGuru);

// 2. Edit Guru
router.put('/:id', protectAdmin, adminGuruController.updateGuru);

// 3. Soft Delete Guru
router.delete('/:id', protectAdmin, adminGuruController.deactivateGuru);

// 4. Kirim Dokumen ke Guru
// Key form-data untuk file adalah 'file'
router.post('/send-doc', protectAdmin, upload.single('file'), adminGuruController.sendDocumentToGuru);

router.get('/stats', protectAdmin, adminGuruController.getDashboardStats);

router.get('/', protectAdmin, adminGuruController.getAllGuru);
router.post('/broadcast-doc', protectAdmin, upload.single('file'), adminGuruController.broadcastDocument);
router.get('/classes', protectAdmin, adminClassController.getAllClasses); // Untuk Dropdown & List
router.post('/classes', protectAdmin, adminClassController.createClass);  // Untuk Create Kelas
router.delete('/classes/:id', protectAdmin, adminClassController.deleteClass); // Untuk Hapus
router.put('/classes/:id', protectAdmin, adminClassController.updateClass); // Tambahkan ini

// Route History
router.get('/history-doc', protectAdmin, adminGuruController.getDocHistory);
router.post('/history-recipients', protectAdmin, adminGuruController.getDocRecipients);

router.get('/predictions/:id_kelas', 
    authMiddleware.protect, 
    authMiddleware.restrictTo('admin'), 
    adminGuruController.getPredictionsByClass
);

module.exports = router;