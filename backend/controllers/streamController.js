const Stream = require('../models/Stream');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

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
      'webrtc.streamId': uuidv4(),
      lastHeartbeat: new Date()
    });

    await stream.save();

    // Обновляем статистику пользователя
    streamer.stats.totalStreams += 1;
    await streamer.save();

    // Уведомляем всех клиентов о новом стриме через Socket.IO
    const io = req.app.get('io');
    if (io) {
      const populatedStream = await Stream.findById(stream._id)
        .populate('streamer', 'nickname avatar');
      io.emit('stream-list-updated', {
        type: 'created',
        stream: populatedStream
      });
    }

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

    // Проверяем, не завис ли стрим (нет heartbeat более 30 секунд)
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
    if (!stream.lastHeartbeat || stream.lastHeartbeat < thirtySecondsAgo) {
      // Стрим завис - автоматически завершаем его
      console.log(`⚠️ Найден зависший стрим ${stream._id}, завершаем автоматически`);
      await stream.endStream();
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

    // Уведомляем всех клиентов о завершении стрима через Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('stream-list-updated', {
        type: 'ended',
        streamId: stream._id
      });
    }

    res.json({ message: 'Стрим завершен', stream });
  } catch (error) {
    console.error('Ошибка завершения стрима:', error);
    res.status(500).json({ error: 'Ошибка при завершении стрима' });
  }
};

/**
 * Завершение любого активного стрима пользователя (для зависших стримов)
 */
exports.endMyActiveStream = async (req, res) => {
  try {
    const stream = await Stream.findOne({
      streamer: req.user._id,
      status: 'live'
    });

    if (!stream) {
      return res.status(404).json({ error: 'Активный стрим не найден' });
    }

    await stream.endStream();

    // Уведомляем всех клиентов о завершении стрима через Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('stream-list-updated', {
        type: 'ended',
        streamId: stream._id
      });
    }

    res.json({ message: 'Стрим завершен', stream });
  } catch (error) {
    console.error('Ошибка завершения активного стрима:', error);
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

/**
 * Сохранение скриншота стрима
 */
exports.uploadScreenshot = async (req, res) => {
  try {
    console.log('[Screenshot Upload] Получен запрос на загрузку скриншота');
    console.log('[Screenshot Upload] req.file:', req.file ? {
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype
    } : 'отсутствует');
    console.log('[Screenshot Upload] req.body:', req.body);
    console.log('[Screenshot Upload] req.user:', req.user ? { id: req.user._id } : 'отсутствует');

    if (!req.file) {
      console.error('[Screenshot Upload] Ошибка: файл не загружен');
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    const { streamId } = req.body;
    if (!streamId) {
      console.error('[Screenshot Upload] Ошибка: streamId отсутствует');
      // Удаляем загруженный файл, если нет streamId
      if (req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: 'streamId обязателен' });
    }

    console.log('[Screenshot Upload] Поиск стрима:', streamId, 'для пользователя:', req.user._id);

    // Проверяем, что стрим существует и принадлежит пользователю
    const stream = await Stream.findOne({
      _id: streamId,
      streamer: req.user._id,
      status: 'live'
    });

    if (!stream) {
      console.error('[Screenshot Upload] Ошибка: стрим не найден или не принадлежит пользователю');
      // Удаляем загруженный файл, если стрим не найден
      if (req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ error: 'Стрим не найден или у вас нет прав' });
    }

    console.log('[Screenshot Upload] Стрим найден:', stream._id);

    // Сохраняем путь к скриншоту
    const screenshotPath = `/uploads/streams/screenshots/${req.file.filename}`;
    console.log('[Screenshot Upload] Путь к скриншоту:', screenshotPath);
    console.log('[Screenshot Upload] Полный путь на диске:', req.file.path);
    
    // Проверяем, что файл действительно существует
    if (!fs.existsSync(req.file.path)) {
      console.error('[Screenshot Upload] Ошибка: файл не существует по пути:', req.file.path);
      return res.status(500).json({ error: 'Файл не был сохранен на диск' });
    }

    // Обновляем последний скриншот в стриме
    stream.lastScreenshot = screenshotPath;
    stream.lastScreenshotAt = new Date();
    await stream.save();

    console.log('[Screenshot Upload] Скриншот успешно сохранен:', screenshotPath);

    res.json({
      message: 'Скриншот сохранен',
      screenshot: screenshotPath
    });
  } catch (error) {
    console.error('[Screenshot Upload] Ошибка сохранения скриншота:', error);
    console.error('[Screenshot Upload] Stack:', error.stack);
    // Удаляем файл в случае ошибки
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('[Screenshot Upload] Ошибка удаления файла:', unlinkError);
      }
    }
    res.status(500).json({ error: 'Ошибка при сохранении скриншота' });
  }
};

/**
 * Получение последнего скриншота стрима
 */
exports.getScreenshot = async (req, res) => {
  try {
    const { streamId } = req.params;
    
    const stream = await Stream.findById(streamId);
    if (!stream) {
      return res.status(404).json({ error: 'Стрим не найден' });
    }

    // Если есть последний скриншот, возвращаем его
    if (stream.lastScreenshot) {
      const screenshotPath = path.join(__dirname, '../../', stream.lastScreenshot);
      if (fs.existsSync(screenshotPath)) {
        return res.json({
          screenshot: stream.lastScreenshot,
          screenshotAt: stream.lastScreenshotAt
        });
      }
    }

    // Если скриншота нет, возвращаем null
    res.json({
      screenshot: null,
      screenshotAt: null
    });
  } catch (error) {
    console.error('Ошибка получения скриншота:', error);
    res.status(500).json({ error: 'Ошибка при получении скриншота' });
  }
};

/**
 * Очистка старых скриншотов (старше 1 дня)
 */
exports.cleanupOldScreenshots = async () => {
  try {
    const screenshotsDir = path.join(__dirname, '../../uploads/streams/screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      return;
    }

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000; // 1 день назад
    const files = fs.readdirSync(screenshotsDir);

    let deletedCount = 0;
    for (const file of files) {
      const filePath = path.join(screenshotsDir, file);
      const stats = fs.statSync(filePath);
      
      // Удаляем файлы старше 1 дня
      if (stats.mtimeMs < oneDayAgo) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`Очищено ${deletedCount} старых скриншотов`);
    }

    // Также очищаем ссылки на удаленные скриншоты в стримах
    const streams = await Stream.find({ 
      lastScreenshot: { $exists: true, $ne: null },
      status: 'live'
    });

    for (const stream of streams) {
      if (stream.lastScreenshot) {
        const screenshotPath = path.join(__dirname, '../../', stream.lastScreenshot);
        if (!fs.existsSync(screenshotPath)) {
          stream.lastScreenshot = null;
          stream.lastScreenshotAt = null;
          await stream.save();
        }
      }
    }
  } catch (error) {
    console.error('Ошибка очистки старых скриншотов:', error);
  }
};

