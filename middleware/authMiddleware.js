const jwt = require('jsonwebtoken');

exports.protect = async (req, res, next) => {
    let token;

    // 1. Cek apakah ada token di header Authorization
    // Format header: "Bearer eyJhbGci..."
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Ambil tokennya saja (buang kata 'Bearer ')
            token = req.headers.authorization.split(' ')[1];

            // 2. Verifikasi token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 3. Simpan data user ke dalam request agar bisa dipakai di controller
            // req.user ini isinya { id: '...', role: 'guru', ... } sesuai yang kita set di login kemarin
            req.user = decoded;

            next(); // Lanjut ke controller berikutnya
        } catch (error) {
            console.error(error);
            return res.status(401).json({ message: "Token tidak valid, silakan login ulang." });
        }
    }

    if (!token) {
        return res.status(401).json({ message: "Anda tidak memiliki akses, silakan login." });
    }
};

exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Anda tidak memiliki izin untuk aksi ini." });
        }
        next();
    };
};