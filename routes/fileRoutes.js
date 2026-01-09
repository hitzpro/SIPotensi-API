const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const authMiddleware = require('../middleware/authMiddleware');

// Endpoint ini dilindungi (hanya user login yang bisa akses file)
router.get('/stream', authMiddleware.protect, fileController.getFile);

module.exports = router;