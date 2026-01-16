import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { generateTurnCredentialsSync } from '../lib/turnAuth';

export default function StreamPlayer({ stream, user, autoPlay = true }) {
  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');
  const [overlayImage, setOverlayImage] = useState(null);
  const [overlayVideo, setOverlayVideo] = useState(null);
  const [overlayType, setOverlayType] = useState(null);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    if (!stream) return;

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000');
    socketRef.current = socket;
    
    // Для неавторизованных пользователей используем временный ID на основе socket.id
    const userId = user?.id || `guest-${socket.id}`;

    // Настройка WebRTC
    const setupWebRTC = async () => {
      try {
        // Получаем TURN серверы из переменных окружения, если они есть
        const iceServers = [
          { urls: 'stun:stun.l.google.com:19302' }
        ];
        
        // Добавляем TURN сервер, если он настроен
        if (process.env.NEXT_PUBLIC_WEBRTC_TURN_SERVER) {
          const turnConfig = {
            urls: process.env.NEXT_PUBLIC_WEBRTC_TURN_SERVER
          };
          
          // Если есть статический ключ, используем его для генерации временных учетных данных
          if (process.env.NEXT_PUBLIC_WEBRTC_TURN_SECRET) {
            // Используем синхронную версию для немедленного использования
            // В production рекомендуется использовать асинхронную версию или серверную генерацию
            const credentials = generateTurnCredentialsSync(process.env.NEXT_PUBLIC_WEBRTC_TURN_SECRET);
            if (credentials && credentials.username && credentials.credential) {
              turnConfig.username = credentials.username;
              turnConfig.credential = credentials.credential;
            } else {
              console.warn('Не удалось сгенерировать TURN credentials, TURN сервер не будет использован');
            }
          } else if (process.env.NEXT_PUBLIC_WEBRTC_TURN_USERNAME && process.env.NEXT_PUBLIC_WEBRTC_TURN_PASSWORD) {
            // Используем статические учетные данные
            turnConfig.username = process.env.NEXT_PUBLIC_WEBRTC_TURN_USERNAME;
            turnConfig.credential = process.env.NEXT_PUBLIC_WEBRTC_TURN_PASSWORD;
          } else {
            console.warn('TURN сервер указан, но нет учетных данных (NEXT_PUBLIC_WEBRTC_TURN_SECRET или NEXT_PUBLIC_WEBRTC_TURN_USERNAME/PASSWORD), TURN сервер не будет использован');
          }
          
          // Добавляем TURN сервер только если есть учетные данные
          if (turnConfig.username && turnConfig.credential) {
            iceServers.push(turnConfig);
          }
        }
        
        const pc = new RTCPeerConnection({ iceServers });

        peerConnectionRef.current = pc;

        // Обработка входящего потока
        pc.ontrack = (event) => {
          console.log('[StreamPlayer] Получен трек от стримера:', event);
          console.log('[StreamPlayer] event.streams:', event.streams);
          console.log('[StreamPlayer] event.track:', event.track);
          console.log('[StreamPlayer] event.track.kind:', event.track?.kind);
          console.log('[StreamPlayer] event.track.readyState:', event.track?.readyState);
          
          if (videoRef.current) {
            let mediaStream = null;
            if (event.streams && event.streams[0]) {
              mediaStream = event.streams[0];
              console.log('[StreamPlayer] используем stream из event.streams[0], tracks:', mediaStream.getTracks().length);
              videoRef.current.srcObject = mediaStream;
            } else if (event.track) {
              // Альтернативный способ получения потока
              mediaStream = new MediaStream([event.track]);
              console.log('[StreamPlayer] создан новый MediaStream из event.track');
              videoRef.current.srcObject = mediaStream;
            }
            
            console.log('[StreamPlayer] videoRef.current после установки srcObject:', {
              srcObject: !!videoRef.current.srcObject,
              readyState: videoRef.current.readyState,
              paused: videoRef.current.paused,
              muted: videoRef.current.muted,
              playsInline: videoRef.current.playsInline,
              videoWidth: videoRef.current.videoWidth,
              videoHeight: videoRef.current.videoHeight
            });
            
            // Автоматически запускаем воспроизведение
            if (mediaStream && videoRef.current) {
              videoRef.current.playsInline = true;
              console.log('[StreamPlayer] пытаемся запустить play()');
              const playPromise = videoRef.current.play();
              if (playPromise !== undefined) {
                playPromise
                  .then(() => {
                    console.log('[StreamPlayer] видео воспроизводится успешно');
                    console.log('[StreamPlayer] video state после play:', {
                      paused: videoRef.current.paused,
                      readyState: videoRef.current.readyState,
                      currentTime: videoRef.current.currentTime,
                      videoWidth: videoRef.current.videoWidth,
                      videoHeight: videoRef.current.videoHeight
                    });
                    setIsConnected(true);
                    setError('');
                  })
                  .catch(err => {
                    console.error('[StreamPlayer] Ошибка автоматического воспроизведения:', err);
                    console.log('[StreamPlayer] video state при ошибке play:', {
                      paused: videoRef.current.paused,
                      readyState: videoRef.current.readyState,
                      srcObject: !!videoRef.current.srcObject,
                      videoWidth: videoRef.current.videoWidth,
                      videoHeight: videoRef.current.videoHeight
                    });
                    // Если автоплей заблокирован, показываем сообщение
                    setError('Нажмите play для воспроизведения');
                    // Но все равно считаем, что видео загружено
                    setIsConnected(true);
                  });
              } else {
                console.log('[StreamPlayer] play() не вернул promise');
                setIsConnected(true);
                setError('');
              }
            } else {
              console.log('[StreamPlayer] нет mediaStream или videoRef.current');
            }
          } else {
            console.log('[StreamPlayer] videoRef.current отсутствует');
          }
        };
        
        // Обработка изменения состояния соединения
        pc.onconnectionstatechange = () => {
          console.log('[StreamPlayer] WebRTC connection state:', pc.connectionState);
          console.log('[StreamPlayer] video state при connectionState change:', {
            hasVideoRef: !!videoRef.current,
            hasSrcObject: videoRef.current?.srcObject ? true : false,
            readyState: videoRef.current?.readyState,
            paused: videoRef.current?.paused,
            videoWidth: videoRef.current?.videoWidth,
            videoHeight: videoRef.current?.videoHeight,
            isConnected: isConnected
          });
          
          if (pc.connectionState === 'connected') {
            console.log('[StreamPlayer] соединение connected');
            setIsConnected(true);
            setError('');
            // Пытаемся запустить воспроизведение, если еще не запущено
            if (videoRef.current && videoRef.current.paused && videoRef.current.srcObject) {
              console.log('[StreamPlayer] пытаемся запустить play() при connected');
              videoRef.current.play().catch(err => {
                console.log('[StreamPlayer] ошибка play() при connected:', err);
              });
            }
          } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            console.log('[StreamPlayer] соединение failed/disconnected');
            setError('Соединение потеряно');
            setIsConnected(false);
          }
        };
        
        // Обработка состояния ICE соединения
        pc.oniceconnectionstatechange = () => {
          console.log('[StreamPlayer] WebRTC ICE connection state:', pc.iceConnectionState);
          console.log('[StreamPlayer] video state при ICE state change:', {
            hasVideoRef: !!videoRef.current,
            hasSrcObject: videoRef.current?.srcObject ? true : false,
            readyState: videoRef.current?.readyState,
            paused: videoRef.current?.paused,
            videoWidth: videoRef.current?.videoWidth,
            videoHeight: videoRef.current?.videoHeight
          });
          
          if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
            console.log('[StreamPlayer] ICE connected/completed');
            setIsConnected(true);
            setError('');
            if (videoRef.current && videoRef.current.paused && videoRef.current.srcObject) {
              console.log('[StreamPlayer] пытаемся запустить play() при ICE connected');
              videoRef.current.play().catch(err => {
                console.log('[StreamPlayer] ошибка play() при ICE connected:', err);
              });
            }
          } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
            console.log('[StreamPlayer] ICE failed/disconnected');
            setError('Соединение потеряно');
            setIsConnected(false);
          }
        };

        // Обработка ICE кандидатов
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('webrtc-ice-candidate', {
              streamId: stream._id,
              candidate: event.candidate,
              targetId: stream.streamer._id
            });
          }
        };

        // Ждем подключения socket перед отправкой join-stream
        socket.on('connect', () => {
          console.log('Socket подключен, присоединяюсь к стриму');
          // Присоединяемся к стриму как зритель
          socket.emit('join-stream', {
            streamId: stream._id,
            userId: userId,
            isStreamer: false
          });
        });

        // Если уже подключен, отправляем сразу
        if (socket.connected) {
          socket.emit('join-stream', {
            streamId: stream._id,
            userId: userId,
            isStreamer: false
          });
        }

        // Слушаем offer от стримера
        const offerHandler = async (data) => {
          if (data.streamId === stream._id && (data.targetId === userId || !data.targetId)) {
            console.log('[StreamPlayer] Получен offer от стримера:', data);
            try {
              // Проверяем состояние соединения перед установкой
              if (pc.signalingState === 'stable' && !pc.remoteDescription) {
                await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                console.log('[StreamPlayer] Отправляю answer стримеру:', data.senderId);
                socket.emit('webrtc-answer', {
                  streamId: stream._id,
                  answer: answer,
                  targetId: data.senderId || stream.streamer._id
                });
                setIsConnected(true);
              } else if (pc.remoteDescription) {
                console.log('[StreamPlayer] Remote description уже установлен, пропускаю');
              } else {
                console.log('[StreamPlayer] Неправильное состояние соединения для offer:', pc.signalingState);
              }
            } catch (error) {
              console.error('[StreamPlayer] Ошибка обработки offer:', error);
              // Если ошибка из-за состояния, пробуем переподключиться
              if (error.message.includes('wrong state') || error.message.includes('stable')) {
                console.log('[StreamPlayer] Ошибка состояния соединения, игнорируем');
              } else if (!error.message.includes('already set')) {
                setError('Ошибка подключения к стриму');
              }
            }
          }
        };
        socket.on('webrtc-offer', offerHandler);

        // Слушаем answer
        socket.on('webrtc-answer', async (data) => {
          if (data.streamId === stream._id) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          }
        });

        // Слушаем ICE кандидаты
        socket.on('webrtc-ice-candidate', async (data) => {
          if (data.streamId === stream._id && (data.targetId === userId || data.senderId === stream.streamer._id)) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (error) {
              console.error('Ошибка добавления ICE candidate:', error);
            }
          }
        });

        // Слушаем изменения заставки от стримера
        const overlayHandler = (data) => {
          console.log('Получено событие заставки:', data);
          if (data.streamId === stream._id) {
            console.log('Применяю заставку:', { overlayImage: data.overlayImage, overlayVideo: data.overlayVideo, type: data.overlayType, enabled: data.enabled });
            setOverlayImage(data.overlayImage || null);
            setOverlayVideo(data.overlayVideo || null);
            setOverlayType(data.overlayType || null);
            setShowOverlay(data.enabled);
          }
        };
        socket.on('stream-overlay-changed', overlayHandler);

        setIsConnected(true);
      } catch (err) {
        console.error('Ошибка WebRTC:', err);
        setError('Ошибка подключения к стриму');
      }
    };

    setupWebRTC();

    return () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (socketRef.current) {
        socketRef.current.off('webrtc-offer');
        socketRef.current.off('webrtc-answer');
        socketRef.current.off('webrtc-ice-candidate');
        socketRef.current.off('stream-overlay-changed');
        socketRef.current.disconnect();
      }
    };
  }, [stream, user?.id]);

  // Отдельный useEffect для автоматического воспроизведения
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleLoadedMetadata = () => {
      if (videoElement.srcObject && videoElement.paused) {
        videoElement.play().catch(err => {
          console.error('Ошибка автоматического воспроизведения при загрузке:', err);
        });
      }
    };

    const handleCanPlay = () => {
      if (videoElement.srcObject && videoElement.paused) {
        videoElement.play().catch(err => {
          console.error('Ошибка автоматического воспроизведения:', err);
        });
      }
    };

    const handlePlay = () => {
      setIsConnected(true);
      setError('');
    };

    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoElement.addEventListener('canplay', handleCanPlay);
    videoElement.addEventListener('play', handlePlay);

    return () => {
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.removeEventListener('canplay', handleCanPlay);
      videoElement.removeEventListener('play', handlePlay);
    };
  }, [isConnected, autoPlay]);

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

  return (
    <div className="stream-player">
      {error && <div className="error">{error}</div>}
      <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '300px' }}>
        {/* Скрываем любые overlay с ID и логотипом - универсальные правила */}
        <style jsx>{`
          .stream-player div[class*="video-overlay-gradient"],
          .stream-player div[class*="overlay-content"],
          .stream-player img[class*="nio-logo-img"],
          .stream-player div[class*="stream-id-overlay"],
          .stream-player div[class*="stream-info-overlay"],
          .stream-player *[class*="overlay"],
          .stream-player *[class*="logo"],
          .stream-player *[class*="id"],
          .stream-player *[id*="overlay"],
          .stream-player *[id*="logo"],
          .stream-player *[id*="id"],
          .stream-player div:has-text("ID:"),
          .stream-player > div > div[style*="gradient"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
            position: absolute !important;
            left: -9999px !important;
            width: 0 !important;
            height: 0 !important;
          }
        `}</style>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          controls
          muted={false}
          className="video-player"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            backgroundColor: '#000'
          }}
          onLoadedMetadata={() => {
            if (videoRef.current && videoRef.current.paused) {
              videoRef.current.play().catch(err => {
                console.error('Ошибка автоплея:', err);
              });
            }
          }}
          onCanPlay={() => {
            if (videoRef.current && videoRef.current.paused) {
              videoRef.current.play().catch(err => {
                console.error('Ошибка автоплея:', err);
              });
            }
          }}
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
            src={overlayVideo}
            autoPlay
            loop
            muted
            playsInline
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
      {!isConnected && <div className="loading">Подключение к стриму...</div>}
    </div>
  );
}

