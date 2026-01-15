const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const socketIo = require('socket.io');

// Загрузка переменных окружения
dotenv.config();

// Импорт маршрутов
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const streamRoutes = require('./routes/streams');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const contentRoutes = require('./routes/content');
const settingsRoutes = require('./routes/settings');

// Импорт сервисов
const chatService = require('./services/chatService');
const webrtcService = require('./services/webrtcService');

const app = express();
const server = http.createServer(app);

// Настройка Socket.IO
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Делаем io доступным для контроллеров (для QR-кода и других сервисов)
app.set('io', io);

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map(o => o.trim()) || ['*'];
    
    // Разрешаем запросы без origin (например, Postman, мобильные приложения)
    if (!origin) return callback(null, true);
    
    // Если разрешены все источники
    if (allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    
    // Проверяем, есть ли origin в списке разрешенных
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Статические файлы (аватары)
app.use('/uploads', express.static('uploads'));

// Подключение к MongoDB
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/streaming-mvp';

mongoose.connect(mongoUri)
.then(() => {
  console.log('✅ MongoDB подключена');
  console.log(`📊 База данных: ${mongoose.connection.name}`);
})
.catch(err => {
  console.error('❌ Ошибка подключения к MongoDB:', err);
  console.error('💡 Проверь MONGODB_URI в .env файле');
  process.exit(1);
});

// API маршруты
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/streams', streamRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Инициализация Socket.IO сервисов
chatService.initialize(io);
webrtcService.initialize(io);

// Автоматическое завершение стримов без heartbeat
const Stream = require('./models/Stream');
const checkInactiveStreams = async () => {
  try {
    // Увеличиваем время до 60 секунд для более надежной работы
    const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);
    
    // Находим все активные стримы без heartbeat более 60 секунд
    // Включая стримы, у которых lastHeartbeat null или очень старый
    const inactiveStreams = await Stream.find({
      status: 'live',
      $or: [
        { lastHeartbeat: { $lt: sixtySecondsAgo } },
        { lastHeartbeat: null },
        { lastHeartbeat: { $exists: false } }
      ]
    });

    for (const stream of inactiveStreams) {
      const lastHeartbeat = stream.lastHeartbeat;
      const timeSinceHeartbeat = lastHeartbeat 
        ? Math.floor((Date.now() - lastHeartbeat.getTime()) / 1000)
        : 'неизвестно';
      
      const timeSinceHeartbeat = lastHeartbeat 
        ? Math.floor((Date.now() - lastHeartbeat.getTime()) / 1000)
        : 'неизвестно';
      
      console.log(`⏰ Автоматическое завершение стрима ${stream._id} (нет heartbeat: ${timeSinceHeartbeat} секунд)`);
      await stream.endStream();
      
      // Уведомляем всех зрителей о завершении стрима
      io.to(`webrtc-${stream._id}`).emit('stream-ended', {
        streamId: stream._id,
        reason: 'Стрим прервался из-за потери соединения'
      });
      io.to(`stream-${stream._id}`).emit('stream-ended', {
        streamId: stream._id,
        reason: 'Стрим прервался из-за потери соединения'
      });
      
      // Уведомляем всех клиентов об обновлении списка стримов
      io.emit('stream-list-updated', {
        type: 'ended',
        streamId: stream._id
      });
    }
  } catch (error) {
    console.error('Ошибка проверки неактивных стримов:', error);
  }
};

// Проверяем неактивные стримы каждые 10 секунд
setInterval(checkInactiveStreams, 10 * 1000);

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error('Ошибка:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Внутренняя ошибка сервера',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Запуск сервера
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📡 WebSocket сервер готов для подключений`);
});

module.exports = { app, server, io };

