# Gunakan image Node.js yang ringan
FROM node:18-alpine

# Set folder kerja
WORKDIR /app

# Copy package json dulu (biar cache layer optimal)
COPY package*.json ./

# Install dependency
RUN npm install

# Copy seluruh kodingan backend
COPY . .

# Buat folder uploads manual (biar gak error permission)
RUN mkdir -p uploads/profiles
RUN mkdir -p uploads/tugas_siswa
RUN mkdir -p uploads/soal_tugas

# Expose port (sesuai app.js kamu)
EXPOSE 3000

# Jalankan server
CMD ["npm", "start"]