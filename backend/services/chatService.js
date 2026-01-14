/**
 * Сервис для управления чатом в реальном времени
 * Использует Socket.IO для обмена сообщениями
 */

let io;

// Конфигурация подарков (стоимость и значение в бобах)
const GIFT_CONFIG = {
  rose: { cost: 10, beans: 5 },
  heart: { cost: 20, beans: 10 },
  diamond: { cost: 50, beans: 25 },
  rocket: { cost: 100, beans: 50 },
  crown: { cost: 200, beans: 100 },
  star: { cost: 500, beans: 250 },
  fire: { cost: 1000, beans: 500 },
  rainbow: { cost: 2000, beans: 1000 }
};

/**
 * Инициализация сервиса чата
 */
const initialize = (socketIo) => {
  io = socketIo;

  io.on('connection', (socket) => {
    console.log(`✅ Пользователь подключился к чату: ${socket.id}`);

    // Присоединение к чату стрима
    socket.on('join-stream-chat', async (data) => {
      const { streamId, userId, nickname } = data;
      
      socket.join(`stream-${streamId}`);
      
      // Уведомляем других пользователей о присоединении
      socket.to(`stream-${streamId}`).emit('user-joined-chat', {
        userId,
        nickname,
        timestamp: new Date().toISOString()
      });

      console.log(`👤 ${nickname} присоединился к чату стрима ${streamId}`);
    });

    // Отправка сообщения в чат
    socket.on('send-message', async (data) => {
      const { streamId, userId, nickname, message, avatar } = data;

      // Проверяем, что пользователь не гость (не начинается с "guest-")
      if (userId && userId.startsWith('guest-')) {
        socket.emit('error', { message: 'Необходима авторизация для отправки сообщений' });
        return;
      }

      // Проверка на спам (можно добавить более сложную логику)
      if (!message || message.trim().length === 0) {
        return;
      }

      if (message.length > 500) {
        socket.emit('error', { message: 'Сообщение слишком длинное' });
        return;
      }

      const messageData = {
        id: `msg-${Date.now()}-${Math.random()}`,
        userId,
        nickname,
        avatar,
        message: message.trim(),
        timestamp: new Date().toISOString(),
        streamId
      };

      // Отправляем сообщение всем в комнате стрима
      io.to(`stream-${streamId}`).emit('receive-message', messageData);

      console.log(`💬 Сообщение в стриме ${streamId} от ${nickname}: ${message}`);
    });

    // Отправка реакции (эмодзи)
    socket.on('send-reaction', (data) => {
      const { streamId, userId, nickname, reaction } = data;

      // Проверяем, что пользователь не гость
      if (userId && userId.startsWith('guest-')) {
        socket.emit('error', { message: 'Необходима авторизация для отправки реакций' });
        return;
      }

      const reactionData = {
        userId,
        nickname,
        reaction,
        timestamp: new Date().toISOString()
      };

      io.to(`stream-${streamId}`).emit('receive-reaction', reactionData);
    });

    // Отправка подарка
    socket.on('send-gift', async (data) => {
      const { streamId, senderId, recipientId, giftType } = data;

      try {
        const Gift = require('../models/Gift');
        const User = require('../models/User');
        const Stream = require('../models/Stream');

        // Получаем конфигурацию подарка
        const giftConfig = GIFT_CONFIG[giftType];
        if (!giftConfig) {
          socket.emit('error', { message: 'Неизвестный тип подарка' });
          return;
        }

        // Проверяем баланс отправителя
        const sender = await User.findById(senderId);
        if (!sender || sender.coins < giftConfig.cost) {
          socket.emit('error', { message: 'Недостаточно монет' });
          return;
        }

        // Проверяем, что стрим существует и активен
        const stream = await Stream.findById(streamId);
        if (!stream || stream.status !== 'live') {
          socket.emit('error', { message: 'Стрим не найден или завершен' });
          return;
        }

        // Списываем монеты у отправителя
        sender.coins -= giftConfig.cost;
        await sender.save();

        // Добавляем бобы получателю
        const recipient = await User.findById(recipientId);
        if (recipient) {
          recipient.beans += giftConfig.beansValue;
          recipient.stats.totalBeansEarned += giftConfig.beansValue;
          recipient.stats.totalGiftsReceived += 1;
          await recipient.save();
        }

        // Обновляем статистику стрима
        stream.stats.totalGifts += 1;
        stream.stats.totalBeansEarned += giftConfig.beansValue;
        await stream.save();

        // Создаем запись о подарке
        const gift = new Gift({
          sender: senderId,
          recipient: recipientId,
          stream: streamId,
          giftType,
          cost: giftConfig.cost,
          beansValue: giftConfig.beansValue
        });
        await gift.save();

        // Отправляем событие всем зрителям стрима
        const giftData = {
          id: gift._id,
          sender: {
            id: sender._id,
            nickname: sender.nickname,
            avatar: sender.avatar
          },
          recipient: {
            id: recipient._id,
            nickname: recipient.nickname
          },
          giftType,
          cost: giftConfig.cost,
          beansValue: giftConfig.beansValue,
          timestamp: new Date().toISOString()
        };

        io.to(`stream-${streamId}`).emit('receive-gift', giftData);

        // Обновляем баланс отправителя
        socket.emit('balance-updated', {
          coins: sender.coins,
          beans: sender.beans || 0
        });

        console.log(`🎁 Подарок ${giftType} отправлен в стриме ${streamId}`);
      } catch (error) {
        console.error('Ошибка отправки подарка:', error);
        socket.emit('error', { message: 'Ошибка при отправке подарка' });
      }
    });

    // Модерация: удаление сообщения
    socket.on('delete-message', (data) => {
      const { streamId, messageId, isModerator } = data;

      if (!isModerator) {
        socket.emit('error', { message: 'Нет прав модератора' });
        return;
      }

      io.to(`stream-${streamId}`).emit('message-deleted', { messageId });
    });

    // Модерация: бан пользователя
    socket.on('ban-user', async (data) => {
      const { streamId, userId, isModerator } = data;

      if (!isModerator) {
        socket.emit('error', { message: 'Нет прав модератора' });
        return;
      }

      // Удаляем пользователя из комнаты
      const userSockets = await io.in(`stream-${streamId}`).fetchSockets();
      userSockets.forEach(userSocket => {
        if (userSocket.userId === userId) {
          userSocket.leave(`stream-${streamId}`);
          userSocket.emit('banned-from-stream', { streamId });
        }
      });

      io.to(`stream-${streamId}`).emit('user-banned', { userId });
    });

    // Отключение
    socket.on('disconnect', () => {
      console.log(`❌ Пользователь отключился от чата: ${socket.id}`);
    });
  });
};

/**
 * Получение конфигурации подарков
 */
const getGiftConfig = () => {
  return GIFT_CONFIG;
};

module.exports = {
  initialize,
  getGiftConfig
};

