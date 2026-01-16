const mongoose = require('mongoose');

const SiteSettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: [true, 'Ключ обязателен'],
    unique: true,
    trim: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  type: {
    type: String,
    enum: ['string', 'number', 'boolean', 'json', 'array'],
    default: 'string'
  },
  category: {
    type: String,
    enum: ['general', 'payment', 'auth', 'advertising', 'analytics', 'other'],
    default: 'general'
  },
  label: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  isPublic: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Индексы
SiteSettingsSchema.index({ key: 1 });
SiteSettingsSchema.index({ category: 1 });

// Статические методы для получения настроек
SiteSettingsSchema.statics.getSetting = async function(key, defaultValue = null) {
  const setting = await this.findOne({ key });
  if (!setting) return defaultValue;
  
  if (setting.type === 'json') {
    try {
      return JSON.parse(setting.value);
    } catch {
      return setting.value;
    }
  }
  
  return setting.value;
};

SiteSettingsSchema.statics.setSetting = async function(key, value, options = {}) {
  const { type = 'string', category = 'general', label = '', description = '', isPublic = false } = options;
  
  let processedValue = value;
  if (type === 'json') {
    processedValue = JSON.stringify(value);
  }
  
  return await this.findOneAndUpdate(
    { key },
    { value: processedValue, type, category, label, description, isPublic },
    { upsert: true, new: true }
  );
};

module.exports = mongoose.model('SiteSettings', SiteSettingsSchema);



