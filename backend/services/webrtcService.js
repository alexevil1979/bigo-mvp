/**
 * Сервис для управления WebRTC соединениями
 * Обрабатывает сигналинг для установки peer-to-peer соединений
 */

let io;

/**
 * Инициализация WebRTC сервиса
 */
const initialize = (socketIo) => {
  io = socketIo;

  io.on('connection', (socket) => {
    console.log(`✅ Пользователь подключился к WebRTC: ${socket.id}`);

    // Присоединение к стриму (как стример или зритель)
    socket.on('join-stream', (data) => {
      const { streamId, userId, isStreamer } = data;
      
      console.log(`[webrtcService] Получено событие join-stream:`, {
        streamId,
        userId,
        isStreamer,
        socketId: socket.id,
        previousIsStreamer: socket.isStreamer,
        previousStreamId: socket.streamId
      });

      socket.join(`webrtc-${streamId}`);
      socket.streamId = streamId;
      socket.userId = userId;
      socket.isStreamer = isStreamer;
      
      console.log(`[webrtcService] Socket ${socket.id} присоединен к стриму ${streamId}, isStreamer=${isStreamer}`);

      if (isStreamer) {
        console.log(`📹 Стример ${userId} начал стрим ${streamId}`);
        // Обновляем heartbeat при присоединении стримера
        const Stream = require('../models/Stream');
        const now = new Date();
        console.log(`[webrtcService] Стример присоединился к стриму ${streamId}, обновляем heartbeat`);
        Stream.findByIdAndUpdate(streamId, { lastHeartbeat: now }).then(result => {
          if (result) {
            console.log(`[webrtcService] Heartbeat обновлен при присоединении стримера: ${streamId}, lastHeartbeat=${now.toISOString()}`);
          } else {
            console.warn(`[webrtcService] Стрим ${streamId} не найден при обновлении heartbeat при присоединении`);
          }
        }).catch(err => {
          console.error(`[webrtcService] Ошибка обновления heartbeat при присоединении стримера ${streamId}:`, err);
          console.error(`[webrtcService] Stack:`, err.stack);
        });
        // Уведомляем всех зрителей о новом стримере
        socket.to(`webrtc-${streamId}`).emit('streamer-joined', {
          streamId,
          streamerId: userId
        });
      } else {
        console.log(`👁️ Зритель ${userId} присоединился к стриму ${streamId}`);
        // Уведомляем стримера о новом зрителе
        socket.to(`webrtc-${streamId}`).emit('viewer-joined', {
          streamId,
          viewerId: userId
        });
      }
    });

    // WebRTC Offer (предложение соединения)
    socket.on('webrtc-offer', (data) => {
      const { streamId, offer, targetId } = data;

      // Отправляем offer целевому пользователю
      socket.to(`webrtc-${streamId}`).emit('webrtc-offer', {
        offer,
        senderId: socket.userId,
        streamId,
        targetId: targetId || data.targetId
      });

      console.log(`📤 WebRTC Offer отправлен в стриме ${streamId} для пользователя ${targetId}`);
    });

    // WebRTC Answer (ответ на предложение)
    socket.on('webrtc-answer', (data) => {
      const { streamId, answer, targetId } = data;

      // Отправляем answer целевому пользователю (стримеру)
      socket.to(`webrtc-${streamId}`).emit('webrtc-answer', {
        answer,
        senderId: socket.userId,
        streamId,
        targetId: targetId || data.targetId
      });

      console.log(`📥 WebRTC Answer отправлен в стриме ${streamId} от ${socket.userId} для ${targetId}`);
    });

    // ICE Candidate (кандидаты для установки соединения)
    socket.on('webrtc-ice-candidate', (data) => {
      const { streamId, candidate, targetId } = data;

      // Отправляем ICE candidate целевому пользователю
      socket.to(`webrtc-${streamId}`).emit('webrtc-ice-candidate', {
        candidate,
        senderId: socket.userId,
        streamId,
        targetId: targetId || data.targetId
      });
    });

    // Получение списка активных зрителей стрима
    socket.on('get-viewers', async (data) => {
      const { streamId } = data;

      try {
        const sockets = await io.in(`webrtc-${streamId}`).fetchSockets();
        const viewers = sockets
          .filter(s => !s.isStreamer && s.userId)
          .map(s => ({
            id: s.userId,
            socketId: s.id
          }));

        socket.emit('viewers-list', { streamId, viewers });
      } catch (error) {
        console.error('Ошибка получения списка зрителей:', error);
      }
    });

    // Heartbeat от стримера (для отслеживания активности)
    socket.on('stream-heartbeat', async (data) => {
      const { streamId } = data;
      
      console.log(`[webrtcService] Получен heartbeat для стрима ${streamId} от socket ${socket.id}, isStreamer=${socket.isStreamer}`);
      
      if (socket.isStreamer && streamId) {
        const Stream = require('../models/Stream');
        try {
          const now = new Date();
          const result = await Stream.findByIdAndUpdate(streamId, { 
            lastHeartbeat: now 
          }, { new: true });
          
          if (result) {
            console.log(`[webrtcService] Heartbeat обновлен для стрима ${streamId}, lastHeartbeat=${now.toISOString()}`);
          } else {
            console.warn(`[webrtcService] Стрим ${streamId} не найден при обновлении heartbeat`);
          }
        } catch (error) {
          console.error(`[webrtcService] Ошибка обновления heartbeat для стрима ${streamId}:`, error);
          console.error(`[webrtcService] Stack:`, error.stack);
        }
      } else {
        console.warn(`[webrtcService] Heartbeat от не-стримера или без streamId: socket.isStreamer=${socket.isStreamer}, streamId=${streamId}`);
      }
    });

    // Изменение заставки стрима
    socket.on('stream-overlay-changed', (data) => {
      const { streamId, overlayImage, overlayVideo, overlayType, enabled } = data;
      
      console.log(`[webrtcService] Получено событие stream-overlay-changed:`, {
        streamId,
        overlayType,
        enabled,
        hasImage: !!overlayImage,
        hasVideo: !!overlayVideo,
        imageLength: overlayImage ? overlayImage.length : 0,
        videoLength: overlayVideo ? overlayVideo.length : 0,
        socketId: socket.id,
        isStreamer: socket.isStreamer
      });
      
      // Проверяем, что это стример
      if (socket.isStreamer && streamId) {
        const webrtcRoom = `webrtc-${streamId}`;
        const streamRoom = `stream-${streamId}`;
        
        // Получаем количество зрителей в комнатах
        io.in(webrtcRoom).fetchSockets().then(webrtcSockets => {
          io.in(streamRoom).fetchSockets().then(streamSockets => {
            console.log(`[webrtcService] Отправляем заставку в комнату ${webrtcRoom}: ${webrtcSockets.length} сокетов`);
            console.log(`[webrtcService] Отправляем заставку в комнату ${streamRoom}: ${streamSockets.length} сокетов`);
            
            // Транслируем событие всем зрителям стрима в комнате WebRTC
            socket.to(webrtcRoom).emit('stream-overlay-changed', {
              streamId,
              overlayImage,
              overlayVideo,
              overlayType,
              enabled
            });
            // Также отправляем в комнату чата на случай, если зрители там
            io.to(streamRoom).emit('stream-overlay-changed', {
              streamId,
              overlayImage,
              overlayVideo,
              overlayType,
              enabled
            });
            
            console.log(`[webrtcService] 🎨 Заставка стрима ${streamId} (${overlayType}) ${enabled ? 'включена' : 'отключена'}, отправлено зрителям`);
          });
        });
      } else {
        console.warn(`[webrtcService] Заставка от не-стримера или без streamId: isStreamer=${socket.isStreamer}, streamId=${streamId}`);
      }
    });

    // Отключение от стрима
    socket.on('leave-stream', (data) => {
      const { streamId } = data;

      socket.leave(`webrtc-${streamId}`);
      socket.to(`webrtc-${streamId}`).emit('user-left', {
        userId: socket.userId,
        streamId
      });

      console.log(`👋 Пользователь ${socket.userId} покинул стрим ${streamId}`);
    });

    // Отключение
    socket.on('disconnect', async () => {
      if (socket.streamId) {
        // Если отключился стример, не завершаем стрим сразу
        // Даем 30 секунд на восстановление соединения (heartbeat)
        if (socket.isStreamer) {
          console.log(`⚠️ Стример ${socket.userId} отключился от стрима ${socket.streamId}. Ожидание восстановления...`);
        }
        
        io.to(`webrtc-${socket.streamId}`).emit('user-disconnected', {
          userId: socket.userId,
          streamId: socket.streamId
        });
      }
      console.log(`❌ Пользователь отключился от WebRTC: ${socket.id}`);
    });
  });
};

/**
 * Получение STUN/TURN серверов для WebRTC
 */
const getIceServers = () => {
  return {
    iceServers: [
      {
        urls: process.env.WEBRTC_STUN_SERVER || 'stun:stun.l.google.com:19302'
      },
      // Если есть TURN сервер, добавляем его
      ...(process.env.WEBRTC_TURN_SERVER ? [{
        urls: process.env.WEBRTC_TURN_SERVER,
        username: process.env.WEBRTC_TURN_USERNAME,
        credential: process.env.WEBRTC_TURN_PASSWORD
      }] : [])
    ]
  };
};

module.exports = {
  initialize,
  getIceServers
};

