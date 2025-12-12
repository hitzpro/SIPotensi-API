    // app.js
    const express = require('express');
    const cors = require('cors');
    const morgan = require('morgan');
    const path = require('path');
    const authRoutes = require('./routes/authRoutes');
    const classRoutes = require('./routes/classRoutes');
    const dashboardRoutes = require('./routes/dashboardRoutes');
    const studentRoutes = require('./routes/studentRoutes');
    const notificationRoutes = require('./routes/notificationRoutes');

    const app = express();

    // Middleware
    app.use(cors()); // Agar bisa diakses dari frontend nanti
    app.use(morgan('dev')); // Logging request di terminal
    app.use(express.json()); // Agar bisa baca req.body format JSON
    app.use(express.urlencoded({ extended: true })); // Untuk handle form-data

    // Routes
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
    app.use('/api/auth', authRoutes);
    app.use('/api/classes', classRoutes);
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api/student', studentRoutes);
    app.use('/api/notifications', notificationRoutes);

    // Base route untuk cek server nyala
    app.get('/', (req, res) => {
        res.send('Server Backend Siap! 🚀');
    });

    module.exports = app;