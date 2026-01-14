const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware для проверки JWT токена
 * Добавляет информацию о пользователе в req.user
 */
const authenticate = async (req, res, next) => {
  try {
    // Получаем токен из заголовка Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Токен не предоставлен' });
    }

    const token = authHeader.substring(7); // Убираем "Bearer "

    // Проверяем токен
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Находим пользователя
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Аккаунт деактивирован' });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: 'Аккаунт забанен' });
    }

    // Добавляем пользователя в запрос
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Недействительный токен' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Токен истек' });
    }
    res.status(500).json({ error: 'Ошибка аутентификации' });
  }
};

/**
 * Middleware для проверки роли пользователя
 * @param {...string} roles - Разрешенные роли
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Требуется аутентификация' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    next();
  };
};

module.exports = { authenticate, authorize };

