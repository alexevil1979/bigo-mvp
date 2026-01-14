const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  // Пользователь, который совершил платеж
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Тип платежной системы
  paymentProvider: {
    type: String,
    enum: ['stripe', 'paypal', 'apple', 'google'],
    required: true
  },
  // ID транзакции в платежной системе
  // unique: true автоматически создает индекс, не нужно дублировать через schema.index()
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  // Сумма в реальной валюте (в центах для USD)
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  // Валюта
  currency: {
    type: String,
    default: 'USD'
  },
  // Количество монет, которые получил пользователь
  coinsReceived: {
    type: Number,
    required: true,
    min: 1
  },
  // Статус платежа
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  // Метаданные платежа
  metadata: {
    type: Map,
    of: String
  },
  // Время создания
  createdAt: {
    type: Date,
    default: Date.now
  },
  // Время завершения
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Индексы
PaymentSchema.index({ user: 1, createdAt: -1 });
// transactionId уже имеет unique index, не нужно дублировать
PaymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', PaymentSchema);

