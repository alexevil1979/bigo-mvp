const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Stream = require('../models/Stream');
const Gift = require('../models/Gift');
const Payment = require('../models/Payment');
const { authenticate, authorize } = require('../middleware/auth');

// Все маршруты админки требуют аутентификации и роли admin
router.use(authenticate);
router.use(authorize('admin', 'moderator'));

/**
 * Получение статистики
 */
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalStreams = await Stream.countDocuments();
    const activeStreams = await Stream.countDocuments({ status: 'live' });
    const totalGifts = await Gift.countDocuments();
    const totalRevenue = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.json({
      stats: {
        totalUsers,
        totalStreams,
        activeStreams,
        totalGifts,
        totalRevenue: totalRevenue[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({ error: 'Ошибка при получении статистики' });
  }
});

/**
 * Получение списка пользователей
 */
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { nickname: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Ошибка получения пользователей:', error);
    res.status(500).json({ error: 'Ошибка при получении пользователей' });
  }
});

/**
 * Обновление баланса пользователя
 */
router.put('/users/:id/balance', async (req, res) => {
  try {
    const { coins, beans } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    if (coins !== undefined) {
      user.coins = Math.max(0, coins);
    }
    if (beans !== undefined) {
      user.beans = Math.max(0, beans);
    }

    await user.save();

    res.json({ message: 'Баланс обновлен', user });
  } catch (error) {
    console.error('Ошибка обновления баланса:', error);
    res.status(500).json({ error: 'Ошибка при обновлении баланса' });
  }
});

/**
 * Бан/разбан пользователя
 */
router.put('/users/:id/ban', async (req, res) => {
  try {
    const { isBanned } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    user.isBanned = isBanned;
    await user.save();

    res.json({ message: `Пользователь ${isBanned ? 'забанен' : 'разбанен'}`, user });
  } catch (error) {
    console.error('Ошибка бана пользователя:', error);
    res.status(500).json({ error: 'Ошибка при бане пользователя' });
  }
});

/**
 * Получение списка стримов
 */
router.get('/streams', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }

    const streams = await Stream.find(query)
      .populate('streamer', 'nickname email avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Stream.countDocuments(query);

    res.json({
      streams,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Ошибка получения стримов:', error);
    res.status(500).json({ error: 'Ошибка при получении стримов' });
  }
});

/**
 * Бан стрима
 */
router.put('/streams/:id/ban', async (req, res) => {
  try {
    const { isBanned, banReason } = req.body;
    const stream = await Stream.findById(req.params.id);

    if (!stream) {
      return res.status(404).json({ error: 'Стрим не найден' });
    }

    stream.isBanned = isBanned;
    if (isBanned) {
      stream.banReason = banReason || 'Нарушение правил';
      stream.status = 'ended';
    }

    await stream.save();

    res.json({ message: `Стрим ${isBanned ? 'забанен' : 'разбанен'}`, stream });
  } catch (error) {
    console.error('Ошибка бана стрима:', error);
    res.status(500).json({ error: 'Ошибка при бане стрима' });
  }
});

/**
 * Топ стримеров по донатам
 */
router.get('/top-streamers', async (req, res) => {
  try {
    const topStreamers = await User.aggregate([
      { $match: { isActive: true, isBanned: false } },
      { $sort: { 'stats.totalBeansEarned': -1 } },
      { $limit: 10 },
      { $project: {
        nickname: 1,
        avatar: 1,
        beans: 1,
        stats: 1
      }}
    ]);

    res.json({ streamers: topStreamers });
  } catch (error) {
    console.error('Ошибка получения топ стримеров:', error);
    res.status(500).json({ error: 'Ошибка при получении топ стримеров' });
  }
});

module.exports = router;

