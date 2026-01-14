const mongoose = require('mongoose');

const StreamSchema = new mongoose.Schema({
  // Стример (владелец стрима)
  streamer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Название стрима
  title: {
    type: String,
    required: [true, 'Название стрима обязательно'],
    trim: true,
    maxlength: [100, 'Название не должно превышать 100 символов']
  },
  // Описание стрима
  description: {
    type: String,
    maxlength: [500, 'Описание не должно превышать 500 символов'],
    default: ''
  },
  // Категория стрима
  category: {
    type: String,
    enum: ['gaming', 'music', 'talk', 'sports', 'education', 'other'],
    default: 'other'
  },
  // Статус стрима
  status: {
    type: String,
    enum: ['live', 'ended', 'scheduled'],
    default: 'live'
  },
  // Количество зрителей
  viewerCount: {
    type: Number,
    default: 0,
    min: 0
  },
  // Максимальное количество зрителей
  maxViewers: {
    type: Number,
    default: 0
  },
  // WebRTC информация
  webrtc: {
    streamId: String, // Уникальный ID стрима для WebRTC
    offer: String,    // SDP offer
    answer: String,  // SDP answer
    iceCandidates: [{
      candidate: String,
      sdpMLineIndex: Number,
      sdpMid: String
    }]
  },
  // Статистика стрима
  stats: {
    totalGifts: { type: Number, default: 0 },
    totalBeansEarned: { type: Number, default: 0 },
    peakViewers: { type: Number, default: 0 },
    duration: { type: Number, default: 0 } // в секундах
  },
  // Время начала стрима
  startedAt: {
    type: Date,
    default: Date.now
  },
  // Время окончания стрима
  endedAt: {
    type: Date,
    default: null
  },
  // Последний heartbeat от стримера (для отслеживания активности)
  lastHeartbeat: {
    type: Date,
    default: Date.now
  },
  // Забанен ли стрим
  isBanned: {
    type: Boolean,
    default: false
  },
  // Причина бана
  banReason: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Индексы для быстрого поиска
StreamSchema.index({ streamer: 1, status: 1 });
StreamSchema.index({ status: 1, createdAt: -1 });
StreamSchema.index({ 'webrtc.streamId': 1 });

// Метод для завершения стрима
StreamSchema.methods.endStream = function() {
  this.status = 'ended';
  this.endedAt = new Date();
  if (this.startedAt) {
    this.stats.duration = Math.floor((this.endedAt - this.startedAt) / 1000);
  }
  return this.save();
};

module.exports = mongoose.model('Stream', StreamSchema);

