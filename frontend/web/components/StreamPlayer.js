import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

export default function StreamPlayer({ stream, user }) {
  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!stream) return;

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000');
    socketRef.current = socket;
    
    // Для неавторизованных пользователей используем временный ID на основе socket.id
    const userId = user?.id || `guest-${socket.id}`;

    // Настройка WebRTC
    const setupWebRTC = async () => {
      try {
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }
          ]
        });

        peerConnectionRef.current = pc;

        // Обработка входящего потока
        pc.ontrack = (event) => {
          console.log('Получен трек от стримера:', event);
          if (videoRef.current) {
            let mediaStream = null;
            if (event.streams && event.streams[0]) {
              mediaStream = event.streams[0];
              videoRef.current.srcObject = mediaStream;
            } else if (event.track) {
              // Альтернативный способ получения потока
              mediaStream = new MediaStream([event.track]);
              videoRef.current.srcObject = mediaStream;
            }
            
            // Автоматически запускаем воспроизведение
            if (mediaStream && videoRef.current) {
              videoRef.current.play().catch(err => {
                console.error('Ошибка автоматического воспроизведения:', err);
                // Если автоплей заблокирован, показываем сообщение
                setError('Нажмите play для воспроизведения');
              });
            }
            
            setIsConnected(true);
            setError('');
          }
        };
        
        // Обработка изменения состояния соединения
        pc.onconnectionstatechange = () => {
          console.log('WebRTC connection state:', pc.connectionState);
          if (pc.connectionState === 'connected') {
            setIsConnected(true);
            setError('');
          } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            setError('Соединение потеряно');
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
            console.log('Получен offer от стримера:', data);
            try {
              // Если уже есть remote description, не устанавливаем снова
              if (pc.remoteDescription) {
                console.log('Remote description уже установлен, пропускаю');
                return;
              }
              await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);

              console.log('Отправляю answer стримеру:', data.senderId);
              socket.emit('webrtc-answer', {
                streamId: stream._id,
                answer: answer,
                targetId: data.senderId || stream.streamer._id
              });
              setIsConnected(true);
            } catch (error) {
              console.error('Ошибка обработки offer:', error);
              // Если ошибка из-за того, что уже установлен, это нормально
              if (!error.message.includes('already set')) {
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
  }, [isConnected]);

  return (
    <div className="stream-player">
      {error && <div className="error">{error}</div>}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        controls
        muted={false}
        className="video-player"
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
      {!isConnected && <div className="loading">Подключение к стриму...</div>}
    </div>
  );
}

