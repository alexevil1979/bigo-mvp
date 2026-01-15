import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import io from 'socket.io-client';
import { generateTurnCredentialsSync } from '../lib/turnAuth';

export default function StreamCard({ stream }) {
  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [overlayImage, setOverlayImage] = useState(null);
  const [overlayVideo, setOverlayVideo] = useState(null);
  const [overlayType, setOverlayType] = useState(null);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    if (!stream) return;

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000');
    socketRef.current = socket;
    
    const userId = `preview-${stream._id}-${Date.now()}`;

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
          if (videoRef.current) {
            if (event.streams && event.streams[0]) {
              videoRef.current.srcObject = event.streams[0];
              videoRef.current.muted = true; // Без звука для превью
              videoRef.current.play().catch(() => {});
              setIsConnected(true);
            } else if (event.track) {
              const stream = new MediaStream([event.track]);
              videoRef.current.srcObject = stream;
              videoRef.current.muted = true;
              videoRef.current.play().catch(() => {});
              setIsConnected(true);
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
              if (pc.remoteDescription) return;
              await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);

              socket.emit('webrtc-answer', {
                streamId: stream._id,
                answer: answer,
                targetId: data.senderId || stream.streamer._id
              });
            } catch (error) {
              console.error('Ошибка обработки offer для превью:', error);
            }
          }
        };
        socket.on('webrtc-offer', offerHandler);

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
            className="stream-preview-video"
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: isConnected ? 'block' : 'none',
              backgroundColor: '#000',
              zIndex: 2
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
          {!isConnected && (
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

