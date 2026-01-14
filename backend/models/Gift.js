const mongoose = require('mongoose');

const GiftSchema = new mongoose.Schema({
  // Отправитель подарка
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Получатель (стример)
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Стрим, в котором был отправлен подарок
  stream: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stream',
    required: true
  },
  // Тип подарка
  giftType: {
    type: String,
    required: true,
    enum: ['rose', 'heart', 'diamond', 'rocket', 'crown', 'star', 'fire', 'rainbow']
  },
  // Стоимость подарка в монетах
  cost: {
    type: Number,
    required: true,
    min: 1
  },
  // Количество "бобов", которые получит стример
  beansValue: {
    type: Number,
    required: true,
    min: 1
  },
  // Время отправки
  sentAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Индексы
GiftSchema.index({ recipient: 1, sentAt: -1 });
GiftSchema.index({ stream: 1, sentAt: -1 });
GiftSchema.index({ sender: 1 });

module.exports = mongoose.model('Gift', GiftSchema);

