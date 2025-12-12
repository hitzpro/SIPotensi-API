const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// --- CONFIG MULTER FOR PROFILE PHOTOS ---
const storageProfile = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/profiles/'),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `profile-${req.user.id}-${Date.now()}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Not an image!'), false);
};

const uploadProfile = multer({
    storage: storageProfile,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter
});

// Task upload
const uploadTask = multer({ dest: 'uploads/tugas_siswa/' });


// -----------------------
// 1. AUTH PROTECT
// -----------------------
router.use(authMiddleware.protect);


// -----------------------
// 2. ROUTE YANG BOLEH SISWA & GURU
// -----------------------
// (HARUS DITARUH SEBELUM router.use(restrictTo('siswa')))
router.get(
    '/tasks/:idTugas',
    authMiddleware.restrictTo('siswa', 'guru'),
    studentController.getTaskDetail
);


// -----------------------
// 3. ROUTE KHUSUS SISWA SAJA
// -----------------------
router.use(authMiddleware.restrictTo('siswa'));

router.get('/dashboard', studentController.getDashboard);

router.post('/upload-photo', uploadProfile.single('foto'), studentController.uploadPhoto);

router.put('/update-password', studentController.updatePassword);

router.get('/tasks', studentController.getMyTasks);

router.post(
    '/tasks/:idTugas/submit',
    uploadTask.single('file'),
    studentController.submitTask
);


module.exports = router;
