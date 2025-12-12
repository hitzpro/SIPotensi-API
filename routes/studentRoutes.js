const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const os = require('os');

// --- MULTER CONFIG (ANTI CRASH VERCEL) ---
const tempDir = os.tmpdir(); 

// Config Profile
const storageProfile = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `p-${req.user.id}-${Date.now()}${ext}`);
    }
});

const uploadProfile = multer({ 
    storage: storageProfile,
    limits: { fileSize: 2 * 1024 * 1024 }
});

// Config Tugas
const storageTask = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        const cleanName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
        cb(null, `t-${req.user.id}-${Date.now()}-${cleanName}`);
    }
});

const uploadTask = multer({ storage: storageTask }); 
// ------------------------------------------

// Middleware
router.use(authMiddleware.protect);

// Shared Route (Guru & Siswa)
router.get('/tasks/:idTugas', authMiddleware.restrictTo('siswa', 'guru'), studentController.getTaskDetail);

// Student Only Routes
router.use(authMiddleware.restrictTo('siswa'));

router.get('/dashboard', studentController.getDashboard);
router.post('/upload-photo', uploadProfile.single('foto'), studentController.uploadPhoto);
router.put('/update-password', studentController.updatePassword);
router.get('/tasks', studentController.getMyTasks);
router.post('/tasks/:idTugas/submit', uploadTask.single('file'), studentController.submitTask);

module.exports = router;