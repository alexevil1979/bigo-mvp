const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/requireAdmin');

// Публичные маршруты
router.get('/page/:slug', contentController.getPageBySlug);

// Админские маршруты
router.get('/pages', authenticate, requireAdmin, contentController.getPages);
router.post('/pages', authenticate, requireAdmin, contentController.createPage);
router.put('/pages/:id', authenticate, requireAdmin, contentController.updatePage);
router.delete('/pages/:id', authenticate, requireAdmin, contentController.deletePage);

module.exports = router;



