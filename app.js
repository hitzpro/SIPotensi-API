const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs'); // Tambahkan fs

const authRoutes = require('./routes/authRoutes');
const classRoutes = require('./routes/classRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const studentRoutes = require('./routes/studentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminGuruRoutes = require('./routes/adminGuruRoutes');
const fileRoutes = require('./routes/fileRoutes');

const app = express();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- FIX EROFS PADA APP.JS ---
// Hanya serve folder uploads JIKA foldernya benar-benar ada (Localhost)
// Di Vercel ini akan diskip otomatis, jadi aman.
const uploadsDir = path.join(__dirname, 'uploads');
if (fs.existsSync(uploadsDir)) {
    app.use('/uploads', express.static(uploadsDir));
}

app.use('/api/auth', authRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin/guru', adminGuruRoutes);
app.use('/api/files', fileRoutes);

app.get('/', (req, res) => {
    res.send('Server Backend Siap! 🚀');
});

module.exports = app;