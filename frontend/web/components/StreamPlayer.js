import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { generateTurnCredentialsSync } from '../lib/turnAuth';

export default function StreamPlayer({ stream, user, autoPlay = true }) {
  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const statsIntervalRef = useRef(null);
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

        // Мониторинг статистики WebRTC для диагностики буферизации
        const startStatsMonitoring = () => {
          if (statsIntervalRef.current) return;
          
          statsIntervalRef.current = setInterval(async () => {
            try {
              const stats = await pc.getStats();
              let videoStats = null;
              let connectionStats = null;
              
              stats.forEach(report => {
                if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
                  videoStats = {
                    bytesReceived: report.bytesReceived,
                    packetsReceived: report.packetsReceived,
                    packetsLost: report.packetsLost,
                    jitter: report.jitter,
                    framesDecoded: report.framesDecoded,
                    framesDropped: report.framesDropped,
                    framesReceived: report.framesReceived
                  };
                }
                if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                  connectionStats = {
                    bytesReceived: report.bytesReceived,
                    bytesSent: report.bytesSent,
                    packetsReceived: report.packetsReceived,
                    packetsSent: report.packetsSent,
                    roundTripTime: report.currentRoundTripTime,
                    availableOutgoingBitrate: report.availableOutgoingBitrate,
                    availableIncomingBitrate: report.availableIncomingBitrate
                  };
                }
              });
              
              if (videoStats) {
                console.log('[StreamPlayer] WebRTC Video Stats:', videoStats);
                
                // Проверяем, получает ли видео данные
                if (videoStats.packetsReceived === 0 && pc.connectionState === 'connected') {
                  console.warn('[StreamPlayer] ВНИМАНИЕ: WebRTC соединение установлено, но данные не получаются!');
                  setError('Соединение установлено, но данные не передаются. Проверьте сеть.');
                }
                
                // Проверяем потери пакетов
                if (videoStats.packetsLost > 0) {
                  const lossRate = (videoStats.packetsLost / (videoStats.packetsReceived + videoStats.packetsLost)) * 100;
                  if (lossRate > 5) {
                    console.warn('[StreamPlayer] ВНИМАНИЕ: Высокая потеря пакетов:', lossRate.toFixed(2) + '%');
                  }
                }
              }
              
              if (connectionStats) {
                console.log('[StreamPlayer] WebRTC Connection Stats:', connectionStats);
              }
              
              // Проверяем буфер видео
              const video = videoRef.current;
              if (video && video.buffered.length > 0) {
                const bufferedEnd = video.buffered.end(video.buffered.length - 1);
                const currentTime = video.currentTime;
                const bufferedAhead = bufferedEnd - currentTime;
                
                if (bufferedAhead < 0.5 && !video.paused) {
                  console.warn('[StreamPlayer] ВНИМАНИЕ: Мало данных в буфере:', bufferedAhead.toFixed(2), 'сек');
                }
              }
            } catch (error) {
              console.error('[StreamPlayer] Ошибка получения статистики WebRTC:', error);
            }
          }, 3000); // Каждые 3 секунды
        };

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
            
            // Запускаем мониторинг статистики после получения трека
            startStatsMonitoring();
            
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
          
          const video = videoRef.current;
          console.log('[StreamPlayer] video state при connectionState change:', {
            hasVideoRef: !!video,
            hasSrcObject: video?.srcObject ? true : false,
            readyState: video?.readyState,
            paused: video?.paused,
            videoWidth: video?.videoWidth,
            videoHeight: video?.videoHeight,
            isConnected: isConnected
          });
          
          if (pc.connectionState === 'connected') {
            console.log('[StreamPlayer] соединение connected');
            setIsConnected(true);
            setError('');
            // Пытаемся запустить воспроизведение, если еще не запущено
            if (video && video.paused && video.srcObject) {
              console.log('[StreamPlayer] пытаемся запустить play() при connected');
              video.play().catch(err => {
                console.log('[StreamPlayer] ошибка play() при connected:', err);
              });
            }
          } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            console.log('[StreamPlayer] соединение failed/disconnected');
            
            // Проверяем, есть ли видео и играет ли оно
            // Приоритет: сначала проверяем !paused (самый надежный индикатор), потом readyState/videoWidth
            if (video && video.srcObject) {
              const hasVideo = !video.paused || video.readyState >= 2 || video.videoWidth > 0;
              
              if (hasVideo) {
                console.log('[StreamPlayer] Видео есть, сохраняем соединение даже при failed connectionState:', {
                  readyState: video.readyState,
                  videoWidth: video.videoWidth,
                  paused: video.paused,
                  hasSrcObject: !!video.srcObject
                });
                // Не сбрасываем isConnected, если видео играет
                if (!video.paused) {
                  setIsConnected(true);
                  setError('');
                  console.log('[StreamPlayer] Видео играет (!paused), сохраняем соединение');
                } else {
                  setIsConnected(true);
                  setError('Соединение нестабильно, но видео доступно');
                }
              } else {
                console.log('[StreamPlayer] Видео не найдено, сбрасываем соединение');
                setError('Соединение потеряно');
                setIsConnected(false);
              }
            } else {
              console.log('[StreamPlayer] Нет srcObject, сбрасываем соединение');
              setError('Соединение потеряно');
              setIsConnected(false);
            }
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
            
            const video = videoRef.current;
            // Проверяем, есть ли видео и играет ли оно
            // Приоритет: сначала проверяем !paused (самый надежный индикатор), потом readyState/videoWidth
            if (video && video.srcObject) {
              const hasVideo = !video.paused || video.readyState >= 2 || video.videoWidth > 0;
              
              if (hasVideo) {
                console.log('[StreamPlayer] Видео есть, сохраняем соединение даже при failed ICE:', {
                  readyState: video.readyState,
                  videoWidth: video.videoWidth,
                  paused: video.paused,
                  hasSrcObject: !!video.srcObject
                });
                // Не сбрасываем isConnected, если видео играет
                if (!video.paused) {
                  setIsConnected(true);
                  setError('');
                  console.log('[StreamPlayer] Видео играет (!paused), сохраняем соединение при ICE failed');
                } else {
                  setIsConnected(true);
                  setError('Соединение нестабильно, но видео доступно');
                }
              } else {
                console.log('[StreamPlayer] Видео не найдено при ICE failed, сбрасываем соединение');
                setError('Соединение потеряно');
                setIsConnected(false);
              }
            } else {
              console.log('[StreamPlayer] Нет srcObject при ICE failed, сбрасываем соединение');
              setError('Соединение потеряно');
              setIsConnected(false);
            }
            
            // Пробуем запустить видео если оно есть, но приостановлено
            if (video && video.srcObject && video.paused) {
              console.log('[StreamPlayer] Попытка запустить видео после failed соединения');
              video.play().catch(err => {
                console.log('[StreamPlayer] Не удалось запустить видео после failed:', err);
              });
            }
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
        let isProcessingOffer = false;
        const offerHandler = async (data) => {
          if (data.streamId === stream._id && (data.targetId === userId || !data.targetId)) {
            console.log('[StreamPlayer] Получен offer от стримера:', data);
            
            // Предотвращаем множественную обработку offer
            if (isProcessingOffer) {
              console.log('[StreamPlayer] Offer уже обрабатывается, пропускаю');
              return;
            }
            
            // Если remote description уже установлен, пропускаем
            if (pc.remoteDescription) {
              console.log('[StreamPlayer] Remote description уже установлен, пропускаю offer');
              return;
            }
            
            try {
              isProcessingOffer = true;
              
              // Проверяем состояние соединения перед установкой
              if (pc.signalingState === 'stable' || pc.signalingState === 'have-local-offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                
                // Обрабатываем очередь ICE кандидатов после установки remote description
                await processIceCandidateQueue();
                
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                console.log('[StreamPlayer] Отправляю answer стримеру:', data.senderId);
                socket.emit('webrtc-answer', {
                  streamId: stream._id,
                  answer: answer,
                  targetId: data.senderId || stream.streamer._id
                });
                setIsConnected(true);
              } else {
                console.log('[StreamPlayer] Неправильное состояние соединения для offer:', pc.signalingState);
              }
            } catch (error) {
              console.error('[StreamPlayer] Ошибка обработки offer:', error);
              // Если ошибка из-за состояния, игнорируем
              if (error.message.includes('wrong state') || error.message.includes('stable') || error.message.includes('already set')) {
                console.log('[StreamPlayer] Ошибка состояния соединения, игнорируем');
              } else {
                setError('Ошибка подключения к стриму');
              }
            } finally {
              isProcessingOffer = false;
            }
          }
        };
        socket.on('webrtc-offer', offerHandler);

        // Слушаем answer (зритель не должен получать answer, но на случай ошибок обрабатываем)
        socket.on('webrtc-answer', async (data) => {
          if (data.streamId === stream._id) {
            try {
              // Проверяем, что remote description еще не установлен
              if (!pc.remoteDescription) {
                await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
              } else {
                console.log('[StreamPlayer] Remote description уже установлен, игнорируем answer');
              }
            } catch (error) {
              // Игнорируем ошибки answer для зрителя
              if (!error.message.includes('already set') && !error.message.includes('wrong state')) {
                console.error('[StreamPlayer] Ошибка обработки answer (ожидаемо для зрителя):', error);
              }
            }
          }
        });

        // Слушаем ICE кандидаты
        const iceCandidateQueue = [];
        socket.on('webrtc-ice-candidate', async (data) => {
          if (data.streamId === stream._id && (data.targetId === userId || data.senderId === stream.streamer._id)) {
            try {
              // Ждем установки remote description перед добавлением ICE кандидатов
              if (pc.remoteDescription) {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
              } else {
                // Сохраняем кандидаты в очередь до установки remote description
                iceCandidateQueue.push(data.candidate);
                console.log('[StreamPlayer] ICE candidate добавлен в очередь, ждем remote description');
              }
            } catch (error) {
              // Игнорируем ошибки, если кандидат уже добавлен или соединение закрыто
              if (!error.message.includes('already set') && !error.message.includes('closed')) {
                console.error('[StreamPlayer] Ошибка добавления ICE candidate:', error);
              }
            }
          }
        });

        // Обработка очереди ICE кандидатов после установки remote description
        const processIceCandidateQueue = async () => {
          while (iceCandidateQueue.length > 0 && pc.remoteDescription) {
            const candidate = iceCandidateQueue.shift();
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (error) {
              if (!error.message.includes('already set') && !error.message.includes('closed')) {
                console.error('[StreamPlayer] Ошибка добавления ICE candidate из очереди:', error);
              }
            }
          }
        };

        // Слушаем изменения заставки от стримера
        const overlayHandler = (data) => {
          try {
            console.log('[StreamPlayer] ⚡ Получено событие заставки:', {
              streamId: data.streamId,
              currentStreamId: stream._id,
              streamIdsMatch: data.streamId === stream._id,
              overlayType: data.overlayType,
              enabled: data.enabled,
              hasImage: !!data.overlayImage,
              hasVideo: !!data.overlayVideo,
              imageLength: data.overlayImage ? data.overlayImage.length : 0,
              videoLength: data.overlayVideo ? data.overlayVideo.length : 0
            });
            
            if (data.streamId === stream._id) {
              console.log('[StreamPlayer] ✅ StreamId совпадает, применяем заставку');
              
              // Формируем полные URL для заставок (если это пути к файлам на сервере)
              const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
              const overlayImageUrl = data.overlayImagePath 
                ? `${apiUrl}${data.overlayImagePath}` 
                : (data.overlayImage || null); // Обратная совместимость с base64
              const overlayVideoUrl = data.overlayVideoPath 
                ? `${apiUrl}${data.overlayVideoPath}` 
                : (data.overlayVideo || null); // Обратная совместимость с base64
              
              // Безопасно устанавливаем заставку
              console.log('[StreamPlayer] Устанавливаем заставку:', {
                overlayType: data.overlayType,
                enabled: data.enabled,
                overlayImagePath: data.overlayImagePath,
                overlayVideoPath: data.overlayVideoPath,
                hasImage: !!overlayImageUrl,
                hasVideo: !!overlayVideoUrl
              });
              
              setOverlayImage(overlayImageUrl);
              setOverlayVideo(overlayVideoUrl);
              setOverlayType(data.overlayType || null);
              setShowOverlay(data.enabled);
              
              console.log('[StreamPlayer] ✅ Заставка применена:', {
                type: data.overlayType,
                enabled: data.enabled,
                showOverlay: data.enabled
              });
            } else {
              console.warn('[StreamPlayer] ⚠️ StreamId не совпадает, игнорируем заставку:', {
                receivedStreamId: data.streamId,
                currentStreamId: stream._id
              });
            }
          } catch (error) {
            console.error('[StreamPlayer] ❌ Ошибка обработки заставки:', error);
            // Не прерываем стрим из-за ошибки заставки
          }
        };
        console.log('[StreamPlayer] Регистрируем обработчик stream-overlay-changed для стрима:', stream._id);
        socket.on('stream-overlay-changed', overlayHandler);

        setIsConnected(true);
      } catch (err) {
        console.error('Ошибка WebRTC:', err);
        setError('Ошибка подключения к стриму');
      }
    };

    setupWebRTC();

    return () => {
      // Останавливаем мониторинг статистики
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
      
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

  // Отдельный useEffect для автоматического воспроизведения и обработки загрузки метаданных
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const tryPlay = async () => {
      if (!videoElement.srcObject) return;
      
      // Ждем загрузки метаданных и размеров видео
      if (videoElement.readyState < 1 || videoElement.videoWidth === 0) {
        console.log('[StreamPlayer] Ждем загрузки метаданных:', {
          readyState: videoElement.readyState,
          videoWidth: videoElement.videoWidth,
          videoHeight: videoElement.videoHeight
        });
        return;
      }

      if (videoElement.paused) {
        try {
          await videoElement.play();
          console.log('[StreamPlayer] Видео успешно запущено после загрузки метаданных');
          setIsConnected(true);
          setError('');
        } catch (err) {
          console.log('[StreamPlayer] Не удалось запустить видео (ожидаемо для мобильных):', err);
          // Не показываем ошибку, если это автоплей заблокирован
          if (!err.message.includes('user didn\'t interact')) {
            setError('Нажмите на кнопку play для запуска видео');
          }
        }
      }
    };

    const handleLoadedMetadata = () => {
      console.log('[StreamPlayer] Метаданные загружены:', {
        readyState: videoElement.readyState,
        videoWidth: videoElement.videoWidth,
        videoHeight: videoElement.videoHeight
      });
      tryPlay();
    };

    const handleLoadedData = () => {
      console.log('[StreamPlayer] Данные загружены');
      tryPlay();
    };

    const handleCanPlay = () => {
      console.log('[StreamPlayer] Видео готово к воспроизведению');
      tryPlay();
    };

    const handlePlay = () => {
      console.log('[StreamPlayer] Видео запущено пользователем');
      setIsConnected(true);
      setError('');
    };

    let waitingTimeout = null;
    const handleWaiting = () => {
      console.log('[StreamPlayer] Видео буферизуется');
      // Если видео долго буферизуется, показываем предупреждение
      if (waitingTimeout) {
        clearTimeout(waitingTimeout);
      }
      waitingTimeout = setTimeout(() => {
        if (videoElement.paused) {
          console.log('[StreamPlayer] Видео долго буферизуется, возможно проблема с соединением');
          setError('Видео буферизуется... Проверьте соединение');
        } else {
          // Видео не paused, но все еще буферизуется - возможно проблема с данными
          console.log('[StreamPlayer] Видео играет, но долго буферизуется');
          setError('Видео буферизуется...');
        }
      }, 3000);
    };

    const handlePlaying = () => {
      console.log('[StreamPlayer] Видео играет - подтверждено событием playing');
      // Очищаем таймаут буферизации
      if (waitingTimeout) {
        clearTimeout(waitingTimeout);
        waitingTimeout = null;
      }
      setIsConnected(true);
      setError('');
    };
    
    const handleProgress = () => {
      // Видео получает данные - это хороший знак
      if (videoElement.buffered.length > 0) {
        const bufferedEnd = videoElement.buffered.end(videoElement.buffered.length - 1);
        const currentTime = videoElement.currentTime;
        const bufferedAhead = bufferedEnd - currentTime;
        console.log('[StreamPlayer] Видео получает данные:', {
          bufferedAhead: bufferedAhead.toFixed(2),
          currentTime: currentTime.toFixed(2),
          readyState: videoElement.readyState
        });
      }
    };
    
    const handleStalled = () => {
      console.log('[StreamPlayer] Видео остановилось (stalled)');
      setError('Видео остановилось. Проверьте соединение');
    };
    
    const handleError = (e) => {
      console.error('[StreamPlayer] Ошибка видео элемента:', e);
      const error = videoElement.error;
      if (error) {
        console.error('[StreamPlayer] Код ошибки:', error.code, 'Сообщение:', error.message);
        setError('Ошибка воспроизведения видео');
      }
    };

    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoElement.addEventListener('loadeddata', handleLoadedData);
    videoElement.addEventListener('canplay', handleCanPlay);
    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('waiting', handleWaiting);
    videoElement.addEventListener('playing', handlePlaying);
    videoElement.addEventListener('progress', handleProgress);
    videoElement.addEventListener('stalled', handleStalled);
    videoElement.addEventListener('error', handleError);

    // Пробуем запустить сразу, если метаданные уже загружены
    if (videoElement.srcObject) {
      tryPlay();
    }

    return () => {
      if (waitingTimeout) {
        clearTimeout(waitingTimeout);
      }
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.removeEventListener('loadeddata', handleLoadedData);
      videoElement.removeEventListener('canplay', handleCanPlay);
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('waiting', handleWaiting);
      videoElement.removeEventListener('playing', handlePlaying);
      videoElement.removeEventListener('progress', handleProgress);
      videoElement.removeEventListener('stalled', handleStalled);
      videoElement.removeEventListener('error', handleError);
    };
  }, [isConnected, autoPlay]);

  // Принудительный запуск видео заставки после загрузки
  useEffect(() => {
    if (showOverlay && overlayType === 'video' && overlayVideo) {
      console.log('[StreamPlayer] useEffect для видео заставки, overlayVideo длина:', overlayVideo.length);
      
      // Небольшая задержка для того, чтобы видео элемент был в DOM
      const timer = setTimeout(() => {
        // Ищем видео элемент заставки по src или по позиции в DOM
        const videoContainer = document.querySelector('.stream-player > div[style*="position: relative"]');
        if (videoContainer) {
          const overlayVideoElements = videoContainer.querySelectorAll('video');
          // Ищем видео элемент, который не является основным видео стрима
          overlayVideoElements.forEach(videoEl => {
            if (videoEl.src && videoEl.src.includes('data:video')) {
              console.log('[StreamPlayer] Найден элемент видео заставки, принудительно запускаю');
              videoEl.play().catch(err => {
                console.log('[StreamPlayer] Не удалось запустить видео заставку (ожидаемо для мобильных):', err);
              });
            }
          });
        }
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [showOverlay, overlayType, overlayVideo]);

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
          onClick={async (e) => {
            // Обработка клика на видео - пытаемся запустить если paused
            const video = videoRef.current;
            if (!video || !video.srcObject) return;
            
            // Если видео уже играет, ничего не делаем
            if (!video.paused) return;
            
            console.log('[StreamPlayer] Клик на видео, пытаемся запустить:', {
              readyState: video.readyState,
              videoWidth: video.videoWidth,
              videoHeight: video.videoHeight,
              paused: video.paused
            });
            
            try {
              // Если метаданные еще не загружены, ждем их
              if (video.readyState < 1 || video.videoWidth === 0) {
                console.log('[StreamPlayer] Ждем загрузки метаданных перед запуском');
                // Ждем события loadedmetadata
                await new Promise((resolve) => {
                  const handler = () => {
                    video.removeEventListener('loadedmetadata', handler);
                    resolve();
                  };
                  video.addEventListener('loadedmetadata', handler);
                  // Таймаут на случай, если метаданные не загрузятся
                  setTimeout(() => {
                    video.removeEventListener('loadedmetadata', handler);
                    resolve();
                  }, 5000);
                });
              }
              
              await video.play();
              console.log('[StreamPlayer] Видео успешно запущено по клику');
              setIsConnected(true);
              setError('');
            } catch (err) {
              console.error('[StreamPlayer] Ошибка запуска видео по клику:', err);
              setError('Не удалось запустить видео. Попробуйте еще раз.');
            }
          }}
          onLoadedMetadata={() => {
            const video = videoRef.current;
            if (video && video.srcObject && video.paused) {
              console.log('[StreamPlayer] onLoadedMetadata - метаданные загружены:', {
                readyState: video.readyState,
                videoWidth: video.videoWidth,
                videoHeight: video.videoHeight
              });
              // Пробуем запустить только если есть размеры
              if (video.videoWidth > 0 && video.videoHeight > 0) {
                video.play().catch(err => {
                  console.log('[StreamPlayer] Автоплей заблокирован (ожидаемо):', err);
                });
              }
            }
          }}
          onLoadedData={() => {
            const video = videoRef.current;
            if (video && video.srcObject && video.paused) {
              console.log('[StreamPlayer] onLoadedData - данные загружены');
              if (video.videoWidth > 0 && video.videoHeight > 0) {
                video.play().catch(err => {
                  console.log('[StreamPlayer] Автоплей заблокирован (ожидаемо):', err);
                });
              }
            }
          }}
          onCanPlay={() => {
            const video = videoRef.current;
            if (video && video.srcObject && video.paused) {
              console.log('[StreamPlayer] onCanPlay - видео готово к воспроизведению');
              if (video.videoWidth > 0 && video.videoHeight > 0) {
                video.play().catch(err => {
                  console.log('[StreamPlayer] Автоплей заблокирован (ожидаемо):', err);
                });
              }
            }
          }}
          onPlay={() => {
            setIsConnected(true);
            setError('');
            console.log('[StreamPlayer] Видео запущено');
          }}
          onPause={() => {
            console.log('[StreamPlayer] Видео приостановлено');
          }}
          onWaiting={() => {
            console.log('[StreamPlayer] Видео буферизуется');
          }}
          onPlaying={() => {
            setIsConnected(true);
            setError('');
            console.log('[StreamPlayer] Видео играет');
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
            key={`overlay-video-${overlayVideo.substring(0, 50)}`}
            ref={(el) => {
              if (el) {
                console.log('[StreamPlayer] Видео заставки элемент создан, src длина:', overlayVideo.length);
                // Убеждаемся, что видео запускается после загрузки
                const tryPlay = () => {
                  if (el.readyState >= 2) {
                    el.play().catch(err => {
                      console.log('[StreamPlayer] Ошибка автоплея видео заставки (ожидаемо):', err);
                    });
                  } else {
                    // Ждем загрузки метаданных
                    el.addEventListener('loadedmetadata', () => {
                      el.play().catch(err => {
                        console.log('[StreamPlayer] Ошибка автоплея видео заставки после загрузки (ожидаемо):', err);
                      });
                    }, { once: true });
                  }
                };
                
                // Пробуем сразу
                tryPlay();
                
                // Также пробуем после загрузки данных
                el.addEventListener('loadeddata', tryPlay, { once: true });
                el.addEventListener('canplay', tryPlay, { once: true });
              }
            }}
            src={overlayVideo}
            autoPlay
            loop
            muted
            playsInline
            onLoadedMetadata={() => {
              console.log('[StreamPlayer] Видео заставки - метаданные загружены');
            }}
            onLoadedData={() => {
              console.log('[StreamPlayer] Видео заставки - данные загружены');
            }}
            onCanPlay={() => {
              console.log('[StreamPlayer] Видео заставки - готово к воспроизведению');
            }}
            onPlay={() => {
              console.log('[StreamPlayer] Видео заставки запущено');
            }}
            onError={(e) => {
              console.error('[StreamPlayer] Ошибка загрузки видео заставки:', e);
              const error = e.target.error;
              if (error) {
                console.error('[StreamPlayer] Код ошибки видео заставки:', error.code, 'Сообщение:', error.message);
              }
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              pointerEvents: 'none',
              zIndex: 10,
              opacity: 0.7,
              mixBlendMode: 'screen'
            }}
          />
        )}
      </div>
      {!isConnected && <div className="loading">Подключение к стриму...</div>}
      
      {/* Отдельный проигрыватель для видео заставки */}
      {showOverlay && overlayType === 'video' && overlayVideo && (
        <div style={{
          marginTop: '20px',
          width: '100%',
          maxWidth: '640px',
          margin: '20px auto 0',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          background: '#000'
        }}>
          <div style={{
            padding: '10px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            fontSize: '14px',
            fontWeight: '600',
            textAlign: 'center'
          }}>
            🎬 Видео заставка стримера
          </div>
          <video
            key={`overlay-video-player-${overlayVideo.substring(0, 50)}`}
            src={overlayVideo}
            autoPlay
            loop
            muted
            playsInline
            controls={false}
            style={{
              width: '100%',
              height: 'auto',
              display: 'block'
            }}
            onLoadedMetadata={() => {
              console.log('[StreamPlayer] Видео заставки в отдельном проигрывателе - метаданные загружены');
            }}
            onLoadedData={() => {
              console.log('[StreamPlayer] Видео заставки в отдельном проигрывателе - данные загружены');
            }}
            onCanPlay={() => {
              console.log('[StreamPlayer] Видео заставки в отдельном проигрывателе - готово к воспроизведению');
            }}
            onPlay={() => {
              console.log('[StreamPlayer] Видео заставки в отдельном проигрывателе запущено');
            }}
            onError={(e) => {
              console.error('[StreamPlayer] Ошибка загрузки видео заставки в отдельном проигрывателе:', e);
            }}
          />
        </div>
      )}
    </div>
  );
}

