const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const os = require('os'); 

// 1. Tentukan folder simpan
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
// Di Vercel wajib /tmp. Di lokal boleh uploads/
const tempDir = isProduction ? os.tmpdir() : 'uploads/'; 

// --- CONFIG MULTER FOR PROFILE PHOTOS ---
const storageProfile = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, tempDir); // Gunakan tempDir yang sudah didefinisikan
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        cb(null, `profile-${req.user.id}-${Date.now()}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Not an image!'), false);
    }
};

const uploadProfile = multer({ 
    storage: storageProfile,
    limits: { fileSize: 2 * 1024 * 1024 }, 
    fileFilter: fileFilter
});

// --- CONFIG MULTER FOR TASKS ---
const storageTask = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, tempDir); // Gunakan tempDir yang sama
    },
    filename: function (req, file, cb) {
        const cleanName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
        cb(null, `tugas-${req.user.id}-${Date.now()}-${cleanName}`);
    }
});

const uploadTask = multer({ storage: storageTask }); 

// --- MIDDLEWARE ---
router.use(authMiddleware.protect);
// Izinkan Guru akses detail tugas (preview)
router.get('/tasks/:idTugas', authMiddleware.restrictTo('siswa', 'guru'), studentController.getTaskDetail);

// --- ZONE KHUSUS SISWA ---
router.use(authMiddleware.restrictTo('siswa'));

router.get('/dashboard', studentController.getDashboard);
router.post('/upload-photo', uploadProfile.single('foto'), studentController.uploadPhoto);
router.put('/update-password', studentController.updatePassword);
router.get('/tasks', studentController.getMyTasks);
router.post('/tasks/:idTugas/submit', uploadTask.single('file'), studentController.submitTask);

module.exports = router;