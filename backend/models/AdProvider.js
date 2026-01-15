const mongoose = require('mongoose');

const AdProviderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Название провайдера обязательно'],
    trim: true
  },
  type: {
    type: String,
    enum: ['banner', 'video', 'native', 'popup', 'other'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  config: {
    type: Map,
    of: String,
    default: {}
  },
  apiKey: {
    type: String,
    default: ''
  },
  apiSecret: {
    type: String,
    default: ''
  },
  revenueShare: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AdProvider', AdProviderSchema);

