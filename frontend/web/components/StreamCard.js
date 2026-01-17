import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import io from 'socket.io-client';
import { generateTurnCredentialsSync } from '../lib/turnAuth';
import StreamPlayer from './StreamPlayer';

export default function StreamCard({ stream }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const animationFrameRef = useRef(null);
  const previewAnimationFrameRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showLoading, setShowLoading] = useState(true);
  const [useCanvas, setUseCanvas] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  // Убрали состояния заставки - она уже в основном потоке

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
              
              // Для мобильных устройств пробуем использовать canvas как fallback
              const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
              console.log('Preview: проверка мобильного устройства - isMobile:', isMobile, 'canvasRef.current:', !!canvasRef.current);
              
              if (isMobile && canvasRef.current) {
                // Пробуем использовать canvas для отображения на мобильных
                console.log('Preview: мобильное устройство - запускаем canvas сразу при получении трека');
                // Устанавливаем useCanvas и запускаем canvas
                setUseCanvas(true);
                // Используем более длинный таймаут, чтобы дать время state обновиться
                setTimeout(() => {
                  console.log('Preview: вызываем startCanvasCapture через setTimeout, useCanvas должен быть true');
                  // Проверяем, что canvas все еще нужен
                  if (canvasRef.current && videoRef.current && videoRef.current.srcObject) {
                    startCanvasCapture();
                  } else {
                    console.log('Preview: canvas или video недоступны при запуске');
                  }
                }, 300);
              }
              
              // Устанавливаем isConnected сразу при наличии потока
              if (videoRef.current.srcObject) {
                setIsConnected(true);
                setShowLoading(false);
              }
              
              // Пытаемся запустить воспроизведение
              const playPromise = videoRef.current.play();
              if (playPromise !== undefined) {
                playPromise
                  .then(() => {
                    console.log('Preview: видео воспроизводится');
                    setIsConnected(true);
                    setShowLoading(false);
                    // Если видео играет, не нужен canvas
                    if (animationFrameRef.current) {
                      cancelAnimationFrame(animationFrameRef.current);
                      setUseCanvas(false);
                    }
                  })
                  .catch((err) => {
                    console.log('Preview: автоплей заблокирован, используем canvas', err);
                    // Автоплей заблокирован - используем canvas для отображения
                    setIsConnected(true);
                    setShowLoading(false);
                    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                    console.log('Preview: проверка canvas при ошибке play - isMobile:', isMobile, 'canvasRef.current:', !!canvasRef.current, 'useCanvas:', useCanvas);
                    if (isMobile && canvasRef.current) {
                      console.log('Preview: запускаем canvas сразу при ошибке play()');
                      setUseCanvas(true);
                      // Запускаем canvas сразу, не ждем setTimeout
                      setTimeout(() => {
                        startCanvasCapture();
                      }, 100);
                    }
                  });
              } else {
                setIsConnected(true);
                setShowLoading(false);
              }
            }
          }
        };
        
        // Функция для захвата превью кадра из видео
        const capturePreviewFrame = () => {
          if (!videoRef.current || !previewCanvasRef.current) {
            console.log('Preview: capturePreviewFrame - нет video или previewCanvas');
            return;
          }
          
          const video = videoRef.current;
          const canvas = previewCanvasRef.current;
          const ctx = canvas.getContext('2d');
          
          console.log('Preview: захват превью кадра, video state:', {
            readyState: video.readyState,
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            paused: video.paused,
            hasSrcObject: !!video.srcObject
          });
          
          const drawPreview = () => {
            if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
              // Устанавливаем размеры canvas
              if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                console.log('Preview: canvas размеры установлены:', canvas.width, 'x', canvas.height);
              }
              // Рисуем текущий кадр
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              console.log('Preview: кадр захвачен и отрисован');
              
              // Останавливаем после первого кадра, если видео не играет
              if (video.paused && previewAnimationFrameRef.current) {
                cancelAnimationFrame(previewAnimationFrameRef.current);
                previewAnimationFrameRef.current = null;
              }
            } else {
              console.log('Preview: видео еще не готово для захвата, readyState:', video.readyState);
            }
            
            // Продолжаем только если видео загружено и не играет
            if (video.srcObject && video.paused && showPreview && !isPlaying) {
              previewAnimationFrameRef.current = requestAnimationFrame(drawPreview);
            } else {
              if (previewAnimationFrameRef.current) {
                cancelAnimationFrame(previewAnimationFrameRef.current);
                previewAnimationFrameRef.current = null;
              }
            }
          };
          
          // Останавливаем предыдущую анимацию если есть
          if (previewAnimationFrameRef.current) {
            cancelAnimationFrame(previewAnimationFrameRef.current);
            previewAnimationFrameRef.current = null;
          }
          
          // Запускаем захват кадра
          drawPreview();
        };
        
        // Функция для захвата кадров в canvas
        const startCanvasCapture = () => {
          console.log('Preview: startCanvasCapture вызвана');
          console.log('Preview: videoRef.current:', !!videoRef.current, 'canvasRef.current:', !!canvasRef.current);
          
          if (!videoRef.current || !canvasRef.current) {
            console.log('Preview: startCanvasCapture - нет video или canvas');
            return;
          }
          
          const video = videoRef.current;
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          
          console.log('Preview: canvas capture - video state:', {
            readyState: video.readyState,
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            paused: video.paused,
            hasSrcObject: !!video.srcObject
          });
          
          // Устанавливаем начальные размеры canvas, если видео еще не загрузило метаданные
          if (video.videoWidth === 0 || video.videoHeight === 0) {
            // Используем стандартные размеры или размеры контейнера
            const container = canvas.parentElement;
            if (container) {
              const rect = container.getBoundingClientRect();
              canvas.width = rect.width || 640;
              canvas.height = rect.height || 360;
              console.log('Preview: canvas размеры установлены из контейнера:', canvas.width, 'x', canvas.height);
            } else {
              canvas.width = 640;
              canvas.height = 360;
              console.log('Preview: canvas размеры установлены по умолчанию:', canvas.width, 'x', canvas.height);
            }
          }
          
          let retryCount = 0;
          const maxRetries = 100; // Пробуем до 100 раз (около 1.5 секунды при 60fps)
          
          const drawFrame = () => {
            // Если видео загрузило метаданные, используем реальные размеры
            if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
              if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                console.log('Preview: canvas размеры установлены из видео:', canvas.width, 'x', canvas.height);
              }
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              setIsConnected(true);
              setShowLoading(false);
              retryCount = 0; // Сброс счетчика при успехе
            } else {
              // Если метаданные еще не загружены, но есть srcObject, пробуем нарисовать черный экран или ждем
              if (video.srcObject && retryCount < maxRetries) {
                // Рисуем черный экран или градиент, пока видео не загрузится
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                retryCount++;
                if (retryCount % 30 === 0) {
                  console.log('Preview: canvas - ждем загрузки видео, попытка:', retryCount, 'readyState:', video.readyState);
                }
              } else if (retryCount >= maxRetries) {
                console.log('Preview: canvas - превышено количество попыток, видео не загрузилось');
              }
            }
            
            // Продолжаем рисовать если canvas активен и есть srcObject
            // ВАЖНО: проверяем canvasRef и videoRef напрямую, не полагаемся на useCanvas state
            // (useCanvas обновляется асинхронно, поэтому может быть false даже после setUseCanvas(true))
            if (canvasRef.current && videoRef.current && videoRef.current.srcObject) {
              animationFrameRef.current = requestAnimationFrame(drawFrame);
            } else {
              console.log('Preview: canvas остановлен - hasCanvas:', !!canvasRef.current, 'hasVideo:', !!videoRef.current, 'hasSrcObject:', !!videoRef.current?.srcObject);
              if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
              }
            }
          };
          
          // Останавливаем предыдущую анимацию если есть
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
          
          console.log('Preview: запускаем drawFrame');
          drawFrame();
        };
        
        // Отслеживание состояния соединения (как в StreamPlayer.js)
        pc.onconnectionstatechange = () => {
          console.log('Preview WebRTC connection state:', pc.connectionState);
          console.log('Preview: video state при connectionState change:', {
            hasVideoRef: !!videoRef.current,
            hasSrcObject: videoRef.current?.srcObject ? true : false,
            readyState: videoRef.current?.readyState,
            paused: videoRef.current?.paused,
            videoWidth: videoRef.current?.videoWidth,
            videoHeight: videoRef.current?.videoHeight,
            isConnected: isConnected
          });
          
          if (pc.connectionState === 'connected') {
            console.log('Preview: соединение connected');
            setIsConnected(true);
            setShowLoading(false);
            // Пытаемся запустить воспроизведение, если еще не запущено
            if (videoRef.current && videoRef.current.paused && videoRef.current.srcObject) {
              console.log('Preview: пытаемся запустить play() при connected');
              videoRef.current.play().catch(err => {
                console.log('Preview: ошибка play() при connected:', err);
              });
            }
          } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            console.log('Preview: соединение failed/disconnected');
            // НЕ сбрасываем isConnected, если видео уже загружено (как в StreamPlayer.js)
            if (!videoRef.current || !videoRef.current.srcObject) {
              console.log('Preview: нет видео - сбрасываем isConnected');
              setIsConnected(false);
            } else {
              console.log('Preview: видео есть - сохраняем isConnected');
            }
            // Для мобильных пробуем canvas, если видео не играет
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            if (isMobile && canvasRef.current && videoRef.current && videoRef.current.srcObject) {
              const videoPlaying = !videoRef.current.paused && videoRef.current.readyState >= 2;
              const videoHasMetadata = videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0;
              console.log('Preview: проверка canvas при failed - isMobile:', isMobile, 'videoPlaying:', videoPlaying, 'videoHasMetadata:', videoHasMetadata, 'useCanvas:', useCanvas);
              // Запускаем canvas если видео не играет ИЛИ метаданные еще не загружены
              if ((!videoPlaying || !videoHasMetadata) && !useCanvas) {
                console.log('Preview: запускаем canvas для мобильных при failed соединении');
                setTimeout(() => {
                  setUseCanvas(true);
                  startCanvasCapture();
                }, 300);
              }
            }
          }
        };
        
        // Обработка состояния ICE соединения (как в StreamPlayer.js)
        pc.oniceconnectionstatechange = () => {
          console.log('Preview: ICE connection state:', pc.iceConnectionState);
          console.log('Preview: video state при ICE state change:', {
            hasVideoRef: !!videoRef.current,
            hasSrcObject: videoRef.current?.srcObject ? true : false,
            readyState: videoRef.current?.readyState,
            paused: videoRef.current?.paused,
            videoWidth: videoRef.current?.videoWidth,
            videoHeight: videoRef.current?.videoHeight
          });
          
          if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
            console.log('Preview: ICE connected/completed');
            setIsConnected(true);
            setShowLoading(false);
            if (videoRef.current && videoRef.current.paused && videoRef.current.srcObject) {
              console.log('Preview: пытаемся запустить play() при ICE connected');
              videoRef.current.play().catch(err => {
                console.log('Preview: ошибка play() при ICE connected:', err);
              });
            }
          } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
            console.log('Preview: ICE failed/disconnected');
            // НЕ сбрасываем isConnected, если видео уже загружено (как в StreamPlayer.js)
            if (!videoRef.current || !videoRef.current.srcObject) {
              console.log('Preview: нет видео при ICE failed - сбрасываем isConnected');
              setIsConnected(false);
            } else {
              console.log('Preview: видео есть при ICE failed - сохраняем isConnected');
            }
            // Для мобильных пробуем canvas, если видео не играет
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            if (isMobile && canvasRef.current && videoRef.current && videoRef.current.srcObject) {
              const videoPlaying = !videoRef.current.paused && videoRef.current.readyState >= 2;
              const videoHasMetadata = videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0;
              console.log('Preview: проверка canvas при ICE failed - isMobile:', isMobile, 'videoPlaying:', videoPlaying, 'videoHasMetadata:', videoHasMetadata, 'useCanvas:', useCanvas);
              // Запускаем canvas если видео не играет ИЛИ метаданные еще не загружены
              if ((!videoPlaying || !videoHasMetadata) && !useCanvas) {
                console.log('Preview: запускаем canvas для мобильных при ICE failed');
                setTimeout(() => {
                  setUseCanvas(true);
                  startCanvasCapture();
                }, 300);
              }
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

        // Убрали обработку заставки - она уже в основном потоке через captureStream

      } catch (err) {
        console.error('Ошибка настройки превью:', err);
      }
    };

    setupPreview();

    return () => {
      clearTimeout(loadingTimeout);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (socketRef.current) {
        socketRef.current.emit('leave-stream', { streamId: stream._id });
        socketRef.current.disconnect();
      }
    };
  }, [stream]);

  // Отдельный useEffect для автоматического воспроизведения (как в StreamPlayer.js)
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleLoadedMetadata = () => {
      if (videoElement.srcObject && videoElement.paused) {
        videoElement.play().catch(err => {
          console.error('Preview: ошибка автоматического воспроизведения при загрузке:', err);
        });
      }
    };

    const handleCanPlay = () => {
      if (videoElement.srcObject && videoElement.paused) {
        videoElement.play().catch(err => {
          console.error('Preview: ошибка автоматического воспроизведения:', err);
        });
      }
    };

    const handlePlay = () => {
      setIsConnected(true);
      setShowLoading(false);
    };

    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoElement.addEventListener('canplay', handleCanPlay);
    videoElement.addEventListener('play', handlePlay);

    return () => {
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.removeEventListener('canplay', handleCanPlay);
      videoElement.removeEventListener('play', handlePlay);
    };
  }, [isConnected]);

  return (
    <Link href={`/stream/${stream._id}`}>
      <div className="stream-card">
        <div className="stream-thumbnail" style={{ position: 'relative' }}>
          {/* Контейнер для плеера */}
          <div className="stream-preview-player-container" style={{ position: 'relative' }}>
            {/* Скриншот стрима для превью */}
            {showPreview && !isPlaying && stream.lastScreenshot && (
              <img
                src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${stream.lastScreenshot}`}
                alt={stream.title}
                className="stream-preview-screenshot"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  zIndex: 2,
                  backgroundColor: '#000'
                }}
                onError={(e) => {
                  // Если скриншот не загрузился, скрываем его
                  e.target.style.display = 'none';
                }}
              />
            )}
            
            {/* Кнопка play поверх превью */}
            {showPreview && !isPlaying && (
              <button
                className="stream-play-button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowPreview(false);
                  setIsPlaying(true);
                  // Находим video элемент внутри StreamPlayer и запускаем его
                  const playerContainer = e.currentTarget.closest('.stream-preview-player-container');
                  if (playerContainer) {
                    const videoElement = playerContainer.querySelector('video');
                    if (videoElement) {
                      videoElement.play().catch(err => {
                        console.error('Ошибка запуска видео:', err);
                      });
                    }
                  }
                }}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'rgba(0, 0, 0, 0.6)',
                  border: '3px solid rgba(255, 255, 255, 0.9)',
                  cursor: 'pointer',
                  zIndex: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)';
                  e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)';
                  e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)';
                }}
              >
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="white"
                  style={{ marginLeft: '4px' }}
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            )}
            
            {/* StreamPlayer - скрыт пока показывается превью */}
            <div style={{ 
              opacity: showPreview && !isPlaying ? 0 : 1,
              transition: 'opacity 0.3s ease',
              position: 'relative',
              zIndex: showPreview && !isPlaying ? 1 : 2
            }}>
              <StreamPlayer stream={stream} user={null} autoPlay={false} />
            </div>
          </div>
          <div className="live-badge" style={{ zIndex: 4 }}>LIVE</div>
        </div>
        <div className="stream-info">
          <h3>{stream.title}</h3>
          <p className="streamer-name">{stream.streamer?.nickname}</p>
          <p className="viewer-count">👁️ {stream.viewerCount} зрителей</p>
        </div>
      </div>
      
      {/* Дополнительный блок с плеером для мобильных устройств */}
      {(() => {
        if (typeof window === 'undefined') return null;
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        return isMobile ? (
          <div className="stream-mobile-player-wrapper">
            <div className="stream-mobile-player-container">
              <StreamPlayer stream={stream} user={null} autoPlay={false} />
            </div>
          </div>
        ) : null;
      })()}
    </Link>
  );
}

