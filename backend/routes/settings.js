const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/requireAdmin');

// Публичные маршруты
router.get('/public', settingsController.getPublicSettings);
router.get('/:key', settingsController.getSetting);

// Админские маршруты
router.get('/', authenticate, requireAdmin, settingsController.getSettings);
router.post('/', authenticate, requireAdmin, settingsController.setSetting);
router.put('/bulk', authenticate, requireAdmin, settingsController.updateSettings);
router.delete('/:key', authenticate, requireAdmin, settingsController.deleteSetting);

module.exports = router;



