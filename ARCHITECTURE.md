# Архитектура MVP Стримингового Сервиса

## 🏗 Общая архитектура

Проект состоит из 4 основных частей:

1. **Backend** (Node.js + Express) - API сервер и WebSocket сервер
2. **Web Frontend** (Next.js) - Веб-приложение для браузера
3. **Mobile Frontend** (React Native) - Мобильное приложение для Android/iOS
4. **Admin Panel** (Next.js) - Админ-панель для управления

## 📡 Backend архитектура

### Структура
```
backend/
├── server.js           # Точка входа, настройка Express и Socket.IO
├── models/            # Mongoose модели (User, Stream, Gift, Payment)
├── controllers/       # Бизнес-логика (auth, streams, payments)
├── routes/            # API маршруты
├── services/          # Сервисы для Socket.IO (чат, WebRTC)
└── middleware/        # Middleware (аутентификация, валидация)
```

### Основные компоненты

#### 1. Авторизация
- JWT токены для аутентификации
- Bcrypt для хеширования паролей
- Middleware для защиты маршрутов

#### 2. Стриминг
- WebRTC для peer-to-peer соединений
- Socket.IO для сигналинга
- Поддержка до 10-50 зрителей на стрим

#### 3. Чат
- Socket.IO для real-time сообщений
- Комнаты для каждого стрима
- Модерация сообщений

#### 4. Подарки и платежи
- Виртуальная валюта (монеты)
- Интеграция со Stripe
- Конвертация монет в "бобы" для стримеров

## 🌐 Web Frontend архитектура

### Структура
```
frontend/web/
├── pages/             # Next.js страницы (SSR)
├── components/        # React компоненты
│   ├── StreamPlayer   # Плеер для просмотра стрима
│   ├── StreamBroadcaster # Компонент для стриминга
│   ├── Chat          # Чат компонент
│   └── GiftPanel     # Панель подарков
├── contexts/          # React Context (AuthContext)
└── styles/           # CSS стили
```

### Технологии
- Next.js 14 для SSR и роутинга
- Socket.IO Client для WebSocket
- WebRTC API для стриминга
- Axios для HTTP запросов

## 📱 Mobile Frontend архитектура

### Структура
```
frontend/mobile/
├── src/
│   ├── screens/       # Экраны приложения
│   │   ├── LoginScreen
│   │   ├── HomeScreen
│   │   ├── StreamScreen
│   │   └── CreateStreamScreen
│   ├── components/    # Переиспользуемые компоненты
│   ├── navigation/   # Навигация (React Navigation)
│   └── contexts/     # React Context
└── android/ios/      # Нативные файлы
```

### Технологии
- React Native для кроссплатформенной разработки
- react-native-webrtc для WebRTC
- Socket.IO Client для WebSocket
- React Navigation для навигации

## 🔄 Потоки данных

### 1. Авторизация
```
User → Frontend → POST /api/auth/login → Backend → MongoDB
                ← JWT Token ←
```

### 2. Создание стрима
```
User → Frontend → POST /api/streams → Backend → MongoDB
                ← Stream Object ←
Frontend → Socket.IO (join-stream) → Backend
```

### 3. Просмотр стрима
```
Viewer → Frontend → GET /api/streams/:id → Backend
                  ← Stream Data ←
Frontend → Socket.IO (join-stream) → Backend
Frontend ↔ WebRTC ↔ Backend (сигналинг) ↔ Streamer
```

### 4. Чат
```
User → Frontend → Socket.IO (send-message) → Backend
Backend → Socket.IO (receive-message) → All Viewers
```

### 5. Подарки
```
User → Frontend → Socket.IO (send-gift) → Backend
Backend → MongoDB (update balances)
Backend → Socket.IO (receive-gift) → All Viewers
```

## 🗄 База данных

### MongoDB Collections

#### Users
- email, password (hashed), nickname
- coins, beans (валюты)
- role (user, streamer, moderator, admin)
- stats (статистика)

#### Streams
- streamer (ref to User)
- title, description, category
- status (live, ended)
- viewerCount, stats
- webrtc (streamId, offer, answer)

#### Gifts
- sender, recipient (ref to User)
- stream (ref to Stream)
- giftType, cost, beansValue

#### Payments
- user (ref to User)
- paymentProvider, transactionId
- amount, coinsReceived
- status

## 🔐 Безопасность

### Backend
- JWT токены с истечением
- Bcrypt для паролей
- Валидация входных данных
- CORS настройки
- Middleware для проверки прав доступа

### Frontend
- Хранение токенов в localStorage (web) / AsyncStorage (mobile)
- Автоматическое добавление токена в заголовки
- Защита маршрутов (требуют аутентификации)

## 📊 Масштабирование

### Текущие ограничения MVP
- WebRTC P2P: до 10-50 зрителей
- MongoDB: одна база данных
- Socket.IO: один сервер

### Рекомендации для продакшена

1. **WebRTC**
   - Использовать SFU (Selective Forwarding Unit)
   - Agora.io, Daily.co, или Twilio
   - TURN серверы для NAT traversal

2. **База данных**
   - MongoDB Atlas (облако)
   - Репликация для отказоустойчивости
   - Индексы для оптимизации запросов

3. **Сервер**
   - Кластеризация Node.js (PM2 cluster mode)
   - Load balancer (Nginx)
   - Redis для Socket.IO (multi-server)

4. **CDN**
   - Для статических файлов
   - Для распространения стримов (если используется HLS/DASH)

## 🧪 Тестирование

### Рекомендуемые тесты
- Unit тесты для контроллеров
- Integration тесты для API
- E2E тесты для критических потоков
- WebRTC тесты для стриминга

## 📈 Мониторинг

### Рекомендуемые инструменты
- Логирование (Winston, Morgan)
- Мониторинг производительности (New Relic, Datadog)
- Ошибки (Sentry)
- Метрики (Prometheus, Grafana)

## 🚀 Деплой

### Backend
- PM2 для управления процессами
- Nginx как reverse proxy
- SSL сертификаты (Let's Encrypt)

### Web Frontend
- Vercel, Netlify, или собственный сервер
- CDN для статических файлов

### Mobile
- Google Play Store (Android)
- App Store (iOS)
- Code signing для релизов

