const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const os = require('os'); // 1. Tambahkan OS

// 2. Tentukan folder simpan berdasarkan Environment
// Jika di Vercel, pakai /tmp. Jika di Local, pakai uploads/
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
const baseUploadPath = isProduction ? os.tmpdir() : 'uploads';

// --- CONFIG MULTER FOR PROFILE PHOTOS ---
const storageProfile = multer.diskStorage({
    destination: function (req, file, cb) {
        // Simpan ke /tmp jika di Vercel
        cb(null, isProduction ? baseUploadPath : path.join(baseUploadPath, 'profiles/'));
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

// Config for Task Uploads
// Sama, gunakan logic /tmp
const uploadTask = multer({ 
    dest: isProduction ? baseUploadPath : path.join(baseUploadPath, 'tugas_siswa/') 
}); 

// --- MIDDLEWARE ---
router.use(authMiddleware.protect);
router.use(authMiddleware.restrictTo('siswa', 'guru')); // Guru boleh akses detail tugas (preview)

// --- ROUTES ---

router.get('/dashboard', studentController.getDashboard);
router.post('/upload-photo', uploadProfile.single('foto'), studentController.uploadPhoto);
router.put('/update-password', studentController.updatePassword);
router.get('/tasks', studentController.getMyTasks);
router.get('/tasks/:idTugas', studentController.getTaskDetail);
router.post('/tasks/:idTugas/submit', uploadTask.single('file'), studentController.submitTask);

module.exports = router;