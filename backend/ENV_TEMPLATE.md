# Полный .env файл для сервера

Скопируйте содержимое ниже в файл `.env` в директории `backend/` на сервере.

```env
# ============================================
# NIO - LIVE Backend Environment Variables
# ============================================

# ============================================
# БАЗОВЫЕ НАСТРОЙКИ
# ============================================

# Режим работы (development/production)
NODE_ENV=production

# Порт сервера
PORT=5000

# ============================================
# MONGODB
# ============================================

# URI подключения к MongoDB
# Локально: mongodb://localhost:27017/streaming-mvp
# MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/streaming-mvp?retryWrites=true&w=majority
MONGODB_URI=mongodb://localhost:27017/streaming-mvp

# ============================================
# JWT АВТОРИЗАЦИЯ
# ============================================

# Секретный ключ для JWT токенов (ОБЯЗАТЕЛЬНО измените на случайную строку!)
# Генерация: openssl rand -base64 32
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Время жизни JWT токена (7d, 30d, 1h и т.д.)
JWT_EXPIRE=7d

# ============================================
# CORS (Cross-Origin Resource Sharing)
# ============================================

# Разрешенные источники (через запятую)
# Для продакшена укажите конкретные домены:
CORS_ORIGIN=https://bigo-mvp.vercel.app,https://bigo-mvp-sv4h.vercel.app
# Для разработки можно использовать * (не рекомендуется для продакшена)
# CORS_ORIGIN=*

# ============================================
# WEBRTC (для стриминга)
# ============================================

# STUN сервер (по умолчанию Google STUN)
WEBRTC_STUN_SERVER=stun:stun.l.google.com:19302

# TURN сервер (опционально, для NAT traversal)
# Формат: turn:turnserver.com:3478
# WEBRTC_TURN_SERVER=

# Учетные данные для TURN сервера (если требуется)
# WEBRTC_TURN_USERNAME=
# WEBRTC_TURN_PASSWORD=

# ============================================
# STRIPE (платежи)
# ============================================

# Секретный ключ Stripe (начинается с sk_)
# STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key

# Webhook секрет для Stripe (начинается с whsec_)
# STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# ============================================
# PAYPAL (платежи)
# ============================================

# PayPal Client ID
# PAYPAL_CLIENT_ID=your_paypal_client_id

# PayPal Client Secret
# PAYPAL_CLIENT_SECRET=your_paypal_client_secret

# PayPal Mode (sandbox или live)
# PAYPAL_MODE=sandbox

# ============================================
# OAUTH (социальные сети) - опционально
# ============================================

# Google OAuth
# GOOGLE_CLIENT_ID=your_google_client_id
# GOOGLE_CLIENT_SECRET=your_google_client_secret
# GOOGLE_CALLBACK_URL=https://api.bigo.1tlt.ru/api/auth/oauth/google/callback

# Facebook OAuth
# FACEBOOK_APP_ID=your_facebook_app_id
# FACEBOOK_APP_SECRET=your_facebook_app_secret
# FACEBOOK_CALLBACK_URL=https://api.bigo.1tlt.ru/api/auth/oauth/facebook/callback

# VK OAuth
# VK_APP_ID=your_vk_app_id
# VK_APP_SECRET=your_vk_app_secret
# VK_CALLBACK_URL=https://api.bigo.1tlt.ru/api/auth/oauth/vk/callback

# ============================================
# CLOUDINARY (загрузка изображений) - опционально
# ============================================

# Cloudinary Cloud Name
# CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name

# Cloudinary API Key
# CLOUDINARY_API_KEY=your_cloudinary_api_key

# Cloudinary API Secret
# CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

## Минимальный .env для работы

Если вам нужен только минимальный набор для запуска:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://localhost:27017/streaming-mvp
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d
CORS_ORIGIN=https://bigo-mvp.vercel.app,https://bigo-mvp-sv4h.vercel.app
WEBRTC_STUN_SERVER=stun:stun.l.google.com:19302
```

## Инструкция по созданию .env на сервере

```bash
cd /ssd/www/bigo-mvp/backend
nano .env
# Вставьте содержимое из шаблона выше
# Сохраните: Ctrl+O, Enter, Ctrl+X

# Проверьте, что файл создан
cat .env

# Перезапустите бэкенд
pm2 restart bigo-backend --update-env
```

## Важные замечания

1. **JWT_SECRET** - ОБЯЗАТЕЛЬНО измените на случайную строку! Генерация:
   ```bash
   openssl rand -base64 32
   ```

2. **MONGODB_URI** - Укажите правильный URI вашей базы данных

3. **CORS_ORIGIN** - Укажите все домены, с которых будут идти запросы

4. **НИКОГДА не коммитьте .env файл в git!** Он должен быть в .gitignore



