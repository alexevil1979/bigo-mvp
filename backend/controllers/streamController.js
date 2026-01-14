const Stream = require('../models/Stream');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');

/**
 * Создание нового стрима
 */
exports.createStream = async (req, res) => {
  try {
    const { title, description, category } = req.body;
    const streamer = req.user;

    // Проверяем, нет ли активного стрима
    const activeStream = await Stream.findOne({
      streamer: streamer._id,
      status: 'live'
    });

    if (activeStream) {
      return res.status(400).json({ 
        error: 'У вас уже есть активный стрим',
        stream: activeStream
      });
    }

    // Создаем новый стрим
    const stream = new Stream({
      streamer: streamer._id,
      title: title || 'Мой стрим',
      description: description || '',
      category: category || 'other',
      status: 'live',
      'webrtc.streamId': uuidv4()
    });

    await stream.save();

    // Обновляем статистику пользователя
    streamer.stats.totalStreams += 1;
    await streamer.save();

    res.status(201).json({
      message: 'Стрим создан',
      stream
    });
  } catch (error) {
    console.error('Ошибка создания стрима:', error);
    res.status(500).json({ error: 'Ошибка при создании стрима' });
  }
};

/**
 * Получение списка активных стримов
 */
exports.getStreams = async (req, res) => {
  try {
    const { category, limit = 20, page = 1 } = req.query;
    
    const query = { status: 'live', isBanned: false };
    if (category) {
      query.category = category;
    }

    const streams = await Stream.find(query)
      .populate('streamer', 'nickname avatar')
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
};

/**
 * Получение конкретного стрима
 */
exports.getStream = async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id)
      .populate('streamer', 'nickname avatar beans stats');

    if (!stream) {
      return res.status(404).json({ error: 'Стрим не найден' });
    }

    res.json({ stream });
  } catch (error) {
    console.error('Ошибка получения стрима:', error);
    res.status(500).json({ error: 'Ошибка при получении стрима' });
  }
};

/**
 * Получение активного стрима пользователя
 */
exports.getMyActiveStream = async (req, res) => {
  try {
    const stream = await Stream.findOne({
      streamer: req.user._id,
      status: 'live'
    })
    .populate('streamer', 'nickname avatar beans stats');

    if (!stream) {
      return res.status(404).json({ error: 'Активный стрим не найден' });
    }

    res.json({ stream });
  } catch (error) {
    console.error('Ошибка получения активного стрима:', error);
    res.status(500).json({ error: 'Ошибка при получении активного стрима' });
  }
};

/**
 * Завершение стрима
 */
exports.endStream = async (req, res) => {
  try {
    const stream = await Stream.findOne({
      _id: req.params.id,
      streamer: req.user._id
    });

    if (!stream) {
      return res.status(404).json({ error: 'Стрим не найден или у вас нет прав' });
    }

    if (stream.status === 'ended') {
      return res.status(400).json({ error: 'Стрим уже завершен' });
    }

    await stream.endStream();

    res.json({ message: 'Стрим завершен', stream });
  } catch (error) {
    console.error('Ошибка завершения стрима:', error);
    res.status(500).json({ error: 'Ошибка при завершении стрима' });
  }
};

/**
 * Обновление количества зрителей
 */
exports.updateViewerCount = async (req, res) => {
  try {
    const { streamId, count } = req.body;

    const stream = await Stream.findById(streamId);
    if (!stream) {
      return res.status(404).json({ error: 'Стрим не найден' });
    }

    stream.viewerCount = Math.max(0, parseInt(count) || 0);
    
    // Обновляем пиковое количество зрителей
    if (stream.viewerCount > stream.stats.peakViewers) {
      stream.stats.peakViewers = stream.viewerCount;
    }

    // Обновляем максимальное количество зрителей
    if (stream.viewerCount > stream.maxViewers) {
      stream.maxViewers = stream.viewerCount;
    }

    await stream.save();

    res.json({ message: 'Количество зрителей обновлено', stream });
  } catch (error) {
    console.error('Ошибка обновления количества зрителей:', error);
    res.status(500).json({ error: 'Ошибка при обновлении количества зрителей' });
  }
};

