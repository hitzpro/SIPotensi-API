const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const authMiddleware = require('../middleware/authMiddleware');
const gradeController = require('../controllers/gradeController');
const predictController = require('../controllers/predictController');



// Tambahan untuk upload file
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'uploads/soal_tugas';
        // Buat folder jika belum ada
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        // Bersihkan nama file dari karakter aneh
        const cleanName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
        // Format: [TIMESTAMP]-[NAMA_FILE_ASLI]
        cb(null, `${Date.now()}-${cleanName}`);
    }
});

const upload = multer({ storage: storage });

router.use(authMiddleware.protect);
router.use(authMiddleware.restrictTo('guru'));

router.route('/')
    .get(classController.getMyClasses)
    .post(classController.createClass);

// Route Baru: Upload CSV Siswa ke Kelas tertentu
// ================================
// IMPORT DATA
// ================================
router.post('/:id/import-students', upload.single('file'), classController.importStudents);
router.post('/tugas/:idTugas/import-quiz', upload.single('file'), gradeController.importSoalQuiz);

// ================================
// CLASS MANAGEMENT
// ================================
router.get('/', authMiddleware.restrictTo('guru'), classController.getMyClasses);
router.post('/', classController.createClass);
router.delete('/:id', classController.deleteClass);
router.get('/:id/stats', authMiddleware.restrictTo('guru'), classController.getClassStats);
router.get('/:id/students', classController.getClassStudents);
router.post('/:id/students/bulk-delete', classController.bulkRemoveStudents);

// Student detail
router.put('/students/:studentId', classController.editStudentData);
router.delete('/:id/students/:studentId', classController.removeStudent);
router.get('/:id/students/:studentId/history', classController.getStudentDetail);

// ================================
// TASK MANAGEMENT
// ================================
router.post('/tugas', upload.single('file_soal'), gradeController.createTugas);
router.get('/:classId/tugas', gradeController.getListTugas);
router.get('/tugas/:idTugas/submissions', gradeController.getTaskSubmissions);
router.put('/tugas/:id', upload.single('file_soal'), gradeController.editTugas);
router.get('/tugas/:idTugas/detail', gradeController.getTaskDetailFull);
router.delete('/tugas/:id', gradeController.deleteTugas);

// ================================
// INPUT NILAI
// ================================
router.post('/nilai-tugas', gradeController.inputNilaiTugas);
router.post('/nilai-ujian', gradeController.inputNilaiUjian);

// ================================
// MACHINE LEARNING
// ================================
router.post('/predict-bulk', predictController.predictClassBulk); // POST /api/classes/predict-bulk
router.get('/:id_kelas/check-readiness', predictController.checkClassReadiness); // GET /api/classes/:id/check-readiness


module.exports = router;