import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import io from 'socket.io-client';
import axios from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import Chat from './Chat';
import ViewerList from './ViewerList';
import OverlaySelector from './OverlaySelector';
import GiftPanel from './GiftPanel';

export default function StreamBroadcaster({ stream, user }) {
  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const localStreamRef = useRef(null);
  const router = useRouter();
  const { token } = useAuth();
  const [isStreaming, setIsStreaming] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [bottomChatInput, setBottomChatInput] = useState('');
  const [showBanner, setShowBanner] = useState(true);
  const [showOverlaySelector, setShowOverlaySelector] = useState(false);
  const [overlayImage, setOverlayImage] = useState(null);
  const [overlayVideo, setOverlayVideo] = useState(null);
  const [overlayType, setOverlayType] = useState(null); // 'image' or 'video'
  const [showOverlay, setShowOverlay] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const heartbeatIntervalRef = useRef(null);
  const screenshotIntervalRef = useRef(null);
  const screenshotCanvasRef = useRef(null);

  useEffect(() => {
    if (stream) {
      startStreaming();
    }

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      if (screenshotIntervalRef.current) {
        clearInterval(screenshotIntervalRef.current);
        screenshotIntervalRef.current = null;
      }
    };
  }, [stream]);

  // Удаляем overlay с ID и логотипом из DOM при монтировании и обновлении
  useEffect(() => {
    const removeOverlay = () => {
      // Ищем и удаляем все элементы с overlay
      const selectors = [
        '[class*="video-overlay-gradient"]',
        '[class*="overlay-content"]',
        '[class*="nio-logo-img"]',
        '[class*="stream-id-overlay"]',
        '[class*="stream-info-overlay"]'
      ];
      
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          // Проверяем, что элемент находится внутри video-wrapper или stream-player
          const isInVideoWrapper = el.closest('.video-wrapper') || el.closest('.stream-player');
          if (isInVideoWrapper) {
            el.remove();
          }
        });
      });
    };

    // Удаляем сразу
    removeOverlay();
    
    // Удаляем периодически на случай, если элемент создается динамически
    const interval = setInterval(removeOverlay, 100);
    
    return () => clearInterval(interval);
  }, [stream]);

  const startStreaming = async () => {
    try {
      if (!localStreamRef.current) {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        localStreamRef.current = mediaStream;
      }
      
      if (videoRef.current && localStreamRef.current) {
        videoRef.current.srcObject = localStreamRef.current;
      }

      if (!socketRef.current) {
        const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000');
        socketRef.current = socket;

        socket.on('viewer-joined', async (data) => {
          console.log('Новый зритель присоединился:', data.viewerId);
          if (peerConnectionsRef.current[data.viewerId]) {
            const oldPc = peerConnectionsRef.current[data.viewerId];
            if (oldPc._answerHandler && socket) {
              socket.off('webrtc-answer', oldPc._answerHandler);
            }
            if (oldPc._iceHandler && socket) {
              socket.off('webrtc-ice-candidate', oldPc._iceHandler);
            }
            oldPc.close();
            delete peerConnectionsRef.current[data.viewerId];
          }
          await handleNewViewer(data.viewerId, socket, stream._id);
        });

        socket.on('user-disconnected', (data) => {
          if (data.userId && peerConnectionsRef.current[data.userId]) {
            const pc = peerConnectionsRef.current[data.userId];
            if (pc._answerHandler && socket) {
              socket.off('webrtc-answer', pc._answerHandler);
            }
            if (pc._iceHandler && socket) {
              socket.off('webrtc-ice-candidate', pc._iceHandler);
            }
            pc.close();
            delete peerConnectionsRef.current[data.userId];
            setViewerCount(Object.keys(peerConnectionsRef.current).length);
          }
        });
      }

      socketRef.current.emit('join-stream', {
        streamId: stream._id,
        userId: user.id,
        isStreamer: true
      });

      socketRef.current.emit('join-stream-chat', {
        streamId: stream._id,
        userId: user.id,
        nickname: user.nickname
      });

      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      
      // Отправляем heartbeat каждые 5 секунд для надежности
      heartbeatIntervalRef.current = setInterval(() => {
        if (socketRef.current && socketRef.current.connected && stream?._id) {
          socketRef.current.emit('stream-heartbeat', {
            streamId: stream._id
          });
        } else {
          console.warn('Не могу отправить heartbeat: socket не подключен или нет stream._id');
        }
      }, 5 * 1000);

      // Отправляем первый heartbeat сразу
      if (socketRef.current && socketRef.current.connected && stream?._id) {
        socketRef.current.emit('stream-heartbeat', {
          streamId: stream._id
        });
      }

      // Создаем canvas для скриншотов, если его еще нет
      if (!screenshotCanvasRef.current) {
        screenshotCanvasRef.current = document.createElement('canvas');
        console.log('[Screenshot] Canvas создан для скриншотов');
      }

      // Захватываем первый скриншот сразу при старте (с небольшой задержкой, чтобы видео успело загрузиться)
      setTimeout(() => {
        console.log('[Screenshot] Захватываем первый скриншот при старте стрима');
        captureAndUploadScreenshot();
      }, 2000); // 2 секунды задержка

      // Захватываем скриншоты каждые 30 секунд
      if (screenshotIntervalRef.current) {
        clearInterval(screenshotIntervalRef.current);
      }
      screenshotIntervalRef.current = setInterval(() => {
        console.log('[Screenshot] Захватываем скриншот (каждые 30 сек)');
        captureAndUploadScreenshot();
      }, 30 * 1000); // 30 секунд

      setIsStreaming(true);
    } catch (error) {
      console.error('Ошибка запуска стрима:', error);
      alert('Не удалось получить доступ к камере/микрофону');
    }
  };

  const handleNewViewer = async (viewerId, socket, streamId) => {
    try {
      if (peerConnectionsRef.current[viewerId]) {
        return;
      }

      // Получаем TURN серверы из переменных окружения, если они есть
      const iceServers = [
        { urls: 'stun:stun.l.google.com:19302' }
      ];
      
      // Добавляем TURN сервер, если он настроен
        if (process.env.NEXT_PUBLIC_WEBRTC_TURN_SERVER) {
          const turnConfig = {
            urls: process.env.NEXT_PUBLIC_WEBRTC_TURN_SERVER
          };
          
          if (process.env.NEXT_PUBLIC_WEBRTC_TURN_SECRET) {
            const { generateTurnCredentialsSync } = require('../lib/turnAuth');
            const credentials = generateTurnCredentialsSync(process.env.NEXT_PUBLIC_WEBRTC_TURN_SECRET);
            if (credentials) {
              turnConfig.username = credentials.username;
              turnConfig.credential = credentials.credential;
            }
          } else if (process.env.NEXT_PUBLIC_WEBRTC_TURN_USERNAME && process.env.NEXT_PUBLIC_WEBRTC_TURN_PASSWORD) {
            turnConfig.username = process.env.NEXT_PUBLIC_WEBRTC_TURN_USERNAME;
            turnConfig.credential = process.env.NEXT_PUBLIC_WEBRTC_TURN_PASSWORD;
          }
          
          iceServers.push(turnConfig);
        }
      
      const pc = new RTCPeerConnection({ iceServers });

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          if (track.readyState === 'live') {
            pc.addTrack(track, localStreamRef.current);
          }
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc-ice-candidate', {
            streamId: streamId,
            candidate: event.candidate,
            targetId: viewerId
          });
        }
      };

      const answerHandler = async (data) => {
        if (data.senderId === viewerId && data.streamId === streamId) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            socket.off('webrtc-answer', answerHandler);
          } catch (error) {
            console.error('Ошибка установки remote description:', error);
          }
        }
      };
      socket.on('webrtc-answer', answerHandler);

      const iceHandler = async (data) => {
        if (data.senderId === viewerId && data.streamId === streamId) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (error) {
            console.error('Ошибка добавления ICE candidate:', error);
          }
        }
      };
      socket.on('webrtc-ice-candidate', iceHandler);

      const offer = await pc.createOffer({
        offerToReceiveVideo: false,
        offerToReceiveAudio: false
      });
      await pc.setLocalDescription(offer);

      socket.emit('webrtc-offer', {
        streamId: streamId,
        offer: offer,
        targetId: viewerId
      });

      pc._answerHandler = answerHandler;
      pc._iceHandler = iceHandler;
      peerConnectionsRef.current[viewerId] = pc;

      setViewerCount(Object.keys(peerConnectionsRef.current).length);
    } catch (error) {
      console.error('Ошибка подключения зрителя:', error);
    }
  };

  // Функция захвата и отправки скриншота
  const captureAndUploadScreenshot = async () => {
    try {
      console.log('[Screenshot] Начало захвата скриншота', {
        hasVideo: !!videoRef.current,
        hasStream: !!stream,
        streamId: stream?._id,
        hasToken: !!token,
        hasCanvas: !!screenshotCanvasRef.current
      });

      if (!videoRef.current || !stream?._id || !token) {
        console.warn('[Screenshot] Пропуск: нет video, stream или token');
        return;
      }

      const video = videoRef.current;
      const canvas = screenshotCanvasRef.current;

      // Проверяем, что видео загружено и имеет размеры
      console.log('[Screenshot] Состояние видео:', {
        readyState: video.readyState,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        paused: video.paused
      });

      if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        console.log('[Screenshot] Видео еще не готово для скриншота, readyState:', video.readyState);
        return;
      }

      // Устанавливаем размеры canvas
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      console.log('[Screenshot] Canvas размеры установлены:', canvas.width, 'x', canvas.height);

      // Рисуем текущий кадр из video на canvas
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      console.log('[Screenshot] Кадр нарисован на canvas');

      // Конвертируем canvas в blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          console.error('[Screenshot] Не удалось создать blob из canvas');
          return;
        }

        console.log('[Screenshot] Blob создан, размер:', blob.size, 'bytes');

        // Создаем FormData для отправки
        const formData = new FormData();
        formData.append('screenshot', blob, 'screenshot.jpg');
        formData.append('streamId', stream._id);

        console.log('[Screenshot] Отправка на сервер:', {
          url: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/streams/screenshot`,
          streamId: stream._id,
          blobSize: blob.size
        });

        try {
          // Отправляем скриншот на сервер
          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/streams/screenshot`,
            formData,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
              }
            }
          );

          console.log('[Screenshot] Скриншот успешно загружен:', response.data);
        } catch (error) {
          console.error('[Screenshot] Ошибка загрузки скриншота:', error);
          if (error.response) {
            console.error('[Screenshot] Ответ сервера:', error.response.status, error.response.data);
          }
          // Не прерываем стрим из-за ошибки скриншота
        }
      }, 'image/jpeg', 0.8); // JPEG с качеством 80%
    } catch (error) {
      console.error('[Screenshot] Ошибка захвата скриншота:', error);
    }
  };

  const stopStreaming = async () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    Object.values(peerConnectionsRef.current).forEach(pc => {
      if (pc._answerHandler && socketRef.current) {
        socketRef.current.off('webrtc-answer', pc._answerHandler);
      }
      if (pc._iceHandler && socketRef.current) {
        socketRef.current.off('webrtc-ice-candidate', pc._iceHandler);
      }
      pc.close();
    });
    peerConnectionsRef.current = {};

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    if (screenshotIntervalRef.current) {
      clearInterval(screenshotIntervalRef.current);
      screenshotIntervalRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.emit('leave-stream', { streamId: stream._id });
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/streams/${stream._id}/end`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
    } catch (error) {
      console.error('Ошибка завершения стрима:', error);
    }

    setIsStreaming(false);
    
    // Очищаем sessionStorage при завершении стрима
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('activeStream');
    }
    
    router.push('/');
  };

  const handleBlockUser = (userId) => {
    setBlockedUsers(prev => [...prev, userId]);
    if (socketRef.current) {
      socketRef.current.emit('block-user', {
        streamId: stream._id,
        userId: userId
      });
    }
  };

  const handleOverlayChange = (overlay, enabled, type) => {
    if (type === 'image') {
      setOverlayImage(overlay);
      setOverlayVideo(null);
    } else if (type === 'video') {
      setOverlayVideo(overlay);
      setOverlayImage(null);
    } else {
      setOverlayImage(null);
      setOverlayVideo(null);
    }
    setOverlayType(type);
    setShowOverlay(enabled);
    
    // Отправляем информацию о заставке всем зрителям через socket
    if (socketRef.current && stream?._id && socketRef.current.connected) {
      // Для видео проверяем размер - если слишком большой, предупреждаем
      if (type === 'video' && enabled && overlay) {
        const base64Length = overlay.length;
        const sizeInMB = (base64Length * 3) / 4 / 1024 / 1024;
        if (sizeInMB > 10) {
          alert(`Внимание: размер видео заставки ${sizeInMB.toFixed(1)}MB. Рекомендуется использовать файлы до 10MB для лучшей синхронизации.`);
        }
      }
      
      const overlayData = {
        streamId: stream._id,
        overlayImage: type === 'image' && enabled ? overlay : null,
        overlayVideo: type === 'video' && enabled ? overlay : null,
        overlayType: enabled ? type : null,
        enabled: enabled
      };
      
      console.log('[StreamBroadcaster] Отправляю событие stream-overlay-changed:', {
        streamId: overlayData.streamId,
        overlayType: overlayData.overlayType,
        enabled: overlayData.enabled,
        hasImage: !!overlayData.overlayImage,
        hasVideo: !!overlayData.overlayVideo,
        imageLength: overlayData.overlayImage ? overlayData.overlayImage.length : 0,
        videoLength: overlayData.overlayVideo ? overlayData.overlayVideo.length : 0,
        socketConnected: socketRef.current.connected
      });
      
      socketRef.current.emit('stream-overlay-changed', overlayData);
    } else if (!socketRef.current?.connected) {
      console.warn('Socket не подключен, не могу отправить событие заставки');
    }
  };

  const handleBottomChatSend = (e) => {
    e.preventDefault();
    if (!bottomChatInput.trim() || !socketRef.current) return;

    socketRef.current.emit('send-message', {
      streamId: stream._id,
      userId: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      message: bottomChatInput.trim()
    });

    setBottomChatInput('');
  };

  return (
    <>
      <div className="container">
        <header className="header">
          <h1><img src="/favicon.ico" alt="NIO" className="logo-icon" /> NIO - LIVE</h1>
          <nav>
            <Link href="/">Главная</Link>
            <span className="user-info">
              👤 {user?.nickname || 'Стример'}
            </span>
            <Link href="/profile">Профиль</Link>
          </nav>
        </header>
      </div>
      <div className="nio-stream-page">
        {/* Верхняя панель управления */}
        <div className="stream-header">
        <div className="streamer-profile">
          <div className="streamer-avatar">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.nickname} />
            ) : (
              <div className="avatar-placeholder">
                {user?.nickname?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
          <div className="streamer-info">
            <div className="streamer-name-row">
              <span className="streamer-name">{user?.nickname || 'Стример'}</span>
              <span className="online-indicator">● LIVE</span>
            </div>
          </div>
          <div className="streamer-stats">
            <div className="stat-item">
              <span className="stat-icon">👁️</span>
              <span className="stat-value">{viewerCount}</span>
            </div>
          </div>
        </div>
        <div className="stream-actions">
          <button onClick={() => setShowOverlaySelector(true)} className="share-button">
            📷 Заставка
          </button>
          <button onClick={stopStreaming} className="stop-button">
            Завершить стрим
          </button>
        </div>
      </div>

      {/* Основной контент */}
      <div className="stream-main-content">
        <div className="stream-video-section">
          <div className="video-wrapper">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
            {showOverlay && overlayType === 'image' && overlayImage && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundImage: `url(${overlayImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                pointerEvents: 'none',
                zIndex: 10
              }} />
            )}
            {showOverlay && overlayType === 'video' && overlayVideo && (
              <video
                ref={(el) => {
                  if (el) {
                    // Убеждаемся, что видео запускается
                    el.play().catch(err => {
                      console.log('[StreamBroadcaster] Ошибка автоплея видео заставки (ожидаемо):', err);
                    });
                  }
                }}
                src={overlayVideo}
                autoPlay
                loop
                muted
                playsInline
                onLoadedData={() => {
                  console.log('[StreamBroadcaster] Видео заставки загружено');
                }}
                onPlay={() => {
                  console.log('[StreamBroadcaster] Видео заставки запущено');
                }}
                onError={(e) => {
                  console.error('[StreamBroadcaster] Ошибка загрузки видео заставки:', e);
                }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  pointerEvents: 'none',
                  zIndex: 10
                }}
              />
            )}
          </div>
          <div className="stream-welcome">
            <p>Наслаждайся прямыми эфирами</p>
          </div>
          <div className="stream-rules-warning">
            <p><strong>Мы постоянно следим за качеством трансляций.</strong></p>
            <p>Запрещено: курение, употребление алкоголя, использование ненормативной лексики, обнаженность, нарушение авторских прав, демонстрация детской порнографии или жестокого обращения с детьми. Такие действия приведут к блокировке аккаунта.</p>
          </div>
        </div>
      </div>

      {/* Нижняя панель с чатом */}
      <div className="stream-bottom-panel">
        <div className="chat-input-section">
          <form onSubmit={handleBottomChatSend} className="chat-input-form-bottom">
            <input 
              type="text" 
              placeholder="Общаться со всеми" 
              className="chat-input-field"
              value={bottomChatInput}
              onChange={(e) => setBottomChatInput(e.target.value)}
              maxLength={500}
            />
            <button type="submit" className="send-button">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </form>
        </div>
      </div>

      {/* Баннер */}
      {showBanner && (
        <div className="recruitment-banner">
          <div className="banner-content">
            <div className="banner-mascot">🎥</div>
            <div className="banner-text">
              <p className="banner-title">Набор ведущих и агентов NIO открыт!</p>
              <p className="banner-subtitle">Безграничные возможности, высокий доход</p>
            </div>
            <button className="banner-join-button">Присоединиться сейчас</button>
            <button className="banner-close" onClick={() => setShowBanner(false)}>×</button>
          </div>
        </div>
      )}

      {/* Боковая панель с чатом и списком зрителей */}
      <div className="stream-sidebar">
        {socketRef.current && (
          <ViewerList 
            streamId={stream._id} 
            socket={socketRef.current}
            onBlockUser={handleBlockUser}
            blockedUsers={blockedUsers}
          />
        )}
        {socketRef.current && <GiftPanel streamId={stream._id} user={user} />}
        <Chat streamId={stream._id} user={user} />
      </div>

      {/* Модальное окно выбора заставки */}
      {showOverlaySelector && (
        <OverlaySelector
          onOverlayChange={handleOverlayChange}
          onContinue={() => setShowOverlaySelector(false)}
        />
      )}

      <style jsx>{`
        .nio-stream-page {
          background: #fff;
          min-height: 100vh;
          position: relative;
          padding: 20px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .stream-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          background: #fff;
          border-bottom: 1px solid #e0e0e0;
          margin-bottom: 20px;
        }

        .streamer-profile {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .streamer-avatar {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          overflow: hidden;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .streamer-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-placeholder {
          font-size: 24px;
          font-weight: bold;
          color: #fff;
        }

        .streamer-info {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .streamer-name-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .streamer-name {
          font-size: 18px;
          font-weight: 600;
          color: #333;
        }

        .online-indicator {
          color: #ef4444;
          font-size: 12px;
          font-weight: 600;
        }

        .streamer-id {
          font-size: 12px;
          color: #666;
        }

        .streamer-stats {
          display: flex;
          gap: 20px;
          margin-left: 20px;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .stat-icon {
          font-size: 18px;
        }

        .stat-value {
          font-weight: 600;
          color: #333;
        }

        .stream-actions {
          display: flex;
          gap: 10px;
        }

        .share-button,
        .stop-button {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .share-button {
          background: #f5f5f5;
          color: #333;
        }

        .share-button:hover {
          background: #e0e0e0;
        }

        .stop-button {
          background: #ef4444;
          color: #fff;
        }

        .stop-button:hover {
          background: #dc2626;
        }

        .stream-main-content {
          display: grid;
          grid-template-columns: 1fr 350px;
          gap: 20px;
          margin-bottom: 20px;
          align-items: start;
          max-width: 1400px;
          margin-left: auto;
          margin-right: auto;
        }

        .stream-video-section {
          display: flex;
          flex-direction: column;
          position: relative;
          padding: 20px;
        }
        
        /* Псевдоэлемент для фона на всю ширину экрана */
        .stream-video-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          width: 100vw;
          height: 100%;
          margin-left: calc(-50vw + 50%);
          margin-right: calc(-50vw + 50%);
          background-image: url('/bg1.png');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          z-index: -1;
          pointer-events: none;
        }

        .video-wrapper {
          position: relative;
          width: 100%;
          background: #000;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 15px;
          aspect-ratio: 16 / 9;
          min-height: 500px;
        }
        
        .video-wrapper video {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        /* Скрываем любые overlay с ID и логотипом - универсальные правила */
        .video-wrapper div[class*="video-overlay-gradient"],
        .video-wrapper div[class*="overlay-content"],
        .video-wrapper img[class*="nio-logo-img"],
        .video-wrapper div[class*="stream-id-overlay"],
        .video-wrapper div[class*="stream-info-overlay"],
        .video-wrapper .stream-info-overlay,
        .video-wrapper .streamer-id,
        .video-wrapper .video-overlay-gradient,
        .video-wrapper .overlay-content,
        .video-wrapper .nio-logo-img,
        .video-wrapper .stream-id-overlay,
        .video-wrapper *[class*="overlay"],
        .video-wrapper *[class*="logo"],
        .video-wrapper *[class*="id"],
        .video-wrapper *[id*="overlay"],
        .video-wrapper *[id*="logo"],
        .video-wrapper *[id*="id"],
        .video-wrapper div[style*="gradient"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
          position: absolute !important;
          left: -9999px !important;
          width: 0 !important;
          height: 0 !important;
        }

        .stream-welcome {
          text-align: center;
          padding: 15px;
          color: #666;
          font-size: 16px;
        }

        .stream-rules-warning {
          background: rgba(255, 243, 205, 0.9);
          border-left: 4px solid #ffc107;
          padding: 15px;
          border-radius: 8px;
          margin-top: 15px;
        }

        .stream-rules-warning p {
          margin: 5px 0;
          font-size: 13px;
          color: #856404;
          line-height: 1.5;
        }

        .stream-bottom-panel {
          background: #f9f9f9;
          padding: 15px;
          border-radius: 12px;
          margin-bottom: 20px;
        }

        .chat-input-section {
          display: flex;
          gap: 10px;
        }

        .chat-input-field {
          flex: 1;
          padding: 12px 15px;
          border: 1px solid #e0e0e0;
          border-radius: 25px;
          font-size: 14px;
          outline: none;
        }

        .chat-input-field:focus {
          border-color: #667eea;
        }

        .chat-input-form-bottom {
          display: flex;
          gap: 10px;
          width: 100%;
        }

        .send-button {
          padding: 12px 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          border: none;
          border-radius: 25px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .send-button:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .recruitment-banner {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 20px;
          position: relative;
        }

        .banner-content {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .banner-mascot {
          font-size: 40px;
        }

        .banner-text {
          flex: 1;
        }

        .banner-title {
          font-size: 18px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 5px;
        }

        .banner-subtitle {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.9);
        }

        .banner-join-button {
          padding: 12px 30px;
          background: #fff;
          color: #667eea;
          border: none;
          border-radius: 25px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .banner-join-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .banner-close {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 30px;
          height: 30px;
          border: none;
          background: rgba(255, 255, 255, 0.2);
          color: #fff;
          border-radius: 50%;
          cursor: pointer;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .banner-close:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .stream-sidebar {
          position: absolute;
          right: 20px;
          top: 120px;
          width: 350px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          height: calc(100vh - 200px);
          max-height: calc(100vh - 200px);
        }
        
        .stream-sidebar > *:not(:last-child) {
          flex-shrink: 0;
        }
        
        .stream-sidebar > *:last-child {
          flex: 1;
          min-height: 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        @media (max-width: 1200px) {
          .stream-main-content {
            grid-template-columns: 1fr;
          }

          .stream-sidebar {
            position: relative;
            right: auto;
            top: auto;
            width: 100%;
          }
        }
      `}</style>
      </div>
    </>
  );
}
