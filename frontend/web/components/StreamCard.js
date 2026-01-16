import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import io from 'socket.io-client';
import { generateTurnCredentialsSync } from '../lib/turnAuth';

export default function StreamCard({ stream }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showLoading, setShowLoading] = useState(true);
  const [useCanvas, setUseCanvas] = useState(false);
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
              
              // Для мобильных устройств пробуем использовать canvas как fallback
              const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
              
              if (isMobile && canvasRef.current) {
                // Пробуем использовать canvas для отображения на мобильных
                setUseCanvas(true);
                startCanvasCapture();
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
                    if (isMobile && canvasRef.current) {
                      setTimeout(() => {
                        setUseCanvas(true);
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
          
          const drawFrame = () => {
            if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
              if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                console.log('Preview: canvas размеры установлены:', canvas.width, 'x', canvas.height);
              }
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              setIsConnected(true);
              setShowLoading(false);
            } else {
              console.log('Preview: canvas - видео еще не готово, readyState:', video.readyState, 'width:', video.videoWidth, 'height:', video.videoHeight);
            }
            
            // Продолжаем рисовать если видео на паузе или canvas активен
            if (useCanvas && canvasRef.current && videoRef.current && videoRef.current.srcObject) {
              animationFrameRef.current = requestAnimationFrame(drawFrame);
            } else {
              console.log('Preview: canvas остановлен - useCanvas:', useCanvas, 'hasCanvas:', !!canvasRef.current, 'hasVideo:', !!videoRef.current, 'hasSrcObject:', !!videoRef.current?.srcObject);
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
              console.log('Preview: проверка canvas - isMobile:', isMobile, 'videoPlaying:', videoPlaying, 'useCanvas:', useCanvas);
              if (!videoPlaying && !useCanvas) {
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
              console.log('Preview: проверка canvas при ICE failed - isMobile:', isMobile, 'videoPlaying:', videoPlaying, 'useCanvas:', useCanvas);
              if (!videoPlaying && !useCanvas) {
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
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
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
          {/* Canvas для мобильных устройств (fallback) */}
          {useCanvas && (
            <canvas
              ref={canvasRef}
              className="stream-preview-canvas"
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
                visibility: isConnected ? 'visible' : 'hidden'
              }}
            />
          )}
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
              display: useCanvas ? 'none' : (videoRef.current?.srcObject ? 'block' : 'none'),
              backgroundColor: 'transparent',
              opacity: (isConnected || videoRef.current?.srcObject) ? 1 : 0,
              transition: 'opacity 0.3s ease-in-out',
              zIndex: 2,
              // Для мобильных устройств важно, чтобы видео было видно даже при failed соединении
              visibility: (isConnected || videoRef.current?.srcObject) ? 'visible' : 'hidden'
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
                
                // Для мобильных устройств пробуем canvas если видео не играет
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                if (isMobile && videoRef.current.paused && canvasRef.current) {
                  setTimeout(() => {
                    setUseCanvas(true);
                    startCanvasCapture();
                  }, 100);
                }
              }
            }}
            
            // Дополнительная проверка через requestAnimationFrame для мобильных
            onTimeUpdate={() => {
              if (videoRef.current && videoRef.current.srcObject && videoRef.current.currentTime > 0) {
                setIsConnected(true);
                setShowLoading(false);
                // Если видео играет, отключаем canvas
                if (useCanvas && animationFrameRef.current) {
                  cancelAnimationFrame(animationFrameRef.current);
                  setUseCanvas(false);
                }
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

