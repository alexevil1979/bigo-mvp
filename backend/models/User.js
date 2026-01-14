const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email обязателен'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Некорректный email']
  },
  password: {
    type: String,
    required: [true, 'Пароль обязателен'],
    minlength: [6, 'Пароль должен быть минимум 6 символов'],
    select: false // Не возвращать пароль по умолчанию
  },
  nickname: {
    type: String,
    required: [true, 'Никнейм обязателен'],
    trim: true,
    minlength: [3, 'Никнейм должен быть минимум 3 символа'],
    maxlength: [20, 'Никнейм не должен превышать 20 символов']
  },
  avatar: {
    type: String,
    default: null
  },
  // Виртуальная валюта пользователя
  coins: {
    type: Number,
    default: 0,
    min: 0
  },
  // "Бобы" - валюта стримера (получает от подарков)
  beans: {
    type: Number,
    default: 0,
    min: 0
  },
  // Роль пользователя
  role: {
    type: String,
    enum: ['user', 'streamer', 'moderator', 'admin'],
    default: 'user'
  },
  // Статус аккаунта
  isActive: {
    type: Boolean,
    default: true
  },
  // Забанен ли пользователь
  isBanned: {
    type: Boolean,
    default: false
  },
  // OAuth провайдеры
  oauthProvider: {
    type: String,
    enum: ['google', 'facebook', null],
    default: null
  },
  oauthId: {
    type: String,
    default: null
  },
  // Статистика
  stats: {
    totalStreams: { type: Number, default: 0 },
    totalViewers: { type: Number, default: 0 },
    totalGiftsReceived: { type: Number, default: 0 },
    totalBeansEarned: { type: Number, default: 0 }
  },
  // Дата создания
  createdAt: {
    type: Date,
    default: Date.now
  },
  // Дата последнего входа
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Хеширование пароля перед сохранением
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Метод для сравнения паролей
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Метод для безопасного возврата пользователя (без пароля)
UserSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

module.exports = mongoose.model('User', UserSchema);

