const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const authMiddleware = require('../middleware/authMiddleware');
const gradeController = require('../controllers/gradeController');
const predictController = require('../controllers/predictController');

// --- MULTER CONFIG (ANTI CRASH VERCEL) ---
const multer = require('multer');
const path = require('path');
const os = require('os');

// Simpan langsung ke folder TMP sistem
// Jangan bikin subfolder (mkdir) di Vercel karena akan EROFS
const tempDir = os.tmpdir(); 

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, tempDir);
    },
    filename: function (req, file, cb) {
        // Sanitasi nama file
        const cleanName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
        cb(null, `cls-${Date.now()}-${cleanName}`);
    }
});

const upload = multer({ storage: storage });
// ------------------------------------------

router.use(authMiddleware.protect);
router.use(authMiddleware.restrictTo('guru'));

router.route('/')
    .get(classController.getMyClasses)
    .post(classController.createClass);

// Import Routes
router.post('/:id/import-students', upload.single('file'), classController.importStudents);
router.post('/tugas/:idTugas/import-quiz', upload.single('file'), gradeController.importSoalQuiz);

// Task Management Routes
router.post('/tugas', upload.single('file_soal'), gradeController.createTugas);
router.put('/tugas/:id', upload.single('file_soal'), gradeController.editTugas);

// Standard Routes (Tanpa Upload)
router.get('/', authMiddleware.restrictTo('guru'), classController.getMyClasses);
router.post('/', classController.createClass);
router.delete('/:id', classController.deleteClass);
router.get('/:id/stats', authMiddleware.restrictTo('guru'), classController.getClassStats);
router.get('/:id/students', classController.getClassStudents);
router.post('/:id/students/bulk-delete', classController.bulkRemoveStudents);
router.put('/students/:studentId', classController.editStudentData);
router.delete('/:id/students/:studentId', classController.removeStudent);
router.get('/:id/students/:studentId/history', classController.getStudentDetail);

router.get('/:classId/tugas', gradeController.getListTugas);
router.get('/tugas/:idTugas/submissions', gradeController.getTaskSubmissions);
router.get('/tugas/:idTugas/detail', gradeController.getTaskDetailFull);
router.delete('/tugas/:id', gradeController.deleteTugas);

router.post('/nilai-tugas', gradeController.inputNilaiTugas);
router.post('/nilai-ujian', gradeController.inputNilaiUjian);

router.post('/predict-bulk', predictController.predictClassBulk); 
router.get('/:id_kelas/check-readiness', predictController.checkClassReadiness); 

module.exports = router;