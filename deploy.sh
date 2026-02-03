#!/bin/bash

# --- SETTING ---
# Folder backup akan dibuat SATU LEVEL DI ATAS folder project
# Supaya file backup tidak masuk ke dalam git repository project itu sendiri
BACKUP_DIR="../backups" 

# Simpan berapa file?
MAX_BACKUPS=5 

# Nama file
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.tar.gz"

# --- ACTION ---

# 1. Buat folder jika belum ada
mkdir -p "$BACKUP_DIR"

# 2. Compress (Backup Fisik)
# Kita exclude folder berat agar backup cepat & ringan
echo "📦 Sedang mem-backup ke $BACKUP_FILE ..."
tar --exclude='node_modules' --exclude='.git' --exclude='.next' --exclude='dist' -czf "$BACKUP_FILE" .

# 3. Rotasi (Hapus backup lama)
cd "$BACKUP_DIR"
# List file, urutkan waktu, simpan 5 teratas, hapus sisanya
ls -t *.tar.gz | tail -n +$((MAX_BACKUPS + 1)) | xargs -I {} rm -- "{}" 2>/dev/null
cd - > /dev/null
echo "✅ Backup selesai & file lama sudah dibersihkan."

# 4. Git Push ke Vercel
echo "🚀 Mengirim ke GitHub/Vercel..."
git add .
# Ambil pesan commit dari input user, kalau kosong pakai default
COMMIT_MSG="${1:-update rutin}"
git commit -m "$COMMIT_MSG"
git push origin main

echo "🎉 Selesai!"