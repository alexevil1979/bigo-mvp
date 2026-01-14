const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

/**
 * Получение профиля пользователя по ID
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Ошибка получения пользователя:', error);
    res.status(500).json({ error: 'Ошибка при получении данных пользователя' });
  }
});

/**
 * Получение топ стримеров
 */
router.get('/top/streamers', async (req, res) => {
  try {
    const topStreamers = await User.find({
      role: { $in: ['streamer', 'user'] },
      isActive: true,
      isBanned: false
    })
    .sort({ 'stats.totalBeansEarned': -1 })
    .limit(10)
    .select('nickname avatar stats beans');

    res.json({ streamers: topStreamers });
  } catch (error) {
    console.error('Ошибка получения топ стримеров:', error);
    res.status(500).json({ error: 'Ошибка при получении топ стримеров' });
  }
});

module.exports = router;

