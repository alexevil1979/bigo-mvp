const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Создаем директорию для скриншотов стримов, если её нет
const screenshotsDir = path.join(__dirname, '../../uploads/streams/screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Настройка хранилища для multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, screenshotsDir);
  },
  filename: function (req, file, cb) {
    // Имя файла: streamId-timestamp.jpg
    const streamId = req.body.streamId || req.params.streamId || 'unknown';
    const timestamp = Date.now();
    cb(null, `${streamId}-${timestamp}.jpg`);
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
