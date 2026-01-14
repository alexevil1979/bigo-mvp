import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import io from 'socket.io-client';

export default function StreamCard({ stream }) {
  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!stream) return;

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000');
    socketRef.current = socket;
    
    const userId = `preview-${stream._id}-${Date.now()}`;

    const setupPreview = async () => {
      try {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

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
        socketRef.current.emit('leave-stream', { streamId: stream._id });
        socketRef.current.disconnect();
      }
    };
  }, [stream]);

  return (
    <Link href={`/stream/${stream._id}`}>
      <div className="stream-card">
        <div className="stream-thumbnail">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="stream-preview-video"
          />
          {!isConnected && (
            <div className="preview-loading">
              <div className="loading-spinner"></div>
            </div>
          )}
          <div className="live-badge">LIVE</div>
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

