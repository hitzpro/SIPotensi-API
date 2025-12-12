const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const os = require('os');

// --- PENTING: GUNAKAN FOLDER TMP SYSTEM ---
const tempDir = os.tmpdir(); 

// A. Config Profile Photo
const storageProfile = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, tempDir); // Simpan di /tmp
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `profile-${req.user.id}-${Date.now()}${ext}`);
    }
});

const uploadProfile = multer({ 
    storage: storageProfile,
    limits: { fileSize: 2 * 1024 * 1024 }
});

// B. Config Task Upload
const storageTask = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, tempDir); // Simpan di /tmp
    },
    filename: (req, file, cb) => {
        const cleanName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
        cb(null, `tugas-${req.user.id}-${Date.now()}-${cleanName}`);
    }
});

const uploadTask = multer({ storage: storageTask }); 

// --- ROUTES ---
router.use(authMiddleware.protect);

// Endpoint Preview Task (Boleh Guru & Siswa)
router.get('/tasks/:idTugas', authMiddleware.restrictTo('siswa', 'guru'), studentController.getTaskDetail);

// Endpoint Khusus Siswa
router.use(authMiddleware.restrictTo('siswa'));

router.get('/dashboard', studentController.getDashboard);
router.post('/upload-photo', uploadProfile.single('foto'), studentController.uploadPhoto);
router.put('/update-password', studentController.updatePassword);
router.get('/tasks', studentController.getMyTasks);
router.post('/tasks/:idTugas/submit', uploadTask.single('file'), studentController.submitTask);

module.exports = router;