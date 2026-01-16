const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Создаем директорию для скриншотов стримов, если её нет
// __dirname = backend/middleware/, поэтому ../uploads = backend/uploads
const screenshotsDir = path.join(__dirname, '../uploads/streams/screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
  console.log('[Screenshot] Директория создана:', screenshotsDir);
} else {
  console.log('[Screenshot] Директория существует:', screenshotsDir);
}

// Настройка хранилища для multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, screenshotsDir);
  },
  filename: function (req, file, cb) {
    // Имя файла: streamId-timestamp.jpg
    // ВАЖНО: req.body может быть еще не распарсен на этом этапе
    // Используем временное имя, которое будет переименовано после сохранения
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const filename = `temp-${timestamp}-${randomId}.jpg`;
    console.log('[Screenshot] Временное имя файла:', filename);
    cb(null, filename);
  }
});

// Фильтр файлов (только изображения)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Разрешены только изображения (jpeg, jpg, png, webp)'));
  }
};

// Настройка multer для скриншотов
const uploadScreenshot = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB максимум для скриншотов
  },
  fileFilter: fileFilter
});

module.exports = uploadScreenshot;
