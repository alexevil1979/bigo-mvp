const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

/**
 * Генерация JWT токена
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

/**
 * Регистрация нового пользователя
 */
exports.register = async (req, res) => {
  try {
    // Проверка валидации
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, nickname } = req.body;

    // Проверка, существует ли пользователь
    const existingUser = await User.findOne({ 
      $or: [{ email }, { nickname }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: existingUser.email === email 
          ? 'Email уже используется' 
          : 'Никнейм уже занят' 
      });
    }

    // Создание нового пользователя
    const user = new User({
      email,
      password,
      nickname
    });

    await user.save();

    // Генерация токена
    const token = generateToken(user._id);

    // Обновление времени последнего входа
    user.lastLogin = new Date();
    await user.save();

    res.status(201).json({
      message: 'Регистрация успешна',
      token,
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
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.status(500).json({ error: 'Ошибка при регистрации' });
  }
};

/**
 * Вход пользователя
 */
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Находим пользователя с паролем
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    // Проверяем пароль
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Аккаунт деактивирован' });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: 'Аккаунт забанен' });
    }

    // Генерация токена
    const token = generateToken(user._id);

    // Обновление времени последнего входа
    user.lastLogin = new Date();
    await user.save();

    res.json({
      message: 'Вход выполнен успешно',
      token,
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
  } catch (error) {
    console.error('Ошибка входа:', error);
    res.status(500).json({ error: 'Ошибка при входе' });
  }
};

/**
 * Получение текущего пользователя
 */
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      user: {
        id: user._id,
        email: user.email,
        nickname: user.nickname,
        avatar: user.avatar,
        coins: user.coins,
        beans: user.beans,
        role: user.role,
        stats: user.stats,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Ошибка получения пользователя:', error);
    res.status(500).json({ error: 'Ошибка при получении данных пользователя' });
  }
};

/**
 * Обновление профиля
 */
exports.updateProfile = async (req, res) => {
  try {
    const { nickname, avatar } = req.body;
    const user = await User.findById(req.user.id);

    if (nickname && nickname !== user.nickname) {
      // Проверяем, не занят ли никнейм
      const existingUser = await User.findOne({ nickname });
      if (existingUser) {
        return res.status(400).json({ error: 'Никнейм уже занят' });
      }
      user.nickname = nickname;
    }

    if (avatar) {
      user.avatar = avatar;
    }

    await user.save();

    res.json({
      message: 'Профиль обновлен',
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
  } catch (error) {
    console.error('Ошибка обновления профиля:', error);
    res.status(500).json({ error: 'Ошибка при обновлении профиля' });
  }
};

