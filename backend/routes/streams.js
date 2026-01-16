const express = require('express');
const router = express.Router();
const streamController = require('../controllers/streamController');
const { authenticate } = require('../middleware/auth');
const uploadScreenshot = require('../middleware/uploadScreenshot');

// Все маршруты требуют аутентификации, кроме получения списка стримов
router.get('/', streamController.getStreams);
router.get('/:id', streamController.getStream);
router.get('/:streamId/screenshot', streamController.getScreenshot);

// Маршруты, требующие аутентификации
router.get('/my/active', authenticate, streamController.getMyActiveStream);
router.post('/', authenticate, streamController.createStream);
router.post('/:id/end', authenticate, streamController.endStream);
router.post('/my/end', authenticate, streamController.endMyActiveStream);
router.put('/viewers', authenticate, streamController.updateViewerCount);
router.post('/screenshot', authenticate, uploadScreenshot.single('screenshot'), streamController.uploadScreenshot);

module.exports = router;

