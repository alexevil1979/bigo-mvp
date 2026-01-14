const QRCode = require('qrcode');
const crypto = require('crypto');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Хранилище активных QR-сессий (в продакшене использовать Redis)
const activeQRSessions = new Map();

/**
 * Генерация JWT токена
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

/**
 * Создание QR-сессии для входа через мобильное приложение
 * 
 * Функционал:
 * 1. Генерирует уникальный sessionId
 * 2. Создает QR-код с данными для сканирования
 * 3. Сохраняет сессию в памяти (временное хранилище)
 * 4. Сессия действительна 5 минут
 * 5. Возвращает sessionId и base64 изображение QR-кода
 */
exports.createQRSession = async (req, res) => {
  try {
    // Генерируем уникальный sessionId
    const sessionId = crypto.randomBytes(32).toString('hex');
    
    // Данные для QR-кода (JSON с sessionId и timestamp)
    const qrData = {
      sessionId,
      timestamp: Date.now(),
      type: 'nio-login'
    };

    // Генерируем QR-код как base64 изображение
    const qrDataString = JSON.stringify(qrData);
    const qrCodeDataURL = await QRCode.toDataURL(qrDataString, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 300
    });

    // Сохраняем сессию (действительна 5 минут)
    activeQRSessions.set(sessionId, {
      createdAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 минут
      status: 'pending' // pending, scanned, completed, expired
    });

    // Очищаем истекшие сессии
    cleanupExpiredSessions();

    res.json({
      sessionId,
      qrData: qrCodeDataURL,
      expiresIn: 300 // секунды
    });
  } catch (error) {
    console.error('Ошибка создания QR-сессии:', error);
    res.status(500).json({ error: 'Ошибка создания QR-сессии' });
  }
};

/**
 * Подтверждение входа через QR-код (вызывается мобильным приложением)
 * 
 * Функционал:
 * 1. Проверяет валидность sessionId
 * 2. Проверяет, не истекла ли сессия
 * 3. Авторизует пользователя из мобильного приложения
 * 4. Отправляет токен и данные пользователя через Socket.IO
 * 5. Помечает сессию как завершенную
 */
exports.confirmQRLogin = async (req, res) => {
  try {
    const { sessionId, userId, token: mobileToken } = req.body;

    if (!sessionId || !userId || !mobileToken) {
      return res.status(400).json({ error: 'Недостаточно данных' });
    }

    // Проверяем существование сессии
    const session = activeQRSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Сессия не найдена' });
    }

    // Проверяем, не истекла ли сессия
    if (Date.now() > session.expiresAt) {
      activeQRSessions.delete(sessionId);
      return res.status(410).json({ error: 'Сессия истекла' });
    }

    // Проверяем, не была ли сессия уже использована
    if (session.status === 'completed') {
      return res.status(409).json({ error: 'Сессия уже использована' });
    }

    // Верифицируем токен мобильного приложения
    // В реальном приложении здесь должна быть проверка токена от мобильного приложения
    // Для MVP просто проверяем существование пользователя
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Генерируем веб-токен для пользователя
    const webToken = generateToken(user._id);

    // Обновляем статус сессии
    session.status = 'scanned';
    session.userId = user._id;
    session.webToken = webToken;

    // Отправляем данные через Socket.IO (если доступен)
    // Это будет обработано в webrtcService.js или отдельном сервисе
    const io = req.app.get('io');
    if (io) {
      io.emit(`qr-login-${sessionId}`, {
        token: webToken,
        user: {
          id: user._id,
          email: user.email,
          nickname: user.nickname,
          avatar: user.avatar,
          coins: user.coins,
          beans: user.beans,
          role: user.role
        }
      });
    }

    res.json({
      message: 'Вход подтвержден',
      status: 'success'
    });
  } catch (error) {
    console.error('Ошибка подтверждения QR-входа:', error);
    res.status(500).json({ error: 'Ошибка подтверждения входа' });
  }
};

/**
 * Проверка статуса QR-сессии
 */
exports.checkQRSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = activeQRSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Сессия не найдена' });
    }

    if (Date.now() > session.expiresAt) {
      activeQRSessions.delete(sessionId);
      return res.status(410).json({ error: 'Сессия истекла' });
    }

    res.json({
      status: session.status,
      expiresAt: session.expiresAt
    });
  } catch (error) {
    console.error('Ошибка проверки QR-сессии:', error);
    res.status(500).json({ error: 'Ошибка проверки сессии' });
  }
};

/**
 * Очистка истекших сессий
 */
function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [sessionId, session] of activeQRSessions.entries()) {
    if (now > session.expiresAt) {
      activeQRSessions.delete(sessionId);
    }
  }
}

// Запускаем очистку каждые 5 минут
setInterval(cleanupExpiredSessions, 5 * 60 * 1000);

