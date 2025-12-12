const DashboardModel = require('../models/dashboardModel');

exports.getDashboardSummary = async (req, res) => {
    try {
        const guruId = req.user.id;

        // 1. Ambil daftar kelas dulu
        const classes = await DashboardModel.getClassesByGuru(guruId);
        const classIds = classes.map(c => c.id);

        // Default value 0
        let totalSiswa = 0;
        let incompleteCount = 0;

        // 2. Jika punya kelas, baru hitung siswa & data incomplete
        if (classIds.length > 0) {
            // Gunakan Promise.all agar kedua fungsi ini jalan barengan (lebih ngebut)
            const [count, incomplete] = await Promise.all([
                DashboardModel.countTotalStudents(classIds),
                DashboardModel.getIncompleteCount(classIds)
            ]);
            
            totalSiswa = count;
            incompleteCount = incomplete;
        }

        res.status(200).json({
            status: 'success',
            data: {
                total_kelas: classes.length,
                total_siswa: totalSiswa,
                notifikasi_incomplete: incompleteCount
            }
        });

    } catch (error) {
        console.error('Dashboard Error:', error);
        res.status(500).json({ message: error.message || 'Server Error' });
    }
};