const mongoose = require('mongoose');

const PaymentProviderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Название провайдера обязательно'],
    trim: true
  },
  type: {
    type: String,
    enum: ['card', 'crypto', 'bank', 'mobile', 'other'],
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
  minAmount: {
    type: Number,
    default: 0
  },
  maxAmount: {
    type: Number,
    default: null
  },
  fee: {
    type: Number,
    default: 0
  },
  feeType: {
    type: String,
    enum: ['percent', 'fixed'],
    default: 'percent'
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PaymentProvider', PaymentProviderSchema);



