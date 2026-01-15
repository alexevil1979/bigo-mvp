const mongoose = require('mongoose');

const ContentPageSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: [true, 'Slug обязателен'],
    unique: true,
    trim: true,
    lowercase: true
  },
  title: {
    type: String,
    required: [true, 'Заголовок обязателен'],
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Содержимое обязательно'],
    default: ''
  },
  metaTitle: {
    type: String,
    default: ''
  },
  metaDescription: {
    type: String,
    default: ''
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  category: {
    type: String,
    enum: ['legal', 'support', 'resources', 'other'],
    default: 'other'
  },
  order: {
    type: Number,
    default: 0
  },
  lastEditedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Индексы
ContentPageSchema.index({ slug: 1 });
ContentPageSchema.index({ category: 1 });
ContentPageSchema.index({ isPublished: 1 });

module.exports = mongoose.model('ContentPage', ContentPageSchema);

