import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

export default function StreamPlayer({ stream, user }) {
  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!stream || !user) return;

    const socket = io(process.env.SOCKET_URL || 'http://localhost:5000');
    socketRef.current = socket;

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
          if (videoRef.current) {
            videoRef.current.srcObject = event.streams[0];
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

        // Присоединяемся к стриму как зритель
        socket.emit('join-stream', {
          streamId: stream._id,
          userId: user.id,
          isStreamer: false
        });

        // Слушаем offer от стримера
        socket.on('webrtc-offer', async (data) => {
          if (data.streamId === stream._id) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit('webrtc-answer', {
              streamId: stream._id,
              answer: answer,
              targetId: data.senderId
            });
          }
        });

        // Слушаем answer
        socket.on('webrtc-answer', async (data) => {
          if (data.streamId === stream._id) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          }
        });

        // Слушаем ICE кандидаты
        socket.on('webrtc-ice-candidate', async (data) => {
          if (data.streamId === stream._id) {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
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
        socketRef.current.disconnect();
      }
    };
  }, [stream, user]);

  return (
    <div className="stream-player">
      {error && <div className="error">{error}</div>}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        controls
        className="video-player"
      />
      {!isConnected && <div className="loading">Подключение к стриму...</div>}
    </div>
  );
}

