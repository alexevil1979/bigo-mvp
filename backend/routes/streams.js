const express = require('express');
const router = express.Router();
const streamController = require('../controllers/streamController');
const { authenticate } = require('../middleware/auth');

// Все маршруты требуют аутентификации, кроме получения списка стримов
router.get('/', streamController.getStreams);
router.get('/:id', streamController.getStream);

// Маршруты, требующие аутентификации
router.post('/', authenticate, streamController.createStream);
router.post('/:id/end', authenticate, streamController.endStream);
router.put('/viewers', authenticate, streamController.updateViewerCount);

module.exports = router;

