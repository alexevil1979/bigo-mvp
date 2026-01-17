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
    const streamId = req.params.id;
    console.log(`[getStream] Запрос стрима: ${streamId}`);
    
    const stream = await Stream.findById(streamId)
      .populate('streamer', 'nickname avatar beans stats');

    if (!stream) {
      console.log(`[getStream] Стрим ${streamId} не найден`);
      return res.status(404).json({ error: 'Стрим не найден' });
    }

    console.log(`[getStream] Стрим ${streamId} найден: status=${stream.status}, lastHeartbeat=${stream.lastHeartbeat ? stream.lastHeartbeat.toISOString() : 'null'}`);
    
    if (stream.status === 'live') {
      const now = new Date();
      const lastHeartbeat = stream.lastHeartbeat;
      const timeSinceHeartbeat = lastHeartbeat 
        ? Math.floor((now.getTime() - lastHeartbeat.getTime()) / 1000)
        : 'неизвестно';
      console.log(`[getStream] Стрим ${streamId} активен, время с последнего heartbeat: ${timeSinceHeartbeat} сек`);
    }

    res.json({ stream });
  } catch (error) {
    console.error('[getStream] Ошибка при получении стрима:', error);
    console.error('[getStream] Stack:', error.stack);
    res.status(500).json({ error: 'Ошибка при получении стрима' });
  }
};

/**
 * Получение активного стрима пользователя
 */
exports.getMyActiveStream = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log(`[getMyActiveStream] Запрос активного стрима для пользователя: ${userId}`);
    
    const stream = await Stream.findOne({
      streamer: userId,
      status: 'live'
    })
    .populate('streamer', 'nickname avatar beans stats');

    if (!stream) {
      console.log(`[getMyActiveStream] Активный стрим не найден для пользователя: ${userId}`);
      return res.status(404).json({ error: 'Активный стрим не найден' });
    }

    console.log(`[getMyActiveStream] Найден активный стрим: ${stream._id}, lastHeartbeat=${stream.lastHeartbeat ? stream.lastHeartbeat.toISOString() : 'null'}`);

    // Проверяем, не завис ли стрим (нет heartbeat более 30 секунд)
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
    const timeSinceHeartbeat = stream.lastHeartbeat 
      ? Math.floor((Date.now() - stream.lastHeartbeat.getTime()) / 1000)
      : 'неизвестно';
    
    console.log(`[getMyActiveStream] Стрим ${stream._id}: время с последнего heartbeat=${timeSinceHeartbeat} сек, порог=30 сек`);
    
    if (!stream.lastHeartbeat || stream.lastHeartbeat < thirtySecondsAgo) {
      // Стрим завис - автоматически завершаем его
      console.log(`[getMyActiveStream] ⚠️ Найден зависший стрим ${stream._id}, завершаем автоматически (heartbeat: ${timeSinceHeartbeat} сек)`);
      await stream.endStream();
      console.log(`[getMyActiveStream] Стрим ${stream._id} завершен`);
      return res.status(404).json({ error: 'Активный стрим не найден' });
    }

    console.log(`[getMyActiveStream] Стрим ${stream._id} активен, возвращаем данные`);
    res.json({ stream });
  } catch (error) {
    console.error('[getMyActiveStream] Ошибка получения активного стрима:', error);
    console.error('[getMyActiveStream] Stack:', error.stack);
    res.status(500).json({ error: 'Ошибка при получении активного стрима' });
  }
};

/**
 * Завершение стрима
 */
exports.endStream = async (req, res) => {
  try {
    const streamId = req.params.id;
    const userId = req.user._id;
    console.log(`[endStream] Запрос завершения стрима: ${streamId} от пользователя: ${userId}`);
    
    const stream = await Stream.findOne({
      _id: streamId,
      streamer: userId
    });

    if (!stream) {
      console.log(`[endStream] Стрим ${streamId} не найден или пользователь ${userId} не является стримером`);
      return res.status(404).json({ error: 'Стрим не найден или у вас нет прав' });
    }

    console.log(`[endStream] Стрим ${streamId} найден: status=${stream.status}, streamer=${stream.streamer}`);

    if (stream.status === 'ended') {
      console.log(`[endStream] Стрим ${streamId} уже завершен`);
      return res.status(400).json({ error: 'Стрим уже завершен' });
    }

    console.log(`[endStream] Завершаем стрим ${streamId}`);
    await stream.endStream();
    console.log(`[endStream] Стрим ${streamId} успешно завершен`);

    // Уведомляем всех клиентов о завершении стрима через Socket.IO
    const io = req.app.get('io');
    if (io) {
      console.log(`[endStream] Отправляем stream-list-updated для стрима ${streamId}`);
      io.emit('stream-list-updated', {
        type: 'ended',
        streamId: stream._id
      });
    } else {
      console.warn(`[endStream] Socket.IO не доступен для отправки уведомлений`);
    }

    res.json({ message: 'Стрим завершен', stream });
  } catch (error) {
    console.error('[endStream] Ошибка завершения стрима:', error);
    console.error('[endStream] Stack:', error.stack);
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
    console.log('[Screenshot Upload] Типы:', {
      streamIdType: typeof streamId,
      userIdType: typeof req.user._id,
      userIdString: req.user._id.toString()
    });

    // Проверяем, что стрим существует и принадлежит пользователю
    // Разрешаем загрузку скриншотов для стримов со статусом 'live' или 'ended' (только что завершенных)
    // Пробуем найти стрим разными способами (на случай проблем с типами ID)
    let stream = await Stream.findOne({
      _id: streamId,
      streamer: req.user._id,
      status: { $in: ['live', 'ended'] }
    });

    // Если не нашли, пробуем найти по строковому ID
    if (!stream) {
      console.log('[Screenshot Upload] Попытка найти стрим по строковому ID');
      stream = await Stream.findOne({
        _id: streamId.toString(),
        streamer: req.user._id.toString(),
        status: { $in: ['live', 'ended'] }
      });
    }

    // Если все еще не нашли, пробуем найти только по ID стрима (без проверки streamer)
    if (!stream) {
      console.log('[Screenshot Upload] Попытка найти стрим только по ID');
      stream = await Stream.findOne({
        _id: streamId,
        status: { $in: ['live', 'ended'] }
      });
      
      if (stream) {
        // Проверяем, что стрим принадлежит пользователю
        const streamerId = stream.streamer.toString();
        const userId = req.user._id.toString();
        if (streamerId !== userId) {
          console.error('[Screenshot Upload] Стрим найден, но не принадлежит пользователю:', {
            streamerId,
            userId
          });
          stream = null;
        } else {
          console.log('[Screenshot Upload] Стрим найден после проверки владельца');
        }
      }
    }

    if (!stream) {
      console.error('[Screenshot Upload] Ошибка: стрим не найден или не принадлежит пользователю');
      console.error('[Screenshot Upload] Попробуем найти все стримы пользователя (live и ended):');
      const userStreams = await Stream.find({
        streamer: req.user._id,
        status: { $in: ['live', 'ended'] }
      }).sort({ createdAt: -1 }).limit(5);
      console.error('[Screenshot Upload] Стримы пользователя:', userStreams.map(s => ({
        id: s._id.toString(),
        title: s.title,
        status: s.status,
        createdAt: s.createdAt
      })));
      
      // Также попробуем найти стрим по ID без проверки статуса (для диагностики)
      const anyStream = await Stream.findById(streamId);
      if (anyStream) {
        console.error('[Screenshot Upload] Стрим найден в БД, но не подходит:', {
          id: anyStream._id.toString(),
          status: anyStream.status,
          streamer: anyStream.streamer.toString(),
          requestedUserId: req.user._id.toString(),
          match: anyStream.streamer.toString() === req.user._id.toString()
        });
      } else {
        console.error('[Screenshot Upload] Стрим с ID', streamId, 'не найден в БД');
      }
      
      // Удаляем загруженный файл, если стрим не найден
      if (req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ error: 'Стрим не найден или у вас нет прав' });
    }

    console.log('[Screenshot Upload] Стрим найден:', stream._id);

    // Переименовываем файл с правильным streamId
    const correctFilename = `${stream._id}-${Date.now()}.jpg`;
    const correctPath = path.join(path.dirname(req.file.path), correctFilename);
    
    try {
      // Переименовываем файл
      fs.renameSync(req.file.path, correctPath);
      console.log('[Screenshot Upload] Файл переименован:', req.file.path, '->', correctPath);
    } catch (renameError) {
      console.error('[Screenshot Upload] Ошибка переименования файла:', renameError);
      // Удаляем временный файл
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(500).json({ error: 'Ошибка при сохранении файла' });
    }

    // Сохраняем путь к скриншоту
    const screenshotPath = `/uploads/streams/screenshots/${correctFilename}`;
    console.log('[Screenshot Upload] Путь к скриншоту:', screenshotPath);
    console.log('[Screenshot Upload] Полный путь на диске:', correctPath);
    
    // Проверяем, что файл действительно существует
    if (!fs.existsSync(correctPath)) {
      console.error('[Screenshot Upload] Ошибка: файл не существует по пути:', correctPath);
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
 * Загрузка заставки для стрима
 */
exports.uploadOverlay = async (req, res) => {
  try {
    const { streamId, overlayType, enabled } = req.body;
    
    // Если файл не загружен, это может быть только обновление состояния (включение/выключение)
    if (!req.file) {
      // Обновляем только состояние заставки без загрузки файла
      const stream = await Stream.findOne({
        _id: streamId,
        streamer: req.user._id
      });

      if (!stream) {
        return res.status(404).json({ error: 'Стрим не найден или у вас нет прав' });
      }

      // Обновляем только состояние
      stream.overlay.overlayType = (enabled === 'true' || enabled === true) ? overlayType : null;
      stream.overlay.showOverlay = enabled === 'true' || enabled === true;
      await stream.save();

      return res.json({
        message: 'Состояние заставки обновлено',
        overlay: {
          overlayImagePath: stream.overlay.overlayImagePath,
          overlayVideoPath: stream.overlay.overlayVideoPath,
          overlayType: stream.overlay.overlayType,
          showOverlay: stream.overlay.showOverlay
        }
      });
    }

    // Если файл загружен, сохраняем его
    const userId = req.user._id;

    console.log('[Overlay Upload] Получен запрос на загрузку заставки:', {
      streamId,
      overlayType,
      enabled,
      userId: userId.toString(),
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    // Проверяем, что стрим существует и принадлежит пользователю
    let stream;
    try {
      stream = await Stream.findOne({
        _id: streamId,
        streamer: userId
      });
    } catch (error) {
      console.error('[Overlay Upload] Ошибка поиска стрима:', error);
      if (req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ error: 'Стрим не найден или у вас нет прав' });
    }

    if (!stream) {
      console.error('[Overlay Upload] Стрим не найден или не принадлежит пользователю');
      if (req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ error: 'Стрим не найден или у вас нет прав' });
    }

    // Переименовываем файл с правильным streamId
    const ext = path.extname(req.file.originalname);
    const correctFilename = `${stream._id}-overlay-${Date.now()}${ext}`;
    const correctPath = path.join(path.dirname(req.file.path), correctFilename);
    
    try {
      fs.renameSync(req.file.path, correctPath);
      console.log('[Overlay Upload] Файл переименован:', req.file.path, '->', correctPath);
    } catch (renameError) {
      console.error('[Overlay Upload] Ошибка переименования файла:', renameError);
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(500).json({ error: 'Ошибка при сохранении файла' });
    }

    // Сохраняем путь к заставке
    const overlayPath = `/uploads/streams/overlays/${correctFilename}`;
    
    // Удаляем старую заставку, если она есть
    if (stream.overlay.overlayImagePath && overlayType === 'image') {
      const oldPath = path.join(__dirname, '../../', stream.overlay.overlayImagePath);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }
    if (stream.overlay.overlayVideoPath && overlayType === 'video') {
      const oldPath = path.join(__dirname, '../../', stream.overlay.overlayVideoPath);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Обновляем заставку в стриме
    if (overlayType === 'image') {
      stream.overlay.overlayImagePath = overlayPath;
      stream.overlay.overlayVideoPath = null;
    } else if (overlayType === 'video') {
      stream.overlay.overlayVideoPath = overlayPath;
      stream.overlay.overlayImagePath = null;
    }
    stream.overlay.overlayType = enabled ? overlayType : null;
    stream.overlay.showOverlay = enabled === 'true' || enabled === true;
    
    await stream.save();

    console.log('[Overlay Upload] Заставка успешно сохранена:', overlayPath);

    res.json({
      message: 'Заставка сохранена',
      overlay: {
        overlayImagePath: stream.overlay.overlayImagePath,
        overlayVideoPath: stream.overlay.overlayVideoPath,
        overlayType: stream.overlay.overlayType,
        showOverlay: stream.overlay.showOverlay
      }
    });
  } catch (error) {
    console.error('[Overlay Upload] Ошибка сохранения заставки:', error);
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('[Overlay Upload] Ошибка удаления файла:', unlinkError);
      }
    }
    res.status(500).json({ error: 'Ошибка при сохранении заставки' });
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

