const SiteSettings = require('../models/SiteSettings');

/**
 * Получение всех настроек
 */
exports.getSettings = async (req, res) => {
  try {
    const { category } = req.query;
    const query = {};
    
    if (category) query.category = category;
    
    const settings = await SiteSettings.find(query).sort({ category: 1, key: 1 });
    
    // Группируем по категориям
    const grouped = {};
    settings.forEach(setting => {
      if (!grouped[setting.category]) {
        grouped[setting.category] = [];
      }
      grouped[setting.category].push(setting);
    });
    
    res.json({ settings: grouped, flat: settings });
  } catch (error) {
    console.error('Ошибка получения настроек:', error);
    res.status(500).json({ error: 'Ошибка при получении настроек' });
  }
};

/**
 * Получение публичных настроек
 */
exports.getPublicSettings = async (req, res) => {
  try {
    const settings = await SiteSettings.find({ isPublic: true });
    const result = {};
    
    settings.forEach(setting => {
      if (setting.type === 'json') {
        try {
          result[setting.key] = JSON.parse(setting.value);
        } catch {
          result[setting.key] = setting.value;
        }
      } else {
        result[setting.key] = setting.value;
      }
    });
    
    res.json({ settings: result });
  } catch (error) {
    console.error('Ошибка получения публичных настроек:', error);
    res.status(500).json({ error: 'Ошибка при получении настроек' });
  }
};

/**
 * Получение настройки по ключу
 */
exports.getSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await SiteSettings.findOne({ key });
    
    if (!setting) {
      return res.status(404).json({ error: 'Настройка не найдена' });
    }
    
    let value = setting.value;
    if (setting.type === 'json') {
      try {
        value = JSON.parse(setting.value);
      } catch {
        value = setting.value;
      }
    }
    
    res.json({ setting: { ...setting.toObject(), value } });
  } catch (error) {
    console.error('Ошибка получения настройки:', error);
    res.status(500).json({ error: 'Ошибка при получении настройки' });
  }
};

/**
 * Создание/обновление настройки
 */
exports.setSetting = async (req, res) => {
  try {
    const { key, value, type, category, label, description, isPublic } = req.body;
    
    const setting = await SiteSettings.setSetting(key, value, {
      type: type || 'string',
      category: category || 'general',
      label: label || '',
      description: description || '',
      isPublic: isPublic || false
    });
    
    res.json({ message: 'Настройка сохранена', setting });
  } catch (error) {
    console.error('Ошибка сохранения настройки:', error);
    res.status(500).json({ error: 'Ошибка при сохранении настройки' });
  }
};

/**
 * Массовое обновление настроек
 */
exports.updateSettings = async (req, res) => {
  try {
    const { settings } = req.body;
    
    if (!Array.isArray(settings)) {
      return res.status(400).json({ error: 'Настройки должны быть массивом' });
    }
    
    const results = [];
    for (const setting of settings) {
      const { key, value, type, category, label, description, isPublic } = setting;
      const updated = await SiteSettings.setSetting(key, value, {
        type: type || 'string',
        category: category || 'general',
        label: label || '',
        description: description || '',
        isPublic: isPublic || false
      });
      results.push(updated);
    }
    
    res.json({ message: 'Настройки обновлены', settings: results });
  } catch (error) {
    console.error('Ошибка обновления настроек:', error);
    res.status(500).json({ error: 'Ошибка при обновлении настроек' });
  }
};

/**
 * Удаление настройки
 */
exports.deleteSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await SiteSettings.findOneAndDelete({ key });
    
    if (!setting) {
      return res.status(404).json({ error: 'Настройка не найдена' });
    }
    
    res.json({ message: 'Настройка удалена' });
  } catch (error) {
    console.error('Ошибка удаления настройки:', error);
    res.status(500).json({ error: 'Ошибка при удалении настройки' });
  }
};



