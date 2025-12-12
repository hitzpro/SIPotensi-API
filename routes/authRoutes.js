const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Endpoint Login
router.post('/login', authController.login);

// Endpoint Logout (Baru)
router.post('/logout', authController.logout);

module.exports = router;