import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:5000';

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/settings/`);
      const flatSettings = response.data.flat || [];
      const settingsObj = {};
      flatSettings.forEach(setting => {
        let value = setting.value;
        if (setting.type === 'json') {
          try {
            value = JSON.parse(value);
          } catch {}
        } else if (setting.type === 'boolean') {
          value = value === 'true' || value === true;
        } else if (setting.type === 'number') {
          value = Number(value);
        }
        settingsObj[setting.key] = value;
      });
      setSettings(settingsObj);
    } catch (error) {
      console.error('Ошибка загрузки настроек:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const settingsArray = Object.keys(settings).map(key => ({
        key,
        value: typeof settings[key] === 'object' 
          ? JSON.stringify(settings[key]) 
          : String(settings[key]),
        type: typeof settings[key] === 'object' ? 'json' 
          : typeof settings[key] === 'boolean' ? 'boolean'
          : typeof settings[key] === 'number' ? 'number'
          : 'string',
        category: getCategory(key)
      }));

      await axios.put(`${API_URL}/api/settings/bulk`, { settings: settingsArray });
      setMessage('Настройки успешно сохранены!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Ошибка сохранения настроек:', error);
      setMessage('Ошибка сохранения настроек');
    } finally {
      setSaving(false);
    }
  };

  const getCategory = (key) => {
    if (key.includes('seo') || key.includes('meta')) return 'seo';
    if (key.includes('payment')) return 'payment';
    if (key.includes('auth')) return 'auth';
    if (key.includes('ad')) return 'advertising';
    return 'general';
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return <div className="loading">Загрузка настроек...</div>;
  }

  return (
    <div className="settings">
      <h2>Настройки сайта</h2>
      
      {message && (
        <div className={`message ${message.includes('успешно') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      <div className="settings-sections">
        {/* Общие настройки */}
        <section className="settings-section">
          <h3>Общие настройки</h3>
          <div className="setting-group">
            <label>Название сайта:</label>
            <input
              type="text"
              value={settings.siteName || ''}
              onChange={(e) => updateSetting('siteName', e.target.value)}
            />
          </div>
          <div className="setting-group">
            <label>Домен:</label>
            <input
              type="text"
              value={settings.siteDomain || ''}
              onChange={(e) => updateSetting('siteDomain', e.target.value)}
              placeholder="https://bigo.1tlt.ru"
            />
          </div>
          <div className="setting-group">
            <label>Email администратора:</label>
            <input
              type="email"
              value={settings.adminEmail || ''}
              onChange={(e) => updateSetting('adminEmail', e.target.value)}
            />
          </div>
        </section>

        {/* SEO настройки */}
        <section className="settings-section">
          <h3>SEO настройки</h3>
          <div className="setting-group">
            <label>Meta описание по умолчанию:</label>
            <textarea
              value={settings.seoDefaultDescription || ''}
              onChange={(e) => updateSetting('seoDefaultDescription', e.target.value)}
              rows="3"
              placeholder="Описание сайта для поисковых систем"
            />
          </div>
          <div className="setting-group">
            <label>Meta ключевые слова:</label>
            <input
              type="text"
              value={settings.seoKeywords || ''}
              onChange={(e) => updateSetting('seoKeywords', e.target.value)}
              placeholder="стриминг, live stream, видео"
            />
          </div>
          <div className="setting-group">
            <label>Open Graph изображение:</label>
            <input
              type="text"
              value={settings.seoOgImage || ''}
              onChange={(e) => updateSetting('seoOgImage', e.target.value)}
              placeholder="/og-image.jpg"
            />
          </div>
          <div className="setting-group">
            <label>Twitter Card тип:</label>
            <select
              value={settings.seoTwitterCard || 'summary_large_image'}
              onChange={(e) => updateSetting('seoTwitterCard', e.target.value)}
            >
              <option value="summary">Summary</option>
              <option value="summary_large_image">Summary Large Image</option>
            </select>
          </div>
          <div className="setting-group">
            <label>Google Analytics ID:</label>
            <input
              type="text"
              value={settings.googleAnalyticsId || ''}
              onChange={(e) => updateSetting('googleAnalyticsId', e.target.value)}
              placeholder="G-XXXXXXXXXX"
            />
          </div>
          <div className="setting-group">
            <label>Yandex Metrika ID:</label>
            <input
              type="text"
              value={settings.yandexMetrikaId || ''}
              onChange={(e) => updateSetting('yandexMetrikaId', e.target.value)}
              placeholder="12345678"
            />
          </div>
        </section>

        {/* Настройки авторизации */}
        <section className="settings-section">
          <h3>Авторизация</h3>
          <div className="setting-group">
            <label>
              <input
                type="checkbox"
                checked={settings.allowRegistration || false}
                onChange={(e) => updateSetting('allowRegistration', e.target.checked)}
              />
              Разрешить регистрацию
            </label>
          </div>
          <div className="setting-group">
            <label>
              <input
                type="checkbox"
                checked={settings.requireEmailVerification || false}
                onChange={(e) => updateSetting('requireEmailVerification', e.target.checked)}
              />
              Требовать подтверждение email
            </label>
          </div>
        </section>
      </div>

      <button onClick={handleSave} className="save-btn" disabled={saving}>
        {saving ? 'Сохранение...' : 'Сохранить настройки'}
      </button>
    </div>
  );
}

