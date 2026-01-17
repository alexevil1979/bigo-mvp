const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Создаем директорию для заставок, если её нет
const overlaysDir = path.join(__dirname, '../uploads/streams/overlays');
if (!fs.existsSync(overlaysDir)) {
  fs.mkdirSync(overlaysDir, { recursive: true });
}

// Настройка multer для загрузки заставок
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, overlaysDir);
  },
  filename: (req, file, cb) => {
    // Используем временное имя, так как streamId еще не доступен
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9);
    const ext = path.extname(file.originalname);
    cb(null, `temp-${timestamp}-${randomId}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Разрешаем только изображения и видео
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Разрешены только изображения и видео файлы'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB максимум
  }
});

module.exports = upload;
