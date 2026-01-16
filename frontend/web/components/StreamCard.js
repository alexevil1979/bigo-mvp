import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import io from 'socket.io-client';
import { generateTurnCredentialsSync } from '../lib/turnAuth';

export default function StreamCard({ stream }) {
  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showLoading, setShowLoading] = useState(true);
  const [overlayImage, setOverlayImage] = useState(null);
  const [overlayVideo, setOverlayVideo] = useState(null);
  const [overlayType, setOverlayType] = useState(null);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    if (!stream) return;

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000');
    socketRef.current = socket;
    
    const userId = `preview-${stream._id}-${Date.now()}`;
    
    // Таймаут для скрытия загрузки через 5 секунд, даже если соединение не установлено
    const loadingTimeout = setTimeout(() => {
      setShowLoading(false);
    }, 5000);

    const setupPreview = async () => {
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
          
          if (process.env.NEXT_PUBLIC_WEBRTC_TURN_SECRET) {
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

        peerConnectionRef.current = pc;

        // Обработка входящего потока
        pc.ontrack = (event) => {
          console.log('Preview: получен трек от стримера:', event);
          if (videoRef.current) {
            let mediaStream = null;
            if (event.streams && event.streams[0]) {
              mediaStream = event.streams[0];
              videoRef.current.srcObject = mediaStream;
            } else if (event.track) {
              mediaStream = new MediaStream([event.track]);
              videoRef.current.srcObject = mediaStream;
            }
            
            if (mediaStream && videoRef.current) {
              videoRef.current.muted = true;
              videoRef.current.playsInline = true;
              
              // Для мобильных устройств важно установить isConnected сразу при наличии потока
              // даже если автоплей заблокирован
              if (videoRef.current.srcObject) {
                setIsConnected(true);
                setShowLoading(false); // Скрываем загрузку при получении потока
              }
              
              // Пытаемся запустить воспроизведение
              const playPromise = videoRef.current.play();
              if (playPromise !== undefined) {
                playPromise
                  .then(() => {
                    console.log('Preview: видео воспроизводится');
                    setIsConnected(true);
                    setShowLoading(false);
                  })
                  .catch((err) => {
                    console.log('Preview: автоплей заблокирован, но видео загружено', err);
                    // Автоплей заблокирован, но видео загружено - показываем его
                    setIsConnected(true);
                    setShowLoading(false);
                  });
              } else {
                setIsConnected(true);
                setShowLoading(false);
              }
            }
          }
        };
        
        // Отслеживание состояния соединения
        pc.onconnectionstatechange = () => {
          console.log('Preview WebRTC connection state:', pc.connectionState);
          if (pc.connectionState === 'connected' && videoRef.current && videoRef.current.srcObject) {
            setIsConnected(true);
            setShowLoading(false);
          } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            // Не сбрасываем isConnected, если видео уже загружено
            if (!videoRef.current || !videoRef.current.srcObject) {
              setIsConnected(false);
            }
          }
        };
        
        // Обработка ошибок ICE
        pc.oniceconnectionstatechange = () => {
          console.log('Preview: ICE connection state:', pc.iceConnectionState);
          if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
            if (videoRef.current && videoRef.current.srcObject) {
              setIsConnected(true);
              setShowLoading(false);
              // Пытаемся запустить воспроизведение, если еще не запущено
              if (videoRef.current.paused) {
                videoRef.current.play().catch(() => {
                  // Автоплей заблокирован, но видео загружено
                  setIsConnected(true);
                  setShowLoading(false);
                });
              }
            }
          } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
            // Не сбрасываем isConnected, если видео уже загружено
            if (!videoRef.current || !videoRef.current.srcObject) {
              setIsConnected(false);
            }
          }
        };

        // Присоединяемся к стриму как зритель
        socket.on('connect', () => {
          socket.emit('join-stream', {
            streamId: stream._id,
            userId: userId,
            isStreamer: false
          });
        });

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
            try {
              if (pc.remoteDescription) {
                return;
              }
              await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);

              socket.emit('webrtc-answer', {
                streamId: stream._id,
                answer: answer,
                targetId: data.senderId || stream.streamer._id
              });
            } catch (error) {
              // Игнорируем ошибки для превью
            }
          }
        };
        socket.on('webrtc-offer', offerHandler);
        
        // Также слушаем answer (на случай если стример инициирует соединение)
        socket.on('webrtc-answer', async (data) => {
          if (data.streamId === stream._id) {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            } catch (error) {
              // Игнорируем ошибки для превью
            }
          }
        });

        // Слушаем ICE кандидаты
        socket.on('webrtc-ice-candidate', async (data) => {
          if (data.streamId === stream._id && (data.targetId === userId || data.senderId === stream.streamer._id)) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (error) {
              // Игнорируем ошибки ICE
            }
          }
        });

        // Слушаем изменения заставки от стримера
        const overlayHandler = (data) => {
          if (data.streamId === stream._id) {
            setOverlayImage(data.overlayImage || null);
            setOverlayVideo(data.overlayVideo || null);
            setOverlayType(data.overlayType || null);
            setShowOverlay(data.enabled);
          }
        };
        socket.on('stream-overlay-changed', overlayHandler);

      } catch (err) {
        console.error('Ошибка настройки превью:', err);
      }
    };

    setupPreview();

    return () => {
      clearTimeout(loadingTimeout);
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (socketRef.current) {
        socketRef.current.off('stream-overlay-changed');
        socketRef.current.emit('leave-stream', { streamId: stream._id });
        socketRef.current.disconnect();
      }
    };
  }, [stream]);

  return (
    <Link href={`/stream/${stream._id}`}>
      <div className="stream-card">
        <div className="stream-thumbnail" style={{ position: 'relative' }}>
          {/* Fallback градиент, который всегда виден */}
          <div 
            className="stream-preview-fallback"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              zIndex: 1
            }}
          />
          {/* Видео превью */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`stream-preview-video ${isConnected ? 'is-connected' : ''}`}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              backgroundColor: 'transparent',
              opacity: isConnected ? 1 : 0,
              transition: 'opacity 0.3s ease-in-out',
              zIndex: 2,
              // Для мобильных устройств важно, чтобы видео было видно
              visibility: isConnected ? 'visible' : 'hidden'
            }}
            onLoadedMetadata={() => {
              console.log('Preview: метаданные загружены');
              if (videoRef.current && videoRef.current.srcObject) {
                // Для мобильных устройств важно показать видео даже если автоплей заблокирован
                setIsConnected(true);
                setShowLoading(false);
                const playPromise = videoRef.current.play();
                if (playPromise !== undefined) {
                  playPromise
                    .then(() => {
                      setIsConnected(true);
                      setShowLoading(false);
                    })
                    .catch(() => {
                      // Автоплей заблокирован, но видео загружено - показываем его
                      setIsConnected(true);
                      setShowLoading(false);
                    });
                }
              }
            }}
            onCanPlay={() => {
              console.log('Preview: видео готово к воспроизведению');
              if (videoRef.current && videoRef.current.srcObject) {
                // Критически важно для мобильных: показываем видео при готовности
                setIsConnected(true);
                const playPromise = videoRef.current.play();
                if (playPromise !== undefined) {
                  playPromise
                    .then(() => {
                      setIsConnected(true);
                    })
                    .catch(() => {
                      // Автоплей заблокирован, но видео загружено - показываем его
                      setIsConnected(true);
                    });
                } else {
                  setIsConnected(true);
                }
              }
            }}
            onPlay={() => {
              console.log('Preview: видео воспроизводится');
              setIsConnected(true);
              setShowLoading(false);
            }}
            onPlaying={() => {
              console.log('Preview: видео играет');
              setIsConnected(true);
              setShowLoading(false);
            }}
            onLoadedData={() => {
              // Дополнительная проверка для мобильных устройств
              if (videoRef.current && videoRef.current.srcObject) {
                setIsConnected(true);
                setShowLoading(false);
              }
            }}
            onError={(e) => {
              console.error('Превью: ошибка видео элемента:', e);
              setIsConnected(false);
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
              zIndex: 5
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
                zIndex: 5
              }}
            />
          )}
          {showLoading && !isConnected && (
            <div className="preview-loading" style={{ zIndex: 3 }}>
              <div className="loading-spinner"></div>
            </div>
          )}
          <div className="live-badge" style={{ zIndex: 4 }}>LIVE</div>
        </div>
        <div className="stream-info">
          <h3>{stream.title}</h3>
          <p className="streamer-name">{stream.streamer?.nickname}</p>
          <p className="viewer-count">👁️ {stream.viewerCount} зрителей</p>
        </div>
      </div>
    </Link>
  );
}

